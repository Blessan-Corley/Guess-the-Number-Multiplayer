function generateRoundSummary(
  roundResult,
  gameSettings,
  evaluatePerformance,
  calculateOptimalAttempts
) {
  const { winnerId, winnerAttempts, players } = roundResult;
  const winner = players.find((player) => player.id === winnerId);
  const loser = players.find((player) => player.id !== winnerId);

  const winnerPerformance = evaluatePerformance(
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
      performance: winnerPerformance,
    },
    loser: {
      id: loser.id,
      name: loser.name,
      attempts: loser.attempts,
      secretNumber: loser.secretNumber,
    },
    gameInfo: {
      range: `${gameSettings.rangeStart}-${gameSettings.rangeEnd}`,
      rangeSize: gameSettings.rangeEnd - gameSettings.rangeStart + 1,
      optimalAttempts: calculateOptimalAttempts(gameSettings.rangeStart, gameSettings.rangeEnd),
      totalAttempts: winner.attempts + loser.attempts,
      attemptDifference: Math.abs(winner.attempts - loser.attempts),
    },
    timestamp: roundResult.timestamp,
  };
}

function getOverallPerformanceRating(player, gameSettings, calculateOptimalAttempts) {
  if (player.stats.totalGames === 0) {
    return { rating: 'new_player', message: 'Welcome to the game!' };
  }

  const winRate = (player.wins / player.stats.totalGames) * 100;
  const avgAttempts = player.stats.averageAttempts;
  const optimalAttempts = calculateOptimalAttempts(gameSettings.rangeStart, gameSettings.rangeEnd);

  let rating;
  let message;

  if (winRate >= 80 && avgAttempts <= optimalAttempts * 1.2) {
    rating = 'master';
    message = 'NumDuel Master!';
  } else if (winRate >= 60 && avgAttempts <= optimalAttempts * 1.5) {
    rating = 'expert';
    message = 'Expert Player! Keep it up!';
  } else if (winRate >= 40) {
    rating = 'intermediate';
    message = 'Getting better! Practice makes perfect!';
  } else {
    rating = 'beginner';
    message = 'Keep playing to improve!';
  }

  return { rating, message };
}

function calculateAchievements(players) {
  const achievements = [];

  players.forEach((player) => {
    const playerAchievements = [];

    if (player.stats.totalGames === 1) {
      playerAchievements.push({
        id: 'first_game',
        title: 'Welcome Player!',
        description: 'Completed your first game',
        icon: 'gamepad-2',
      });
    }

    if (player.stats.bestScore === 1) {
      playerAchievements.push({
        id: 'perfect_game',
        title: 'Mind Reader',
        description: 'Won in just 1 attempt!',
        icon: 'brain',
      });
    }

    if (player.wins >= 3) {
      playerAchievements.push({
        id: 'win_streak',
        title: 'On Fire!',
        description: `${player.wins} wins in a row!`,
        icon: 'flame',
      });
    }

    if (player.stats.averageAttempts <= 3 && player.stats.totalGames >= 3) {
      playerAchievements.push({
        id: 'efficient_player',
        title: 'Strategic Mastermind',
        description: 'Consistently efficient gameplay',
        icon: 'target',
      });
    }

    if (player.stats.totalGames >= 10) {
      playerAchievements.push({
        id: 'veteran',
        title: 'Veteran Player',
        description: 'Played 10+ games',
        icon: 'award',
      });
    }

    if (playerAchievements.length > 0) {
      achievements.push({
        playerId: player.id,
        playerName: player.name,
        achievements: playerAchievements,
      });
    }
  });

  return achievements;
}

function generateGameSummary(party, deps) {
  const {
    generateRoundSummary: buildRoundSummary,
    getOverallPerformanceRating: getRating,
    calculateAchievements: buildAchievements,
  } = deps;

  const { roundResults } = party.gameState;
  const players = Array.from(party.players.values());

  const winCounts = new Map();
  roundResults.forEach((result) => {
    winCounts.set(result.winnerId, (winCounts.get(result.winnerId) || 0) + 1);
  });

  let gameWinner = null;
  let maxWins = 0;
  winCounts.forEach((wins, playerId) => {
    if (wins > maxWins) {
      maxWins = wins;
      gameWinner = players.find((player) => player.id === playerId);
    }
  });

  const totalAttempts = players.reduce((sum, player) => sum + player.stats.totalAttempts, 0);
  const averageAttempts = players.length > 0 ? totalAttempts / players.length : 0;
  const roundSummaries = roundResults.map((result) =>
    buildRoundSummary(result, party.gameSettings)
  );

  return {
    gameWinner: gameWinner
      ? {
          id: gameWinner.id,
          name: gameWinner.name,
          totalWins: maxWins,
          winRate: Math.round((maxWins / roundResults.length) * 100),
        }
      : null,
    gameStats: {
      totalRounds: roundResults.length,
      totalAttempts,
      averageAttempts: Math.round(averageAttempts * 100) / 100,
      duration: Date.now() - party.createdAt,
      settings: party.gameSettings,
    },
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      wins: player.wins,
      winRate: roundResults.length > 0 ? Math.round((player.wins / roundResults.length) * 100) : 0,
      totalAttempts: player.stats.totalAttempts,
      averageAttempts: player.stats.averageAttempts,
      bestScore: player.stats.bestScore,
      performance: getRating(player, party.gameSettings),
    })),
    roundSummaries,
    achievements: buildAchievements(players, party),
  };
}

function processGameEnd(party, generateGameSummaryFn) {
  const gameSummary = generateGameSummaryFn(party);

  party.players.forEach((player) => {
    player.updateStats();
  });

  return gameSummary;
}

function getGameStatistics(party, calculateDifficultyFn) {
  const players = Array.from(party.players.values());
  const currentRound = party.currentRound;
  const totalRounds = party.maxRounds;

  return {
    party: {
      code: party.code,
      phase: party.gameState.phase,
      currentRound,
      totalRounds,
      progress: Math.round((currentRound / totalRounds) * 100),
    },
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      currentAttempts: player.attempts,
      totalWins: player.wins,
      isReady: player.isReady,
      isConnected: player.isConnected,
    })),
    settings: party.gameSettings,
    difficulty: calculateDifficultyFn(party.gameSettings.rangeStart, party.gameSettings.rangeEnd),
  };
}

function predictOutcome(party) {
  const players = Array.from(party.players.values());

  if (party.gameState.phase !== 'playing') {
    return { prediction: 'unknown', confidence: 0 };
  }

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
    reasoning: `${leader.name} is ahead by ${attemptDifference} attempts`,
  };
}

function suggestNextGameRange(party) {
  const averageAttempts =
    party.players.size > 0
      ? Array.from(party.players.values()).reduce(
          (sum, player) => sum + player.stats.averageAttempts,
          0
        ) / party.players.size
      : 0;

  let suggestedRange;

  if (averageAttempts <= 3) {
    suggestedRange = {
      start: 1,
      end: Math.min(1000, (party.gameSettings.rangeEnd - party.gameSettings.rangeStart + 1) * 2),
    };
  } else if (averageAttempts >= 10) {
    suggestedRange = {
      start: 1,
      end: Math.max(
        20,
        Math.floor((party.gameSettings.rangeEnd - party.gameSettings.rangeStart + 1) / 2)
      ),
    };
  } else {
    suggestedRange = {
      start: party.gameSettings.rangeStart,
      end: party.gameSettings.rangeEnd,
    };
  }

  return {
    suggested: suggestedRange,
    reason:
      averageAttempts <= 3
        ? 'Increase challenge'
        : averageAttempts >= 10
          ? 'Make it easier'
          : 'Perfect difficulty',
    currentPerformance: averageAttempts,
  };
}

module.exports = {
  generateRoundSummary,
  getOverallPerformanceRating,
  calculateAchievements,
  generateGameSummary,
  processGameEnd,
  getGameStatistics,
  predictOutcome,
  suggestNextGameRange,
};
