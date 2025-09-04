const config = require('../../config/config');

class Game {
    constructor(party) {
        this.party = party;
        this.messageGenerator = require('../utils/messageGenerator');
    }

    
    generateFeedback(guess, target, rangeStart, rangeEnd) {
        if (guess === target) {
            return {
                type: 'correct',
                message: '🎉 Correct! You found the number!',
                isCorrect: true
            };
        }

        const difference = Math.abs(guess - target);
        const range = rangeEnd - rangeStart;
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
            message: this.messageGenerator.getRandomMessage(messageKey),
            isCorrect: false,
            difference: difference,
            direction: guess > target ? 'high' : 'low',
            closeness: difference <= veryCloseThreshold ? 'very_close' : 
                      difference <= closeThreshold ? 'close' : 'far'
        };
    }

    
    calculateGameStats(players) {
        const stats = {
            totalAttempts: 0,
            averageAttempts: 0,
            quickestWin: null,
            longestGame: null,
            mostAccuratePlayer: null,
            leastAccuratePlayer: null
        };

        const playerAttempts = [];

        players.forEach(player => {
            stats.totalAttempts += player.attempts;
            playerAttempts.push({
                playerId: player.id,
                name: player.name,
                attempts: player.attempts
            });

            if (player.attempts > 0) {
                if (!stats.quickestWin || player.attempts < stats.quickestWin.attempts) {
                    stats.quickestWin = {
                        playerId: player.id,
                        name: player.name,
                        attempts: player.attempts
                    };
                }

                if (!stats.longestGame || player.attempts > stats.longestGame.attempts) {
                    stats.longestGame = {
                        playerId: player.id,
                        name: player.name,
                        attempts: player.attempts
                    };
                }
            }
        });

        if (players.length > 0) {
            stats.averageAttempts = Math.round(stats.totalAttempts / players.length * 100) / 100;
        }

        
        if (playerAttempts.length > 1) {
            playerAttempts.sort((a, b) => a.attempts - b.attempts);
            stats.mostAccuratePlayer = playerAttempts[0];
            stats.leastAccuratePlayer = playerAttempts[playerAttempts.length - 1];
        }

        return stats;
    }

    
    calculateOptimalAttempts(rangeStart, rangeEnd) {
        const rangeSize = rangeEnd - rangeStart + 1;
        return Math.ceil(Math.log2(rangeSize));
    }

    
    evaluatePerformance(player, rangeStart, rangeEnd) {
        const optimalAttempts = this.calculateOptimalAttempts(rangeStart, rangeEnd);
        const actualAttempts = player.attempts;

        let rating;
        let message;

        if (actualAttempts === 1) {
            rating = 'legendary';
            message = '🍀 Incredible! First try! Are you a mind reader?';
        } else if (actualAttempts <= optimalAttempts) {
            rating = 'excellent';
            message = '🧠 Excellent strategy! You played like a pro!';
        } else if (actualAttempts <= optimalAttempts * 1.5) {
            rating = 'good';
            message = '👍 Great job! Well played!';
        } else if (actualAttempts <= optimalAttempts * 2) {
            rating = 'fair';
            message = '😊 Good effort! You got there in the end!';
        } else {
            rating = 'needs_improvement';
            message = '🎯 Mission accomplished! Practice makes perfect!';
        }

        return {
            rating,
            message,
            actualAttempts,
            optimalAttempts,
            efficiency: Math.round((optimalAttempts / actualAttempts) * 100)
        };
    }

    
    generateRoundSummary(roundResult, gameSettings) {
        const { players, winnerId, winnerAttempts } = roundResult;
        const winner = players.find(p => p.id === winnerId);
        const loser = players.find(p => p.id !== winnerId);

        const winnerPerformance = this.evaluatePerformance(
            { attempts: winnerAttempts }, 
            gameSettings.rangeStart, 
            gameSettings.rangeEnd
        );

        return {
            winner: {
                id: winner.id,
                name: winner.name,
                attempts: winner.attempts,
                secretNumber: winner.secretNumber,
                performance: winnerPerformance
            },
            loser: {
                id: loser.id,
                name: loser.name,
                attempts: loser.attempts,
                secretNumber: loser.secretNumber
            },
            stats: {
                totalAttempts: winner.attempts + loser.attempts,
                attemptDifference: Math.abs(winner.attempts - loser.attempts),
                range: `${gameSettings.rangeStart}-${gameSettings.rangeEnd}`,
                rangeSize: gameSettings.rangeEnd - gameSettings.rangeStart + 1
            }
        };
    }

    
    generateGameSummary(party) {
        const { roundResults, gameSettings } = party.gameState;
        const players = Array.from(party.players.values());
        
        
        const winCounts = new Map();
        roundResults.forEach(result => {
            winCounts.set(result.winnerId, (winCounts.get(result.winnerId) || 0) + 1);
        });

        let gameWinner = null;
        let maxWins = 0;
        winCounts.forEach((wins, playerId) => {
            if (wins > maxWins) {
                maxWins = wins;
                gameWinner = players.find(p => p.id === playerId);
            }
        });

        
        const gameStats = this.calculateGameStats(players);

        
        const roundSummaries = roundResults.map(result => 
            this.generateRoundSummary(result, gameSettings)
        );

        return {
            gameWinner: gameWinner ? {
                id: gameWinner.id,
                name: gameWinner.name,
                totalWins: maxWins,
                winRate: Math.round((maxWins / roundResults.length) * 100)
            } : null,
            totalRounds: roundResults.length,
            gameStats,
            roundSummaries,
            players: players.map(player => ({
                id: player.id,
                name: player.name,
                wins: player.wins,
                totalAttempts: player.stats.totalAttempts,
                averageAttempts: player.stats.averageAttempts,
                bestScore: player.stats.bestScore,
                performance: player.getSessionPerformance()
            })),
            settings: gameSettings,
            duration: Date.now() - party.createdAt
        };
    }

    
    validateMove(playerId, guess) {
        const player = this.party.getPlayer(playerId);
        if (!player) {
            return { valid: false, error: 'Player not found' };
        }

        if (this.party.gameState.phase !== 'playing') {
            return { valid: false, error: 'Game is not in playing phase' };
        }

        const validation = player.validateGuess(
            guess,
            this.party.gameSettings.rangeStart,
            this.party.gameSettings.rangeEnd
        );

        return validation;
    }

    
    getHint(playerId, targetNumber, previousGuesses) {
        
        
        
        if (previousGuesses.length === 0) {
            return {
                type: 'range',
                message: `Pick a number between ${this.party.gameSettings.rangeStart} and ${this.party.gameSettings.rangeEnd}`
            };
        }

        const lastGuess = previousGuesses[previousGuesses.length - 1];
        const difference = Math.abs(lastGuess.guess - targetNumber);
        
        if (difference <= 5) {
            return {
                type: 'proximity',
                message: 'You are very close! Make small adjustments.'
            };
        } else if (difference <= 10) {
            return {
                type: 'proximity', 
                message: 'Getting warmer! You are in the right area.'
            };
        } else {
            return {
                type: 'direction',
                message: lastGuess.guess > targetNumber ? 
                    'Try going lower!' : 'Try going higher!'
            };
        }
    }

    
    checkAchievements(player, gameResult) {
        const achievements = [];

        
        if (player.stats.totalGames === 1) {
            achievements.push({
                id: 'first_game',
                title: 'Welcome Player!',
                description: 'Completed your first game',
                icon: '🎮'
            });
        }

        
        if (gameResult.isWin && player.attempts === 1) {
            achievements.push({
                id: 'perfect_game',
                title: 'Mind Reader',
                description: 'Won in just 1 attempt!',
                icon: '🧠'
            });
        }

        
        if (player.wins >= 3) {
            achievements.push({
                id: 'win_streak',
                title: 'On Fire!',
                description: `${player.wins} wins in a row!`,
                icon: '🔥'
            });
        }

        
        if (player.stats.averageAttempts <= 3 && player.stats.totalGames >= 3) {
            achievements.push({
                id: 'efficient_player',
                title: 'Strategic Mastermind',
                description: 'Consistently efficient gameplay',
                icon: '🎯'
            });
        }

        return achievements;
    }
}

module.exports = Game;