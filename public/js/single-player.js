class SinglePlayerGame {
    constructor() {
        this.gameState = {
            playerName: '',
            playerSecretNumber: null,
            botSecretNumber: null,
            playerAttempts: 0,
            botAttempts: 0,
            playerWins: 0,
            botWins: 0,
            rangeStart: 1,
            rangeEnd: 100,
            botDifficulty: 'medium',
            gamePhase: 'setup', 
            playerGuessHistory: [],
            botGuessHistory: [],
            botStrategy: {
                min: 1,
                max: 100,
                lastGuess: null,
                strategy: 'binary'
            }
        };
        
        this.botThinkingTime = {
            easy: 2000,
            medium: 1500,
            hard: 1000
        };
        
        this.gameMessages = {
            TOO_HIGH: [
                "🔥 Way too high! Come back down to earth!",
                "📈 That's stratosphere level! Think lower!",
                "🚀 Houston, we have a problem - too high!",
                "⬆️ Nope, bring it down several notches!",
                "🎈 Your guess is floating in the clouds!",
                "🏔️ That's mountain-top high!",
                "🎢 Whoa! Take it down a level!",
                "⛰️ You're reaching the summit! Come down!",
                "🛸 That's outer space territory! Descend!",
                "📡 Satellite level! Bring it way down!",
                "🎯 Aim lower, sharpshooter!",
                "🔻 Drop it like it's hot!"
            ],
            TOO_LOW: [
                "🕳️ That's underground territory!",
                "📉 You're mining too deep! Go higher!",
                "⬇️ Think way higher than that!",
                "🐠 You're swimming in the deep end!",
                "🏠 That's basement level thinking!",
                "🌊 You're below sea level!",
                "⛏️ Stop digging and climb up!",
                "🐙 Deep ocean vibes! Surface level please!",
                "🚇 You're in the subway! Go upstairs!",
                "🔺 Elevate your thinking!",
                "🎯 Aim higher, champion!",
                "🚁 Time to take off!"
            ],
            CLOSE_HIGH: [
                "🔥 Getting warm, but still too HIGH!",
                "🎯 Close! Just dial it down a bit!",
                "👀 So close! Nudge it down slightly!",
                "⚡ Hot! But still flying too HIGH!",
                "🎪 In the neighborhood, but aim LOWER!",
                "🔍 Burning hot! Come down just a bit!",
                "🌡️ Temperature rising! Cool it down!",
                "🏹 Good shot! Just adjust down!",
                "🎲 You're in the zone! Step down!",
                "🧭 Right direction! Just lower!",
                "🎨 Close call! Paint it lower!",
                "⚖️ Almost balanced! Tip it down!"
            ],
            CLOSE_LOW: [
                "🔥 Getting warm, but still too LOW!",
                "🎯 Close! Just bump it up a bit!",
                "👀 So close! Nudge it up slightly!",
                "⚡ Hot! But still diving too LOW!",
                "🎪 In the neighborhood, but aim HIGHER!",
                "🔍 Burning hot! Climb up just a bit!",
                "🌡️ Temperature rising! Heat it up!",
                "🏹 Good shot! Just adjust up!",
                "🎲 You're in the zone! Step up!",
                "🧭 Right direction! Just higher!",
                "🎨 Close call! Paint it higher!",
                "⚖️ Almost balanced! Tip it up!"
            ],
            VERY_CLOSE_HIGH: [
                "🌟 SO CLOSE! Just a tiny bit LOWER!",
                "💫 Almost perfect! Go down just a smidge!",
                "🎊 You're practically there! Slightly LOWER!",
                "🔥 BURNING HOT! Just nudge it down!",
                "⭐ Right on the edge! Think LOWER!",
                "💎 Diamond close! Polish it down!",
                "🎯 Bullseye territory! A hair lower!",
                "🔮 Crystal ball says: DOWN just a notch!",
                "🏆 Champion level! Just a whisper down!",
                "⚡ Electric! Just a spark lower!"
            ],
            VERY_CLOSE_LOW: [
                "🌟 SO CLOSE! Just a tiny bit HIGHER!",
                "💫 Almost perfect! Go up just a smidge!",
                "🎊 You're practically there! Slightly HIGHER!",
                "🔥 BURNING HOT! Just nudge it up!",
                "⭐ Right on the edge! Think HIGHER!",
                "💎 Diamond close! Polish it up!",
                "🎯 Bullseye territory! A hair higher!",
                "🔮 Crystal ball says: UP just a notch!",
                "🏆 Champion level! Just a whisper up!",
                "⚡ Electric! Just a spark higher!"
            ]
        };
    }

    startGame(playerName, rangeStart, rangeEnd, botDifficulty) {
        this.gameState.playerName = playerName;
        this.gameState.rangeStart = rangeStart;
        this.gameState.rangeEnd = rangeEnd;
        this.gameState.botDifficulty = botDifficulty;
        this.gameState.gamePhase = 'selection';
        
        
        this.gameState.playerSecretNumber = null; 
        this.gameState.botSecretNumber = this.generateRandomNumber(rangeStart, rangeEnd);
        
        
        this.initializeBotStrategy();
        
        
        this.gameState.playerAttempts = 0;
        this.gameState.botAttempts = 0;
        this.gameState.playerGuessHistory = [];
        this.gameState.botGuessHistory = [];
        
        
        this.showSinglePlayerSelection();
    }

    showSinglePlayerSelection() {
        
        UI.showScreen('selectionScreen');
        
        
        document.getElementById('selectionRoundInfo').querySelector('.round-text').textContent = 'Single Player vs Bot';
        
        const rangeDisplay = `${this.gameState.rangeStart} - ${this.gameState.rangeEnd}`;
        document.getElementById('selectionRangeDisplay').textContent = rangeDisplay;
        
        const secretNumberInput = document.getElementById('secretNumber');
        secretNumberInput.min = this.gameState.rangeStart;
        secretNumberInput.max = this.gameState.rangeEnd;
        secretNumberInput.value = '';
        secretNumberInput.disabled = false;
        secretNumberInput.placeholder = `Choose ${rangeDisplay}`;
        
        
        const selectionMessage = document.getElementById('selectionMessage');
        selectionMessage.innerHTML = `
            <strong>🎯 Choose your secret number between ${rangeDisplay}</strong><br>
            <small>🤖 The AI bot will try to guess YOUR number!</small>
        `;
        selectionMessage.className = 'message info enhanced';
        
        
        const readyBtn = document.getElementById('readyBtn');
        readyBtn.disabled = false;
        readyBtn.textContent = '✅ Start Game';
        readyBtn.onclick = () => this.setPlayerReady();
        
        
        document.getElementById('readyStatus').innerHTML = '';
        
        
        setTimeout(() => secretNumberInput.focus(), 200);
        
        UI.showNotification('🤖 Choose your secret number! The AI bot will try to guess it.', 'info', 4000);
    }

    setPlayerReady() {
        const secretNumberInput = document.getElementById('secretNumber');
        const secretNumber = parseInt(secretNumberInput.value);
        
        
        if (!secretNumber || secretNumber < this.gameState.rangeStart || secretNumber > this.gameState.rangeEnd) {
            UI.showNotification(`⚠️ Please enter a number between ${this.gameState.rangeStart} and ${this.gameState.rangeEnd}`, 'error');
            secretNumberInput.focus();
            return;
        }
        
        
        this.gameState.playerSecretNumber = secretNumber;
        
        
        secretNumberInput.disabled = true;
        const readyBtn = document.getElementById('readyBtn');
        readyBtn.disabled = true;
        readyBtn.textContent = '✅ Starting Game...';
        
        
        document.getElementById('readyStatus').innerHTML = `✅ Your secret number: ${secretNumber}<br><small>🤖 Starting game with AI bot...</small>`;
        
        UI.showNotification(`✅ Secret number ${secretNumber} selected! Starting game...`, 'success');
        
        
        setTimeout(() => {
            this.showSinglePlayerGame();
        }, 2000);
    }

    showSinglePlayerGame() {
        
        document.querySelector('.game-container').classList.add('single-player-mode');
        
        UI.showScreen('gameScreen');
        
        
        document.getElementById('gameRoundInfo').querySelector('.round-text').textContent = 'Single Player vs Bot';
        
        
        document.getElementById('myBattleName').textContent = this.gameState.playerName;
        document.getElementById('opponentBattleName').innerHTML = `
            <div class="bot-avatar">🤖</div>
            AI Bot (${this.gameState.botDifficulty})
        `;
        
        
        document.getElementById('myAttempts').textContent = this.gameState.playerAttempts;
        document.getElementById('myWins').textContent = this.gameState.playerWins;
        document.getElementById('opponentAttempts').textContent = this.gameState.botAttempts;
        document.getElementById('opponentWins').textContent = this.gameState.botWins;
        
        
        document.getElementById('myTarget').textContent = this.gameState.playerSecretNumber;
        document.getElementById('opponentTarget').textContent = '???';
        
        
        const guessInput = document.getElementById('guessInput');
        guessInput.min = this.gameState.rangeStart;
        guessInput.max = this.gameState.rangeEnd;
        guessInput.value = '';
        guessInput.placeholder = `Guess Bot's number (${this.gameState.rangeStart}-${this.gameState.rangeEnd})`;
        guessInput.focus();
        
        
        document.getElementById('gameMessage').textContent = `🤖 Bot has picked a number between ${this.gameState.rangeStart} and ${this.gameState.rangeEnd}. Can you find it?`;
        document.getElementById('gameMessage').className = 'message info';
        UI.clearGuessHistory();
        
        this.gameState.gamePhase = 'playing';
        
        
        setTimeout(() => {
            this.botMakeGuess();
        }, 2000);
    }

    makePlayerGuess(guess) {
        if (this.gameState.gamePhase !== 'playing') return;
        
        this.gameState.playerAttempts++;
        
        
        const feedback = this.generateFeedback(guess, this.gameState.botSecretNumber);
        
        
        this.gameState.playerGuessHistory.push({
            attempt: this.gameState.playerAttempts,
            guess: guess,
            feedback: feedback
        });
        
        
        document.getElementById('myAttempts').textContent = this.gameState.playerAttempts;
        UI.showGameMessage(feedback.message, feedback.type);
        UI.addGuessToHistory(guess, {
            attempts: this.gameState.playerAttempts,
            isCorrect: feedback.isCorrect,
            closeness: feedback.closeness,
            direction: feedback.direction
        });
        
        
        if (feedback.isCorrect) {
            this.endGame('player');
            return;
        }
        
        
        setTimeout(() => {
            this.botMakeGuess();
        }, this.botThinkingTime[this.gameState.botDifficulty]);
    }

    botMakeGuess() {
        if (this.gameState.gamePhase !== 'playing') return;
        
        this.gameState.botAttempts++;
        
        let botGuess;
        switch (this.gameState.botDifficulty) {
            case 'easy':
                botGuess = this.botEasyStrategy();
                break;
            case 'medium':
                botGuess = this.botMediumStrategy();
                break;
            case 'hard':
                botGuess = this.botHardStrategy();
                break;
        }
        
        
        const isCorrect = botGuess === this.gameState.playerSecretNumber;
        
        
        this.gameState.botGuessHistory.push({
            attempt: this.gameState.botAttempts,
            guess: botGuess,
            isCorrect: isCorrect
        });
        
        
        document.getElementById('opponentAttempts').textContent = this.gameState.botAttempts;
        
        
        const botMessage = isCorrect ? 
            `🤖 Bot found your number ${this.gameState.playerSecretNumber} in ${this.gameState.botAttempts} attempts! 🎯` :
            `🤖 Bot guessed ${botGuess} (Attempt ${this.gameState.botAttempts})`;
        
        UI.showNotification(botMessage, isCorrect ? 'warning' : 'info');
        
        if (isCorrect) {
            this.endGame('bot');
        } else {
            
            this.updateBotStrategy(botGuess, this.gameState.playerSecretNumber);
        }
    }

    
    botEasyStrategy() {
        
        return this.generateRandomNumber(this.gameState.rangeStart, this.gameState.rangeEnd);
    }

    botMediumStrategy() {
        
        const { min, max } = this.gameState.botStrategy;
        const range = max - min + 1;
        
        if (range <= 1) {
            return min;
        }
        
        
        const mid = Math.floor((min + max) / 2);
        const randomOffset = Math.floor(Math.random() * Math.min(3, range)) - 1;
        return Math.max(min, Math.min(max, mid + randomOffset));
    }

    botHardStrategy() {
        
        const { min, max } = this.gameState.botStrategy;
        return Math.floor((min + max) / 2);
    }

    updateBotStrategy(guess, target) {
        if (guess < target) {
            this.gameState.botStrategy.min = guess + 1;
        } else if (guess > target) {
            this.gameState.botStrategy.max = guess - 1;
        }
        this.gameState.botStrategy.lastGuess = guess;
    }

    initializeBotStrategy() {
        this.gameState.botStrategy = {
            min: this.gameState.rangeStart,
            max: this.gameState.rangeEnd,
            lastGuess: null,
            strategy: 'binary'
        };
    }

    generateFeedback(guess, target) {
        if (guess === target) {
            return {
                type: 'success',
                message: '🎉 Correct! You found the bot\'s number!',
                isCorrect: true
            };
        }

        const difference = Math.abs(guess - target);
        const range = this.gameState.rangeEnd - this.gameState.rangeStart + 1;
        
        
        let veryCloseThreshold, closeThreshold;
        
        if (range <= 20) {
            veryCloseThreshold = 1;
            closeThreshold = 2;
        } else if (range <= 50) {
            veryCloseThreshold = 2;
            closeThreshold = 4;
        } else if (range <= 100) {
            veryCloseThreshold = 3;
            closeThreshold = 8;
        } else if (range <= 500) {
            veryCloseThreshold = Math.max(5, Math.ceil(range * 0.015));
            closeThreshold = Math.max(10, Math.ceil(range * 0.04));
        } else {
            veryCloseThreshold = Math.max(8, Math.ceil(range * 0.012));
            closeThreshold = Math.max(20, Math.ceil(range * 0.035));
        }

        let messageType;
        let messageKey;

        if (difference <= veryCloseThreshold) {
            messageType = 'warning';
            messageKey = guess > target ? 'VERY_CLOSE_HIGH' : 'VERY_CLOSE_LOW';
        } else if (difference <= closeThreshold) {
            messageType = 'warning';
            messageKey = guess > target ? 'CLOSE_HIGH' : 'CLOSE_LOW';
        } else {
            messageType = 'info';
            messageKey = guess > target ? 'TOO_HIGH' : 'TOO_LOW';
        }

        return {
            type: messageType,
            message: this.getRandomMessage(messageKey),
            isCorrect: false,
            difference: difference,
            direction: guess > target ? 'high' : 'low',
            closeness: difference <= veryCloseThreshold ? 'very_close' : 
                      difference <= closeThreshold ? 'close' : 'far'
        };
    }

    getRandomMessage(category) {
        const messages = this.gameMessages[category];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    generateRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    endGame(winner) {
        this.gameState.gamePhase = 'finished';
        
        if (winner === 'player') {
            this.gameState.playerWins++;
        } else {
            this.gameState.botWins++;
        }
        
        
        this.showSinglePlayerResults(winner);
    }

    showSinglePlayerResults(winner) {
        UI.showScreen('resultsScreen');
        
        const isPlayerWinner = winner === 'player';
        
        
        document.getElementById('resultEmoji').textContent = isPlayerWinner ? '🎉' : '🤖';
        document.getElementById('resultTitle').textContent = isPlayerWinner ? 
            '🎉 You Won!' : '🤖 Bot Won!';
        
        
        document.getElementById('myResultName').textContent = this.gameState.playerName;
        document.getElementById('opponentResultName').innerHTML = `🤖 AI Bot (${this.gameState.botDifficulty})`;
        
        document.getElementById('myFinalAttempts').textContent = this.gameState.playerAttempts;
        document.getElementById('opponentFinalAttempts').textContent = this.gameState.botAttempts;
        document.getElementById('myTotalWins').textContent = this.gameState.playerWins;
        document.getElementById('opponentTotalWins').textContent = this.gameState.botWins;
        
        
        const optimalAttempts = Math.ceil(Math.log2(this.gameState.rangeEnd - this.gameState.rangeStart + 1));
        let playerPerformance = 'Good Try!';
        let botPerformance = 'AI Performance';
        
        if (isPlayerWinner) {
            if (this.gameState.playerAttempts === 1) {
                playerPerformance = '🍀 Lucky Shot!';
            } else if (this.gameState.playerAttempts <= optimalAttempts) {
                playerPerformance = '🧠 Excellent!';
            } else if (this.gameState.playerAttempts <= optimalAttempts * 1.5) {
                playerPerformance = '👍 Good!';
            } else {
                playerPerformance = '😊 Not bad!';
            }
        }
        
        document.getElementById('myPerformance').textContent = playerPerformance;
        document.getElementById('opponentPerformance').textContent = botPerformance;
        
        
        const myCard = document.getElementById('myResultCard');
        const opponentCard = document.getElementById('opponentResultCard');
        myCard.classList.toggle('winner', isPlayerWinner);
        opponentCard.classList.toggle('winner', !isPlayerWinner);
        
        
        let message;
        if (isPlayerWinner) {
            message = `Congratulations! You beat the ${this.gameState.botDifficulty} bot in ${this.gameState.playerAttempts} attempts!`;
        } else {
            message = `The ${this.gameState.botDifficulty} bot found your number in ${this.gameState.botAttempts} attempts. Try again!`;
        }
        
        document.getElementById('finalResultMessage').textContent = message;
        document.getElementById('finalResultMessage').className = `message ${isPlayerWinner ? 'success' : 'info'}`;
        
        
        document.getElementById('nextRoundBtn').style.display = 'none';
        
        
        const rematchBtn = document.getElementById('rematchBtn');
        rematchBtn.textContent = '🔄 Play Again';
        rematchBtn.onclick = () => this.rematch();
        
        
        const leaveBtn = document.getElementById('leaveResultsBtn');
        leaveBtn.textContent = '🏠 Main Menu';
        leaveBtn.onclick = () => this.returnToMenu();
    }

    rematch() {
        
        this.gameState.playerAttempts = 0;
        this.gameState.botAttempts = 0;
        this.gameState.playerGuessHistory = [];
        this.gameState.botGuessHistory = [];
        this.gameState.gamePhase = 'selection';
        
        
        this.gameState.playerSecretNumber = null; 
        this.gameState.botSecretNumber = this.generateRandomNumber(this.gameState.rangeStart, this.gameState.rangeEnd);
        
        
        this.initializeBotStrategy();
        
        
        this.showSinglePlayerSelection();
        
        UI.showNotification('New game! Choose your secret number again! 🎮', 'success');
    }

    returnToMenu() {
        
        document.querySelector('.game-container').classList.remove('single-player-mode');
        
        
        this.gameState = {
            playerName: '',
            playerSecretNumber: null,
            botSecretNumber: null,
            playerAttempts: 0,
            botAttempts: 0,
            playerWins: 0,
            botWins: 0,
            rangeStart: 1,
            rangeEnd: 100,
            botDifficulty: 'medium',
            gamePhase: 'setup',
            playerGuessHistory: [],
            botGuessHistory: [],
            botStrategy: {
                min: 1,
                max: 100,
                lastGuess: null,
                strategy: 'binary'
            }
        };
        
        
        UI.showScreen('welcomeScreen');
        UI.clearInputs();
    }

    getGameState() {
        return { ...this.gameState };
    }
}


const singlePlayerGame = new SinglePlayerGame();


window.singlePlayerGame = singlePlayerGame;