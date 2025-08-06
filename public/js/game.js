class Game {
    static init() {
        this.currentState = {
            screen: 'welcome',
            party: null,
            player: null,
            gamePhase: null,
            isHost: false,
            gameMode: null // 'single' or 'multiplayer'
        };
        
        console.log('🎮 Multiplayer Number Guesser initialized!');
    }

    // Game Mode Selection
    static selectSinglePlayer() {
        this.currentState.gameMode = 'single';
        document.getElementById('multiplayerOptions').style.display = 'none';
        document.getElementById('singlePlayerOptions').style.display = 'block';
        
        // Update button states
        document.getElementById('singlePlayerBtn').classList.add('active');
        document.getElementById('multiplayerBtn').classList.remove('active');
    }

    static selectMultiplayer() {
        this.currentState.gameMode = 'multiplayer';
        document.getElementById('singlePlayerOptions').style.display = 'none';
        document.getElementById('multiplayerOptions').style.display = 'block';
        
        // Update button states
        document.getElementById('multiplayerBtn').classList.add('active');
        document.getElementById('singlePlayerBtn').classList.remove('active');
    }

    static startSinglePlayer() {
        const playerName = document.getElementById('playerName').value.trim();
        const rangeStart = parseInt(document.getElementById('singleRangeStart').value);
        const rangeEnd = parseInt(document.getElementById('singleRangeEnd').value);
        const botDifficulty = document.getElementById('botDifficulty').value;
        
        if (!this.validatePlayerName(playerName)) return;
        if (!this.validateSinglePlayerRange(rangeStart, rangeEnd)) return;
        
        // Start single player game
        singlePlayerGame.startGame(playerName, rangeStart, rangeEnd, botDifficulty);
        this.trackUserAction('single_player_start', { botDifficulty, range: `${rangeStart}-${rangeEnd}` });
    }

    static validateSinglePlayerRange(start, end) {
        if (start >= end) {
            UI.showNotification('Start number must be less than end number', 'error');
            return false;
        }
        
        if (end - start < 5) {
            UI.showNotification('Range must be at least 5 numbers', 'error');
            return false;
        }
        
        if (end - start > 1000) {
            UI.showNotification('Range cannot exceed 1000 numbers', 'error');
            return false;
        }
        
        return true;
    }

    static makeGuess(guess) {
        if (this.currentState.gameMode === 'single') {
            // Handle single player guess
            singlePlayerGame.makePlayerGuess(guess);
            return;
        }
        
        // Handle multiplayer guess
        if (!this.currentState.party) return;
        
        const { rangeStart, rangeEnd } = this.currentState.party.gameSettings;
        
        if (guess < rangeStart || guess > rangeEnd) {
            UI.showNotification(`Guess must be between ${rangeStart} and ${rangeEnd}`, 'error');
            return;
        }
        
        console.log('Making guess:', guess);
        socketClient.makeGuess(guess);
        
        // Clear input and show loading state
        document.getElementById('guessInput').value = '';
        document.getElementById('makeGuessBtn').disabled = true;
        
        setTimeout(() => {
            document.getElementById('makeGuessBtn').disabled = false;
        }, 1000);
    }

    // Party Management
    static createParty(playerName) {
        if (!this.validatePlayerName(playerName)) return;
        
        console.log('Creating party for:', playerName);
        socketClient.createParty(playerName);
    }

    static joinParty(partyCode, playerName) {
        if (!this.validatePlayerName(playerName)) return;
        if (!this.validatePartyCode(partyCode)) return;
        
        console.log('Joining party:', partyCode, 'as:', playerName);
        socketClient.joinParty(partyCode, playerName);
    }

    static leaveParty() {
        console.log('Leaving party...');
        socketClient.leaveParty();
    }

    static updateSettings() {
        if (!socketClient.isHost()) return;
        
        const settings = {
            rangeStart: parseInt(document.getElementById('rangeStart').value),
            rangeEnd: parseInt(document.getElementById('rangeEnd').value),
            bestOfThree: document.getElementById('bestOfThree').checked
        };
        
        // Validate settings
        if (settings.rangeStart >= settings.rangeEnd) {
            UI.showNotification('Start number must be less than end number', 'error');
            return;
        }
        
        if (settings.rangeEnd - settings.rangeStart < 10) {
            UI.showNotification('Range must be at least 10 numbers', 'error');
            return;
        }
        
        console.log('Updating settings:', settings);
        socketClient.updateSettings(settings);
    }

    // Game Flow
    static startGame() {
        if (!socketClient.isHost()) {
            UI.showNotification('Only the host can start the game', 'error');
            return;
        }
        
        console.log('Starting game...');
        socketClient.startGame();
    }

    static setReady(secretNumber) {
        if (!this.currentState.party) return;
        
        const { rangeStart, rangeEnd } = this.currentState.party.gameSettings;
        
        if (secretNumber < rangeStart || secretNumber > rangeEnd) {
            UI.showNotification(`Secret number must be between ${rangeStart} and ${rangeEnd}`, 'error');
            return;
        }
        
        console.log('Setting ready with secret number:', secretNumber);
        socketClient.setReady(secretNumber);
    }

    static nextRound() {
        if (!socketClient.isHost()) {
            UI.showNotification('Only the host can start the next round', 'error');
            return;
        }
        
        console.log('Starting next round...');
        socketClient.nextRound();
    }

    static rematch() {
        console.log('Starting rematch...');
        socketClient.rematch();
    }

    // Event Handlers
    static handlePartyCreated(data) {
        console.log('Party created successfully:', data);
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        this.currentState.isHost = true;
        
        UI.hideLoadingOverlay();
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        
        document.getElementById('lobbyPartyCode').textContent = data.party.code;
        
        UI.showNotification(`Party ${data.party.code} created!`, 'success');
    }

    static handlePartyJoined(data) {
        console.log('Joined party successfully:', data);
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        this.currentState.isHost = false;
        
        UI.hideLoadingOverlay();
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        UI.disableSettings(true); // Non-host cannot change settings
        
        document.getElementById('lobbyPartyCode').textContent = data.party.code;
        document.getElementById('startGameBtn').style.display = 'none'; // Only host can start
        
        UI.showNotification(`Joined party ${data.party.code}!`, 'success');
    }

    static handlePlayerJoined(data) {
        console.log('Player joined:', data);
        this.currentState.party = data.party;
        UI.updateLobbyPlayers(data.party);
        UI.showNotification(`${data.newPlayer.name} joined the party!`, 'success');
    }

    static handlePlayerLeft(data) {
        console.log('Player left:', data);
        this.currentState.party = data.party;
        UI.updateLobbyPlayers(data.party);
        UI.showNotification(`${data.leftPlayer.name} left the party`, 'warning');
        
        // Disable start button if not enough players
        if (data.party.players.length < 2) {
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = true;
            startBtn.textContent = '⏳ Waiting for player...';
        }
    }

    static handlePartyLeft(data) {
        console.log('Left party:', data);
        this.resetGameState();
        UI.showNotification('Left the party', 'info');
    }

    static handleSettingsUpdated(data) {
        console.log('Settings updated:', data);
        UI.updateGameSettings(data.settings);
        UI.showNotification(`Settings updated by ${data.updatedBy}`, 'info');
    }

    static handleGameStarted(data) {
        console.log('Game started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification('Game started! Choose your secret number!', 'success');
    }

    static handlePlayerReady(data) {
        console.log('Player ready:', data);
        UI.updateReadyStatus(data.playerId, data.playerName, data.allReady);
        
        if (data.playerId !== socketClient.gameState.playerId) {
            UI.showNotification(`${data.playerName} is ready!`, 'info');
        }
    }

    static handleSelectionTimer(data) {
        UI.updateSelectionTimer(data.timeLeft);
        
        if (data.timeLeft <= 5 && data.timeLeft > 0) {
            UI.showNotification(`${data.timeLeft} seconds left!`, 'warning');
        }
    }

    static handlePlayingStarted(data) {
        console.log('Playing phase started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'playing';
        
        UI.showScreen('gameScreen');
        UI.updateGameScreen(data.party);
        
        UI.showNotification('Battle begins! Start guessing!', 'success');
    }

    static handleGuessResult(data) {
        console.log('guess result:', data);
        
        // Update attempts count
        UI.updateGameStats(data.attempts, null);
        
        // Show feedback message
        UI.showGameMessage(data.feedback.message, data.feedback.type);
        
        // Add to guess history
        UI.addGuessToHistory(data.guess, {
            attempts: data.attempts,
            isCorrect: data.isCorrect,
            closeness: data.feedback.closeness,
            direction: data.feedback.direction
        });
        
        // If correct, show finished message but continue game
        if (data.isCorrect) {
            UI.showGameMessage(`🎉 You found the number in ${data.attempts} attempts! Waiting for opponent...`, 'success');
            
            // Disable further guessing for this player
            document.getElementById('guessInput').disabled = true;
            document.getElementById('makeGuessBtn').disabled = true;
            document.getElementById('makeGuessBtn').textContent = '✅ Finished';
            
            // Show opponent's target number since you've found theirs
            document.getElementById('opponentTarget').textContent = data.guess;
        } else {
            // Focus back to input for next guess
            setTimeout(() => {
                document.getElementById('guessInput').focus();
            }, 1000);
        }
    }

    static handlePlayerFinished(data) {
        console.log('Player finished:', data);
        
        // Show notification about who finished
        if (data.playerId === socketClient.gameState.playerId) {
            UI.showNotification(`You finished in ${data.attempts} attempts! 🎯`, 'success');
        } else {
            UI.showNotification(`${data.playerName} finished in ${data.attempts} attempts! ⚡`, 'warning');
        }
        
        // Update the UI to show finished status
        const finishedMessage = `${data.playerName} found the number! (${data.attempts} attempts)`;
        
        // Update game message
        const currentMessage = document.getElementById('gameMessage').textContent;
        if (!currentMessage.includes('Waiting for opponent')) {
            UI.showGameMessage(finishedMessage, 'info');
        }
    }

    static handleGameEndedByLeave(data) {
        console.log('Game ended by leave:', data);
        
        // Show immediate win screen
        UI.showScreen('resultsScreen');
        
        // Update result display
        document.getElementById('resultEmoji').textContent = '🏆';
        document.getElementById('resultTitle').textContent = 'You Win by Default!';
        
        document.getElementById('myResultName').textContent = data.winner.name;
        document.getElementById('opponentResultName').textContent = data.leftPlayer.name + ' (Left)';
        
        document.getElementById('myFinalAttempts').textContent = data.winner.attempts || 0;
        document.getElementById('opponentFinalAttempts').textContent = '❌';
        document.getElementById('myTotalWins').textContent = (this.currentState.player?.wins || 0) + 1;
        document.getElementById('opponentTotalWins').textContent = 0;
        
        // Highlight winner
        const myCard = document.getElementById('myResultCard');
        const opponentCard = document.getElementById('opponentResultCard');
        myCard.classList.add('winner');
        opponentCard.classList.remove('winner');
        
        document.getElementById('finalResultMessage').textContent = data.message;
        document.getElementById('finalResultMessage').className = 'message success';
        
        // Hide next round button since game ended by leave
        document.getElementById('nextRoundBtn').style.display = 'none';
        
        UI.showNotification('Your opponent left the game. You win! 🏆', 'success');
    }

    static handleOpponentGuessed(data) {
        console.log('Opponent guessed:', data);
        
        // Update opponent's attempt count
        const opponentAttemptsElement = document.getElementById('opponentAttempts');
        if (opponentAttemptsElement) {
            opponentAttemptsElement.textContent = data.attempts;
        }
        
        // Show notification
        if (data.isCorrect) {
            UI.showNotification(`${data.opponentName} found your number!`, 'warning');
        } else {
            UI.showNotification(`${data.opponentName} made a guess (${data.attempts} attempts)`, 'info');
        }
    }

    static handleRoundEnded(data) {
        console.log('Round ended:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'results';
        
        UI.showScreen('resultsScreen');
        UI.updateResultsScreen(data.roundResult, data.isGameComplete, data.gameWinner, data.party);
        
        // Show appropriate notification
        const isWinner = data.roundResult.winner.id === socketClient.gameState.playerId;
        const message = isWinner ? 
            `🎉 You won the round in ${data.roundResult.winner.attempts} attempts!` :
            `Round complete! Better luck next time!`;
        
        UI.showNotification(message, isWinner ? 'success' : 'info');
        
        // Immediately show end game options
        this.showEndGameOptions(data.isGameComplete);
    }

    static showEndGameOptions(isGameComplete) {
        // Add end game actions to results screen
        const resultsScreen = document.getElementById('resultsScreen');
        let endGameDiv = document.getElementById('endGameActions');
        
        if (!endGameDiv) {
            endGameDiv = document.createElement('div');
            endGameDiv.id = 'endGameActions';
            endGameDiv.className = 'end-game-actions';
            resultsScreen.appendChild(endGameDiv);
        }
        
        endGameDiv.innerHTML = `
            <h4>🎮 What's Next?</h4>
            <div class="quick-actions">
                ${!isGameComplete ? `<button class="btn btn-primary" onclick="Game.nextRound()">🚀 Next Round</button>` : ''}
                <button class="btn btn-success" onclick="Game.rematch()">🔄 Rematch</button>
                <button class="btn btn-secondary" onclick="Game.newGame()">🎯 New Game</button>
                <button class="btn btn-danger" onclick="Game.leaveParty()">🏠 Main Menu</button>
            </div>
        `;
    }

    static newGame() {
        // Return to lobby for new game with same players
        if (socketClient.isHost()) {
            UI.showNotification('Starting new game...', 'info');
            this.resetGameState();
            UI.showScreen('lobbyScreen');
        } else {
            UI.showNotification('Only host can start a new game', 'error');
        }
    }

    static handleNextRoundStarted(data) {
        console.log('Next round started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification(`Round ${data.party.currentRound} started!`, 'success');
    }

    static handleRematchStarted(data) {
        console.log('Rematch started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification('Rematch started! Good luck!', 'success');
    }

    static handlePlayerTyping(data) {
        // Could show typing indicators here
        console.log('Player typing:', data);
    }

    static handleReconnected(data) {
        console.log('Reconnected to game:', data);
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        
        // Navigate to appropriate screen based on game phase
        const phase = data.party.phase;
        switch (phase) {
            case 'lobby':
                UI.showScreen('lobbyScreen');
                UI.updatePartyInfo(data.party);
                UI.updateLobbyPlayers(data.party);
                UI.updateGameSettings(data.party.gameSettings);
                break;
            case 'selection':
                UI.showScreen('selectionScreen');
                UI.updateSelectionScreen(data.party);
                break;
            case 'playing':
                UI.showScreen('gameScreen');
                UI.updateGameScreen(data.party);
                break;
            case 'results':
                UI.showScreen('resultsScreen');
                // Would need to reconstruct results screen state
                break;
            default:
                UI.showScreen('welcomeScreen');
        }
    }

    // Validation Methods
    static validatePlayerName(name) {
        if (!name || name.trim().length === 0) {
            UI.showNotification('Please enter your name', 'error');
            return false;
        }
        
        if (name.length > 20) {
            UI.showNotification('Name cannot exceed 20 characters', 'error');
            return false;
        }
        
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
            UI.showNotification('Name can only contain letters, numbers, spaces, hyphens, and underscores', 'error');
            return false;
        }
        
        return true;
    }

    static validatePartyCode(code) {
        if (!code || code.trim().length === 0) {
            UI.showNotification('Please enter a party code', 'error');
            return false;
        }
        
        if (code.length !== 6) {
            UI.showNotification('Party code must be 6 characters long', 'error');
            return false;
        }
        
        if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
            UI.showNotification('Party code can only contain letters and numbers', 'error');
            return false;
        }
        
        return true;
    }

    // Utility Methods
    static resetGameState() {
        this.currentState = {
            screen: 'welcome',
            party: null,
            player: null,
            gamePhase: null,
            isHost: false,
            gameMode: null
        };
        
        UI.resetGameState();
    }

    static returnToWelcome() {
        this.resetGameState();
        UI.showNotification('Returned to main menu', 'info');
    }

    static getGameState() {
        return {
            ...this.currentState,
            socketState: socketClient.getGameState()
        };
    }

    // Debug Methods
    static debugInfo() {
        return {
            gameState: this.getGameState(),
            connectionStatus: socketClient.getConnectionStatus(),
            currentScreen: document.querySelector('.screen.active')?.id
        };
    }

    static simulateNetworkError() {
        console.warn('Simulating network error...');
        socketClient.socket.disconnect();
    }

    static simulateReconnection() {
        console.log('Simulating reconnection...');
        socketClient.socket.connect();
    }

    // Performance tracking
    static trackUserAction(action, data = {}) {
        const event = {
            action,
            timestamp: Date.now(),
            gameState: this.currentState.screen,
            ...data
        };
        
        console.log('User action:', event);
        
        // Could send to analytics service here
        if (window.gtag) {
            window.gtag('event', action, {
                game_state: this.currentState.screen,
                ...data
            });
        }
    }

    // Error handling
    static handleError(error, context = 'Unknown') {
        console.error(`Game error in ${context}:`, error);
        
        let userMessage = 'An unexpected error occurred';
        
        // Provide user-friendly error messages
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('connection')) {
                userMessage = 'Connection error. Please check your internet connection.';
            } else if (error.message.includes('party') || error.message.includes('Party')) {
                userMessage = error.message; // Party-related errors are usually user-friendly
            } else if (error.message.includes('validation') || error.message.includes('invalid')) {
                userMessage = 'Invalid input. Please check your entry and try again.';
            }
        }
        
        UI.showNotification(userMessage, 'error');
        
        // Track errors for debugging
        this.trackUserAction('error', {
            error: error.message,
            context,
            stack: error.stack
        });
    }

    // Keyboard shortcuts and accessibility
    static setupAccessibility() {
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Tab navigation enhancements could go here
            if (e.key === 'Tab') {
                // Ensure proper focus management
                this.manageFocus();
            }
        });
        
        // Add screen reader announcements
        this.announceScreenChanges();
    }

    static manageFocus() {
        // Ensure focus is properly managed when switching screens
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const firstInput = activeScreen.querySelector('input, button');
            if (firstInput && document.activeElement === document.body) {
                firstInput.focus();
            }
        }
    }

    static announceScreenChanges() {
        // Create aria-live region for screen reader announcements
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.position = 'absolute';
        announcer.style.left = '-10000px';
        announcer.style.width = '1px';
        announcer.style.height = '1px';
        announcer.style.overflow = 'hidden';
        document.body.appendChild(announcer);
        
        // Announce screen changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('screen') && target.classList.contains('active')) {
                        const screenName = target.id.replace('Screen', ' screen');
                        announcer.textContent = `Navigated to ${screenName}`;
                    }
                }
            });
        });
        
        // Observe all screens
        document.querySelectorAll('.screen').forEach(screen => {
            observer.observe(screen, { attributes: true });
        });
    }

    // Game statistics and analytics
    static recordGameStart() {
        this.trackUserAction('game_start', {
            isHost: this.currentState.isHost,
            partyCode: this.currentState.party?.code
        });
    }

    static recordGameEnd(result) {
        this.trackUserAction('game_end', {
            result,
            duration: Date.now() - (this.gameStartTime || Date.now()),
            rounds: this.currentState.party?.currentRound
        });
    }

    // Save/load preferences
    static savePreferences() {
        const preferences = {
            lastPlayerName: document.getElementById('playerName').value,
            preferredSettings: {
                rangeStart: document.getElementById('rangeStart')?.value || 1,
                rangeEnd: document.getElementById('rangeEnd')?.value || 100,
                bestOfThree: document.getElementById('bestOfThree')?.checked || false
            }
        };
        
        try {
            localStorage.setItem('numberGuesserPrefs', JSON.stringify(preferences));
        } catch (e) {
            console.warn('Could not save preferences:', e);
        }
    }

    static loadPreferences() {
        try {
            const saved = localStorage.getItem('numberGuesserPrefs');
            if (saved) {
                const preferences = JSON.parse(saved);
                
                // Restore last player name
                if (preferences.lastPlayerName) {
                    document.getElementById('playerName').value = preferences.lastPlayerName;
                }
                
                // Restore preferred settings (only for host)
                if (preferences.preferredSettings && this.currentState.isHost) {
                    const rangeStartEl = document.getElementById('rangeStart');
                    const rangeEndEl = document.getElementById('rangeEnd');
                    const bestOfThreeEl = document.getElementById('bestOfThree');
                    
                    if (rangeStartEl) rangeStartEl.value = preferences.preferredSettings.rangeStart || 1;
                    if (rangeEndEl) rangeEndEl.value = preferences.preferredSettings.rangeEnd || 100;
                    if (bestOfThreeEl) bestOfThreeEl.checked = preferences.preferredSettings.bestOfThree || false;
                }
            }
        } catch (e) {
            console.warn('Could not load preferences:', e);
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
    Game.setupAccessibility();
    Game.loadPreferences();
});

// Save preferences when leaving page
window.addEventListener('beforeunload', () => {
    Game.savePreferences();
});

// Handle page visibility changes (for mobile apps)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App went to background');
    } else {
        console.log('App came to foreground');
        // Could trigger reconnection check here
    }
});

// Make Game globally available for debugging
window.Game = Game;