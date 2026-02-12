function getStrategicHint(player, targetNumber, gameSettings) {
  const { guessHistory } = player;
  const { rangeStart, rangeEnd } = gameSettings;

  if (guessHistory.length === 0) {
    return {
      type: 'start',
      message: `Start with a number in the middle of the range (${rangeStart}-${rangeEnd})`,
    };
  }

  const lastGuess = guessHistory[guessHistory.length - 1];
  const difference = Math.abs(lastGuess.guess - targetNumber);

  if (difference <= 2) {
    return {
      type: 'precise',
      message: 'You are extremely close! Make tiny adjustments.',
    };
  }
  if (difference <= 5) {
    return {
      type: 'close',
      message: 'Very close! Adjust by a small amount.',
    };
  }
  if (difference <= 10) {
    return {
      type: 'moderate',
      message: 'Getting warmer! You are in the right area.',
    };
  }

  return {
    type: 'far',
    message:
      lastGuess.guess > targetNumber
        ? 'Much too high! Try a significantly lower number.'
        : 'Much too low! Try a significantly higher number.',
  };
}

function calculateDifficulty(rangeStart, rangeEnd, calculateOptimalAttempts) {
  const rangeSize = rangeEnd - rangeStart + 1;
  const optimalAttempts = calculateOptimalAttempts(rangeStart, rangeEnd);

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
    estimatedTime: `${optimalAttempts * 30}-${optimalAttempts * 60} seconds`,
  };
}

function getMotivationalMessage(player, context = 'general') {
  const messages = {
    general: [
      "You've got this!",
      'Trust your instincts!',
      'Every guess gets you closer!',
      'Think strategically!',
      "You're doing great!",
    ],
    behind: [
      "Don't give up! You can catch up!",
      'Stay focused and think strategically!',
      'Every expert was once a beginner!',
      'Learn from each guess!',
      'Your comeback starts now!',
    ],
    ahead: [
      "You're in the lead! Keep it up!",
      'Excellent strategy!',
      "You're on fire!",
      'Maintain your focus!',
      'Victory is within reach!',
    ],
    close: [
      'So close! You can feel it!',
      'The answer is right there!',
      'Trust your instincts now!',
      "You're practically touching it!",
      'One more strategic move!',
    ],
  };

  const messageArray = messages[context] || messages.general;
  return messageArray[Math.floor(Math.random() * messageArray.length)];
}

module.exports = {
  getStrategicHint,
  calculateDifficulty,
  getMotivationalMessage,
};
