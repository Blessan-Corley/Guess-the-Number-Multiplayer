const config = require('../../config/config');

class MessageGenerator {
    constructor() {
        this.messages = config.GAME_MESSAGES;
    }

    
    getRandomMessage(category) {
        const messageArray = this.messages[category];
        if (!messageArray || messageArray.length === 0) {
            return this.getDefaultMessage(category);
        }
        
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    }

    
    getDefaultMessage(category) {
        const defaults = {
            'TOO_HIGH': 'Too high! Try a lower number.',
            'TOO_LOW': 'Too low! Try a higher number.',
            'CLOSE_HIGH': 'Close, but still too high!',
            'CLOSE_LOW': 'Close, but still too low!',
            'VERY_CLOSE_HIGH': 'Very close! Just a bit lower!',
            'VERY_CLOSE_LOW': 'Very close! Just a bit higher!'
        };
        
        return defaults[category] || 'Keep trying!';
    }

    
    getContextualMessage(context) {
        const contextMessages = {
            gameStart: [
                "Let the games begin!",
                "Ready, set, guess!",
                "May the best guesser win!",
                "Time to show your skills!",
                "Game on!"
            ],
            roundStart: [
                "New round, new challenge!",
                "Here we go again!",
                "Round {round} begins!",
                "Fresh start, fresh chances!",
                "Let's see what you've got!"
            ],
            playerJoin: [
                "Welcome to the party!",
                "A new challenger appears!",
                "Great to have you here!",
                "Let's play together!",
                "Ready for some fun?"
            ],
            playerLeave: [
                "Thanks for playing!",
                "See you next time!",
                "Come back soon!",
                "It was fun while it lasted!",
                "Until we meet again!"
            ],
            gameWin: [
                "Congratulations, champion!",
                "Victory is yours!",
                "What a performance!",
                "Absolutely brilliant!",
                "You are the winner!"
            ],
            gameLose: [
                "Great effort! Try again!",
                "You played well!",
                "Better luck next time!",
                "Keep practicing!",
                "You'll get it next round!"
            ],
            rematch: [
                "Round two, let's go!",
                "The rematch begins!",
                "Another chance at glory!",
                "Redemption time!",
                "Prove yourself again!"
            ],
            timeout: [
                "Time's up! Auto-selecting...",
                "No more time to think!",
                "Decision time is over!",
                "Time limit reached!",
                "Making choice for you!"
            ]
        };

        const messages = contextMessages[context];
        if (!messages || messages.length === 0) {
            return "Game message";
        }

        return messages[Math.floor(Math.random() * messages.length)];
    }

    
    getEncouragementMessage(attempts, optimalAttempts) {
        if (attempts === 1) {
            return "First try! Incredible luck or skill?";
        } else if (attempts <= optimalAttempts) {
            return "Excellent strategy! Very efficient!";
        } else if (attempts <= optimalAttempts * 1.5) {
            return "Good approach! You're doing well!";
        } else if (attempts <= optimalAttempts * 2) {
            return "Hang in there! You can do it!";
        } else {
            return "Every guess brings you closer!";
        }
    }

    
    getCelebrationMessage(winType = 'normal') {
        const celebrations = {
            normal: [
                "Fantastic! You found it!",
                "Brilliant guessing!",
                "Victory is yours!",
                "Amazing work!",
                "Bullseye! Perfect!"
            ],
            quick: [
                "Lightning fast!",
                "Speed demon!",
                "Quick as a flash!",
                "Speedy victory!",
                "Record time!"
            ],
            comeback: [
                "Incredible comeback!",
                "Never gave up!",
                "What a turnaround!",
                "Against all odds!",
                "Clutch performance!"
            ],
            perfect: [
                "Mind reader confirmed!",
                "One guess wonder!",
                "Supernatural skills!",
                "Absolute legend!",
                "Perfection achieved!"
            ]
        };

        const messages = celebrations[winType] || celebrations.normal;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    
    getTrashTalkMessage() {
        return [
            "Feeling confident, are we?",
            "Let's see what you've got!",
            "Bring your A-game!",
            "Time to prove yourself!",
            "Show me your skills!",
            "Think you can beat me?",
            "Ready for a challenge?",
            "Let the best player win!"
        ][Math.floor(Math.random() * 8)];
    }

    
    getWaitingMessage(context = 'general') {
        const waitingMessages = {
            general: [
                "Waiting for other players...",
                "Hang tight, we're almost ready!",
                "Just a moment more...",
                "Getting everything set up...",
                "Patience, young grasshopper..."
            ],
            opponent: [
                "Your opponent is thinking...",
                "Waiting for their move...",
                "They're strategizing...",
                "Taking their time...",
                "Planning their next guess..."
            ],
            selection: [
                "Choose your secret number!",
                "Pick wisely!",
                "Time is ticking...",
                "Make your selection!",
                "What's your choice?"
            ]
        };

        const messages = waitingMessages[context] || waitingMessages.general;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    
    getErrorMessage(errorType) {
        const errorMessages = {
            invalidGuess: [
                "That doesn't look right!",
                "Please enter a valid number!",
                "Stay within the range!",
                "Check your input!",
                "Try again with a valid guess!"
            ],
            notYourTurn: [
                "Hold on, it's not your turn yet!",
                "Patience! Wait for your chance!",
                "Your opponent is still playing!",
                "Wait for the green light!",
                "Just a moment more!"
            ],
            connectionError: [
                "Connection hiccup! Trying again...",
                "Reconnecting to the game...",
                "Network issue detected!",
                "Checking your connection...",
                "Technical difficulties!"
            ],
            partyFull: [
                "This party is already full!",
                "Maximum players reached!",
                "Sorry, no more room!",
                "Try creating a new party!",
                "Look for another game!"
            ]
        };

        const messages = errorMessages[errorType];
        if (!messages || messages.length === 0) {
            return "Something went wrong!";
        }

        return messages[Math.floor(Math.random() * messages.length)];
    }

    
    getPersonalizedMessage(player) {
        const { wins, attempts, stats } = player;
        const winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;

        if (winRate >= 80) {
            return "You're absolutely dominating!";
        } else if (winRate >= 60) {
            return "You're on fire today!";
        } else if (winRate >= 40) {
            return "Keep up the good work!";
        } else if (stats.totalGames === 1) {
            return "Welcome! Every expert was once a beginner!";
        } else {
            return "Practice makes perfect!";
        }
    }

    
    formatMessage(template, variables = {}) {
        let message = template;
        
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'g');
            message = message.replace(regex, variables[key]);
        });
        
        return message;
    }

    
    getSpecialMessage() {
        const now = new Date();
        const month = now.getMonth();
        const day = now.getDate();

        
        if (month === 0 && day === 1) {
            return "Happy New Year! Let's start with some number guessing!";
        }
        
        if (month === 8 && day === 15) {
            return "Happy Independence Day! Celebrate with some fun guessing!";
        }
        if (month === 11 && day === 31) {
            return "Happy New Year's Eve! End the year with a perfect guess!";
        }
        if (month === 11 && day >= 20) {
            return "Holiday spirit is in the air!";
        }
        
        if (month === 9 && day === 31) {
            return "Spooky number guessing!";
        }
        
        
        return this.getContextualMessage('gameStart');
    }
}

module.exports = new MessageGenerator();
