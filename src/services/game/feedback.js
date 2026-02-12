function generateFeedback(guess, target, rangeStart, rangeEnd, messageGenerator) {
  if (guess === target) {
    return {
      type: 'success',
      message: 'Correct! You found the number!',
      isCorrect: true,
    };
  }

  const difference = Math.abs(guess - target);
  const range = rangeEnd - rangeStart + 1;

  let veryCloseThreshold;
  let closeThreshold;

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
    message: messageGenerator.getRandomMessage(messageKey),
    isCorrect: false,
    difference,
    direction: guess > target ? 'high' : 'low',
    closeness:
      difference <= veryCloseThreshold
        ? 'very_close'
        : difference <= closeThreshold
          ? 'close'
          : 'far',
  };
}

function calculateOptimalAttempts(rangeStart, rangeEnd) {
  const rangeSize = rangeEnd - rangeStart + 1;
  return Math.ceil(Math.log2(rangeSize));
}

function evaluatePerformance(attempts, rangeStart, rangeEnd) {
  const optimalAttempts = calculateOptimalAttempts(rangeStart, rangeEnd);

  let rating;
  let message;
  let emoji;

  if (attempts === 1) {
    rating = 'legendary';
    message = 'Incredible! First try! Are you a mind reader?';
    emoji = 'sparkles';
  } else if (attempts <= optimalAttempts) {
    rating = 'excellent';
    message = 'Excellent strategy! You played like a pro!';
    emoji = 'brain';
  } else if (attempts <= optimalAttempts * 1.5) {
    rating = 'good';
    message = 'Great job! Well played!';
    emoji = 'thumbs-up';
  } else if (attempts <= optimalAttempts * 2) {
    rating = 'fair';
    message = 'Good effort! You got there in the end!';
    emoji = 'smile';
  } else {
    rating = 'needs_improvement';
    message = 'Mission accomplished! Practice makes perfect!';
    emoji = 'target';
  }

  return {
    rating,
    message,
    emoji,
    actualAttempts: attempts,
    optimalAttempts,
    efficiency: Math.round((optimalAttempts / attempts) * 100),
  };
}

function getContextualFeedback(guess, target, previousGuesses, gameSettings, messageGenerator) {
  const baseFeedback = generateFeedback(
    guess,
    target,
    gameSettings.rangeStart,
    gameSettings.rangeEnd,
    messageGenerator
  );

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

module.exports = {
  generateFeedback,
  calculateOptimalAttempts,
  evaluatePerformance,
  getContextualFeedback,
};
