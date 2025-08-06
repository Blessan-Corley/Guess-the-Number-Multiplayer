const Game = require('../models/Game');
const messageGenerator = require('../utils/messageGenerator');
const config = require('../../config/config');

class GameService {
    constructor(partyService) {
        this.partyService = partyService;
    }

    // Generate feedback for a guess
    generateFeedback(guess, target, rangeStart, rangeEnd) {
        if (guess === target) {
            return {
                type: 'success',
                message: '🎉 Correct! You found the number!',
                isCorrect: true
            };
        }

        const difference = Math.abs(guess - target);
        const range = rangeEnd - rangeStart;
        const closeThreshold = Math.max(1, Math.floor(range * 0.1)); // 10% of range
        const veryCloseThreshold = Math.max(1, Math.floor(range * 0.05)); // 5% of range

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
            message: messageGenerator.getRandomMessage(messageKey),
            isCorrect: false,
            difference: difference,
            direction: guess > target ? 'high' : 'low',
            closeness: difference <= veryCloseThreshold ? 'very_close' : 
                      difference <= closeThreshold ? 'close' : 'far'
        };
    }

    // Calculate optimal number of attempts for a range
    calculateOptimalAttempts(rangeStart, rangeEnd) {
        const rangeSize = rangeEnd - rangeStart + 1;
        return Math.ceil(Math.log2(rangeSize));
    }

    // Evaluate player performance
    evaluatePerformance(attempts, rangeStart, rangeEnd) {
        const optimalAttempts = this.calculateOptimalAttempts(rangeStart, rangeEnd);
        
        let rating;
        let message;
        let emoji;

        if (attempts === 1) {
            rating = 'legendary';
            message = 'Incredible! First try! Are you a mind reader?';
            emoji = '🍀';
        } else if (attempts <= optimalAttempts) {
            rating = 'excellent';
            message = 'Excellent strategy! You played like a pro!';
            emoji = '🧠';
        } else if (attempts <= optimalAttempts * 1.5) {
            rating = 'good';
            message = 'Great job! Well played!';
            emoji = '👍';
        } else if (attempts <= optimalAttempts * 2) {
            rating = 'fair';
            message = 'Good effort! You got there in the end!';
            emoji = '😊';
        } else {
            rating = 'needs_improvement';
            message = 'Mission accomplished! Practice makes perfect!';
            emoji = '🎯';
        }

        return {
            rating,
            message,
            emoji,
            actualAttempts: attempts,
            optimalAttempts,
            efficiency: Math.round((optimalAttempts / attempts) * 100)
        };
    }

    // Generate round summary
    generateRoundSummary(roundResult, gameSettings) {
        const { winnerId, winnerName, winnerAttempts, players } = roundResult;
        const winner = players.find(p => p.id === winnerId);
        const loser = players.find(p => p.id !== winnerId);

        const winnerPerformance = this.evaluatePerformance(
            winnerAttempts, 
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
            gameInfo: {
                range: `${gameSettings.rangeStart}-${gameSettings.rangeEnd}`,
                rangeSize: gameSettings.rangeEnd - gameSettings.rangeStart + 1,
                optimalAttempts: this.calculateOptimalAttempts(gameSettings.rangeStart, gameSettings.rangeEnd),
                totalAttempts: winner.attempts + loser.attempts,
                attemptDifference: Math.abs(winner.attempts - loser.attempts)
            },
            timestamp: roundResult.timestamp
        };
    }

    // Generate game summary for completed games
    generateGameSummary(party) {
        const { roundResults } = party.gameState;
        const players = Array.from(party.players.values());
        
        // Calculate overall winner
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

        // Calculate game statistics
        const totalAttempts = players.reduce((sum, player) => sum + player.stats.totalAttempts, 0);
        const averageAttempts = players.length > 0 ? totalAttempts / players.length : 0;

        // Generate round summaries
        const roundSummaries = roundResults.map(result => 
            this.generateRoundSummary(result, party.gameSettings)
        );

        return {
            gameWinner: gameWinner ? {
                id: gameWinner.id,
                name: gameWinner.name,
                totalWins: maxWins,
                winRate: Math.round((maxWins / roundResults.length) * 100)
            } : null,
            gameStats: {
                totalRounds: roundResults.length,
                totalAttempts: totalAttempts,
                averageAttempts: Math.round(averageAttempts * 100) / 100,
                duration: Date.now() - party.createdAt,
                settings: party.gameSettings
            },
            players: players.map(player => ({
                id: player.id,
                name: player.name,
                wins: player.wins,
                winRate: roundResults.length > 0 ? Math.round((player.wins / roundResults.length) * 100) : 0,
                totalAttempts: player.stats.totalAttempts,
                averageAttempts: player.stats.averageAttempts,
                bestScore: player.stats.bestScore,
                performance: this.getOverallPerformanceRating(player, party.gameSettings)
            })),
            roundSummaries: roundSummaries,
            achievements: this.calculateAchievements(players, party)
        };
    }

    // Get overall performance rating for a player
    getOverallPerformanceRating(player, gameSettings) {
        if (player.stats.totalGames === 0) {
            return { rating: 'new_player', message: 'Welcome to the game!' };
        }

        const winRate = (player.wins / player.stats.totalGames) * 100;
        const avgAttempts = player.stats.averageAttempts;
        const optimalAttempts = this.calculateOptimalAttempts(gameSettings.rangeStart, gameSettings.rangeEnd);

        let rating;
        let message;

        if (winRate >= 80 && avgAttempts <= optimalAttempts * 1.2) {
            rating = 'master';
            message = 'Number Guessing Master! 🏆';
        } else if (winRate >= 60 && avgAttempts <= optimalAttempts * 1.5) {
            rating = 'expert';
            message = 'Expert Player! Keep it up! 🎯';
        } else if (winRate >= 40) {
            rating = 'intermediate';
            message = 'Getting better! Practice makes perfect! 📈';
        } else {
            rating = 'beginner';
            message = 'Keep playing to improve! 🌟';
        }

        return { rating, message };
    }

    // Calculate achievements for players
    calculateAchievements(players, party) {
        const achievements = [];

        players.forEach(player => {
            const playerAchievements = [];

            // First game achievement
            if (player.stats.totalGames === 1) {
                playerAchievements.push({
                    id: 'first_game',
                    title: 'Welcome Player!',
                    description: 'Completed your first game',
                    icon: '🎮'
                });
            }

            // Perfect game (1 attempt win)
            if (player.stats.bestScore === 1) {
                playerAchievements.push({
                    id: 'perfect_game',
                    title: 'Mind Reader',
                    description: 'Won in just 1 attempt!',
                    icon: '🧠'
                });
            }

            // Win streak
            if (player.wins >= 3) {
                playerAchievements.push({
                    id: 'win_streak',
                    title: 'On Fire!',
                    description: `${player.wins} wins in a row!`,
                    icon: '🔥'
                });
            }

            // Efficient player
            if (player.stats.averageAttempts <= 3 && player.stats.totalGames >= 3) {
                playerAchievements.push({
                    id: 'efficient_player',
                    title: 'Strategic Mastermind',
                    description: 'Consistently efficient gameplay',
                    icon: '🎯'
                });
            }

            // Veteran player
            if (player.stats.totalGames >= 10) {
                playerAchievements.push({
                    id: 'veteran',
                    title: 'Veteran Player',
                    description: 'Played 10+ games',
                    icon: '🏅'
                });
            }

            if (playerAchievements.length > 0) {
                achievements.push({
                    playerId: player.id,
                    playerName: player.name,
                    achievements: playerAchievements
                });
            }
        });

        return achievements;
    }

    // Validate game move
    validateMove(party, playerId, guess) {
        const player = party.getPlayer(playerId);
        if (!player) {
            return { valid: false, error: 'Player not found' };
        }

        if (party.gameState.phase !== 'playing') {
            return { valid: false, error: 'Game is not in playing phase' };
        }

        const validation = player.validateGuess(
            guess,
            party.gameSettings.rangeStart,
            party.gameSettings.rangeEnd
        );

        return validation;
    }

    // Get strategic hint for a player
    getStrategicHint(player, targetNumber, gameSettings) {
        const { guessHistory } = player;
        const { rangeStart, rangeEnd } = gameSettings;

        if (guessHistory.length === 0) {
            return {
                type: 'start',
                message: `Start with a number in the middle of the range (${rangeStart}-${rangeEnd})`
            };
        }

        const lastGuess = guessHistory[guessHistory.length - 1];
        const difference = Math.abs(lastGuess.guess - targetNumber);

        if (difference <= 2) {
            return {
                type: 'precise',
                message: 'You are extremely close! Make tiny adjustments.'
            };
        } else if (difference <= 5) {
            return {
                type: 'close',
                message: 'Very close! Adjust by a small amount.'
            };
        } else if (difference <= 10) {
            return {
                type: 'moderate',
                message: 'Getting warmer! You are in the right area.'
            };
        } else {
            return {
                type: 'far',
                message: lastGuess.guess > targetNumber ? 
                    'Much too high! Try a significantly lower number.' :
                    'Much too low! Try a significantly higher number.'
            };
        }
    }

    // Calculate game difficulty based on range
    calculateDifficulty(rangeStart, rangeEnd) {
        const rangeSize = rangeEnd - rangeStart + 1;
        const optimalAttempts = this.calculateOptimalAttempts(rangeStart, rangeEnd);

        let difficulty;
        let description;

        if (rangeSize <= 20) {
            difficulty = 'easy';
            description = 'Perfect for beginners';
        } else if (rangeSize <= 100) {
            difficulty = 'medium';
            description = 'Good challenge for most players';
        } else if (rangeSize <= 500) {
            difficulty = 'hard';
            description = 'Challenging for experienced players';
        } else {
            difficulty = 'expert';
            description = 'Only for number guessing masters';
        }

        return {
            difficulty,
            description,
            rangeSize,
            optimalAttempts,
            estimatedTime: `${optimalAttempts * 30}-${optimalAttempts * 60} seconds`
        };
    }

    // Generate motivational messages
    getMotivationalMessage(player, context = 'general') {
        const messages = {
            general: [
                "You've got this! 💪",
                "Trust your instincts! 🎯",
                "Every guess gets you closer! 🚀",
                "Think strategically! 🧠",
                "You're doing great! ⭐"
            ],
            behind: [
                "Don't give up! You can catch up! 💪",
                "Stay focused and think strategically! 🎯",
                "Every expert was once a beginner! 🌟",
                "Learn from each guess! 📚",
                "Your comeback starts now! 🚀"
            ],
            ahead: [
                "You're in the lead! Keep it up! 🏆",
                "Excellent strategy! 🎯",
                "You're on fire! 🔥",
                "Maintain your focus! ⭐",
                "Victory is within reach! 🏅"
            ],
            close: [
                "So close! You can feel it! 🔥",
                "The answer is right there! 👁️",
                "Trust your instincts now! ⚡",
                "You're practically touching it! ✨",
                "One more strategic move! 🎯"
            ]
        };

        const messageArray = messages[context] || messages.general;
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    }

    // Process game end and generate final statistics
    processGameEnd(party) {
        const gameSummary = this.generateGameSummary(party);
        
        // Update player statistics
        party.players.forEach(player => {
            player.updateStats();
        });

        // Log game completion
        console.log(`Game completed in party ${party.code}:`);
        console.log(`- Winner: ${gameSummary.gameWinner?.name || 'Tie'}`);
        console.log(`- Total rounds: ${gameSummary.gameStats.totalRounds}`);
        console.log(`- Duration: ${Math.round(gameSummary.gameStats.duration / 1000)} seconds`);

        return gameSummary;
    }

    // Get real-time game statistics
    getGameStatistics(party) {
        const players = Array.from(party.players.values());
        const currentRound = party.currentRound;
        const totalRounds = party.maxRounds;

        return {
            party: {
                code: party.code,
                phase: party.gameState.phase,
                currentRound,
                totalRounds,
                progress: Math.round((currentRound / totalRounds) * 100)
            },
            players: players.map(player => ({
                id: player.id,
                name: player.name,
                currentAttempts: player.attempts,
                totalWins: player.wins,
                isReady: player.isReady,
                isConnected: player.isConnected
            })),
            settings: party.gameSettings,
            difficulty: this.calculateDifficulty(
                party.gameSettings.rangeStart, 
                party.gameSettings.rangeEnd
            )
        };
    }

    // Predict game outcome based on current state
    predictOutcome(party) {
        const players = Array.from(party.players.values());
        
        if (party.gameState.phase !== 'playing') {
            return { prediction: 'unknown', confidence: 0 };
        }

        // Simple prediction based on current attempts
        const playersByAttempts = players.sort((a, b) => a.attempts - b.attempts);
        const leader = playersByAttempts[0];
        const attemptDifference = playersByAttempts[1].attempts - leader.attempts;

        let confidence;
        if (attemptDifference >= 3) {
            confidence = 80;
        } else if (attemptDifference >= 2) {
            confidence = 65;
        } else {
            confidence = 50;
        }

        return {
            prediction: leader.name,
            confidence,
            reasoning: `${leader.name} is ahead by ${attemptDifference} attempts`
        };
    }

    // Real-time feedback enhancement
    getContextualFeedback(guess, target, previousGuesses, gameSettings) {
        const baseFeedback = this.generateFeedback(guess, target, gameSettings.rangeStart, gameSettings.rangeEnd);
        
        // Add contextual information based on guess history
        if (previousGuesses.length > 0) {
            const lastGuess = previousGuesses[previousGuesses.length - 1];
            const improvement = Math.abs(lastGuess.guess - target) - Math.abs(guess - target);
            
            if (improvement > 0) {
                baseFeedback.improvement = 'better';
                baseFeedback.message += ' Getting warmer!';
            } else if (improvement < 0) {
                baseFeedback.improvement = 'worse';
                baseFeedback.message += ' Getting colder!';
            } else {
                baseFeedback.improvement = 'same';
                baseFeedback.message += ' Same distance as before.';
            }
        }
        
        return baseFeedback;
    }

    // Smart range suggestions for next game
    suggestNextGameRange(party) {
        const completedGames = party.stats.gamesCompleted;
        const averageAttempts = party.players.size > 0 ? 
            Array.from(party.players.values()).reduce((sum, p) => sum + p.stats.averageAttempts, 0) / party.players.size : 0;
        
        let suggestedRange;
        
        if (averageAttempts <= 3) {
            // Players are very efficient, increase difficulty
            suggestedRange = { start: 1, end: Math.min(1000, (party.gameSettings.rangeEnd - party.gameSettings.rangeStart + 1) * 2) };
        } else if (averageAttempts >= 10) {
            // Players are struggling, decrease difficulty
            suggestedRange = { start: 1, end: Math.max(20, Math.floor((party.gameSettings.rangeEnd - party.gameSettings.rangeStart + 1) / 2)) };
        } else {
            // Current difficulty is good
            suggestedRange = { start: party.gameSettings.rangeStart, end: party.gameSettings.rangeEnd };
        }
        
        return {
            suggested: suggestedRange,
            reason: averageAttempts <= 3 ? 'Increase challenge' : 
                   averageAttempts >= 10 ? 'Make it easier' : 'Perfect difficulty',
            currentPerformance: averageAttempts
        };
    }
}

module.exports = GameService;