class Game {
    static init() {
        this.currentState = {
            screen: 'welcome',
            party: null,
            player: null,
            gamePhase: null,
            isHost: false,
            gameMode: null, 
            hasFinished: false 
        };
        
    }

    
    static selectSinglePlayer() {
        this.currentState.gameMode = 'single';
        document.getElementById('multiplayerOptions').style.display = 'none';
        document.getElementById('singlePlayerOptions').style.display = 'block';
        
        
        document.getElementById('singlePlayerBtn').classList.add('active');
        document.getElementById('multiplayerBtn').classList.remove('active');
    }

    static selectMultiplayer() {
        this.currentState.gameMode = 'multiplayer';
        document.getElementById('singlePlayerOptions').style.display = 'none';
        document.getElementById('multiplayerOptions').style.display = 'block';
        
        
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
            singlePlayerGame.makePlayerGuess(guess);
            return;
        }
        
        
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
        
        
        socketClient.makeGuess(guess);
    }

    
    static createParty(playerName) {
        if (!this.validatePlayerName(playerName)) return;
        
        socketClient.createParty(playerName);
    }

    static joinParty(partyCode, playerName) {
        if (!this.validatePlayerName(playerName)) return;
        if (!this.validatePartyCode(partyCode)) return;
        
        socketClient.joinParty(partyCode, playerName);
    }

    static leaveParty() {
        
        
        this.currentState.hasFinished = false;
        
        socketClient.leaveParty();
        
        
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    static updateSettings() {
        if (!socketClient.isHost()) return;
        
        const settings = {
            rangeStart: parseInt(document.getElementById('rangeStart').value),
            rangeEnd: parseInt(document.getElementById('rangeEnd').value)
            
        };
        
        
        if (!UI.validateRangePair(settings.rangeStart, settings.rangeEnd)) {
            return;
        }
        
        socketClient.updateSettings(settings);
        
        
        this.updateRangeDisplay(settings.rangeStart, settings.rangeEnd);
        
        
        const rangeText = `${settings.rangeStart}-${settings.rangeEnd}`;
        UI.showNotification(`⚙️ Range updated to ${rangeText}`, 'info');
    }

    static setRangePreset(start, end) {
        if (!socketClient.isHost()) {
            UI.showNotification('Only the host can change settings', 'error');
            return;
        }
        
        document.getElementById('rangeStart').value = start;
        document.getElementById('rangeEnd').value = end;
        
        
        this.updateRangeDisplay(start, end);
        
        
        this.updateSettings();
    }

    static updateRangeDisplay(start, end) {
        const rangeSize = end - start + 1;
        document.getElementById('currentRangeDisplay').textContent = `${start} to ${end}`;
        
        
        let difficultyText = '';
        let difficultyClass = '';
        
        if (rangeSize <= 10) {
            difficultyText = ' - Beginner 😊';
            difficultyClass = 'difficulty-beginner';
        } else if (rangeSize <= 50) {
            difficultyText = ' - Easy 🙂';
            difficultyClass = 'difficulty-easy';
        } else if (rangeSize <= 100) {
            difficultyText = ' - Medium 😐';
            difficultyClass = 'difficulty-medium';
        } else if (rangeSize <= 500) {
            difficultyText = ' - Hard 😤';
            difficultyClass = 'difficulty-hard';
        } else if (rangeSize <= 1000) {
            difficultyText = ' - Expert 😰';
            difficultyClass = 'difficulty-expert';
        } else if (rangeSize <= 5000) {
            difficultyText = ' - Insane 🤯';
            difficultyClass = 'difficulty-insane';
        } else {
            difficultyText = ' - Legendary 😱';
            difficultyClass = 'difficulty-legendary';
        }
        
        const rangeSizeElement = document.getElementById('rangeSize');
        rangeSizeElement.textContent = rangeSize + difficultyText;
        rangeSizeElement.className = `range-size ${difficultyClass}`;
        
        
        const optimalAttempts = Math.ceil(Math.log2(rangeSize));
        const rangeInfo = document.querySelector('.range-info small');
        if (rangeInfo) {
            rangeInfo.innerHTML = `💡 Current range: <span id="currentRangeDisplay">${start} to ${end}</span> (<span id="rangeSize" class="${difficultyClass}">${rangeSize}${difficultyText}</span>)<br><small>🎯 Optimal strategy: ~${optimalAttempts} attempts max</small>`;
        }
    }

    
    static startGame() {
        if (!socketClient.isHost()) {
            UI.showNotification('Only the host can start the game', 'error');
            return;
        }
        
        socketClient.startGame();
    }

    static setReady(secretNumber) {
        if (!this.currentState.party) {
            UI.showNotification('Game not properly initialized', 'error');
            return;
        }
        
        const { rangeStart, rangeEnd } = this.currentState.party.gameSettings;
        
        
        if (isNaN(secretNumber) || !Number.isInteger(secretNumber)) {
            UI.showNotification('Please enter a valid whole number', 'error');
            return;
        }
        
        if (secretNumber < rangeStart || secretNumber > rangeEnd) {
            UI.showNotification(`⚠️ Secret number must be between ${rangeStart} and ${rangeEnd}`, 'error');
            document.getElementById('secretNumber').focus();
            return;
        }
        
        
        
        UI.showNotification(`✅ Number ${secretNumber} chosen!`, 'success');
        
        
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
        
        
        
        this.currentState.hasFinished = false;
        
        socketClient.nextRound();
    }

    static rematch() {
        
        
        this.currentState.hasFinished = false;
        
        socketClient.rematch();
    }

    
    static handlePartyCreated(data) {
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        this.currentState.isHost = true;
        
        
        socketClient.gameState.isHost = true;
        socketClient.gameState.playerId = data.player.id;
        
        
        const createBtn = document.getElementById('createPartyBtn');
        UI.setButtonSuccess(createBtn, '✓ Created!');
        
        UI.hideLoadingOverlay();
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        
        document.getElementById('lobbyPartyCode').textContent = data.party.code;
        
        UI.showNotification(`🎉 Party ${data.party.code} created! Share it with your friend.`, 'success');
        
        
        setTimeout(() => {
            UI.copyToClipboard(data.party.code);
        }, 1000);
    }

    static handlePartyJoined(data) {
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        this.currentState.isHost = false;
        
        
        socketClient.gameState.isHost = false;
        socketClient.gameState.playerId = data.player.id;
        
        
        const joinBtn = document.getElementById('joinPartySubmitBtn');
        UI.setButtonSuccess(joinBtn, '✓ Joined!');
        
        UI.hideLoadingOverlay();
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        UI.disableSettings(true); 
        
        document.getElementById('lobbyPartyCode').textContent = data.party.code;
        document.getElementById('startGameBtn').style.display = 'none'; 
        
        UI.showNotification(`🎉 Joined party ${data.party.code}! Wait for the host to start.`, 'success');
    }

    static handlePlayerJoined(data) {
        this.currentState.party = data.party;
        UI.updateLobbyPlayers(data.party);
        UI.showNotification(`${data.newPlayer.name} joined the party! 🎉`, 'success');
        
        
        const helperDiv = document.getElementById('invitation-helper');
        if (helperDiv) {
            helperDiv.remove();
        }
    }

    static handlePlayerLeft(data) {
        this.currentState.party = data.party;
        UI.updateLobbyPlayers(data.party);
        UI.showNotification(`${data.leftPlayer.name} left the party`, 'warning');
        
        
        if (data.party.players.length < 2) {
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = true;
            startBtn.textContent = '⏳ Waiting for player...';
            startBtn.classList.remove('pulse-animation');
        }
    }

    static handlePartyLeft(data) {
        this.resetGameState();
        UI.showNotification('Left the party', 'info');
    }
    
    
    static handlePartyClosedHostLeft(data) {
        
        
        this.resetGameState();
        UI.showScreen('welcomeScreen');
        
        
        UI.showNotification(data.message || 'Party closed - host left', 'warning', 5000);
        
        
        setTimeout(() => {
            UI.showNotification('🏠 Returned to main menu. You can create or join a new party!', 'info', 4000);
        }, 2000);
    }

    static handleSettingsUpdated(data) {
        
        
        if (this.currentState.party) {
            this.currentState.party.gameSettings = data.settings;
        }
        
        
        UI.updateGameSettings(data.settings);
        
        
        this.updateRangeDisplay(data.settings.rangeStart, data.settings.rangeEnd);
        
        
        if (data.updatedBy !== socketClient.gameState.playerName) {
            const rangeText = `${data.settings.rangeStart}-${data.settings.rangeEnd}`;
            UI.showNotification(`⚙️ ${data.updatedBy} changed range to ${rangeText}`, 'info');
        }
    }

    static handleGameStarted(data) {
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        this.currentState.hasFinished = false;
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification('Game started! Choose your secret number wisely! 🎯', 'success');
    }

    static handlePlayerReady(data) {
        UI.updateReadyStatus(data.playerId, data.playerName, data.allReady);
        
        if (data.playerId !== socketClient.gameState.playerId) {
            UI.showNotification(`${data.playerName} is ready! ⚡`, 'info');
        }
    }

    static handleSelectionTimer(data) {
        UI.updateSelectionTimer(data.timeLeft);
    }

    static handlePlayingStarted(data) {
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'playing';
        this.currentState.hasFinished = false;
        
        UI.showScreen('gameScreen');
        UI.updateGameScreen(data.party);
        
        UI.showNotification('Battle begins! Find your opponent\'s number! 🔥', 'success');
    }

    static handleGuessResult(data) {
        
        UI.updateGameStats(data.attempts, null);
        
        
        UI.showGameMessage(data.feedback.message, data.feedback.type);
        
        
        UI.addGuessToHistory(data.guess, {
            attempts: data.attempts,
            isCorrect: data.isCorrect,
            closeness: data.feedback.closeness,
            direction: data.feedback.direction
        });
        
        
        if (data.isCorrect) {
            this.currentState.hasFinished = true;
            
            UI.showGameMessage(`🎉 Excellent! You found the number in ${data.attempts} attempts! Now wait for your opponent...`, 'success');
            
            
            const guessInput = document.getElementById('guessInput');
            const guessBtn = document.getElementById('makeGuessBtn');
            
            guessInput.disabled = true;
            guessInput.placeholder = 'You found it!';
            guessBtn.disabled = true;
            guessBtn.textContent = '✅ Finished!';
            guessBtn.classList.add('finished');
            
            
            document.getElementById('opponentTarget').innerHTML = `<span class="revealed-number">${data.guess}</span>`;
            
            
            this.playSound('success');
        } else {
            
            setTimeout(() => {
                const guessInput = document.getElementById('guessInput');
                if (!guessInput.disabled) {
                    guessInput.focus();
                }
            }, 1000);
        }
    }

    static handlePlayerFinished(data) {
        
        
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
        
        
        if (data.playerId !== socketClient.gameState.playerId) {
            UI.updateGameStats(null, data.attempts);
        }
    }

    
    static handleOpponentFinishedFirst(data) {
        
        const { opponentName, opponentAttempts, yourAttempts, attemptsToWin } = data;
        
        
        UI.showNotification(
            `${opponentName} found it in ${opponentAttempts} attempts! You have ${yourAttempts} attempts so far. Find it in ${attemptsToWin} or fewer to win!`, 
            'warning', 
            6000, 
            'competitive'
        );
        
        
        UI.showGameMessage(
            `🏁 FINAL SPRINT! You need to find it in ${attemptsToWin} or fewer attempts to beat ${opponentName}!`, 
            'warning'
        );
        
        
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.classList.add('competitive-mode');
        
        
        document.getElementById('opponentTarget').innerHTML = `<span class="finished-indicator">✅ Found it!</span>`;
    }

    
    static handleWaitingForOpponent(data) {
        
        UI.showNotification(data.message, 'success', 5000);
        
        
        const guessInput = document.getElementById('guessInput');
        const guessBtn = document.getElementById('makeGuessBtn');
        
        guessInput.disabled = true;
        guessInput.placeholder = '✅ You finished first!';
        guessBtn.disabled = true;
        guessBtn.textContent = '✅ Waiting...';
        guessBtn.classList.add('finished');
        
        
        UI.showGameMessage(`🏆 You finished first! Waiting for your opponent to complete...`, 'success');
        
        
        if (data.opponentAttempts) {
            setTimeout(() => {
                UI.showNotification(`Your opponent has ${data.opponentAttempts} attempts so far...`, 'info', 3000);
            }, 2000);
        }
    }

    static handleGameEndedByLeave(data) {
        
        
        this.currentState.hasFinished = false;
        
        
        UI.showScreen('resultsScreen');
        
        
        document.getElementById('resultEmoji').textContent = '🏆';
        document.getElementById('resultTitle').textContent = 'Victory by Default! 🏆';
        
        document.getElementById('myResultName').innerHTML = `${data.winner.name} <small>(You)</small>`;
        document.getElementById('opponentResultName').innerHTML = `${data.leftPlayer.name} <small>(Left)</small>`;
        
        document.getElementById('myFinalAttempts').textContent = data.winner.attempts || 0;
        document.getElementById('opponentFinalAttempts').textContent = '❌';
        document.getElementById('myTotalWins').textContent = (this.currentState.player?.wins || 0) + 1;
        document.getElementById('opponentTotalWins').textContent = 0;
        
        
        const myCard = document.getElementById('myResultCard');
        const opponentCard = document.getElementById('opponentResultCard');
        myCard.classList.add('winner');
        opponentCard.classList.remove('winner');
        
        document.getElementById('finalResultMessage').textContent = data.message;
        document.getElementById('finalResultMessage').className = 'message success';
        
        
        document.getElementById('nextRoundBtn').style.display = 'none';
        
        UI.showNotification('Your opponent left the game. You win by default! 🏆', 'success');
    }

    static handleOpponentGuessed(data) {
        
        
        UI.updateGameStats(null, data.attempts);
        
        
        if (data.isCorrect) {
            UI.showNotification(`💥 ${data.opponentName} found your number! The round is over.`, 'warning');
        } else {
            
            if (data.attempts % 2 === 0 || data.attempts <= 5) { 
                UI.showNotification(`${data.opponentName}: ${data.attempts} attempts so far...`, 'info', 2000);
            }
        }
    }

    static handleRoundEnded(data) {
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'results';
        this.currentState.hasFinished = false;
        
        
        const gameScreen = document.getElementById('gameScreen');
        gameScreen.classList.remove('competitive-mode');
        
        UI.showScreen('resultsScreen');
        UI.updateResultsScreen(data.roundResult, data.isGameComplete, data.gameWinner, data.party, data.additionalData);
        
        
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
        
        
        if (additionalData.earlyEnd) {
            setTimeout(() => {
                UI.showNotification(`⚡ Game ended early - no point continuing when victory is impossible!`, 'info', 4000);
            }, 2000);
        } else if (additionalData.bothFinished) {
            setTimeout(() => {
                UI.showNotification(`🎯 Both players found the number! Winner determined by performance.`, 'info', 4000);
            }, 2000);
        }
        
        
        setTimeout(() => {
            this.showEndGameOptions(data.isGameComplete);
        }, 3000);
    }

    static showEndGameOptions(isGameComplete) {
        
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
                <button class="btn btn-success pulse-animation" onclick="Game.requestRematch()">🔄 Rematch</button>
                <button class="btn btn-primary" onclick="Game.changeSettings()">⚙️ Change Settings</button>
                <button class="btn btn-danger" onclick="Game.confirmLeaveParty()">🏠 Main Menu</button>
            </div>
            <p class="action-help"><small>💡 <strong>Rematch:</strong> Direct to number selection with same range | <strong>Change Settings:</strong> Return to lobby to adjust range | <strong>Main Menu:</strong> Leave party</small></p>
        `;
    }

    
    static requestRematch() {
        
        
        UI.showNotification('🔄 Starting rematch...', 'info', 2000);
        
        
        this.currentState.hasFinished = false;
        
        
        this.clearGameInputs();
        
        socketClient.rematch();
    }
    
    
    static changeSettings() {
        
        
        UI.showLoadingOverlay('Returning to lobby...');
        UI.showNotification('⚙️ Back to lobby...', 'info', 2000);
        
        
        this.currentState.hasFinished = false;
        this.currentState.gamePhase = 'lobby';
        
        
        this.clearGameInputs();
        
        
        socketClient.socket.emit('request_settings_change');
    }
    
    
    static handleSettingsChangeStarted(data) {
        
        
        UI.hideLoadingOverlay();
        
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'lobby';
        
        
        UI.showScreen('lobbyScreen');
        UI.updatePartyInfo(data.party);
        UI.updateLobbyPlayers(data.party);
        UI.updateGameSettings(data.party.gameSettings);
        
        
        const myPlayer = data.party.players.find(p => p.id === socketClient.gameState.playerId);
        const isHost = myPlayer?.isHost || false;
        UI.disableSettings(!isHost);
        
        if (isHost) {
            UI.showNotification('⚙️ Change settings and start!', 'info', 3000);
        } else {
            UI.showNotification('⏳ Waiting for host...', 'info', 3000);
        }
    }
    
    
    static confirmLeaveParty() {
        const confirmed = confirm('🚔 Are you sure you want to leave this party and return to the main menu?\n\nYour session progress will be lost.');
        
        if (confirmed) {
            this.leaveParty();
        }
    }
    
    
    static playAgain() {
        this.requestRematch();
    }

    static clearGameInputs() {
        
        const guessInput = document.getElementById('guessInput');
        if (guessInput) {
            guessInput.value = '';
            guessInput.disabled = false;
            guessInput.placeholder = 'Enter your guess...';
        }
        
        
        const guessBtn = document.getElementById('makeGuessBtn');
        if (guessBtn) {
            guessBtn.disabled = false;
            guessBtn.textContent = '🎯 Guess!';
            guessBtn.classList.remove('finished');
        }
        
        
        const secretNumberInput = document.getElementById('secretNumber');
        if (secretNumberInput) {
            secretNumberInput.value = '';
            secretNumberInput.disabled = false;
            secretNumberInput.placeholder = 'Enter secret number...';
            secretNumberInput.style.borderColor = '';
            secretNumberInput.classList.remove('error', 'success');
        }
        
        
        
        
        
        const readyStatus = document.getElementById('readyStatus');
        if (readyStatus) {
            readyStatus.textContent = '';
            readyStatus.innerHTML = '';
        }
        
        
        UI.updateGameStats(0, 0);
        
        
        UI.clearGuessHistory();
        
        
        const gameMessage = document.getElementById('gameMessage');
        if (gameMessage) {
            gameMessage.textContent = '';
            gameMessage.className = 'message';
        }
        
        
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.classList.remove('competitive-mode');
        }
        
        
        this.currentState.hasFinished = false;
        this.currentState.gamePhase = null;
        
        
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => el.classList.remove('loading'));
    }

    static newGame() {
        
        if (socketClient.isHost()) {
            UI.showNotification('Returning to lobby for new game setup...', 'info');
            this.currentState.hasFinished = false;
            UI.showScreen('lobbyScreen');
        } else {
            UI.showNotification('Only the host can start a new game', 'warning');
        }
    }

    static handleNextRoundStarted(data) {
        this.currentState.party = data.party;
        this.currentState.gamePhase = 'selection';
        this.currentState.hasFinished = false;
        
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        UI.showNotification(`Round ${data.party.currentRound} started! Choose wisely! 🎯`, 'success');
    }

    static handleRematchRequested(data) {
        
        if (data.playerId === socketClient.gameState.playerId) {
            
            UI.showNotification('🔄 Rematch requested! Waiting for opponent to agree...', 'info', 3000);
            this.updateRematchButtons('waiting');
        } else {
            
            UI.showNotification(`${data.requestedBy} wants a rematch! Click "Play Again" to agree.`, 'info', 5000);
            this.updateRematchButtons('requested');
        }
    }

    static handleRematchStarted(data) {
        this.currentState.party = data.party;
        this.currentState.hasFinished = false;
        
        
        this.clearGameInputs();
        
        
        this.currentState.gamePhase = 'selection';
        UI.showScreen('selectionScreen');
        UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
        
        
        const range = `${data.party.gameSettings.rangeStart}-${data.party.gameSettings.rangeEnd}`;
        UI.showNotification(`🔄 Rematch! Range: ${range} - Choose your secret number! 🍀`, 'success');
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
        
    }

    static handleReconnected(data) {
        this.currentState.party = data.party;
        this.currentState.player = data.player;
        
        
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
                
                break;
            default:
                UI.showScreen('welcomeScreen');
        }
        
        UI.showNotification('Reconnected successfully! 🔄', 'success');
    }

    
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

    
    static playSound(type) {
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            
            switch (type) {
                case 'success':
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    break;
                case 'win':
                    
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
                    return; 
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
        }
    }

    
    static debugInfo() {
        return {
            gameState: this.getGameState(),
            connectionStatus: socketClient.getConnectionStatus(),
            currentScreen: document.querySelector('.screen.active')?.id,
            hasFinished: this.currentState.hasFinished
        };
    }

    static simulateNetworkError() {
        socketClient.socket.disconnect();
    }

    static simulateReconnection() {
        socketClient.socket.connect();
    }

    
    static trackUserAction(action, data = {}) {
        const event = {
            action,
            timestamp: Date.now(),
            gameState: this.currentState.screen,
            ...data
        };
        
        
        
        if (window.gtag) {
            window.gtag('event', action, {
                game_state: this.currentState.screen,
                ...data
            });
        }
    }

    
    static handleError(error, context = 'Unknown', buttonId = null) {
        
        
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                UI.setButtonError(button, 'Error!');
            }
        }
        
        let userMessage = 'An unexpected error occurred';
        
        
        if (error.message) {
            if (error.message.includes('network') || error.message.includes('connection')) {
                userMessage = 'Connection error. Please check your internet connection.';
            } else if (error.message.includes('party') || error.message.includes('Party')) {
                userMessage = error.message; 
            } else if (error.message.includes('validation') || error.message.includes('invalid')) {
                userMessage = 'Invalid input. Please check your entry and try again.';
            }
        }
        
        UI.showNotification(userMessage, 'error');
        
        
        this.trackUserAction('error', {
            error: error.message,
            context,
            stack: error.stack
        });
    }

    
    static setupAccessibility() {
        
        document.addEventListener('keydown', (e) => {
            
            if (e.key === 'Tab') {
                
                this.manageFocus();
            }
            
            
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'c':
                        
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
        
        
        this.announceScreenChanges();
    }

    static manageFocus() {
        
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const firstInput = activeScreen.querySelector('input:not([disabled]), button:not([disabled])');
            if (firstInput && document.activeElement === document.body) {
                firstInput.focus();
            }
        }
    }

    static announceScreenChanges() {
        
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.position = 'absolute';
        announcer.style.left = '-10000px';
        announcer.style.width = '1px';
        announcer.style.height = '1px';
        announcer.style.overflow = 'hidden';
        document.body.appendChild(announcer);
        
        
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
        
        
        document.querySelectorAll('.screen').forEach(screen => {
            observer.observe(screen, { attributes: true });
        });
    }

    
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

    
    static savePreferences() {
        const preferences = {
            lastPlayerName: document.getElementById('playerName').value,
            preferredSettings: {
                rangeStart: document.getElementById('rangeStart')?.value || 1,
                rangeEnd: document.getElementById('rangeEnd')?.value || 100,
                bestOfThree: document.getElementById('bestOfThree')?.checked || false
            },
            lastGameMode: this.currentState.gameMode,
            soundEnabled: true, 
            notifications: true
        };
        
        try {
            localStorage.setItem('numberGuesserPrefs', JSON.stringify(preferences));
        } catch (e) {
        }
    }

    static loadPreferences() {
        try {
            const saved = localStorage.getItem('numberGuesserPrefs');
            if (saved) {
                const preferences = JSON.parse(saved);
                
                
                if (preferences.lastPlayerName) {
                    document.getElementById('playerName').value = preferences.lastPlayerName;
                }
                
                
                if (preferences.preferredSettings && this.currentState.isHost) {
                    const rangeStartEl = document.getElementById('rangeStart');
                    const rangeEndEl = document.getElementById('rangeEnd');
                    const bestOfThreeEl = document.getElementById('bestOfThree');
                    
                    if (rangeStartEl) rangeStartEl.value = preferences.preferredSettings.rangeStart || 1;
                    if (rangeEndEl) rangeEndEl.value = preferences.preferredSettings.rangeEnd || 100;
                    if (bestOfThreeEl) bestOfThreeEl.checked = preferences.preferredSettings.bestOfThree || false;
                }
                
                
                if (preferences.lastGameMode === 'single') {
                    this.selectSinglePlayer();
                } else if (preferences.lastGameMode === 'multiplayer') {
                    this.selectMultiplayer();
                }
            }
        } catch (e) {
        }
    }

    
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

    
    static monitorConnection() {
        setInterval(() => {
            if (!socketClient.isConnected && this.currentState.gamePhase) {
                UI.showNotification('Connection unstable. Trying to reconnect...', 'warning');
            }
        }, 30000);
    }

    
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
            }
        }
    }

    static restoreGameState() {
        try {
            const saved = sessionStorage.getItem('gameStateBackup');
            if (saved) {
                const gameState = JSON.parse(saved);
                
                
                if (Date.now() - gameState.timestamp < 600000) {
                    UI.showNotification('Previous game session detected. Attempting to reconnect...', 'info');
                    
                    sessionStorage.removeItem('gameStateBackup');
                } else {
                    sessionStorage.removeItem('gameStateBackup');
                }
            }
        } catch (e) {
            sessionStorage.removeItem('gameStateBackup');
        }
    }

    
    static optimizePerformance() {
        
        let settingsTimeout;
        const originalUpdateSettings = this.updateSettings;
        this.updateSettings = function() {
            clearTimeout(settingsTimeout);
            settingsTimeout = setTimeout(() => {
                originalUpdateSettings.call(this);
            }, 500);
        };
        
        
        let lastGuessTime = 0;
        const originalMakeGuess = this.makeGuess;
        this.makeGuess = function(guess) {
            const now = Date.now();
            if (now - lastGuessTime < 500) { 
                return;
            }
            lastGuessTime = now;
            originalMakeGuess.call(this, guess);
        };
    }

    
    static initializeEnhancements() {
        this.setupAccessibility();
        this.monitorConnection();
        this.optimizePerformance();
        
        
        setInterval(() => {
            this.saveGameState();
        }, 30000);
        
        
        setInterval(() => {
            if (this.currentState.gamePhase === 'playing' && Math.random() < 0.3) {
                this.showGameTips();
            }
        }, 120000); 
    }
}


document.addEventListener('DOMContentLoaded', () => {
    Game.init();
    Game.initializeEnhancements();
    Game.loadPreferences();
    
    
    Game.updateRangeDisplay(1, 100);
    
    
    setTimeout(() => {
        Game.restoreGameState();
    }, 1000);
});


window.addEventListener('beforeunload', () => {
    Game.savePreferences();
    Game.saveGameState();
});


document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Game.saveGameState();
    } else {
        
        if (socketClient && !socketClient.isConnected) {
            if (typeof UI !== 'undefined') {
                UI.showNotification('Checking connection...', 'info');
            }
            socketClient.socket.connect();
        }
    }
});


window.Game = Game;