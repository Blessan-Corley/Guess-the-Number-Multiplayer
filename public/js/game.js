class Game {
    static init() {
        this.currentState = {
            screen: 'welcome',
            party: null,
            player: null,
            gamePhase: null,
            isHost: false,
            gameMode: null, // 'single' or 'multiplayer'
            hasFinished: false // Track if current player has finished
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
        
        // Handle multiplayer guess - check if player has already finished
        if (this.currentState.hasFinished) {
            UI.showNotification('You have already found the number! Wait for your opponent.', 'warning');
            return;
        }
        
        if (!this.currentState.party) return;
        
        const { rangeStart, rangeEnd } = this.currentState.party.gameSettings;
        
        if (guess < rangeStart || guess > rangeEnd) {
            UI.showNotification(`Guess must be between ${rangeStart} and ${rangeEnd}`, 'error');
            return;
        }
        
        console.log('Making guess:', guess);
        socketClient.makeGuess(guess);
        
        // Clear input and add loading state
        document.getElementById('guessInput').value = '';
        const guessBtn = document.getElementById('makeGuessBtn');
        guessBtn.disabled = true;
        guessBtn.textContent = '🤔 Thinking...';
        
        // Re-enable after short delay
        setTimeout(() => {
            if (!this.currentState.hasFinished) {
                guessBtn.disabled = false;
                guessBtn.textContent = '🎯 Guess!';
            }
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
        
        // Reset finished state
        this.currentState.hasFinished = false;
        
        socketClient.leaveParty();
        
        // Clear URL parameters
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
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
        
        if (settings.rangeEnd - settings.rangeStart < 5) {
            UI.showNotification('Range must be at least 5 numbers', 'error');
            return;
        }
        
        if (settings.rangeEnd - settings.rangeStart > 10000) {
            UI.showNotification('Range cannot exceed 10000 numbers for performance', 'warning');
            return;
        }
        
        console.log('Updating settings:', settings);
        socketClient.updateSettings(settings);
        
        // Update range display
        this.updateRangeDisplay(settings.rangeStart, settings.rangeEnd);
    }

    static setRangePreset(start, end) {
        if (!socketClient.isHost()) {
            UI.showNotification('Only the host can change settings', 'error');
            return;
        }
        
        document.getElementById('rangeStart').value = start;
        document.getElementById('rangeEnd').value = end;
        
        // Update display immediately
        this.updateRangeDisplay(start, end);
        
        // Trigger settings update
        this.updateSettings();
    }

    static updateRangeDisplay(start, end) {
        const rangeSize = end - start + 1;
        document.getElementById('currentRangeDisplay').textContent = `${start} to ${end}`;
        document.getElementById('rangeSize').textContent = rangeSize;
        
        // Update difficulty indicator
        let difficultyText = '';
        if (rangeSize <= 10) difficultyText = ' - Very Easy';
        else if (rangeSize <= 50) difficultyText = ' - Easy';
        else if (rangeSize <= 100) difficultyText = ' - Medium';
        else if (rangeSize <= 500) difficultyText = ' - Hard';
        else difficultyText = ' - Expert';
        
        document.getElementById('rangeSize').textContent = rangeSize + difficultyText;
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
        
        // Enhanced validation
        if (isNaN(secretNumber) || !Number.isInteger(secretNumber)) {
            UI.showNotification('Please enter a valid whole number', 'error');
            return;
        }
        
        if (secretNumber < rangeStart || secretNumber > rangeEnd) {
            UI.showNotification(`⚠️ Secret number must be between ${rangeStart} and ${rangeEnd}`, 'error');
            document.getElementById('secretNumber').focus();
            return;
        }
        
        console.log('Setting ready with secret number:', secretNumber);
        
        // Show confirmation message
        UI.showNotification(`✅ Secret number ${secretNumber} selected! Waiting for opponent...`, 'success');
        
        // Disable input and button
        document.getElementById('secretNumber').disabled = true;
        document.getElementById('readyBtn').disabled = true;
        document.getElementById('readyBtn').textContent = '✅ Ready!';
        
        socketClient.setReady(secretNumber);
    }

    static nextRound() {
        if (!socketClient.isHost()) {
            UI.showNotification('Only the host can start the next round', 'error');
            return;
        }
        
        console.log('Starting next round...');
        
        // Reset finished state
        this.currentState.hasFinished = false;
        
        socketClient.nextRound();
    }

    static rematch() {
        console.log('Starting rematch...');
        
        // Reset finished state
        this.currentState.hasFinished = false;
        
        socketClient.rematch();
    }

    // Event Handlers
    static handlePartyCreated(data) {
        console.log('Party created successfully:', data);
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        this.currentState.isHost = true;
        
        // Reset button state
        const createBtn = document.getElementById('createPartyBtn');
        UI.setButtonSuccess(createBtn, '✓ Created!');
        
        UI.hideLoadingOverlay();
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        
        document.getElementById('lobbyPartyCode').textContent = data.party.code;
        
        UI.showNotification(`🎉 Party ${data.party.code} created! Share it with your friend.`, 'success');
        
        // Auto-copy party code to clipboard
        setTimeout(() => {
            UI.copyToClipboard(data.party.code);
        }, 1000);
    }

    static handlePartyJoined(data) {
        console.log('Joined party successfully:', data);
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        this.currentState.isHost = false;
        
        // Reset button state
        const joinBtn = document.getElementById('joinPartySubmitBtn');
        UI.setButtonSuccess(joinBtn, '✓ Joined!');
        
        UI.hideLoadingOverlay();
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        UI.disableSettings(true); // Non-host cannot change settings
        
        document.getElementById('lobbyPartyCode').textContent = data.party.code;
        document.getElementById('startGameBtn').style.display = 'none'; // Only host can start
        
        UI.showNotification(`🎉 Joined party ${data.party.code}! Wait for the host to start.`, 'success');
    }

    static handlePlayerJoined(data) {
        console.log('Player joined:', data);
        this.currentState.party = data.party;
        UI.updateLobbyPlayers(data.party);
        UI.showNotification(`${data.newPlayer.name} joined the party! 🎉`, 'success');
        
        // Remove invitation helper if it exists
        const helperDiv = document.getElementById('invitation-helper');
        if (helperDiv) {
            helperDiv.remove();
        }
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
            startBtn.classList.remove('pulse-animation');
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
        
        if (data.updatedBy !== socketClient.gameState.playerName) {
            UI.showNotification(`Settings updated by ${data.updatedBy}`, 'info');
        }
    }

    static handleGameStarted(data) {
        console.log('Game started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        this.currentState.hasFinished = false;
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification('Game started! Choose your secret number wisely! 🎯', 'success');
    }

    static handlePlayerReady(data) {
        console.log('Player ready:', data);
        UI.updateReadyStatus(data.playerId, data.playerName, data.allReady);
        
        if (data.playerId !== socketClient.gameState.playerId) {
            UI.showNotification(`${data.playerName} is ready! ⚡`, 'info');
        }
    }

    static handleSelectionTimer(data) {
        UI.updateSelectionTimer(data.timeLeft);
    }

    static handlePlayingStarted(data) {
        console.log('Playing phase started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'playing';
        this.currentState.hasFinished = false;
        
        UI.showScreen('gameScreen');
        UI.updateGameScreen(data.party);
        
        UI.showNotification('Battle begins! Find your opponent\'s number! 🔥', 'success');
    }

    static handleGuessResult(data) {
        console.log('Guess result:', data);
        
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
        
        // If correct, mark as finished and disable further guessing
        if (data.isCorrect) {
            this.currentState.hasFinished = true;
            
            UI.showGameMessage(`🎉 Excellent! You found the number in ${data.attempts} attempts! Now wait for your opponent...`, 'success');
            
            // Disable further guessing for this player
            const guessInput = document.getElementById('guessInput');
            const guessBtn = document.getElementById('makeGuessBtn');
            
            guessInput.disabled = true;
            guessInput.placeholder = 'You found it!';
            guessBtn.disabled = true;
            guessBtn.textContent = '✅ Finished!';
            guessBtn.classList.add('finished');
            
            // Show opponent's target number since you've found theirs
            document.getElementById('opponentTarget').innerHTML = `<span class="revealed-number">${data.guess}</span>`;
            
            // Play success sound if available
            this.playSound('success');
        } else {
            // Focus back to input for next guess
            setTimeout(() => {
                const guessInput = document.getElementById('guessInput');
                if (!guessInput.disabled) {
                    guessInput.focus();
                }
            }, 1000);
        }
    }

    static handlePlayerFinished(data) {
        console.log('Enhanced player finished:', data);
        
        // Show notification about who finished with context
        if (data.playerId === socketClient.gameState.playerId) {
            if (data.isFirstToFinish) {
                UI.showNotification(`🎯 Excellent! You found it first in ${data.attempts} attempts! Waiting for opponent to finish...`, 'success', 4000);
            } else {
                UI.showNotification(`✅ You found it in ${data.attempts} attempts! Let's see who wins...`, 'success', 4000);
            }
        } else {
            if (data.isFirstToFinish && !this.currentState.hasFinished) {
                UI.showNotification(`⚡ ${data.playerName} found it first in ${data.attempts} attempts! You need fewer attempts to win!`, 'warning', 5000);
            } else if (!this.currentState.hasFinished) {
                UI.showNotification(`${data.playerName} found it in ${data.attempts} attempts! Keep going!`, 'info', 4000);
            }
        }
        
        // Update opponent's attempts display
        if (data.playerId !== socketClient.gameState.playerId) {
            UI.updateGameStats(null, data.attempts);
        }
    }

    // Handle when opponent finishes first with competitive messaging
    static handleOpponentFinishedFirst(data) {
        console.log('Opponent finished first, can still win:', data);
        
        const { opponentName, opponentAttempts, yourAttempts, attemptsToWin } = data;
        
        // Show competitive message
        UI.showNotification(
            `${opponentName} found it in ${opponentAttempts} attempts! You have ${yourAttempts} attempts so far. Find it in ${attemptsToWin} or fewer to win!`, 
            'warning', 
            6000, 
            'competitive'
        );
        
        // Update game message with pressure
        UI.showGameMessage(
            `🏁 FINAL SPRINT! You need to find it in ${attemptsToWin} or fewer attempts to beat ${opponentName}!`, 
            'warning'
        );
        
        // Add visual urgency
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.classList.add('competitive-mode');
        
        // Update opponent card to show they finished
        document.getElementById('opponentTarget').innerHTML = `<span class="finished-indicator">✅ Found it!</span>`;
    }

    // Handle waiting for opponent after finishing first
    static handleWaitingForOpponent(data) {
        console.log('Waiting for opponent to finish:', data);
        
        UI.showNotification(data.message, 'success', 5000);
        
        // Disable further input
        const guessInput = document.getElementById('guessInput');
        const guessBtn = document.getElementById('makeGuessBtn');
        
        guessInput.disabled = true;
        guessInput.placeholder = '✅ You finished first!';
        guessBtn.disabled = true;
        guessBtn.textContent = '✅ Waiting...';
        guessBtn.classList.add('finished');
        
        // Update game message
        UI.showGameMessage(`🏆 You finished first! Waiting for your opponent to complete...`, 'success');
        
        // Show opponent's current attempts if available
        if (data.opponentAttempts) {
            setTimeout(() => {
                UI.showNotification(`Your opponent has ${data.opponentAttempts} attempts so far...`, 'info', 3000);
            }, 2000);
        }
    }

    static handleGameEndedByLeave(data) {
        console.log('Game ended by leave:', data);
        
        // Reset finished state
        this.currentState.hasFinished = false;
        
        // Show immediate win screen
        UI.showScreen('resultsScreen');
        
        // Update result display
        document.getElementById('resultEmoji').textContent = '🏆';
        document.getElementById('resultTitle').textContent = 'Victory by Default! 🏆';
        
        document.getElementById('myResultName').innerHTML = `${data.winner.name} <small>(You)</small>`;
        document.getElementById('opponentResultName').innerHTML = `${data.leftPlayer.name} <small>(Left)</small>`;
        
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
        
        UI.showNotification('Your opponent left the game. You win by default! 🏆', 'success');
    }

    static handleOpponentGuessed(data) {
        console.log('Opponent guessed:', data);
        
        // Update opponent's attempt count
        const opponentAttemptsElement = document.getElementById('opponentAttempts');
        if (opponentAttemptsElement) {
            opponentAttemptsElement.textContent = data.attempts;
        }
        
        // Show notification based on correctness
        if (data.isCorrect) {
            UI.showNotification(`💥 ${data.opponentName} found your number! The round is over.`, 'warning');
        } else {
            // Only show guess notifications occasionally to avoid spam
            if (data.attempts % 3 === 0) { // Every 3rd guess
                UI.showNotification(`${data.opponentName}: ${data.attempts} attempts so far...`, 'info', 2000);
            }
        }
    }

    static handleRoundEnded(data) {
        console.log('Round ended with detailed data:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'results';
        this.currentState.hasFinished = false;
        
        // Remove competitive mode styling
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.classList.remove('competitive-mode');
        
        UI.showScreen('resultsScreen');
        UI.updateResultsScreen(data.roundResult, data.isGameComplete, data.gameWinner, data.party, data.additionalData);
        
        // Show detailed win reason notification
        const isWinner = data.roundResult.winner.id === socketClient.gameState.playerId;
        const additionalData = data.additionalData || {};
        let message = '';
        
        if (isWinner) {
            if (additionalData.winReason === 'fewer_attempts') {
                message = `🏆 Victory! You won with ${additionalData.winnerAttempts} attempts vs ${additionalData.loserAttempts} attempts!`;
            } else if (additionalData.winReason === 'same_attempts_faster') {
                message = `🏆 Victory! Same attempts (${additionalData.winnerAttempts}), but you were faster!`;
            } else if (additionalData.winReason === 'exceeded_attempts') {
                message = `🏆 Victory! Your opponent exceeded your ${additionalData.winnerAttempts} attempts!`;
            } else {
                message = `🎉 Round victory! You won in ${data.roundResult.winner.attempts} attempts!`;
            }
            this.playSound('win');
        } else {
            if (additionalData.winReason === 'fewer_attempts') {
                message = `😔 Defeat! Opponent won with ${additionalData.winnerAttempts} vs your ${additionalData.loserAttempts} attempts.`;
            } else if (additionalData.winReason === 'same_attempts_faster') {
                message = `😔 So close! Same attempts (${additionalData.winnerAttempts}), but they were faster!`;
            } else if (additionalData.winReason === 'exceeded_attempts') {
                message = `😔 You exceeded their ${additionalData.winnerAttempts} attempts. Better luck next round!`;
            } else {
                message = `Round complete! Better luck next time! 💪`;
            }
            this.playSound('lose');
        }
        
        UI.showNotification(message, isWinner ? 'success' : 'warning', 6000, isWinner ? 'victory' : null);
        
        // Show additional context messages
        if (additionalData.earlyEnd) {
            setTimeout(() => {
                UI.showNotification(`⚡ Game ended early - no point continuing when victory is impossible!`, 'info', 4000);
            }, 2000);
        } else if (additionalData.bothFinished) {
            setTimeout(() => {
                UI.showNotification(`🎯 Both players found the number! Winner determined by performance.`, 'info', 4000);
            }, 2000);
        }
        
        // Show end game options after a delay
        setTimeout(() => {
            this.showEndGameOptions(data.isGameComplete);
        }, 3000);
    }

    static showEndGameOptions(isGameComplete) {
        // Add end game actions to results screen if not already present
        const resultsScreen = document.getElementById('resultsScreen');
        let endGameDiv = document.getElementById('endGameActions');
        
        if (!endGameDiv) {
            endGameDiv = document.createElement('div');
            endGameDiv.id = 'endGameActions';
            endGameDiv.className = 'end-game-actions';
            resultsScreen.appendChild(endGameDiv);
        }
        
        const hostControls = socketClient.gameState.isHost;
        
        endGameDiv.innerHTML = `
            <h4>🎮 What's Next?</h4>
            <div class="quick-actions">
                ${!isGameComplete && hostControls ? 
                    `<button class="btn btn-primary pulse-animation" onclick="Game.nextRound()">🚀 Next Round</button>` : 
                    ''
                }
                <button class="btn btn-success pulse-animation" onclick="Game.playAgain()">🎯 Play Again</button>
                <button class="btn btn-secondary" onclick="Game.newGame()">⚙️ New Settings</button>
                <button class="btn btn-danger" onclick="Game.leaveParty()">🏠 Main Menu</button>
            </div>
            ${!hostControls && !isGameComplete ? 
                '<p class="host-message"><small>⏳ Waiting for host to start next round...</small></p>' : 
                ''
            }
        `;
    }

    static playAgain() {
        console.log('Starting play again...');
        
        // Reset finished state
        this.currentState.hasFinished = false;
        
        // Clear any previous game state
        this.clearGameInputs();
        
        socketClient.rematch();
    }

    static clearGameInputs() {
        // Clear guess input
        const guessInput = document.getElementById('guessInput');
        if (guessInput) {
            guessInput.value = '';
            guessInput.disabled = false;
            guessInput.placeholder = 'Enter your guess...';
        }
        
        // Reset guess button
        const guessBtn = document.getElementById('makeGuessBtn');
        if (guessBtn) {
            guessBtn.disabled = false;
            guessBtn.textContent = '🎯 Guess!';
            guessBtn.classList.remove('finished');
        }
        
        // FIXED: Clear selection inputs properly for rematches
        const secretNumberInput = document.getElementById('secretNumber');
        if (secretNumberInput) {
            secretNumberInput.value = '';
            secretNumberInput.disabled = false;
        }
        
        // Reset ready button completely
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn) {
            readyBtn.disabled = false;
            readyBtn.textContent = '✅ Ready';
            readyBtn.classList.remove('btn-disabled', 'loading', 'success', 'error');
            readyBtn.style.opacity = '1';
        }
        
        // Clear ready status
        const readyStatus = document.getElementById('readyStatus');
        if (readyStatus) {
            readyStatus.textContent = '';
            readyStatus.innerHTML = '';
        }
    }

    static newGame() {
        // Return to lobby for new game with same players
        if (socketClient.isHost()) {
            UI.showNotification('Returning to lobby for new game setup...', 'info');
            this.currentState.hasFinished = false;
            UI.showScreen('lobbyScreen');
        } else {
            UI.showNotification('Only the host can start a new game', 'warning');
        }
    }

    static handleNextRoundStarted(data) {
        console.log('Next round started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        this.currentState.hasFinished = false;
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification(`Round ${data.party.currentRound} started! Choose wisely! 🎯`, 'success');
    }

    static handleRematchRequested(data) {
        console.log('Rematch requested:', data);
        
        if (data.playerId === socketClient.gameState.playerId) {
            // I requested the rematch
            UI.showNotification('🔄 Rematch requested! Waiting for opponent to agree...', 'info', 3000);
            this.updateRematchButtons('waiting');
        } else {
            // Opponent requested rematch
            UI.showNotification(`${data.requestedBy} wants a rematch! Click "Play Again" to agree.`, 'info', 5000);
            this.updateRematchButtons('requested');
        }
    }

    static handleRematchStarted(data) {
        console.log('Rematch started:', data);
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        this.currentState.hasFinished = false;
        
        // Clear any previous game state
        this.clearGameInputs();
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification('🎮 Both players agreed! New game starting! Good luck! 🍀', 'success');
    }

    static updateRematchButtons(state) {
        const endGameDiv = document.getElementById('endGameActions');
        if (!endGameDiv) return;
        
        const playAgainBtn = endGameDiv.querySelector('.btn-success');
        if (!playAgainBtn) return;
        
        switch (state) {
            case 'waiting':
                playAgainBtn.textContent = '⏳ Waiting for opponent...';
                playAgainBtn.disabled = true;
                playAgainBtn.classList.remove('pulse-animation');
                break;
            case 'requested':
                playAgainBtn.textContent = '✅ Accept Rematch';
                playAgainBtn.disabled = false;
                playAgainBtn.classList.add('pulse-animation');
                break;
            default:
                playAgainBtn.textContent = '🎯 Play Again';
                playAgainBtn.disabled = false;
                playAgainBtn.classList.add('pulse-animation');
        }
    }

    static handlePlayerTyping(data) {
        // Could show typing indicators here in the future
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
        
        UI.showNotification('Reconnected successfully! 🔄', 'success');
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
            gameMode: null,
            hasFinished: false
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

    // Sound system (optional, can be enhanced)
    static playSound(type) {
        // Simple sound system using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different sounds for different events
            switch (type) {
                case 'success':
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    break;
                case 'win':
                    // Play ascending notes
                    [523, 659, 784, 1047].forEach((freq, i) => {
                        const osc = audioContext.createOscillator();
                        const gain = audioContext.createGain();
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.value = freq;
                        gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.2);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.2 + 0.3);
                        osc.start(audioContext.currentTime + i * 0.2);
                        osc.stop(audioContext.currentTime + i * 0.2 + 0.3);
                    });
                    return; // Don't execute the rest for win sound
                case 'lose':
                    oscillator.frequency.value = 200;
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                    break;
                default:
                    oscillator.frequency.value = 440;
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            }
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not available:', error);
        }
    }

    // Debug Methods
    static debugInfo() {
        return {
            gameState: this.getGameState(),
            connectionStatus: socketClient.getConnectionStatus(),
            currentScreen: document.querySelector('.screen.active')?.id,
            hasFinished: this.currentState.hasFinished
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
    static handleError(error, context = 'Unknown', buttonId = null) {
        console.error(`Game error in ${context}:`, error);
        
        // Reset button state if provided
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                UI.setButtonError(button, 'Error!');
            }
        }
        
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
            
            // Quick actions with keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'c':
                        // Ctrl+C to copy party code if on lobby screen
                        const lobbyScreen = document.getElementById('lobbyScreen');
                        if (lobbyScreen.classList.contains('active')) {
                            const partyCode = document.getElementById('lobbyPartyCode').textContent;
                            if (partyCode) {
                                UI.copyToClipboard(partyCode);
                                e.preventDefault();
                            }
                        }
                        break;
                }
            }
        });
        
        // Add screen reader announcements
        this.announceScreenChanges();
    }

    static manageFocus() {
        // Ensure focus is properly managed when switching screens
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const firstInput = activeScreen.querySelector('input:not([disabled]), button:not([disabled])');
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
        this.gameStartTime = Date.now();
        this.trackUserAction('game_start', {
            isHost: this.currentState.isHost,
            partyCode: this.currentState.party?.code,
            gameMode: this.currentState.gameMode
        });
    }

    static recordGameEnd(result) {
        this.trackUserAction('game_end', {
            result,
            duration: Date.now() - (this.gameStartTime || Date.now()),
            rounds: this.currentState.party?.currentRound,
            gameMode: this.currentState.gameMode
        });
    }

    // Save/load preferences with enhanced options
    static savePreferences() {
        const preferences = {
            lastPlayerName: document.getElementById('playerName').value,
            preferredSettings: {
                rangeStart: document.getElementById('rangeStart')?.value || 1,
                rangeEnd: document.getElementById('rangeEnd')?.value || 100,
                bestOfThree: document.getElementById('bestOfThree')?.checked || false
            },
            lastGameMode: this.currentState.gameMode,
            soundEnabled: true, // Could be made configurable
            notifications: true
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
                
                // Restore last game mode
                if (preferences.lastGameMode === 'single') {
                    this.selectSinglePlayer();
                } else if (preferences.lastGameMode === 'multiplayer') {
                    this.selectMultiplayer();
                }
            }
        } catch (e) {
            console.warn('Could not load preferences:', e);
        }
    }

    // Enhanced game tips and tutorials
    static showGameTips() {
        const tips = [
            "💡 Use binary search strategy: start with the middle number!",
            "🎯 Pay attention to 'close' vs 'far' feedback!",
            "🧠 Remember your previous guesses to narrow down the range!",
            "⚡ The fewer attempts, the better your performance rating!",
            "🤝 In multiplayer, both players must find the number - it's not a race!",
            "🔥 Choose your secret number wisely - not too obvious!",
            "📊 Optimal attempts for range 1-100: about 7 guesses maximum!",
            "🎮 Best of 3 rounds makes for more competitive gameplay!"
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        UI.showNotification(randomTip, 'info', 8000);
    }

    // Connection quality monitoring
    static monitorConnection() {
        setInterval(() => {
            if (!socketClient.isConnected && this.currentState.gamePhase) {
                UI.showNotification('Connection unstable. Trying to reconnect...', 'warning');
            }
        }, 30000);
    }

    // Auto-save game state for recovery
    static saveGameState() {
        if (this.currentState.party) {
            try {
                const gameState = {
                    partyCode: this.currentState.party.code,
                    playerId: socketClient.gameState.playerId,
                    phase: this.currentState.gamePhase,
                    hasFinished: this.currentState.hasFinished,
                    timestamp: Date.now()
                };
                sessionStorage.setItem('gameStateBackup', JSON.stringify(gameState));
            } catch (e) {
                console.warn('Could not save game state:', e);
            }
        }
    }

    static restoreGameState() {
        try {
            const saved = sessionStorage.getItem('gameStateBackup');
            if (saved) {
                const gameState = JSON.parse(saved);
                
                // Only restore if it's recent (within 10 minutes)
                if (Date.now() - gameState.timestamp < 600000) {
                    UI.showNotification('Previous game session detected. Attempting to reconnect...', 'info');
                    socketClient.reconnectAttempt(gameState.partyCode, gameState.playerId);
                } else {
                    sessionStorage.removeItem('gameStateBackup');
                }
            }
        } catch (e) {
            console.warn('Could not restore game state:', e);
            sessionStorage.removeItem('gameStateBackup');
        }
    }

    // Performance optimizations
    static optimizePerformance() {
        // Debounce settings updates
        let settingsTimeout;
        const originalUpdateSettings = this.updateSettings;
        this.updateSettings = function() {
            clearTimeout(settingsTimeout);
            settingsTimeout = setTimeout(() => {
                originalUpdateSettings.call(this);
            }, 500);
        };
        
        // Throttle guess submissions
        let lastGuessTime = 0;
        const originalMakeGuess = this.makeGuess;
        this.makeGuess = function(guess) {
            const now = Date.now();
            if (now - lastGuessTime < 500) { // 500ms throttle
                return;
            }
            lastGuessTime = now;
            originalMakeGuess.call(this, guess);
        };
    }

    // Initialize all enhanced features
    static initializeEnhancements() {
        this.setupAccessibility();
        this.monitorConnection();
        this.optimizePerformance();
        
        // Auto-save game state periodically
        setInterval(() => {
            this.saveGameState();
        }, 30000);
        
        // Show tips occasionally during gameplay
        setInterval(() => {
            if (this.currentState.gamePhase === 'playing' && Math.random() < 0.3) {
                this.showGameTips();
            }
        }, 120000); // Every 2 minutes
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
    Game.initializeEnhancements();
    Game.loadPreferences();
    
    // Initialize range display
    Game.updateRangeDisplay(1, 100);
    
    // Try to restore previous game state
    setTimeout(() => {
        Game.restoreGameState();
    }, 1000);
});

// Save preferences when leaving page
window.addEventListener('beforeunload', () => {
    Game.savePreferences();
    Game.saveGameState();
});

// Handle page visibility changes (for mobile apps)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App went to background');
        Game.saveGameState();
    } else {
        console.log('App came to foreground');
        // Could trigger reconnection check here
        if (socketClient && !socketClient.isConnected) {
            UI.showNotification('Checking connection...', 'info');
            socketClient.socket.connect();
        }
    }
});

// Make Game globally available for debugging
window.Game = Game;