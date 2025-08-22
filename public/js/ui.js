class UI {
    static init() {
        // Developer Credits Banner
        console.log('┌────────────────────────────────────────────┐');
        console.log('│                                            │');
        console.log('│      Multiplayer Number Guesser Game      │');
        console.log('│                                            │');
        console.log('│    Designed & Developed by Blessan Corley  │');
        console.log('│                                            │');
        console.log('│  Technologies Used:                        │');
        console.log('│  • Node.js & Express.js                   │');
        console.log('│  • Socket.IO Real-time Communication      │');
        console.log('│  • Vanilla JavaScript ES6+                │');
        console.log('│  • CSS3 with Modern Features              │');
        console.log('│  • Progressive Web App (PWA)              │');
        console.log('│  • WebSocket Multiplayer Architecture     │');
        console.log('│                                            │');
        console.log('│  Features:                                 │');
        console.log('│  ⚡ Real-time Multiplayer Gaming          │');
        console.log('│  🎮 Cross-browser Compatibility           │');
        console.log('│  📱 Mobile-responsive Design              │');
        console.log('│  🔄 Auto-reconnection System              │');
        console.log('│  ⚙️  Dynamic Game Settings                │');
        console.log('│  🏆 Session-based Score Tracking          │');
        console.log('│                                            │');
        console.log('└────────────────────────────────────────────┘');
        
        this.setupEventListeners();
        this.setupInputValidation();
        this.setupKeyboardShortcuts();
        this.showScreen('welcomeScreen');
        this.setupNavigationConfirmation();
        this.setupEnhancedUI();
        this.notificationQueue = [];
        this.maxNotifications = 3;
        
        // Simple periodic check every 30 seconds
        setInterval(() => {
            this.simpleButtonCheck();
        }, 30000);
    }

    static setupEnhancedUI() {
        // Add enhanced UI class for progressive enhancement
        document.body.classList.add('enhanced-ui');
        
        // Setup real-time input validation
        this.setupRealTimeValidation();
        
        // QR code functionality removed for better performance
        
        // Setup How to Play modal
        this.setupHowToPlayModal();
    }
    
    static setupHowToPlayModal() {
        // Close modal events - check if elements exist
        const closeBtn = document.getElementById('closeHowToPlay');
        const gotItBtn = document.getElementById('gotItBtn');
        const modal = document.getElementById('howToPlayModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideHowToPlay();
            });
        }
        
        if (gotItBtn) {
            gotItBtn.addEventListener('click', () => {
                this.hideHowToPlay();
            });
        }
        
        if (modal) {
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideHowToPlay();
                }
            });
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                this.hideHowToPlay();
            }
        });
        
        // Handle browser navigation (back button) to close modal
        window.addEventListener('popstate', (e) => {
            if (modal && modal.style.display === 'flex') {
                // Don't call hideHowToPlay to avoid infinite loop
                modal.style.display = 'none';
                document.body.style.overflow = ''; // Restore scroll
            }
        });
    }

    static setupEventListeners() {
        // Remove the prevention - each tab needs its own listener
        // if (this._gameListenerAdded) return;
        // this._gameListenerAdded = true;
        
        // CLEAN BUTTON SYSTEM - Simple and reliable
        document.addEventListener('click', (e) => {
            // Ready button handler
            if (e.target.id === 'readyBtn') {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.target.disabled) return;
                
                const input = document.getElementById('secretNumber');
                if (!input || !input.value) {
                    this.showNotification('Please enter a secret number', 'error');
                    return;
                }
                const num = parseInt(input.value);
                if (isNaN(num)) {
                    this.showNotification('Please enter a valid number', 'error');
                    return;
                }
                
                // Simple button disable
                e.target.disabled = true;
                e.target.textContent = 'Setting...';
                
                // Auto-enable after 2 seconds regardless
                setTimeout(() => {
                    e.target.disabled = false;
                    e.target.textContent = '✅ Ready';
                }, 2000);
                
                Game.setReady(num);
                return;
            }
            
            // Guess button handler - COMPLETELY REWRITTEN
            if (e.target.id === 'makeGuessBtn') {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.target.disabled) return;
                
                const input = document.getElementById('guessInput');
                if (!input || !input.value) {
                    this.showNotification('Please enter a guess', 'error');
                    return;
                }
                const num = parseInt(input.value);
                if (isNaN(num)) {
                    this.showNotification('Please enter a valid number', 'error');
                    return;
                }
                
                // Clear input immediately
                input.value = '';
                
                // Simple button state change
                e.target.disabled = true;
                e.target.textContent = 'Guessing...';
                
                // GUARANTEED reset after 1.5 seconds
                setTimeout(() => {
                    e.target.disabled = false;
                    e.target.textContent = '🎯 Guess!';
                }, 1500);
                
                // Send the guess
                Game.makeGuess(num);
                return;
            }
        });
        
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
        
        // Single player How to Play button
        const howToPlaySingleBtn = document.getElementById('howToPlaySingleBtn');
        if (howToPlaySingleBtn) {
            howToPlaySingleBtn.addEventListener('click', () => {
                this.showHowToPlay('singleplayer');
            });
        }
        
        // Welcome screen How to Play link
        const welcomeHowToPlay = document.getElementById('welcomeHowToPlay');
        if (welcomeHowToPlay) {
            welcomeHowToPlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHowToPlay('general');
            });
        }

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
        
        // How to Play button (multiplayer lobby)
        const howToPlayBtn = document.getElementById('howToPlayBtn');
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', () => {
                this.showHowToPlay('multiplayer');
            });
        }

        // Enhanced range validation for multiplayer
        const rangeStartEl = document.getElementById('rangeStart');
        if (rangeStartEl) {
            rangeStartEl.addEventListener('change', (e) => {
                this.validateAndFixRange(e.target, 'start', 'rangeEnd', Game.updateSettings);
            });
        }

        const rangeEndEl = document.getElementById('rangeEnd');
        if (rangeEndEl) {
            rangeEndEl.addEventListener('change', (e) => {
                this.validateAndFixRange(e.target, 'end', 'rangeStart', Game.updateSettings);
            });
        }

        // Enhanced range validation for single player
        const singleRangeStartEl = document.getElementById('singleRangeStart');
        if (singleRangeStartEl) {
            singleRangeStartEl.addEventListener('change', (e) => {
                this.validateAndFixRange(e.target, 'start', 'singleRangeEnd');
            });
        }

        const singleRangeEndEl = document.getElementById('singleRangeEnd');
        if (singleRangeEndEl) {
            singleRangeEndEl.addEventListener('change', (e) => {
                this.validateAndFixRange(e.target, 'end', 'singleRangeStart');
            });
        }

        // bestOfThree removed - no longer needed
        const bestOfThreeEl = document.getElementById('bestOfThree');
        if (bestOfThreeEl) {
            bestOfThreeEl.addEventListener('change', () => {
                Game.updateSettings();
            });
        }

        // Add input validation for range inputs
        if (rangeStartEl) {
            rangeStartEl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (value < 1) e.target.value = 1;
                if (value > 9999) e.target.value = 9999;
            });
        }

        if (rangeEndEl) {
            rangeEndEl.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (value < 2) e.target.value = 2;
                if (value > 10000) e.target.value = 10000;
            });
        }



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
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
        }
        
        // Reset buttons when switching screens to prevent stuck states
        if (screenId === 'gameScreen') {
            setTimeout(() => {
                const guessBtn = document.getElementById('makeGuessBtn');
                if (guessBtn) {
                    guessBtn.disabled = false;
                    guessBtn.textContent = '🎯 Guess!';
                    guessBtn.classList.remove('finished', 'loading', 'btn-loading');
                    guessBtn.style.backgroundColor = '';
                    guessBtn.style.transform = '';
                }
            }, 100);
        }
        
        if (screenId === 'selectionScreen') {
            setTimeout(() => {
                const readyBtn = document.getElementById('readyBtn');
                if (readyBtn) {
                    readyBtn.disabled = false;
                    readyBtn.textContent = '✅ Ready';
                    readyBtn.classList.remove('finished', 'loading', 'btn-loading');
                    readyBtn.style.backgroundColor = '';
                    readyBtn.style.transform = '';
                }
            }, 100);
        }
        
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
        // Ensure queue and maxNotifications are initialized
        if (!this.notificationQueue) {
            this.notificationQueue = [];
        }
        if (!this.maxNotifications) {
            this.maxNotifications = 3;
        }
        
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
                        <!-- QR Code removed for better performance -->
                    </div>
                    <p class="helper-tip">💡 Tip: Share the party code with your friend to join the game!</p>
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
        // Update multiplayer input fields for all players in real-time
        const rangeStartEl = document.getElementById('rangeStart');
        const rangeEndEl = document.getElementById('rangeEnd');
        
        if (rangeStartEl && rangeEndEl) {
            rangeStartEl.value = settings.rangeStart;
            rangeEndEl.value = settings.rangeEnd;
            
            // Clear any error states since these are valid values from server
            this.clearInputState(rangeStartEl);
            this.clearInputState(rangeEndEl);
            
            // Show visual feedback that settings were synced (only for non-hosts)
            if (socketClient && !socketClient.gameState.isHost) {
                this.showInputSuccess(rangeStartEl, 'Synced');
                this.showInputSuccess(rangeEndEl, 'Synced');
                
                // Clear success feedback after 2 seconds
                setTimeout(() => {
                    this.clearInputState(rangeStartEl);
                    this.clearInputState(rangeEndEl);
                }, 2000);
            }
        }
        
        // Update single player settings too for consistency
        const singleStartEl = document.getElementById('singleRangeStart');
        const singleEndEl = document.getElementById('singleRangeEnd');
        
        if (singleStartEl && singleEndEl) {
            singleStartEl.value = settings.rangeStart;
            singleEndEl.value = settings.rangeEnd;
        }
        
        // Update range display through Game class
        if (typeof Game !== 'undefined' && Game.updateRangeDisplay) {
            Game.updateRangeDisplay(settings.rangeStart, settings.rangeEnd);
        }
        
    }

    static disableSettings(disabled = true) {
        document.getElementById('rangeStart').disabled = disabled;
        document.getElementById('rangeEnd').disabled = disabled;
        // bestOfThree removed
        
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
        
        // Safe DOM element access with null checks
        const selectionRoundInfo = document.getElementById('selectionRoundInfo');
        if (selectionRoundInfo) {
            const roundTextEl = selectionRoundInfo.querySelector('.round-text');
            if (roundTextEl) {
                roundTextEl.textContent = roundText;
            }
        }
        
        const rangeDisplay = `${party.gameSettings.rangeStart} - ${party.gameSettings.rangeEnd}`;
        const selectionRangeDisplay = document.getElementById('selectionRangeDisplay');
        if (selectionRangeDisplay) {
            selectionRangeDisplay.textContent = rangeDisplay;
        }
        
        const secretNumberInput = document.getElementById('secretNumber');
        if (secretNumberInput) {
            secretNumberInput.min = party.gameSettings.rangeStart;
            secretNumberInput.max = party.gameSettings.rangeEnd;
            secretNumberInput.value = '';
            secretNumberInput.disabled = false;
            secretNumberInput.placeholder = `Choose ${rangeDisplay}`;
        }
        
        // Update range hints with null checks
        const secretNumberRange = document.getElementById('secretNumberRange');
        if (secretNumberRange) {
            secretNumberRange.textContent = `(${rangeDisplay})`;
        }
        
        const secretNumberHint = document.getElementById('secretNumberHint');
        if (secretNumberHint) {
            secretNumberHint.innerHTML = `💡 Pick a good number!`;
        }
        
        // Add range hint
        const selectionMessage = document.getElementById('selectionMessage');
        if (selectionMessage) {
            selectionMessage.innerHTML = `
                <strong>🎯 Pick a number: ${rangeDisplay}</strong><br>
                <small>💡 Make it tricky!</small>
            `;
            selectionMessage.className = 'message info enhanced';
        }
        
        // FIXED: Ensure button is properly reset for all new games/rounds/rematches
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn) {
            readyBtn.disabled = false;
            readyBtn.textContent = '✅ Ready';
            readyBtn.classList.remove('btn-disabled', 'loading', 'success', 'error');
            readyBtn.style.opacity = '1';
            readyBtn.style.pointerEvents = 'auto';
            readyBtn.style.cursor = 'pointer';
            
            // Re-attach event listener if it was lost
            if (!readyBtn._eventListenerAttached) {
                
                // Ensure we have the bound function
                if (!this.handleReadyClick) {
                    this.handleReadyClick = (e) => {
                        const button = document.getElementById('readyBtn');
                        const secretNumberInput = document.getElementById('secretNumber');
                        
                        if (!button || !secretNumberInput) {
                            return;
                        }
                        
                        if (button.disabled) {
                            return;
                        }
                        
                        if (!this.validateInput(secretNumberInput)) {
                            this.showNotification('Please enter a valid secret number', 'error');
                            return;
                        }
                        
                        const secretNumber = parseInt(secretNumberInput.value);
                        this.setButtonLoading(button, 'Setting...');
                        Game.setReady(secretNumber);
                    };
                }
                
                readyBtn.addEventListener('click', this.handleReadyClick);
                readyBtn._eventListenerAttached = true;
            }
        }
        
        // Clear ready status completely
        const readyStatus = document.getElementById('readyStatus');
        if (readyStatus) {
            readyStatus.textContent = '';
            readyStatus.innerHTML = '';
        }
        
        // Clear any previous timeout/interval from button reset
        if (readyBtn && readyBtn._resetTimeout) {
            clearTimeout(readyBtn._resetTimeout);
            delete readyBtn._resetTimeout;
        }
        
        // Focus on input
        if (secretNumberInput) {
            setTimeout(() => secretNumberInput.focus(), 200);
        }
        
        // Add input validation with toast messages
        if (secretNumberInput) {
            this.setupSecretNumberValidation(secretNumberInput, party.gameSettings.rangeStart, party.gameSettings.rangeEnd);
        }
    }

    static updateSelectionTimer(timeLeft) {
        const selectionTimer = document.getElementById('selectionTimer');
        if (selectionTimer) {
            selectionTimer.textContent = timeLeft;
        }
        
        // Add urgency styling and sound
        if (selectionTimer) {
            if (timeLeft <= 10) {
                selectionTimer.style.color = '#ff6b6b';
                selectionTimer.style.animation = 'pulse 0.5s infinite';
                
                // Add urgent warning
                if (timeLeft === 10) {
                    this.showNotification('⚠️ 10 seconds left!', 'warning', 2000);
                } else if (timeLeft === 5) {
                    this.showNotification('⚠️ 5 seconds!', 'warning', 1000);
                }
            } else if (timeLeft <= 20) {
                selectionTimer.style.color = '#ffc107';
                selectionTimer.style.animation = 'none';
            } else {
                selectionTimer.style.color = '#4CAF50';
                selectionTimer.style.animation = 'none';
            }
        }
    }

    static updateReadyStatus(playerId, playerName, allReady) {
        const statusElement = document.getElementById('readyStatus');
        if (!statusElement) return;
        
        if (playerId === socketClient.gameState.playerId) {
            statusElement.innerHTML = '✅ Ready! Waiting for opponent...<br><small>🎮 Game starting soon!</small>';
            const readyBtn = document.getElementById('readyBtn');
            if (readyBtn) {
                readyBtn.disabled = true;
                readyBtn.textContent = '✅ Ready!';
            }
        } else {
            statusElement.innerHTML = `⏳ ${playerName} is ready!<br><small>🎯 Pick your number!</small>`;
        }
        
        if (allReady) {
            statusElement.innerHTML = '🚀 Both ready! Starting game...<br><small>🔥 Let\'s play!</small>';
        }
    }

    // Game screen UI with enhanced feedback
    static updateGameScreen(party) {
        const roundText = party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
        
        // Safe DOM access for game round info
        const gameRoundInfo = document.getElementById('gameRoundInfo');
        if (gameRoundInfo) {
            const roundTextEl = gameRoundInfo.querySelector('.round-text');
            if (roundTextEl) {
                roundTextEl.textContent = roundText;
            }
        }
        
        const players = party.players;
        const myPlayer = players.find(p => p.id === socketClient.gameState.playerId);
        const opponent = players.find(p => p.id !== socketClient.gameState.playerId);
        
        if (myPlayer && opponent) {
            // Update player names with enhanced display and match scores
            const myWins = myPlayer.wins || 0;
            const opponentWins = opponent.wins || 0;
            
            // Enhanced win display with session context - show X out of Y format
            const totalRoundsPlayed = myWins + opponentWins;
            const myWinDisplay = totalRoundsPlayed > 0 ? `${myWins} out of ${totalRoundsPlayed} won` : `${myWins} wins`;
            const opponentWinDisplay = totalRoundsPlayed > 0 ? `${opponentWins} out of ${totalRoundsPlayed} won` : `${opponentWins} wins`;
            
            // Safe DOM updates for player names
            const myBattleName = document.getElementById('myBattleName');
            if (myBattleName) {
                myBattleName.innerHTML = `${myPlayer.name} <small>(You) - Session: ${myWinDisplay}</small>`;
            }
            
            const opponentBattleName = document.getElementById('opponentBattleName');
            if (opponentBattleName) {
                opponentBattleName.innerHTML = `${opponent.name} <small>(Opponent) - Session: ${opponentWinDisplay}</small>`;
            }
            
            // Update stats with better real-time tracking
            const myAttempts = document.getElementById('myAttempts');
            if (myAttempts) {
                myAttempts.textContent = myPlayer.attempts || 0;
            }
            
            const myWinsEl = document.getElementById('myWins');
            if (myWinsEl) {
                myWinsEl.textContent = myWins;
            }
            
            const opponentAttempts = document.getElementById('opponentAttempts');
            if (opponentAttempts) {
                opponentAttempts.textContent = opponent.attempts || 0;
            }
            const opponentWinsEl = document.getElementById('opponentWins');
            if (opponentWinsEl) {
                opponentWinsEl.textContent = opponentWins;
            }
            
            // Add session performance indicator
            const winDifference = myWins - opponentWins;
            let performanceClass = 'neutral';
            let performanceText = 'Tied';
            
            if (winDifference > 0) {
                performanceClass = 'leading';
                performanceText = `+${winDifference} ahead`;
            } else if (winDifference < 0) {
                performanceClass = 'trailing';
                performanceText = `${Math.abs(winDifference)} behind`;
            }
            
            // Update battle cards with performance indicators
            const myCard = document.getElementById('myBattleCard');
            const opponentCard = document.getElementById('opponentBattleCard');
            
            if (myCard) {
                myCard.className = myCard.className.replace(/\b(leading|trailing|neutral)\b/g, '');
                myCard.classList.add(performanceClass);
                
                let statusIndicator = myCard.querySelector('.win-status') || document.createElement('div');
                statusIndicator.className = 'win-status';
                statusIndicator.textContent = performanceText;
                if (!myCard.contains(statusIndicator)) {
                    myCard.appendChild(statusIndicator);
                }
            }
            
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
        
        // Enable guess button and reset any stuck states
        const guessBtn = document.getElementById('makeGuessBtn');
        if (guessBtn) {
            guessBtn.disabled = false;
            guessBtn.textContent = '🎯 Guess!';
            guessBtn.classList.remove('finished', 'loading', 'btn-loading');
            guessBtn.style.backgroundColor = '';
            guessBtn.style.transform = '';
        }
        
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
        const gameMessage = document.getElementById('gameMessage');
        if (gameMessage) {
            gameMessage.textContent = `🎯 Guess the number: ${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd}`;
            gameMessage.className = 'message info';
        }
        this.clearGuessHistory();
    }

    static updateGameStats(myAttempts, opponentAttempts) {
        // Always update my attempts if provided
        if (myAttempts !== null && myAttempts !== undefined) {
            document.getElementById('myAttempts').textContent = myAttempts;
        }
        
        // Always update opponent attempts if provided - this fixes the real-time display issue
        if (opponentAttempts !== null && opponentAttempts !== undefined) {
            document.getElementById('opponentAttempts').textContent = opponentAttempts;
        }
        
        // Also update the battle card displays for better visibility
        const myCard = document.getElementById('myBattleCard');
        const opponentCard = document.getElementById('opponentBattleCard');
        
        if (myCard && myAttempts !== null && myAttempts !== undefined) {
            const attemptsDisplay = myCard.querySelector('.attempts-display') || myCard.querySelector('.attempts');
            if (attemptsDisplay) {
                attemptsDisplay.textContent = `${myAttempts} attempts`;
            }
        }
        
        if (opponentCard && opponentAttempts !== null && opponentAttempts !== undefined) {
            const attemptsDisplay = opponentCard.querySelector('.attempts-display') || opponentCard.querySelector('.attempts');
            if (attemptsDisplay) {
                attemptsDisplay.textContent = `${opponentAttempts} attempts`;
            }
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
            // Enhanced session win tracking display - show X out of Y format
            const totalRoundsPlayed = myPlayer.wins + opponent.wins;
            document.getElementById('myTotalWins').textContent = `${myPlayer.wins} out of ${totalRoundsPlayed} rounds won`;
            document.getElementById('opponentTotalWins').textContent = `${opponent.wins} out of ${totalRoundsPlayed} rounds won`;
            
            // Add session summary
            const totalRounds = myPlayer.wins + opponent.wins;
            let sessionSummary = `Session: ${totalRounds} rounds played`;
            if (totalRounds > 0) {
                const myWinRate = ((myPlayer.wins / totalRounds) * 100).toFixed(0);
                sessionSummary += ` | Your win rate: ${myWinRate}%`;
            }
            
            // Update or create session info display
            let sessionInfo = document.getElementById('sessionInfo');
            if (!sessionInfo) {
                sessionInfo = document.createElement('div');
                sessionInfo.id = 'sessionInfo';
                sessionInfo.className = 'session-info';
                const resultsScreen = document.getElementById('resultsScreen');
                const resultsHeader = resultsScreen.querySelector('h2');
                if (resultsHeader && resultsHeader.nextSibling) {
                    resultsScreen.insertBefore(sessionInfo, resultsHeader.nextSibling);
                }
            }
            sessionInfo.textContent = sessionSummary;
            
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
        const totalRoundsPlayed = myPlayer.wins + opponent.wins;
        
        if (isGameComplete) {
            if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
                message = `🎊 You won ${myPlayer.wins} out of ${totalRoundsPlayed} rounds! Champion!`;
            } else if (gameWinner) {
                message = `Good game! Your opponent won ${opponent.wins} out of ${totalRoundsPlayed} rounds.`;
            } else {
                message = `Incredible! You both won ${myPlayer.wins} rounds each!`;
            }
        } else {
            message = isWinner ? 
                `🔥 You found it in ${myPlayer.attempts} attempts! Nice!` :
                `Opponent found it in ${opponent.attempts} attempts. Next round!`;
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

    // Enhanced win badge system for session tracking
    static updateWinBadges(cardId, wins) {
        const card = document.getElementById(cardId);
        if (!card) return;
        
        // Remove existing badges
        const existingBadge = card.querySelector('.win-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add new badge if there are wins
        if (wins > 0) {
            const badge = document.createElement('div');
            badge.className = 'win-badge';
            badge.innerHTML = `<span class="win-count">${wins}</span><span class="win-label">wins</span>`;
            
            // Add streak indicator
            if (wins >= 3) {
                badge.classList.add('hot-streak');
                badge.title = 'On fire! 🔥';
            } else if (wins >= 2) {
                badge.classList.add('winning-streak');
                badge.title = 'Building momentum! 💪';
            }
            
            card.appendChild(badge);
        }
    }
    
    // How to Play Modal System
    static showHowToPlay(mode = 'multiplayer') {
        const modal = document.getElementById('howToPlayModal');
        const content = document.getElementById('howToPlayContent');
        
        if (!modal || !content) {
            return;
        }
        
        // Set content based on mode
        if (mode === 'multiplayer') {
            content.innerHTML = this.getMultiplayerGuide();
        } else if (mode === 'singleplayer') {
            content.innerHTML = this.getSinglePlayerGuide();
        } else {
            content.innerHTML = this.getGeneralGuide();
        }
        
        // Add history entry for proper back button handling
        if (history.pushState) {
            history.pushState({ modal: 'howToPlay' }, '', window.location.href);
        }
        
        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    static hideHowToPlay() {
        const modal = document.getElementById('howToPlayModal');
        if (modal && modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
        }
    }
    
    static getMultiplayerGuide() {
        return `
            <h3>🎯 Multiplayer Number Guessing</h3>
            <p>Challenge your friend in an exciting head-to-head number guessing battle!</p>
            
            <h4>🏠 Getting Started</h4>
            <ol>
                <li><strong>Create Party:</strong> Host creates a 6-digit party code</li>
                <li><strong>Join Party:</strong> Friend enters the party code to join</li>
                <li><strong>Adjust Settings:</strong> Host can change the number range (1-10000)</li>
                <li><strong>Start Game:</strong> When both players are ready!</li>
            </ol>
            
            <h4>🎲 How to Play</h4>
            <ol>
                <li><strong>Choose Secret:</strong> Each player picks a secret number (30 seconds)</li>
                <li><strong>Guess Battle:</strong> Take turns guessing each other's number</li>
                <li><strong>Get Hints:</strong> Receive smart feedback (too high/low, close/far)</li>
                <li><strong>First to Win:</strong> First player to find the opponent's number wins!</li>
            </ol>
            
            <h4>🏆 After Each Game</h4>
            <ul>
                <li><strong>Rematch:</strong> Play again with same settings</li>
                <li><strong>Change Settings:</strong> Adjust number range and start new game</li>
                <li><strong>Session Wins:</strong> Track your victories in this party!</li>
            </ul>
            
            <div class="tip">
                <strong>💡 Pro Tips:</strong>
                <ul>
                    <li>Choose tricky numbers (not too obvious like 50 or 100)</li>
                    <li>Use the feedback wisely - "close" means you're getting warm!</li>
                    <li>Larger ranges = more challenging and strategic gameplay</li>
                    <li>Host controls all settings and can kick off new games</li>
                </ul>
            </div>
        `;
    }
    
    static getSinglePlayerGuide() {
        return `
            <h3>🤖 Single Player vs AI Bot</h3>
            <p>Test your guessing skills against our smart AI opponents!</p>
            
            <h4>⚙️ Setup Your Game</h4>
            <ol>
                <li><strong>Choose Range:</strong> Set start and end numbers (1-10000)</li>
                <li><strong>Pick Difficulty:</strong> Easy, Medium, or Hard AI opponent</li>
                <li><strong>Start Playing:</strong> Jump right into the action!</li>
            </ol>
            
            <h4>🎲 Gameplay</h4>
            <ol>
                <li><strong>Secret Numbers:</strong> You and the AI each pick secret numbers</li>
                <li><strong>Taking Turns:</strong> Alternate guessing each other's numbers</li>
                <li><strong>Smart Feedback:</strong> Get helpful hints after each guess</li>
                <li><strong>First to Find:</strong> Winner is first to discover the secret number!</li>
            </ol>
            
            <h4>🏆 AI Difficulty Levels</h4>
            <ul>
                <li><strong>Easy:</strong> AI makes random guesses - good for beginners</li>
                <li><strong>Medium:</strong> AI uses basic strategy - balanced challenge</li>
                <li><strong>Hard:</strong> AI uses optimal strategy - prepare for a battle!</li>
            </ul>
            
            <div class="tip">
                <strong>💡 Strategy Tips:</strong>
                <ul>
                    <li>Start with numbers in the middle of your range</li>
                    <li>Use binary search approach: eliminate half the possibilities each guess</li>
                    <li>Pay attention to "very close" hints - you're almost there!</li>
                    <li>Practice on Easy mode, then challenge yourself with harder AIs</li>
                </ul>
            </div>
        `;
    }
    
    static getGeneralGuide() {
        return `
            <h3>🎯 Welcome to Number Guesser!</h3>
            <p>Choose your adventure - challenge friends or battle our AI!</p>
            
            <h4>👥 Multiplayer Mode</h4>
            <ul>
                <li><strong>Create Party:</strong> Generate a 6-digit code for friends to join</li>
                <li><strong>Join Party:</strong> Enter a friend's party code to play together</li>
                <li><strong>Head-to-Head:</strong> Both players pick secret numbers and guess each other's</li>
                <li><strong>Session Wins:</strong> Track victories throughout your gaming session</li>
            </ul>
            
            <h4>🤖 Single Player Mode</h4>
            <ul>
                <li><strong>Choose Difficulty:</strong> Easy, Medium, or Hard AI opponents</li>
                <li><strong>Custom Ranges:</strong> Set your preferred number range (1-10000)</li>
                <li><strong>Strategic Play:</strong> Use smart feedback to optimize your guessing</li>
                <li><strong>Perfect Practice:</strong> Hone your skills before challenging friends</li>
            </ul>
            
            <h4>🎮 Game Mechanics</h4>
            <ul>
                <li><strong>Secret Selection:</strong> Pick a number within the chosen range</li>
                <li><strong>Smart Feedback:</strong> Get hints like "too high", "close!", "very close!"</li>
                <li><strong>Win Condition:</strong> First to guess the opponent's number wins</li>
                <li><strong>Quick Rounds:</strong> Fast-paced gameplay keeps the excitement high</li>
            </ul>
            
            <div class="tip">
                <strong>💡 Quick Start Tips:</strong>
                <ul>
                    <li>New to number guessing? Start with <strong>Single Player Easy mode</strong></li>
                    <li>Want to challenge friends? Click <strong>Multiplayer → Create Party</strong></li>
                    <li>Each mode has detailed guides available when you need them</li>
                    <li>Have fun and may the best guesser win! 🏆</li>
                </ul>
            </div>
        `;
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
        
        // Clean up all timers and prevent memory leaks
        this.cleanup();
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
            // Clear any existing timeout first
            if (notification.dataset.timeoutId) {
                clearTimeout(notification.dataset.timeoutId);
            }
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
        // Ensure queue and maxNotifications are initialized
        if (!this.notificationQueue) {
            this.notificationQueue = [];
        }
        if (!this.maxNotifications) {
            this.maxNotifications = 3;
        }
        
        // Double-check queue exists and has length property
        if (this.notificationQueue && Array.isArray(this.notificationQueue) && this.notificationQueue.length > 0) {
            if (this.getActiveNotifications().length < this.maxNotifications) {
                const next = this.notificationQueue.shift();
                if (next) {
                    this.displayNotification(next.message, next.type, next.duration, next.specialStyle);
                }
            }
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

    // Cleanup method to clear all timers and prevent memory leaks
    static cleanup() {
        // Clear all notification timers
        this.clearAllNotifications();
        
        // Clear any ready button timeouts
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn && readyBtn._resetTimeout) {
            clearTimeout(readyBtn._resetTimeout);
            delete readyBtn._resetTimeout;
        }
        
        // Clear notification queue
        this.notificationQueue = [];
    }

    // QR Code functionality removed for better performance and reliability
    // Users can simply copy and share the party code

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
        
        if (!value && input.value !== '0') {
            this.clearInputState(input);
            return false;
        }
        
        // Get current game range from game state if available
        let min = 1, max = 100;
        
        if (typeof Game !== 'undefined' && Game.currentState && Game.currentState.party) {
            min = Game.currentState.party.gameSettings.rangeStart;
            max = Game.currentState.party.gameSettings.rangeEnd;
        } else {
            // Fallback: try to get from range inputs
            const rangeStartEl = document.getElementById('rangeStart');
            const rangeEndEl = document.getElementById('rangeEnd');
            if (rangeStartEl && rangeEndEl) {
                min = parseInt(rangeStartEl.value) || 1;
                max = parseInt(rangeEndEl.value) || 100;
            }
        }
        
        // Validation complete
        
        if (value < min || value > max) {
            this.showInputError(input, `Number must be between ${min} and ${max}`);
            return false;
        }
        
        this.clearInputState(input); // Clear any previous error state
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

    // Comprehensive range validation with edge case handling
    static validateAndFixRange(input, type, otherInputId, callback = null) {
        const value = parseInt(input.value);
        const otherInput = document.getElementById(otherInputId);
        
        if (!otherInput) {
            return;
        }
        
        const otherValue = parseInt(otherInput.value);
        
        // Edge case 1: Invalid numbers
        if (isNaN(value) || value < 1) {
            this.showNotification('Please enter a valid number (minimum 1)', 'error');
            input.value = type === 'start' ? 1 : 2;
            this.showInputError(input, 'Invalid number');
            return;
        }
        
        if (isNaN(otherValue) || otherValue < 1) {
            this.showNotification('Please set both start and end numbers', 'warning');
            return;
        }
        
        // Edge case 2: Numbers too large
        if (value > 10000) {
            this.showNotification('Maximum number is 10000', 'warning');
            input.value = 10000;
            this.showInputError(input, 'Too large');
            return;
        }
        
        // Edge case 3: Start >= End
        if (type === 'start' && value >= otherValue) {
            if (value === otherValue) {
                this.showNotification('Start and end cannot be the same!', 'error');
                input.value = Math.max(1, otherValue - 1);
            } else {
                this.showNotification('Start must be less than end', 'warning');
                input.value = Math.max(1, otherValue - 1);
            }
            this.showInputError(input, 'Invalid range');
            return;
        }
        
        // Edge case 4: End <= Start  
        if (type === 'end' && value <= otherValue) {
            if (value === otherValue) {
                this.showNotification('Start and end cannot be the same!', 'error');
                input.value = Math.min(10000, otherValue + 1);
            } else {
                this.showNotification('End must be greater than start', 'warning');
                input.value = Math.min(10000, otherValue + 1);
            }
            this.showInputError(input, 'Invalid range');
            return;
        }
        
        // Edge case 5: Range too small (less than 2 numbers)
        const rangeSize = type === 'start' ? otherValue - value + 1 : value - otherValue + 1;
        if (rangeSize < 2) {
            this.showNotification('Range must have at least 2 numbers', 'warning');
            if (type === 'start') {
                input.value = Math.max(1, otherValue - 1);
            } else {
                input.value = Math.min(10000, otherValue + 1);
            }
            this.showInputError(input, 'Range too small');
            return;
        }
        
        // Edge case 6: Range too large (more than 10000 numbers)
        if (rangeSize > 10000) {
            this.showNotification('Range too large! Maximum 10000 numbers', 'warning');
            if (type === 'start') {
                input.value = Math.max(1, otherValue - 9999);
            } else {
                input.value = Math.min(10000, otherValue + 9999);
            }
            this.showInputError(input, 'Range too large');
            return;
        }
        
        // All validation passed!
        this.clearInputState(input);
        this.clearInputState(otherInput);
        
        // Show success feedback
        const actualStart = type === 'start' ? value : otherValue;
        const actualEnd = type === 'start' ? otherValue : value;
        const actualSize = actualEnd - actualStart + 1;
        
        this.showNotification(`✅ Range: ${actualStart}-${actualEnd} (${actualSize} numbers)`, 'success', 2000);
        
        // Call callback if provided (for multiplayer settings update)
        if (callback && typeof callback === 'function') {
            callback();
        }
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
    
    // Ensure ready button is functional (debugging helper)
    static ensureReadyButtonFunctional() {
        const readyBtn = document.getElementById('readyBtn');
        if (!readyBtn) {
            return;
        }
        
        // Test if click event fires
        readyBtn.addEventListener('click', function testClick() {
            readyBtn.removeEventListener('click', testClick);
        }, { once: true });
        
        // Add visual feedback for debugging
        readyBtn.style.border = '2px solid lime';
        setTimeout(() => {
            readyBtn.style.border = '';
        }, 2000);
    }
    
    // Ensure guess button is functional (debugging helper)
    static ensureGuessButtonFunctional() {
        const guessBtn = document.getElementById('makeGuessBtn');
        if (!guessBtn) {
            return;
        }
        
        // Re-attach event listener if it was lost
        if (!guessBtn._eventListenerAttached) {
            
            // Ensure we have the bound function
            if (!this.handleGuessClick) {
                this.handleGuessClick = (e) => {
                    const button = document.getElementById('makeGuessBtn');
                    const guessInput = document.getElementById('guessInput');
                    
                    if (!button || !guessInput) {
                        return;
                    }
                    
                    if (button.disabled) {
                        return;
                    }
                    
                    if (!this.validateInput(guessInput)) {
                        this.showNotification('Please enter a valid guess', 'error');
                        return;
                    }
                    
                    const guess = parseInt(guessInput.value);
                    this.setButtonLoading(button, 'Guessing...');
                    
                    setTimeout(() => {
                        this.resetButton(button, '🎯 Guess!');
                    }, 1000);
                    
                    Game.makeGuess(guess);
                };
            }
            
            guessBtn.addEventListener('click', this.handleGuessClick);
            guessBtn._eventListenerAttached = true;
        }
        
        // Test if click event fires
        guessBtn.addEventListener('click', function testClick() {
            guessBtn.removeEventListener('click', testClick);
        }, { once: true });
        
        // Add visual feedback for debugging
        guessBtn.style.border = '2px solid orange';
        setTimeout(() => {
            guessBtn.style.border = '';
        }, 2000);
    }
    
    
    // Simple button check - just ensure they're not permanently stuck
    static simpleButtonCheck() {
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn && readyBtn.textContent === 'Setting...') {
            readyBtn.disabled = false;
            readyBtn.textContent = '✅ Ready';
        }
        
        const guessBtn = document.getElementById('makeGuessBtn');
        if (guessBtn && guessBtn.textContent === 'Guessing...') {
            guessBtn.disabled = false;
            guessBtn.textContent = '🎯 Guess!';
        }
    }
    
    // Comprehensive range pair validation used by Game.updateSettings
    static validateRangePair(startValue, endValue) {
        // Check for valid numbers
        if (isNaN(startValue) || isNaN(endValue)) {
            this.showNotification('Please enter valid numbers', 'error');
            return false;
        }
        
        // Check minimum values
        if (startValue < 1 || endValue < 1) {
            this.showNotification('Numbers must be at least 1', 'error');
            return false;
        }
        
        // Check maximum values
        if (startValue > 10000 || endValue > 10000) {
            this.showNotification('Maximum value is 10000', 'error');
            return false;
        }
        
        // Start must be less than end
        if (startValue >= endValue) {
            this.showNotification('Start must be less than end', 'error');
            return false;
        }
        
        // Minimum range size
        const rangeSize = endValue - startValue + 1;
        if (rangeSize < 2) {
            this.showNotification('Range must have at least 2 numbers', 'error');
            return false;
        }
        
        // Maximum range size
        if (rangeSize > 10000) {
            this.showNotification('Range too large (max 10000 numbers)', 'warning');
            return false;
        }
        
        return true;
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
    
    // Add global error handlers for better error recovery
    window.addEventListener('error', (event) => {
        if (typeof UI !== 'undefined') {
            UI.showNotification('An unexpected error occurred. Please try refreshing the page.', 'error', 8000);
        }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        if (typeof UI !== 'undefined') {
            UI.showNotification('A network error occurred. Please check your connection.', 'warning', 6000);
        }
    });
});