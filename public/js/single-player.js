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
            gamePhase: 'setup', // setup, playing, finished
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
                "🎈 Your guess is floating in the clouds!"
            ],
            TOO_LOW: [
                "🕳️ That's underground territory!",
                "📉 You're mining too deep! Go higher!",
                "⬇️ Think way higher than that!",
                "🐠 You're swimming in the deep end!",
                "🏠 That's basement level thinking!"
            ],
            CLOSE_HIGH: [
                "🔥 Getting warm, but still too HIGH!",
                "🎯 Close! Just dial it down a bit!",
                "👀 So close! Nudge it down slightly!",
                "⚡ Hot! But still flying too HIGH!"
            ],
            CLOSE_LOW: [
                "🔥 Getting warm, but still too LOW!",
                "🎯 Close! Just bump it up a bit!",
                "👀 So close! Nudge it up slightly!",
                "⚡ Hot! But still diving too LOW!"
            ],
            VERY_CLOSE_HIGH: [
                "🌟 SO CLOSE! Just a tiny bit LOWER!",
                "💫 Almost perfect! Go down just a smidge!",
                "🎊 You're practically there! Slightly LOWER!"
            ],
            VERY_CLOSE_LOW: [
                "🌟 SO CLOSE! Just a tiny bit HIGHER!",
                "💫 Almost perfect! Go up just a smidge!",
                "🎊 You're practically there! Slightly HIGHER!"
            ]
        };
    }

    startGame(playerName, rangeStart, rangeEnd, botDifficulty) {
        this.gameState.playerName = playerName;
        this.gameState.rangeStart = rangeStart;
        this.gameState.rangeEnd = rangeEnd;
        this.gameState.botDifficulty = botDifficulty;
        this.gameState.gamePhase = 'setup';
        
        // Generate secret numbers
        this.gameState.playerSecretNumber = this.generateRandomNumber(rangeStart, rangeEnd);
        this.gameState.botSecretNumber = this.generateRandomNumber(rangeStart, rangeEnd);
        
        // Initialize bot strategy
        this.initializeBotStrategy();
        
        // Reset stats
        this.gameState.playerAttempts = 0;
        this.gameState.botAttempts = 0;
        this.gameState.playerGuessHistory = [];
        this.gameState.botGuessHistory = [];
        
        this.showSinglePlayerGame();
    }

    showSinglePlayerGame() {
        // Add single player mode class to container
        document.querySelector('.game-container').classList.add('single-player-mode');
        
        UI.showScreen('gameScreen');
        
        // Update round info
        document.getElementById('gameRoundInfo').querySelector('.round-text').textContent = 'Single Player vs Bot';
        
        // Update player info
        document.getElementById('myBattleName').textContent = this.gameState.playerName;
        document.getElementById('opponentBattleName').innerHTML = `
            <div class="bot-avatar">🤖</div>
            AI Bot (${this.gameState.botDifficulty})
        `;
        
        // Update stats
        document.getElementById('myAttempts').textContent = this.gameState.playerAttempts;
        document.getElementById('myWins').textContent = this.gameState.playerWins;
        document.getElementById('opponentAttempts').textContent = this.gameState.botAttempts;
        document.getElementById('opponentWins').textContent = this.gameState.botWins;
        
        // Update targets
        document.getElementById('myTarget').textContent = this.gameState.playerSecretNumber;
        document.getElementById('opponentTarget').textContent = '???';
        
        // Setup guess input
        const guessInput = document.getElementById('guessInput');
        guessInput.min = this.gameState.rangeStart;
        guessInput.max = this.gameState.rangeEnd;
        guessInput.value = '';
        guessInput.placeholder = `Guess Bot's number (${this.gameState.rangeStart}-${this.gameState.rangeEnd})`;
        guessInput.focus();
        
        // Clear game message and history
        document.getElementById('gameMessage').textContent = `🤖 Bot has picked a number between ${this.gameState.rangeStart} and ${this.gameState.rangeEnd}. Can you find it?`;
        document.getElementById('gameMessage').className = 'message info';
        UI.clearGuessHistory();
        
        this.gameState.gamePhase = 'playing';
        
        // Bot starts thinking after a delay
        setTimeout(() => {
            this.botMakeGuess();
        }, 2000);
    }

    makePlayerGuess(guess) {
        if (this.gameState.gamePhase !== 'playing') return;
        
        this.gameState.playerAttempts++;
        
        // Generate feedback
        const feedback = this.generateFeedback(guess, this.gameState.botSecretNumber);
        
        // Add to history
        this.gameState.playerGuessHistory.push({
            attempt: this.gameState.playerAttempts,
            guess: guess,
            feedback: feedback
        });
        
        // Update UI
        document.getElementById('myAttempts').textContent = this.gameState.playerAttempts;
        UI.showGameMessage(feedback.message, feedback.type);
        UI.addGuessToHistory(guess, {
            attempts: this.gameState.playerAttempts,
            isCorrect: feedback.isCorrect,
            closeness: feedback.closeness,
            direction: feedback.direction
        });
        
        // Check if player won
        if (feedback.isCorrect) {
            this.endGame('player');
            return;
        }
        
        // Continue bot thinking
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
        
        // Check if bot won
        const isCorrect = botGuess === this.gameState.playerSecretNumber;
        
        // Add to bot history
        this.gameState.botGuessHistory.push({
            attempt: this.gameState.botAttempts,
            guess: botGuess,
            isCorrect: isCorrect
        });
        
        // Update UI
        document.getElementById('opponentAttempts').textContent = this.gameState.botAttempts;
        
        // Show bot's guess
        const botMessage = isCorrect ? 
            `🤖 Bot found your number ${this.gameState.playerSecretNumber} in ${this.gameState.botAttempts} attempts! 🎯` :
            `🤖 Bot guessed ${botGuess} (Attempt ${this.gameState.botAttempts})`;
        
        UI.showNotification(botMessage, isCorrect ? 'warning' : 'info');
        
        if (isCorrect) {
            this.endGame('bot');
        } else {
            // Update bot strategy based on feedback
            this.updateBotStrategy(botGuess, this.gameState.playerSecretNumber);
        }
    }

    // Bot Strategies
    botEasyStrategy() {
        // Random guessing
        return this.generateRandomNumber(this.gameState.rangeStart, this.gameState.rangeEnd);
    }

    botMediumStrategy() {
        // Narrowing range but not optimal
        const { min, max } = this.gameState.botStrategy;
        const range = max - min + 1;
        
        if (range <= 1) {
            return min;
        }
        
        // Use binary search with some randomness
        const mid = Math.floor((min + max) / 2);
        const randomOffset = Math.floor(Math.random() * Math.min(3, range)) - 1;
        return Math.max(min, Math.min(max, mid + randomOffset));
    }

    botHardStrategy() {
        // Optimal binary search
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
        const range = this.gameState.rangeEnd - this.gameState.rangeStart;
        const closeThreshold = Math.max(1, Math.floor(range * 0.1));
        const veryCloseThreshold = Math.max(1, Math.floor(range * 0.05));

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
        
        // Show results
        this.showSinglePlayerResults(winner);
    }

    showSinglePlayerResults(winner) {
        UI.showScreen('resultsScreen');
        
        const isPlayerWinner = winner === 'player';
        
        // Update result display
        document.getElementById('resultEmoji').textContent = isPlayerWinner ? '🎉' : '🤖';
        document.getElementById('resultTitle').textContent = isPlayerWinner ? 
            '🎉 You Won!' : '🤖 Bot Won!';
        
        // Update player results
        document.getElementById('myResultName').textContent = this.gameState.playerName;
        document.getElementById('opponentResultName').innerHTML = `🤖 AI Bot (${this.gameState.botDifficulty})`;
        
        document.getElementById('myFinalAttempts').textContent = this.gameState.playerAttempts;
        document.getElementById('opponentFinalAttempts').textContent = this.gameState.botAttempts;
        document.getElementById('myTotalWins').textContent = this.gameState.playerWins;
        document.getElementById('opponentTotalWins').textContent = this.gameState.botWins;
        
        // Performance evaluation
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
        
        // Highlight winner
        const myCard = document.getElementById('myResultCard');
        const opponentCard = document.getElementById('opponentResultCard');
        myCard.classList.toggle('winner', isPlayerWinner);
        opponentCard.classList.toggle('winner', !isPlayerWinner);
        
        // Final message
        let message;
        if (isPlayerWinner) {
            message = `Congratulations! You beat the ${this.gameState.botDifficulty} bot in ${this.gameState.playerAttempts} attempts!`;
        } else {
            message = `The ${this.gameState.botDifficulty} bot found your number in ${this.gameState.botAttempts} attempts. Try again!`;
        }
        
        document.getElementById('finalResultMessage').textContent = message;
        document.getElementById('finalResultMessage').className = `message ${isPlayerWinner ? 'success' : 'info'}`;
        
        // Hide multiplayer buttons, show single player actions
        document.getElementById('nextRoundBtn').style.display = 'none';
        
        // Update rematch button for single player
        const rematchBtn = document.getElementById('rematchBtn');
        rematchBtn.textContent = '🔄 Play Again';
        rematchBtn.onclick = () => this.rematch();
        
        // Update leave button
        const leaveBtn = document.getElementById('leaveResultsBtn');
        leaveBtn.textContent = '🏠 Main Menu';
        leaveBtn.onclick = () => this.returnToMenu();
    }

    rematch() {
        // Reset game state but keep wins
        this.gameState.playerAttempts = 0;
        this.gameState.botAttempts = 0;
        this.gameState.playerGuessHistory = [];
        this.gameState.botGuessHistory = [];
        
        // Generate new secret numbers
        this.gameState.playerSecretNumber = this.generateRandomNumber(this.gameState.rangeStart, this.gameState.rangeEnd);
        this.gameState.botSecretNumber = this.generateRandomNumber(this.gameState.rangeStart, this.gameState.rangeEnd);
        
        // Reset bot strategy
        this.initializeBotStrategy();
        
        // Show game screen
        this.showSinglePlayerGame();
        
        UI.showNotification('New game started! 🎮', 'success');
    }

    returnToMenu() {
        // Remove single player mode class
        document.querySelector('.game-container').classList.remove('single-player-mode');
        
        // Reset game state
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
        
        // Reset UI
        UI.showScreen('welcomeScreen');
        UI.clearInputs();
    }

    getGameState() {
        return { ...this.gameState };
    }
}

// Initialize single player game
const singlePlayerGame = new SinglePlayerGame();

// Make it globally available
window.singlePlayerGame = singlePlayerGame;