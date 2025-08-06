class UI {
    static init() {
        this.setupEventListeners();
        this.setupInputValidation();
        this.setupKeyboardShortcuts();
        this.showScreen('welcomeScreen');
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
            const playerName = document.getElementById('playerName').value.trim();
            if (!playerName) {
                this.showNotification('Please enter your name', 'error');
                return;
            }
            Game.createParty(playerName);
        });

        document.getElementById('joinPartyBtn').addEventListener('click', () => {
            document.getElementById('joinPartyDiv').style.display = 'block';
            document.getElementById('partyCodeInput').focus();
        });

        document.getElementById('joinPartySubmitBtn').addEventListener('click', () => {
            const playerName = document.getElementById('playerName').value.trim();
            const partyCode = document.getElementById('partyCodeInput').value.trim();
            
            if (!playerName || !partyCode) {
                this.showNotification('Please enter both name and party code', 'error');
                return;
            }
            
            Game.joinParty(partyCode, playerName);
        });

        // Lobby screen
        document.getElementById('copyCodeBtn').addEventListener('click', () => {
            const partyCode = document.getElementById('lobbyPartyCode').textContent;
            this.copyToClipboard(partyCode);
        });

        document.getElementById('startGameBtn').addEventListener('click', () => {
            Game.startGame();
        });

        document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
            Game.leaveParty();
        });

        // Settings change listeners
        document.getElementById('rangeStart').addEventListener('change', () => {
            Game.updateSettings();
        });

        document.getElementById('rangeEnd').addEventListener('change', () => {
            Game.updateSettings();
        });

        document.getElementById('bestOfThree').addEventListener('change', () => {
            Game.updateSettings();
        });

        // Selection screen
        document.getElementById('readyBtn').addEventListener('click', () => {
            const secretNumber = parseInt(document.getElementById('secretNumber').value);
            if (isNaN(secretNumber)) {
                this.showNotification('Please enter a valid number', 'error');
                return;
            }
            Game.setReady(secretNumber);
        });

        // Game screen
        document.getElementById('makeGuessBtn').addEventListener('click', () => {
            const guess = parseInt(document.getElementById('guessInput').value);
            if (isNaN(guess)) {
                this.showNotification('Please enter a valid number', 'error');
                return;
            }
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
            Game.leaveParty();
        });
    }

    static setupInputValidation() {
        // Auto-uppercase party code input
        document.getElementById('partyCodeInput').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Validate number inputs
        const numberInputs = ['rangeStart', 'rangeEnd', 'secretNumber', 'guessInput'];
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
                        } else {
                            document.getElementById('createPartyBtn').click();
                        }
                        break;
                    case 'selectionScreen':
                        if (!document.getElementById('readyBtn').disabled) {
                            document.getElementById('readyBtn').click();
                        }
                        break;
                    case 'gameScreen':
                        document.getElementById('makeGuessBtn').click();
                        break;
                }
            }

            // Escape key - go back or leave
            if (e.key === 'Escape') {
                const joinDiv = document.getElementById('joinPartyDiv');
                if (joinDiv.style.display === 'block') {
                    joinDiv.style.display = 'none';
                }
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
    }

    static focusFirstInput(screenId) {
        setTimeout(() => {
            const screen = document.getElementById(screenId);
            const firstInput = screen.querySelector('input:not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    // Connection status
    static updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.innerHTML = '🟢 Connected';
                break;
            case 'connecting':
                statusElement.innerHTML = '<span class="loading-spinner"></span> Connecting...';
                break;
            case 'disconnected':
                statusElement.innerHTML = '🔴 Disconnected';
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

    // Notifications
    static showNotification(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    container.removeChild(notification);
                }, 300);
            }
        }, duration);
        
        // Manual remove on click
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    container.removeChild(notification);
                }, 300);
            }
        });
    }

    // Utility functions
    static copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Party code copied to clipboard!', 'success');
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
            this.showNotification('Party code copied to clipboard!', 'success');
        } catch (err) {
            this.showNotification('Failed to copy. Please copy manually: ' + text, 'error');
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
        const player1Name = document.getElementById('player1Name');
        if (hostPlayer) {
            player1Name.innerHTML = `
                <span class="status-indicator ${hostPlayer.isConnected ? 'online' : 'offline'}"></span>
                ${hostPlayer.name}
            `;
        }

        // Update player 2 (guest)
        const player2Name = document.getElementById('player2Name');
        if (guestPlayer) {
            player2Name.innerHTML = `
                <span class="status-indicator ${guestPlayer.isConnected ? 'online' : 'offline'}"></span>
                ${guestPlayer.name}
            `;
            // Enable start button if host
            const startBtn = document.getElementById('startGameBtn');
            if (party.players.some(p => p.isHost && socketClient.gameState.playerId === p.id)) {
                startBtn.disabled = false;
                startBtn.textContent = '🚀 Start Game';
            }
        } else {
            player2Name.innerHTML = `
                <span class="status-indicator offline"></span>
                Waiting for player...
            `;
        }
    }

    static updateGameSettings(settings) {
        document.getElementById('rangeStart').value = settings.rangeStart;
        document.getElementById('rangeEnd').value = settings.rangeEnd;
        document.getElementById('bestOfThree').checked = settings.bestOfThree;
    }

    static disableSettings(disabled = true) {
        document.getElementById('rangeStart').disabled = disabled;
        document.getElementById('rangeEnd').disabled = disabled;
        document.getElementById('bestOfThree').disabled = disabled;
    }

    // Selection screen UI
    static updateSelectionScreen(party, timeLimit) {
        const roundText = party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
        document.getElementById('selectionRoundInfo').querySelector('.round-text').textContent = roundText;
        
        document.getElementById('selectionRangeDisplay').textContent = `${party.gameSettings.rangeStart} - ${party.gameSettings.rangeEnd}`;
        document.getElementById('secretNumber').min = party.gameSettings.rangeStart;
        document.getElementById('secretNumber').max = party.gameSettings.rangeEnd;
        document.getElementById('secretNumber').value = '';
        
        // Reset ready button
        document.getElementById('readyBtn').disabled = false;
        document.getElementById('readyStatus').textContent = '';
    }

    static updateSelectionTimer(timeLeft) {
        document.getElementById('selectionTimer').textContent = timeLeft;
        
        // Add urgency styling
        const timer = document.getElementById('selectionTimer');
        if (timeLeft <= 10) {
            timer.style.color = '#ff6b6b';
            timer.style.animation = 'pulse 0.5s infinite';
        } else {
            timer.style.color = '#ff6b6b';
            timer.style.animation = 'none';
        }
    }

    static updateReadyStatus(playerId, playerName, allReady) {
        const statusElement = document.getElementById('readyStatus');
        
        if (playerId === socketClient.gameState.playerId) {
            statusElement.textContent = '✅ You are ready! Waiting for opponent...';
            document.getElementById('readyBtn').disabled = true;
        } else {
            statusElement.textContent = `⏳ ${playerName} is ready!`;
        }
        
        if (allReady) {
            statusElement.textContent = '🚀 Both players ready! Starting game...';
        }
    }

    // Game screen UI
    static updateGameScreen(party) {
        const roundText = party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
        document.getElementById('gameRoundInfo').querySelector('.round-text').textContent = roundText;
        
        const players = party.players;
        const myPlayer = players.find(p => p.id === socketClient.gameState.playerId);
        const opponent = players.find(p => p.id !== socketClient.gameState.playerId);
        
        if (myPlayer && opponent) {
            // Update player names
            document.getElementById('myBattleName').textContent = myPlayer.name;
            document.getElementById('opponentBattleName').textContent = opponent.name;
            
            // Update stats
            document.getElementById('myAttempts').textContent = myPlayer.attempts;
            document.getElementById('myWins').textContent = myPlayer.wins;
            document.getElementById('opponentAttempts').textContent = opponent.attempts;
            document.getElementById('opponentWins').textContent = opponent.wins;
            
            // Update targets
            document.getElementById('myTarget').textContent = myPlayer.secretNumber || '???';
            document.getElementById('opponentTarget').textContent = '???'; // Always hidden during game
        }
        
        // Setup guess input
        const guessInput = document.getElementById('guessInput');
        guessInput.min = party.gameSettings.rangeStart;
        guessInput.max = party.gameSettings.rangeEnd;
        guessInput.value = '';
        guessInput.focus();
        
        // Clear message and history
        document.getElementById('gameMessage').textContent = '';
        this.clearGuessHistory();
    }

    static updateGameStats(myAttempts, opponentAttempts) {
        document.getElementById('myAttempts').textContent = myAttempts;
        document.getElementById('opponentAttempts').textContent = opponentAttempts;
    }

    static showGameMessage(message, type) {
        const messageElement = document.getElementById('gameMessage');
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
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
        
        const guessNumber = document.createElement('div');
        guessNumber.className = 'guess-number';
        guessNumber.textContent = `#${feedback.attempts || document.querySelectorAll('.guess-item').length + 1} - ${guess}`;
        
        const guessFeedback = document.createElement('div');
        guessFeedback.className = `guess-feedback ${feedback.closeness || 'far'}`;
        guessFeedback.textContent = this.getFeedbackText(feedback);
        
        guessItem.appendChild(guessNumber);
        guessItem.appendChild(guessFeedback);
        
        historyContent.appendChild(guessItem);
        
        // Scroll to bottom
        document.getElementById('gameGuessHistory').scrollTop = document.getElementById('gameGuessHistory').scrollHeight;
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

    // Results screen UI
    static updateResultsScreen(roundResult, isGameComplete, gameWinner, party) {
        const isWinner = roundResult.winner.id === socketClient.gameState.playerId;
        
        // Update header
        document.getElementById('resultEmoji').textContent = isWinner ? '🎉' : '😔';
        
        let title;
        if (isGameComplete) {
            if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
                title = '🏆 You Won the Match!';
            } else if (gameWinner) {
                title = '🥈 You Lost the Match';
            } else {
                title = '🤝 It\'s a Tie!';
            }
        } else {
            title = isWinner ? '🎉 You Won This Round!' : '😔 You Lost This Round';
        }
        document.getElementById('resultTitle').textContent = title;
        
        // Update player results
        const players = party.players;
        const myPlayer = players.find(p => p.id === socketClient.gameState.playerId);
        const opponent = players.find(p => p.id !== socketClient.gameState.playerId);
        
        if (myPlayer && opponent) {
            document.getElementById('myResultName').textContent = myPlayer.name;
            document.getElementById('opponentResultName').textContent = opponent.name;
            
            document.getElementById('myFinalAttempts').textContent = myPlayer.attempts;
            document.getElementById('opponentFinalAttempts').textContent = opponent.attempts;
            document.getElementById('myTotalWins').textContent = myPlayer.wins;
            document.getElementById('opponentTotalWins').textContent = opponent.wins;
            
            // Update performance badges
            this.updatePerformanceBadge('myPerformance', roundResult.winner.performance, isWinner);
            this.updatePerformanceBadge('opponentPerformance', null, !isWinner);
            
            // Highlight winner
            const myCard = document.getElementById('myResultCard');
            const opponentCard = document.getElementById('opponentResultCard');
            myCard.classList.toggle('winner', isWinner);
            opponentCard.classList.toggle('winner', !isWinner);
        }
        
        // Update final message
        let message;
        if (isGameComplete) {
            if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
                message = `Congratulations! You won ${myPlayer.wins} out of ${party.maxRounds} rounds!`;
            } else if (gameWinner) {
                message = `Good effort! Your opponent won ${opponent.wins} out of ${party.maxRounds} rounds.`;
            } else {
                message = `Amazing! You both won ${myPlayer.wins} rounds each!`;
            }
        } else {
            message = isWinner ? 
                `Great job! You found the number in ${myPlayer.attempts} attempts!` :
                `Your opponent found your number in ${opponent.attempts} attempts. Try again next round!`;
        }
        
        document.getElementById('finalResultMessage').textContent = message;
        document.getElementById('finalResultMessage').className = `message ${isWinner ? 'success' : 'info'}`;
        
        // Show/hide next round button
        const nextRoundBtn = document.getElementById('nextRoundBtn');
        if (isGameComplete) {
            nextRoundBtn.style.display = 'none';
        } else {
            nextRoundBtn.style.display = socketClient.gameState.isHost ? 'inline-block' : 'none';
        }
    }

    static updatePerformanceBadge(elementId, performance, isWinner) {
        const badge = document.getElementById(elementId);
        if (!performance) {
            badge.textContent = isWinner ? 'Winner!' : 'Good Try!';
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
    }

    static resetGameState() {
        this.hidePartyInfo();
        this.clearInputs();
        this.showScreen('welcomeScreen');
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
            setTimeout(() => {
                element.style.boxShadow = '';
            }, duration);
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});