class UI {
    static init() {
        this.setupEventListeners();
        this.setupInputValidation();
        this.setupKeyboardShortcuts();
        this.showScreen('welcomeScreen');
        this.setupNavigationConfirmation();
        this.setupEnhancedUI();
        this.notificationQueue = [];
        this.maxNotifications = 3;
    }

    static setupEnhancedUI() {
        // Add enhanced UI class for progressive enhancement
        document.body.classList.add('enhanced-ui');
        
        // Setup real-time input validation
        this.setupRealTimeValidation();
        
        // Initialize QR code functionality
        this.loadQRLibrary();
    }

    static setupEventListeners() {
        // Game mode selection
        document.getElementById('singlePlayerBtn').addEventListener('click', () => {
            Game.selectSinglePlayer();
        });

        document.getElementById('multiplayerBtn').addEventListener('click', () => {
            Game.selectMultiplayer();
        });

        document.getElementById('startSinglePlayerBtn').addEventListener('click', () => {
            Game.startSinglePlayer();
        });

        // Welcome screen
        document.getElementById('createPartyBtn').addEventListener('click', () => {
            const button = document.getElementById('createPartyBtn');
            const playerName = document.getElementById('playerName').value.trim();
            
            if (!this.validateInput(document.getElementById('playerName'))) {
                this.showNotification('Please enter a valid name', 'error');
                return;
            }
            
            this.setButtonLoading(button, 'Creating...');
            Game.createParty(playerName);
        });

        document.getElementById('joinPartyBtn').addEventListener('click', () => {
            const joinDiv = document.getElementById('joinPartyDiv');
            const isVisible = joinDiv.style.display === 'block';
            
            if (isVisible) {
                // Hide join form
                joinDiv.style.display = 'none';
                document.getElementById('joinPartyBtn').textContent = '🚀 Join Party';
            } else {
                // Show join form
                joinDiv.style.display = 'block';
                document.getElementById('joinPartyBtn').textContent = '❌ Cancel';
                document.getElementById('partyCodeInput').focus();
            }
        });

        document.getElementById('joinPartySubmitBtn').addEventListener('click', () => {
            const button = document.getElementById('joinPartySubmitBtn');
            const playerNameInput = document.getElementById('playerName');
            const partyCodeInput = document.getElementById('partyCodeInput');
            
            if (!this.validateInput(playerNameInput) || !this.validateInput(partyCodeInput)) {
                this.showNotification('Please enter valid name and party code', 'error');
                return;
            }
            
            this.setButtonLoading(button, 'Joining...');
            Game.joinParty(partyCodeInput.value.trim(), playerNameInput.value.trim());
        });

        // Back to menu buttons
        this.setupBackButtons();

        // Lobby screen
        document.getElementById('copyCodeBtn').addEventListener('click', () => {
            const partyCode = document.getElementById('lobbyPartyCode').textContent;
            this.copyToClipboard(partyCode);
        });

        document.getElementById('startGameBtn').addEventListener('click', () => {
            Game.startGame();
        });

        document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
            this.showConfirmDialog(
                'Leave Party',
                'Are you sure you want to leave this party?',
                () => Game.leaveParty()
            );
        });

        // Settings change listeners with validation
        document.getElementById('rangeStart').addEventListener('change', (e) => {
            const start = parseInt(e.target.value);
            const end = parseInt(document.getElementById('rangeEnd').value);
            
            if (start >= end) {
                UI.showNotification('Start number must be less than end number', 'warning');
                e.target.value = Math.max(1, end - 1);
                return;
            }
            
            Game.updateSettings();
        });

        document.getElementById('rangeEnd').addEventListener('change', (e) => {
            const start = parseInt(document.getElementById('rangeStart').value);
            const end = parseInt(e.target.value);
            
            if (end <= start) {
                UI.showNotification('End number must be greater than start number', 'warning');
                e.target.value = Math.min(10000, start + 1);
                return;
            }
            
            Game.updateSettings();
        });

        document.getElementById('bestOfThree').addEventListener('change', () => {
            Game.updateSettings();
        });

        // Add input validation for range inputs
        document.getElementById('rangeStart').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 1) e.target.value = 1;
            if (value > 9999) e.target.value = 9999;
        });

        document.getElementById('rangeEnd').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value < 2) e.target.value = 2;
            if (value > 10000) e.target.value = 10000;
        });

        // Selection screen
        document.getElementById('readyBtn').addEventListener('click', () => {
            const button = document.getElementById('readyBtn');
            const secretNumberInput = document.getElementById('secretNumber');
            
            if (!this.validateInput(secretNumberInput)) {
                this.showNotification('Please enter a valid secret number', 'error');
                return;
            }
            
            const secretNumber = parseInt(secretNumberInput.value);
            this.setButtonLoading(button, 'Setting...');
            Game.setReady(secretNumber);
        });

        // Game screen
        document.getElementById('makeGuessBtn').addEventListener('click', () => {
            const button = document.getElementById('makeGuessBtn');
            const guessInput = document.getElementById('guessInput');
            
            if (!this.validateInput(guessInput)) {
                this.showNotification('Please enter a valid guess', 'error');
                return;
            }
            
            const guess = parseInt(guessInput.value);
            this.setButtonLoading(button, 'Guessing...');
            
            // Reset button after a short delay
            setTimeout(() => {
                this.resetButton(button, '🎯 Guess!');
            }, 1000);
            
            Game.makeGuess(guess);
        });

        // Results screen
        document.getElementById('nextRoundBtn').addEventListener('click', () => {
            Game.nextRound();
        });

        document.getElementById('rematchBtn').addEventListener('click', () => {
            Game.rematch();
        });

        document.getElementById('leaveResultsBtn').addEventListener('click', () => {
            this.showConfirmDialog(
                'Leave Game',
                'Are you sure you want to leave this game?',
                () => Game.leaveParty()
            );
        });
    }

    static setupBackButtons() {
        // Add back button functionality to various screens
        this.addBackButtonToScreen('lobbyScreen', () => {
            this.showConfirmDialog(
                'Leave Party',
                'Are you sure you want to leave this party?',
                () => {
                    Game.leaveParty();
                }
            );
        });

        this.addBackButtonToScreen('selectionScreen', () => {
            this.showConfirmDialog(
                'Leave Game',
                'Are you sure you want to leave this game?',
                () => {
                    Game.leaveParty();
                }
            );
        });

        this.addBackButtonToScreen('gameScreen', () => {
            this.showConfirmDialog(
                'Leave Game',
                'Are you sure you want to leave this active game? You will lose progress.',
                () => {
                    Game.leaveParty();
                }
            );
        });
    }

    static addBackButtonToScreen(screenId, onBack) {
        const screen = document.getElementById(screenId);
        if (!screen) return;

        // Check if back button already exists
        let backBtn = screen.querySelector('.back-btn');
        if (!backBtn) {
            backBtn = document.createElement('button');
            backBtn.className = 'btn btn-secondary back-btn';
            backBtn.innerHTML = '🔙 Back';
            backBtn.style.position = 'absolute';
            backBtn.style.top = '20px';
            backBtn.style.left = '20px';
            backBtn.style.minWidth = 'auto';
            backBtn.style.padding = '10px 15px';
            
            // Insert at the beginning of the screen
            screen.insertBefore(backBtn, screen.firstChild);
        }
        
        backBtn.onclick = onBack;
    }

    static setupInputValidation() {
        // Auto-uppercase party code input
        document.getElementById('partyCodeInput').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Validate number inputs
        const numberInputs = ['rangeStart', 'rangeEnd', 'secretNumber', 'guessInput', 'singleRangeStart', 'singleRangeEnd'];
        numberInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    // Remove non-numeric characters except minus sign
                    e.target.value = e.target.value.replace(/[^0-9-]/g, '');
                });
            }
        });

        // Player name validation
        document.getElementById('playerName').addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length > 20) {
                e.target.value = value.substring(0, 20);
                this.showNotification('Name cannot exceed 20 characters', 'warning');
            }
        });
    }

    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Enter key shortcuts
            if (e.key === 'Enter') {
                const activeScreen = document.querySelector('.screen.active');
                if (!activeScreen) return;

                const screenId = activeScreen.id;
                
                switch (screenId) {
                    case 'welcomeScreen':
                        if (document.getElementById('joinPartyDiv').style.display === 'block') {
                            document.getElementById('joinPartySubmitBtn').click();
                        } else if (document.getElementById('singlePlayerOptions').style.display === 'block') {
                            document.getElementById('startSinglePlayerBtn').click();
                        } else if (document.getElementById('multiplayerOptions').style.display === 'block') {
                            document.getElementById('createPartyBtn').click();
                        }
                        break;
                    case 'selectionScreen':
                        if (!document.getElementById('readyBtn').disabled) {
                            document.getElementById('readyBtn').click();
                        }
                        break;
                    case 'gameScreen':
                        const guessInput = document.getElementById('guessInput');
                        if (document.activeElement === guessInput && !guessInput.disabled) {
                            document.getElementById('makeGuessBtn').click();
                        }
                        break;
                }
            }

            // Escape key - go back or cancel
            if (e.key === 'Escape') {
                const joinDiv = document.getElementById('joinPartyDiv');
                if (joinDiv.style.display === 'block') {
                    joinDiv.style.display = 'none';
                    document.getElementById('joinPartyBtn').textContent = '🚀 Join Party';
                }
                
                // Close any open confirmation dialogs
                const confirmDialog = document.querySelector('.confirm-dialog');
                if (confirmDialog) {
                    confirmDialog.remove();
                }
            }
        });
    }

    static setupNavigationConfirmation() {
        // Warn users when trying to leave during active game
        window.addEventListener('beforeunload', (e) => {
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen && (activeScreen.id === 'gameScreen' || activeScreen.id === 'selectionScreen')) {
                e.preventDefault();
                e.returnValue = 'You are in an active game. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    // Screen management
    static showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        
        // Focus management
        this.focusFirstInput(screenId);
        
        // Update URL hash for better navigation (optional)
        window.location.hash = screenId;
    }

    static focusFirstInput(screenId) {
        setTimeout(() => {
            const screen = document.getElementById(screenId);
            const firstInput = screen.querySelector('input:not([disabled]), button:not([disabled])');
            if (firstInput && !firstInput.classList.contains('back-btn')) {
                firstInput.focus();
            }
        }, 100);
    }

    // Enhanced notification system with queue management
    static showNotification(message, type = 'info', duration = 4000, specialStyle = null) {
        // Add to queue if too many notifications
        if (this.getActiveNotifications().length >= this.maxNotifications) {
            this.notificationQueue.push({ message, type, duration, specialStyle });
            return;
        }
        
        this.displayNotification(message, type, duration, specialStyle);
    }

    // Confirmation dialog system
    static showConfirmDialog(title, message, onConfirm, onCancel = null) {
        // Remove existing dialog
        const existingDialog = document.querySelector('.confirm-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-overlay"></div>
            <div class="confirm-content">
                <h3 class="confirm-title">${title}</h3>
                <p class="confirm-message">${message}</p>
                <div class="confirm-buttons">
                    <button class="btn btn-danger confirm-yes">Yes</button>
                    <button class="btn btn-secondary confirm-no">No</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add event listeners
        dialog.querySelector('.confirm-yes').onclick = () => {
            dialog.remove();
            if (onConfirm) onConfirm();
        };

        dialog.querySelector('.confirm-no').onclick = () => {
            dialog.remove();
            if (onCancel) onCancel();
        };

        dialog.querySelector('.confirm-overlay').onclick = () => {
            dialog.remove();
            if (onCancel) onCancel();
        };

        // Focus the "No" button by default (safer choice)
        setTimeout(() => {
            dialog.querySelector('.confirm-no').focus();
        }, 100);
    }

    // Enhanced connection status
    static updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.innerHTML = 'Connected';
                statusElement.title = 'Connected to server';
                break;
            case 'connecting':
                statusElement.innerHTML = 'Connecting...';
                statusElement.title = 'Connecting to server...';
                break;
            case 'disconnected':
                statusElement.innerHTML = 'Disconnected';
                statusElement.title = 'Disconnected from server - attempting to reconnect';
                // Show critical notification for disconnection
                this.showNotification('🚨 Connection lost! Attempting to reconnect...', 'critical', 10000);
                break;
        }
    }

    // Loading overlay
    static showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('.loading-text');
        text.textContent = message;
        overlay.style.display = 'flex';
    }

    static hideLoadingOverlay() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Enhanced clipboard functionality
    static copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Party code copied to clipboard! Share it with your friend.', 'success');
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    static fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('Party code copied! Share it with your friend.', 'success');
        } catch (err) {
            this.showNotification(`Failed to copy. Please copy manually: ${text}`, 'error', 8000);
        }
        
        document.body.removeChild(textArea);
    }

    // Party management UI
    static updatePartyInfo(party) {
        document.getElementById('partyCodeDisplay').textContent = party.code;
        document.getElementById('partyInfo').style.display = 'block';
    }

    static hidePartyInfo() {
        document.getElementById('partyInfo').style.display = 'none';
    }

    static updateLobbyPlayers(party) {
        const players = party.players;
        const hostPlayer = players.find(p => p.isHost);
        const guestPlayer = players.find(p => !p.isHost);

        // Update player 1 (host)
        const player1Card = document.getElementById('player1Card');
        const player1Name = document.getElementById('player1Name');
        if (hostPlayer) {
            player1Name.innerHTML = `
                <span class="status-indicator ${hostPlayer.isConnected ? 'online' : 'offline'}"></span>
                ${hostPlayer.name} ${hostPlayer.isHost ? '👑' : ''}
            `;
            player1Card.classList.toggle('active', hostPlayer.isConnected);
        }

        // Update player 2 (guest)
        const player2Card = document.getElementById('player2Card');
        const player2Name = document.getElementById('player2Name');
        if (guestPlayer) {
            player2Name.innerHTML = `
                <span class="status-indicator ${guestPlayer.isConnected ? 'online' : 'offline'}"></span>
                ${guestPlayer.name}
            `;
            player2Card.classList.toggle('active', guestPlayer.isConnected);
            
            // Enable start button if host
            const startBtn = document.getElementById('startGameBtn');
            if (party.players.some(p => p.isHost && socketClient.gameState.playerId === p.id)) {
                startBtn.disabled = false;
                startBtn.textContent = '🚀 Start Game';
                startBtn.classList.add('pulse-animation'); // Add visual emphasis
            }
        } else {
            player2Name.innerHTML = `
                <span class="status-indicator offline"></span>
                Waiting for player...
            `;
            player2Card.classList.remove('active');
            
            // Show invitation helpers
            this.showInvitationHelpers(party.code);
        }
    }

    static showInvitationHelpers(partyCode) {
        // Add invitation helper UI if not already present
        const lobbyScreen = document.getElementById('lobbyScreen');
        let helperDiv = document.getElementById('invitation-helper');
        
        if (!helperDiv) {
            helperDiv = document.createElement('div');
            helperDiv.id = 'invitation-helper';
            helperDiv.className = 'invitation-helper';
            helperDiv.innerHTML = `
                <div class="helper-content">
                    <h4>🎯 Waiting for a friend?</h4>
                    <p>Share your party code: <strong>${partyCode}</strong></p>
                    <div class="share-options">
                        <button class="btn btn-copy" onclick="UI.copyToClipboard('${partyCode}')">📋 Copy Code</button>
                        <button class="btn btn-secondary" onclick="UI.sharePartyLink('${partyCode}')">🔗 Share Link</button>
                        <button class="btn btn-primary" onclick="UI.generateQRCode('${partyCode}')">📱 QR Code</button>
                    </div>
                    <p class="helper-tip">💡 Tip: Your friend can scan the QR code or enter the code manually!</p>
                </div>
            `;
            
            // Insert after party code section
            const partyCodeSection = document.querySelector('.party-code-section');
            partyCodeSection.after(helperDiv);
        }
    }

    static sharePartyLink(partyCode) {
        const url = `${window.location.origin}${window.location.pathname}?join=${partyCode}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join my Number Guessing Game!',
                text: `Join my party with code: ${partyCode}`,
                url: url
            }).then(() => {
                this.showNotification('Invitation shared!', 'success');
            }).catch(err => {
                this.copyToClipboard(url);
            });
        } else {
            this.copyToClipboard(url);
        }
    }

    static updateGameSettings(settings) {
        document.getElementById('rangeStart').value = settings.rangeStart;
        document.getElementById('rangeEnd').value = settings.rangeEnd;
        document.getElementById('bestOfThree').checked = settings.bestOfThree;
        
        // Update single player settings too
        document.getElementById('singleRangeStart').value = settings.rangeStart;
        document.getElementById('singleRangeEnd').value = settings.rangeEnd;
        
        // Update range display
        Game.updateRangeDisplay(settings.rangeStart, settings.rangeEnd);
    }

    static disableSettings(disabled = true) {
        document.getElementById('rangeStart').disabled = disabled;
        document.getElementById('rangeEnd').disabled = disabled;
        document.getElementById('bestOfThree').disabled = disabled;
        
        // Add visual feedback
        const settingsSection = document.getElementById('gameSettings');
        if (disabled) {
            settingsSection.classList.add('disabled');
            settingsSection.title = 'Only the host can change settings';
        } else {
            settingsSection.classList.remove('disabled');
            settingsSection.title = '';
        }
    }

    // Selection screen UI
    static updateSelectionScreen(party, timeLimit) {
        const roundText = party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
        document.getElementById('selectionRoundInfo').querySelector('.round-text').textContent = roundText;
        
        const rangeDisplay = `${party.gameSettings.rangeStart} - ${party.gameSettings.rangeEnd}`;
        document.getElementById('selectionRangeDisplay').textContent = rangeDisplay;
        
        const secretNumberInput = document.getElementById('secretNumber');
        secretNumberInput.min = party.gameSettings.rangeStart;
        secretNumberInput.max = party.gameSettings.rangeEnd;
        secretNumberInput.value = '';
        secretNumberInput.disabled = false;
        secretNumberInput.placeholder = `Choose ${rangeDisplay}`;
        
        // Update range hints
        document.getElementById('secretNumberRange').textContent = `(${rangeDisplay})`;
        document.getElementById('secretNumberHint').innerHTML = `💡 Choose wisely - your opponent will try to guess this number!`;
        
        // Add range hint
        const selectionMessage = document.getElementById('selectionMessage');
        selectionMessage.innerHTML = `
            <strong>🎯 Choose your secret number between ${rangeDisplay}</strong><br>
            <small>💡 Think strategically! Not too obvious, not too random.</small>
        `;
        selectionMessage.className = 'message info enhanced';
        
        // FIXED: Ensure button is properly reset for all new games/rounds/rematches
        const readyBtn = document.getElementById('readyBtn');
        readyBtn.disabled = false;
        readyBtn.textContent = '✅ Ready';
        readyBtn.classList.remove('btn-disabled', 'loading', 'success', 'error');
        readyBtn.style.opacity = '1';
        
        // Clear ready status completely
        document.getElementById('readyStatus').textContent = '';
        document.getElementById('readyStatus').innerHTML = '';
        
        // Clear any previous timeout/interval from button reset
        if (readyBtn._resetTimeout) {
            clearTimeout(readyBtn._resetTimeout);
            delete readyBtn._resetTimeout;
        }
        
        // Focus on input
        setTimeout(() => secretNumberInput.focus(), 200);
        
        // Add input validation with toast messages
        this.setupSecretNumberValidation(secretNumberInput, party.gameSettings.rangeStart, party.gameSettings.rangeEnd);
    }

    static updateSelectionTimer(timeLeft) {
        document.getElementById('selectionTimer').textContent = timeLeft;
        
        // Add urgency styling and sound
        const timer = document.getElementById('selectionTimer');
        if (timeLeft <= 10) {
            timer.style.color = '#ff6b6b';
            timer.style.animation = 'pulse 0.5s infinite';
            
            // Add urgent warning
            if (timeLeft === 10) {
                this.showNotification('⚠️ Only 10 seconds left to choose!', 'warning', 2000);
            } else if (timeLeft === 5) {
                this.showNotification('⚠️ 5 seconds remaining!', 'warning', 1000);
            }
        } else if (timeLeft <= 20) {
            timer.style.color = '#ffc107';
            timer.style.animation = 'none';
        } else {
            timer.style.color = '#ff6b6b';
            timer.style.animation = 'none';
        }
    }

    static updateReadyStatus(playerId, playerName, allReady) {
        const statusElement = document.getElementById('readyStatus');
        
        if (playerId === socketClient.gameState.playerId) {
            statusElement.innerHTML = '✅ You are ready! Waiting for opponent...<br><small>💡 Get ready for the guessing battle!</small>';
            document.getElementById('readyBtn').disabled = true;
            document.getElementById('readyBtn').textContent = '✅ Ready!';
        } else {
            statusElement.innerHTML = `⏳ ${playerName} is ready!<br><small>🎯 Choose your number quickly!</small>`;
        }
        
        if (allReady) {
            statusElement.innerHTML = '🚀 Both players ready! Starting game...<br><small>🔥 Let the battle begin!</small>';
        }
    }

    // Game screen UI with enhanced feedback
    static updateGameScreen(party) {
        const roundText = party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
        document.getElementById('gameRoundInfo').querySelector('.round-text').textContent = roundText;
        
        const players = party.players;
        const myPlayer = players.find(p => p.id === socketClient.gameState.playerId);
        const opponent = players.find(p => p.id !== socketClient.gameState.playerId);
        
        if (myPlayer && opponent) {
            // Update player names with enhanced display and match scores
            const myWins = myPlayer.wins || 0;
            const opponentWins = opponent.wins || 0;
            
            document.getElementById('myBattleName').innerHTML = `${myPlayer.name} <small>(You) - ${myWins} wins</small>`;
            document.getElementById('opponentBattleName').innerHTML = `${opponent.name} <small>(Opponent) - ${opponentWins} wins</small>`;
            
            // Update stats
            document.getElementById('myAttempts').textContent = myPlayer.attempts || 0;
            document.getElementById('myWins').textContent = myWins;
            document.getElementById('opponentAttempts').textContent = opponent.attempts || 0;
            document.getElementById('opponentWins').textContent = opponentWins;
            
            // Update targets with better display
            document.getElementById('myTarget').textContent = myPlayer.secretNumber || '???';
            document.getElementById('opponentTarget').innerHTML = '<span class="hidden-number">???</span>'; // Always hidden during game
        }
        
        // Setup guess input with enhanced UX and validation
        const guessInput = document.getElementById('guessInput');
        guessInput.min = party.gameSettings.rangeStart;
        guessInput.max = party.gameSettings.rangeEnd;
        guessInput.value = '';
        guessInput.placeholder = `Guess ${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd}`;
        guessInput.disabled = false;
        
        // Enable guess button
        const guessBtn = document.getElementById('makeGuessBtn');
        guessBtn.disabled = false;
        guessBtn.textContent = '🎯 Guess!';
        guessBtn.classList.remove('finished');
        
        // Update range display
        const guessRangeEl = document.getElementById('guessRange');
        if (guessRangeEl) {
            guessRangeEl.textContent = `(${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd})`;
        }
        
        // Add input validation for guess input
        this.setupGuessInputValidation(guessInput, party.gameSettings.rangeStart, party.gameSettings.rangeEnd);
        
        // Focus on input
        setTimeout(() => guessInput.focus(), 300);
        
        // Clear message and history
        document.getElementById('gameMessage').textContent = `🎯 Find your opponent's secret number between ${party.gameSettings.rangeStart} and ${party.gameSettings.rangeEnd}!`;
        document.getElementById('gameMessage').className = 'message info';
        this.clearGuessHistory();
    }

    static updateGameStats(myAttempts, opponentAttempts) {
        document.getElementById('myAttempts').textContent = myAttempts || 0;
        if (opponentAttempts !== null && opponentAttempts !== undefined) {
            document.getElementById('opponentAttempts').textContent = opponentAttempts;
        }
    }

    static showGameMessage(message, type) {
        const messageElement = document.getElementById('gameMessage');
        messageElement.innerHTML = message;
        messageElement.className = `message ${type}`;
        
        // Add animation for important messages
        if (type === 'success' || type === 'warning') {
            messageElement.style.animation = 'messageHighlight 0.5s ease';
            setTimeout(() => {
                messageElement.style.animation = '';
            }, 500);
        }
    }

    static addGuessToHistory(guess, feedback) {
        const historyContent = document.querySelector('#gameGuessHistory .history-content');
        
        // Remove placeholder if it exists
        const placeholder = historyContent.querySelector('.history-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        const guessItem = document.createElement('div');
        guessItem.className = 'guess-item';
        if (feedback.isCorrect) {
            guessItem.classList.add('correct-guess');
        }
        
        const guessNumber = document.createElement('div');
        guessNumber.className = 'guess-number';
        guessNumber.innerHTML = `
            <strong>#${feedback.attempts || document.querySelectorAll('.guess-item').length + 1}</strong> 
            <span class="guess-value">${guess}</span>
        `;
        
        const guessFeedback = document.createElement('div');
        guessFeedback.className = `guess-feedback ${feedback.closeness || 'far'}`;
        guessFeedback.textContent = this.getFeedbackText(feedback);
        
        guessItem.appendChild(guessNumber);
        guessItem.appendChild(guessFeedback);
        
        historyContent.appendChild(guessItem);
        
        // Scroll to bottom with smooth animation
        const historyContainer = document.getElementById('gameGuessHistory');
        historyContainer.scrollTo({
            top: historyContainer.scrollHeight,
            behavior: 'smooth'
        });
        
        // Highlight the new guess briefly
        setTimeout(() => {
            guessItem.classList.add('new-guess');
            setTimeout(() => {
                guessItem.classList.remove('new-guess');
            }, 1000);
        }, 100);
    }

    static getFeedbackText(feedback) {
        if (feedback.isCorrect) {
            return '🎯 Correct!';
        } else if (feedback.closeness === 'very_close') {
            return feedback.direction === 'high' ? '🔥⬇️ Very Close High' : '🔥⬆️ Very Close Low';
        } else if (feedback.closeness === 'close') {
            return feedback.direction === 'high' ? '🎯⬇️ Close High' : '🎯⬆️ Close Low';
        } else {
            return feedback.direction === 'high' ? '📈 Too High' : '📉 Too Low';
        }
    }

    static clearGuessHistory() {
        const historyContent = document.querySelector('#gameGuessHistory .history-content');
        historyContent.innerHTML = '<div class="history-placeholder">Your guess history will appear here...</div>';
    }

    // Enhanced results screen
    static updateResultsScreen(roundResult, isGameComplete, gameWinner, party, additionalData = {}) {
        const isWinner = roundResult.winner.id === socketClient.gameState.playerId;
        
        // Update header with enhanced animations
        const resultEmoji = document.getElementById('resultEmoji');
        resultEmoji.textContent = isWinner ? '🎉' : '😔';
        resultEmoji.style.animation = 'bounceIn 0.5s ease';
        
        let title;
        if (isGameComplete) {
            if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
                title = '🏆 Champion! You Won the Match!';
            } else if (gameWinner) {
                title = '🥈 Good Game! You Lost the Match';
            } else {
                title = '🤝 Amazing! It\'s a Tie!';
            }
        } else {
            title = isWinner ? '🎉 Round Victory!' : '😔 Round Lost - But Not Over!';
        }
        document.getElementById('resultTitle').textContent = title;
        
        // Update player results with enhanced display
        const players = party.players;
        const myPlayer = players.find(p => p.id === socketClient.gameState.playerId);
        const opponent = players.find(p => p.id !== socketClient.gameState.playerId);
        
        if (myPlayer && opponent) {
            document.getElementById('myResultName').innerHTML = `${myPlayer.name} <small>(You)</small>`;
            document.getElementById('opponentResultName').innerHTML = `${opponent.name} <small>(Opponent)</small>`;
            
            document.getElementById('myFinalAttempts').textContent = myPlayer.attempts;
            document.getElementById('opponentFinalAttempts').textContent = opponent.attempts;
            document.getElementById('myTotalWins').textContent = myPlayer.wins;
            document.getElementById('opponentTotalWins').textContent = opponent.wins;
            
            // Enhanced performance display
            this.updatePerformanceBadge('myPerformance', roundResult.winner.performance, isWinner);
            this.updatePerformanceBadge('opponentPerformance', null, !isWinner);
            
            // Highlight winner with animation
            const myCard = document.getElementById('myResultCard');
            const opponentCard = document.getElementById('opponentResultCard');
            
            myCard.classList.toggle('winner', isWinner);
            opponentCard.classList.toggle('winner', !isWinner);
            
            if (isWinner) {
                myCard.style.animation = 'winnerHighlight 1s ease';
            } else {
                opponentCard.style.animation = 'winnerHighlight 1s ease';
            }
        }
        
        // Enhanced final message
        let message;
        if (isGameComplete) {
            if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
                message = `🎊 Fantastic! You won ${myPlayer.wins} out of ${party.maxRounds} rounds! You're the champion!`;
            } else if (gameWinner) {
                message = `Good effort! Your opponent won ${opponent.wins} out of ${party.maxRounds} rounds. Great game though!`;
            } else {
                message = `Incredible! You both won ${myPlayer.wins} rounds each! What a match!`;
            }
        } else {
            message = isWinner ? 
                `🔥 Excellent! You found the number in ${myPlayer.attempts} attempts! Ready for the next round?` :
                `Your opponent found your number in ${opponent.attempts} attempts. Don't worry, you'll get them next round!`;
        }
        
        document.getElementById('finalResultMessage').textContent = message;
        document.getElementById('finalResultMessage').className = `message ${isWinner ? 'success' : 'info'}`;
        
        // Enhanced button display
        const nextRoundBtn = document.getElementById('nextRoundBtn');
        const rematchBtn = document.getElementById('rematchBtn');
        const leaveBtn = document.getElementById('leaveResultsBtn');
        
        if (isGameComplete) {
            nextRoundBtn.style.display = 'none';
            rematchBtn.textContent = '🔄 Play Again';
            rematchBtn.classList.add('pulse-animation');
        } else {
            nextRoundBtn.style.display = socketClient.gameState.isHost ? 'inline-block' : 'none';
            if (socketClient.gameState.isHost) {
                nextRoundBtn.classList.add('pulse-animation');
            }
            rematchBtn.textContent = '🔄 Restart Match';
        }
        
        leaveBtn.textContent = '🏠 Back to Menu';
    }

    static updatePerformanceBadge(elementId, performance, isWinner) {
        const badge = document.getElementById(elementId);
        if (!performance) {
            badge.textContent = isWinner ? '🏆 Winner!' : '🎯 Good Try!';
            badge.className = `performance-badge ${isWinner ? 'excellent' : 'fair'}`;
            return;
        }
        
        badge.textContent = `${performance.emoji} ${performance.rating.charAt(0).toUpperCase() + performance.rating.slice(1)}`;
        badge.className = `performance-badge ${performance.rating}`;
    }

    // Input clearing and resetting
    static clearInputs() {
        document.getElementById('playerName').value = '';
        document.getElementById('partyCodeInput').value = '';
        document.getElementById('joinPartyDiv').style.display = 'none';
        document.getElementById('joinPartyBtn').textContent = '🚀 Join Party';
        
        // Clear game mode selection
        document.getElementById('singlePlayerOptions').style.display = 'none';
        document.getElementById('multiplayerOptions').style.display = 'none';
        document.getElementById('singlePlayerBtn').classList.remove('active');
        document.getElementById('multiplayerBtn').classList.remove('active');
        
        // Remove any helper elements
        const helperDiv = document.getElementById('invitation-helper');
        if (helperDiv) {
            helperDiv.remove();
        }
    }

    static resetGameState() {
        this.hidePartyInfo();
        this.clearInputs();
        this.showScreen('welcomeScreen');
        
        // Remove any pulse animations
        document.querySelectorAll('.pulse-animation').forEach(el => {
            el.classList.remove('pulse-animation');
        });
    }

    // Animation helpers
    static animateElement(element, animationClass, duration = 1000) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }

    static highlightElement(elementId, duration = 2000) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.boxShadow = '0 0 20px rgba(79, 172, 254, 0.5)';
            element.style.transform = 'scale(1.02)';
            setTimeout(() => {
                element.style.boxShadow = '';
                element.style.transform = '';
            }, duration);
        }
    }

    // Button Loading States
    static setButtonLoading(button, text = 'Loading...') {
        if (!button) return;
        
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = text;
        button.classList.add('loading');
        button.disabled = true;
    }
    
    static setButtonSuccess(button, text = 'Success!', duration = 2000) {
        if (!button) return;
        
        const originalText = button.dataset.originalText || button.innerHTML;
        button.innerHTML = text;
        button.classList.remove('loading');
        button.classList.add('success');
        button.disabled = false;
        
        setTimeout(() => {
            this.resetButton(button, originalText);
        }, duration);
    }
    
    static setButtonError(button, text = 'Error!', duration = 2000) {
        if (!button) return;
        
        const originalText = button.dataset.originalText || button.innerHTML;
        button.innerHTML = text;
        button.classList.remove('loading');
        button.classList.add('error');
        button.disabled = false;
        
        setTimeout(() => {
            this.resetButton(button, originalText);
        }, duration);
    }
    
    static resetButton(button, text = null) {
        if (!button) return;
        
        const originalText = text || button.dataset.originalText;
        if (originalText) {
            button.innerHTML = originalText;
            delete button.dataset.originalText;
        }
        
        button.classList.remove('loading', 'success', 'error');
        button.disabled = false;
    }

    // Auto-join from URL parameter
    static checkAutoJoin() {
        const urlParams = new URLSearchParams(window.location.search);
        const joinCode = urlParams.get('join');
        
        if (joinCode) {
            // Auto-fill the party code
            document.getElementById('partyCodeInput').value = joinCode.toUpperCase();
            
            // Show join form
            document.getElementById('multiplayerBtn').click();
            document.getElementById('joinPartyBtn').click();
            
            // Focus on player name
            document.getElementById('playerName').focus();
            
            this.showNotification('Party code loaded from link! Enter your name to join.', 'info', 6000);
        }
    }

    // Input validation methods
    static setupSecretNumberValidation(input, rangeStart, rangeEnd) {
        // Remove any existing listeners
        input.removeEventListener('input', input._secretValidationHandler);
        input.removeEventListener('blur', input._secretBlurHandler);
        
        const validationHandler = (e) => {
            const value = parseInt(e.target.value);
            if (e.target.value && !isNaN(value)) {
                if (value < rangeStart) {
                    this.showNotification(`⚠️ Number too low! Choose between ${rangeStart} and ${rangeEnd}`, 'warning', 3000);
                    e.target.style.borderColor = '#ffc107';
                } else if (value > rangeEnd) {
                    this.showNotification(`⚠️ Number too high! Choose between ${rangeStart} and ${rangeEnd}`, 'warning', 3000);
                    e.target.style.borderColor = '#ffc107';
                } else {
                    e.target.style.borderColor = '';
                }
            }
        };

        const blurHandler = (e) => {
            const value = parseInt(e.target.value);
            if (e.target.value && (isNaN(value) || value < rangeStart || value > rangeEnd)) {
                this.showNotification(`🚫 Please enter a number between ${rangeStart} and ${rangeEnd}`, 'error', 4000);
                e.target.focus();
            }
        };

        input._secretValidationHandler = validationHandler;
        input._secretBlurHandler = blurHandler;
        input.addEventListener('input', validationHandler);
        input.addEventListener('blur', blurHandler);
    }

    static setupGuessInputValidation(input, rangeStart, rangeEnd) {
        // Remove any existing listeners
        input.removeEventListener('input', input._guessValidationHandler);
        
        const validationHandler = (e) => {
            const value = parseInt(e.target.value);
            if (e.target.value && !isNaN(value)) {
                if (value < rangeStart || value > rangeEnd) {
                    this.showInputError(e.target, `Guess must be between ${rangeStart} and ${rangeEnd}`);
                } else {
                    this.clearInputError(e.target);
                }
            }
        };

        input._guessValidationHandler = validationHandler;
        input.addEventListener('input', validationHandler);
    }

    // Enhanced notification system with queue management
    static displayNotification(message, type = 'info', duration = 4000, specialStyle = null) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        
        // Add special styling for competitive scenarios
        let className = `notification ${type}`;
        if (specialStyle) {
            className += ` ${specialStyle}`;
        }
        notification.className = className;
        
        // Add icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            competitive: '🔥',
            victory: '🏆',
            critical: '🚨'
        };
        
        const icon = icons[specialStyle] || icons[type] || icons.info;
        
        // Enhanced notification structure
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <div class="notification-message">${message}</div>
            <button class="notification-close" aria-label="Close notification">×</button>
        `;
        
        container.appendChild(notification);
        
        // Add click handlers
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.onclick = () => this.removeNotification(notification);
        
        // Auto remove with smart timing
        const autoRemoveDelay = type === 'critical' ? duration * 2 : duration;
        const timeoutId = setTimeout(() => {
            this.removeNotification(notification);
        }, autoRemoveDelay);
        
        // Store timeout ID for manual cancellation
        notification.dataset.timeoutId = timeoutId;
        
        // Pause auto-remove on hover
        notification.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
        });
        
        notification.addEventListener('mouseleave', () => {
            const newTimeoutId = setTimeout(() => {
                this.removeNotification(notification);
            }, 2000); // Shorter delay after hover
            notification.dataset.timeoutId = newTimeoutId;
        });
    }
    
    static removeNotification(notification) {
        if (!notification.parentNode) return;
        
        // Clear any pending timeout
        clearTimeout(notification.dataset.timeoutId);
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                // Process queue
                this.processNotificationQueue();
            }
        }, 300);
    }
    
    static processNotificationQueue() {
        if (this.notificationQueue.length > 0 && this.getActiveNotifications().length < this.maxNotifications) {
            const next = this.notificationQueue.shift();
            this.displayNotification(next.message, next.type, next.duration, next.specialStyle);
        }
    }
    
    static getActiveNotifications() {
        return document.querySelectorAll('.notification');
    }
    
    static clearAllNotifications() {
        const notifications = this.getActiveNotifications();
        notifications.forEach(notification => {
            this.removeNotification(notification);
        });
        this.notificationQueue = [];
    }

    // QR Code functionality
    static loadQRLibrary() {
        // Load QR code library if not already loaded
        if (window.QRCode) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    static generateQRCode(partyCode) {
        const url = `${window.location.origin}${window.location.pathname}?join=${partyCode}`;
        
        this.loadQRLibrary().then(() => {
            const canvas = document.createElement('canvas');
            window.QRCode.toCanvas(canvas, url, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#1a1a2e',
                    light: '#ffffff'
                }
            }, (error) => {
                if (error) {
                    console.error('QR Code generation failed:', error);
                    return;
                }
                
                this.showQRCodeModal(canvas, partyCode, url);
            });
        }).catch(() => {
            // Fallback to just showing the URL
            this.showNotification('QR code unavailable, but you can share this link: ' + url, 'info', 8000);
        });
    }
    
    static showQRCodeModal(canvas, partyCode, url) {
        // Remove existing QR modal
        const existingModal = document.querySelector('.qr-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'confirm-dialog qr-modal';
        modal.innerHTML = `
            <div class="confirm-overlay"></div>
            <div class="confirm-content qr-code-container">
                <h4>🎮 Share Party Code</h4>
                <div class="party-code-display">${partyCode}</div>
                <div class="qr-code"></div>
                <p class="qr-share-text">Scan this QR code or share the party code</p>
                <div class="confirm-buttons">
                    <button class="btn btn-primary" onclick="UI.copyToClipboard('${partyCode}')">📋 Copy Code</button>
                    <button class="btn btn-secondary" onclick="UI.copyToClipboard('${url}')">🔗 Copy Link</button>
                    <button class="btn btn-danger qr-close">Close</button>
                </div>
            </div>
        `;
        
        // Add the canvas
        modal.querySelector('.qr-code').appendChild(canvas);
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.qr-close').onclick = () => modal.remove();
        modal.querySelector('.confirm-overlay').onclick = () => modal.remove();
        
        // Focus the close button
        setTimeout(() => {
            modal.querySelector('.qr-close').focus();
        }, 100);
    }

    // Enhanced input validation
    static setupRealTimeValidation() {
        // Add real-time validation for all form inputs
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input')) {
                this.validateInput(e.target);
            }
        }, true);
        
        document.addEventListener('input', (e) => {
            if (e.target.matches('input')) {
                // Clear error state on input
                this.clearInputError(e.target);
            }
        }, true);
    }
    
    static validateInput(input) {
        const id = input.id;
        const value = input.value.trim();
        
        switch (id) {
            case 'playerName':
                return this.validatePlayerName(input);
            case 'partyCodeInput':
                return this.validatePartyCode(input);
            case 'secretNumber':
            case 'guessInput':
                return this.validateGameNumber(input);
            case 'rangeStart':
            case 'rangeEnd':
            case 'singleRangeStart':
            case 'singleRangeEnd':
                return this.validateRangeNumber(input);
            default:
                return true;
        }
    }
    
    static validatePlayerName(input) {
        const value = input.value.trim();
        
        if (!value) {
            this.showInputError(input, 'Name is required');
            return false;
        }
        
        if (value.length < 2) {
            this.showInputError(input, 'Name must be at least 2 characters');
            return false;
        }
        
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
            this.showInputError(input, 'Name can only contain letters, numbers, spaces, hyphens, and underscores');
            return false;
        }
        
        this.showInputSuccess(input, 'Name looks good!');
        return true;
    }
    
    static validatePartyCode(input) {
        const value = input.value.trim();
        
        if (!value) {
            this.clearInputState(input);
            return false;
        }
        
        if (value.length !== 6) {
            this.showInputError(input, 'Party code must be 6 characters');
            return false;
        }
        
        if (!/^[A-Z0-9]+$/.test(value)) {
            this.showInputError(input, 'Party code can only contain letters and numbers');
            return false;
        }
        
        this.showInputSuccess(input, 'Party code format is correct');
        return true;
    }
    
    static validateGameNumber(input) {
        const value = parseInt(input.value);
        const screen = input.closest('.screen');
        
        if (!value && input.value !== '0') {
            this.clearInputState(input);
            return false;
        }
        
        // Get current game range
        let min = 1, max = 100;
        if (screen) {
            const rangeDisplay = screen.querySelector('[id*="Range"]');
            if (rangeDisplay) {
                const rangeText = rangeDisplay.textContent;
                const matches = rangeText.match(/(\d+).*?(\d+)/);
                if (matches) {
                    min = parseInt(matches[1]);
                    max = parseInt(matches[2]);
                }
            }
        }
        
        if (value < min || value > max) {
            this.showInputError(input, `Number must be between ${min} and ${max}`);
            return false;
        }
        
        this.showInputSuccess(input, 'Number is in valid range');
        return true;
    }
    
    static validateRangeNumber(input) {
        const value = parseInt(input.value);
        
        if (!value && input.value !== '0') {
            this.clearInputState(input);
            return false;
        }
        
        const min = input.id.includes('Start') ? 1 : 2;
        const max = input.id.includes('Start') ? 9999 : 10000;
        
        if (value < min || value > max) {
            this.showInputError(input, `Must be between ${min} and ${max}`);
            return false;
        }
        
        this.clearInputState(input);
        return true;
    }
    
    static showInputError(input, message) {
        input.classList.add('error');
        input.classList.remove('success');
        this.updateInputHint(input, message, 'error');
    }
    
    static showInputSuccess(input, message) {
        input.classList.add('success');
        input.classList.remove('error');
        this.updateInputHint(input, message, 'success');
    }
    
    static clearInputError(input) {
        input.classList.remove('error');
        // Don't remove success state immediately
    }
    
    static clearInputState(input) {
        input.classList.remove('error', 'success');
        this.clearInputHint(input);
    }
    
    static updateInputHint(input, message, type) {
        let hint = input.parentElement.querySelector('.input-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'input-hint';
            input.parentElement.appendChild(hint);
        }
        
        hint.textContent = message;
        hint.className = `input-hint ${type}`;
    }
    
    static clearInputHint(input) {
        const hint = input.parentElement.querySelector('.input-hint');
        if (hint) {
            hint.remove();
        }
    }
}

// Enhanced CSS for new features (add to styles.css)
const additionalStyles = `
.confirm-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.confirm-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
}

.confirm-content {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 15px;
    padding: 30px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    position: relative;
    z-index: 1;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

/* Range Preset Styles */
.range-presets {
    margin: 20px 0;
    padding: 15px;
    background: rgba(79, 172, 254, 0.05);
    border-radius: 10px;
    border: 1px solid rgba(79, 172, 254, 0.2);
}

.range-presets h4 {
    color: #4facfe;
    margin-bottom: 10px;
    font-size: 0.95rem;
}

.preset-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.btn-preset {
    background: rgba(79, 172, 254, 0.1) !important;
    border: 1px solid rgba(79, 172, 254, 0.3) !important;
    color: #4facfe !important;
    font-size: 0.85rem !important;
    padding: 8px 12px !important;
    border-radius: 6px !important;
    transition: all 0.2s ease !important;
}

.btn-preset:hover {
    background: rgba(79, 172, 254, 0.2) !important;
    border-color: rgba(79, 172, 254, 0.5) !important;
    color: #66b3ff !important;
    transform: translateY(-1px);
}

.range-info {
    margin-top: 15px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    text-align: center;
}

.range-info small {
    color: #b8c5d6;
    font-size: 0.85rem;
}

#currentRangeDisplay {
    color: #4facfe;
    font-weight: 600;
}

#rangeSize {
    color: #51cf66;
    font-weight: 600;
}

/* Competitive Mode Styles */
.competitive-mode {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%);
    border: 2px solid rgba(255, 107, 107, 0.3);
    border-radius: 12px;
    animation: competitivePulse 2s infinite;
}

.finished-indicator {
    color: #51cf66;
    font-weight: bold;
    font-size: 0.9rem;
    background: rgba(81, 207, 102, 0.2);
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(81, 207, 102, 0.4);
}

/* Enhanced notification styles for different scenarios */
.notification.competitive {
    background: linear-gradient(135deg, rgba(255, 107, 107, 0.9) 0%, rgba(255, 154, 107, 0.9) 100%);
    border-left: 4px solid #ff6b6b;
    animation: urgentShake 0.5s ease-in-out;
}

.notification.victory {
    background: linear-gradient(135deg, rgba(81, 207, 102, 0.9) 0%, rgba(64, 192, 87, 0.9) 100%);
    border-left: 4px solid #51cf66;
    animation: victoryGlow 1s ease-in-out;
}

@keyframes competitivePulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(255, 107, 107, 0.1); }
    100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}

@keyframes urgentShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
}

@keyframes victoryGlow {
    0% { box-shadow: 0 0 5px rgba(81, 207, 102, 0.5); }
    50% { box-shadow: 0 0 20px rgba(81, 207, 102, 0.8); }
    100% { box-shadow: 0 0 5px rgba(81, 207, 102, 0.5); }
}

.confirm-title {
    color: #4facfe;
    margin-bottom: 15px;
    font-size: 1.3rem;
}

.confirm-message {
    color: #b8c5d6;
    margin-bottom: 25px;
    line-height: 1.6;
}

.confirm-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
}

.pulse-animation {
    animation: pulse 2s infinite;
}

.invitation-helper {
    margin: 20px 0;
    padding: 20px;
    background: rgba(79, 172, 254, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(79, 172, 254, 0.3);
    text-align: center;
}

.helper-content h4 {
    color: #4facfe;
    margin-bottom: 10px;
}

.share-options {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 15px 0;
}

.helper-tip {
    font-size: 0.9rem;
    color: #b8c5d6;
    font-style: italic;
}

.back-btn {
    z-index: 100;
    font-size: 0.9rem !important;
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.2) !important;
}

.notification {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notification-icon {
    font-size: 1.2rem;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    margin-left: auto;
    padding: 0;
    opacity: 0.7;
}

.notification-close:hover {
    opacity: 1;
}

.settings-section.disabled {
    opacity: 0.6;
    pointer-events: none;
}

.guess-item.new-guess {
    background: rgba(79, 172, 254, 0.2);
    transform: scale(1.02);
    transition: all 0.3s ease;
}

.guess-item.correct-guess {
    background: rgba(81, 207, 102, 0.2);
    border-left: 4px solid #51cf66;
}

.hidden-number {
    font-family: monospace;
    letter-spacing: 2px;
    font-weight: bold;
}

@keyframes messageHighlight {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

@keyframes bounceIn {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes winnerHighlight {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

@media (max-width: 768px) {
    .back-btn {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        margin: 0 0 20px 0;
        width: 100%;
    }
    
    .share-options {
        flex-direction: column;
        align-items: center;
    }
    
    .confirm-content {
        margin: 20px;
        padding: 20px;
    }
    
    .confirm-buttons {
        flex-direction: column;
    }
}
`;

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    
    // Add the additional styles
    const style = document.createElement('style');
    style.textContent = additionalStyles;
    document.head.appendChild(style);
    
    // Check for auto-join from URL
    UI.checkAutoJoin();
});