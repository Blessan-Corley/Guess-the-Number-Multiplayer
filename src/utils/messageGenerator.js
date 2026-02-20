const config = require('../../config/config');
const {
  defaultMessages,
  contextualMessages,
  celebrationMessages,
  trashTalkMessages,
  waitingMessages,
  errorMessages,
} = require('./messages/catalogs');
const { getSpecialDateMessage } = require('./messages/specialDates');

function getRandomItem(items, fallback = '') {
  if (!Array.isArray(items) || items.length === 0) {
    return fallback;
  }

  return items[Math.floor(Math.random() * items.length)];
}

class MessageGenerator {
  constructor() {
    this.messages = config.GAME_MESSAGES;
  }

  getRandomMessage(category) {
    const messageArray = this.messages[category];
    if (!messageArray || messageArray.length === 0) {
      return this.getDefaultMessage(category);
    }

    return getRandomItem(messageArray, 'Keep trying!');
  }

  getDefaultMessage(category) {
    return defaultMessages[category] || 'Keep trying!';
  }

  getContextualMessage(context) {
    return getRandomItem(contextualMessages[context], 'Game message');
  }

  getEncouragementMessage(attempts, optimalAttempts) {
    if (attempts === 1) {
      return 'First try! Incredible luck or skill?';
    }
    if (attempts <= optimalAttempts) {
      return 'Excellent strategy! Very efficient!';
    }
    if (attempts <= optimalAttempts * 1.5) {
      return "Good approach! You're doing well!";
    }
    if (attempts <= optimalAttempts * 2) {
      return 'Hang in there! You can do it!';
    }
    return 'Every guess brings you closer!';
  }

  getCelebrationMessage(winType = 'normal') {
    return getRandomItem(
      celebrationMessages[winType] || celebrationMessages.normal,
      'Fantastic! You found it!'
    );
  }

  getTrashTalkMessage() {
    return getRandomItem(trashTalkMessages, "Let's play.");
  }

  getWaitingMessage(context = 'general') {
    return getRandomItem(waitingMessages[context] || waitingMessages.general, 'Waiting...');
  }

  getErrorMessage(errorType) {
    return getRandomItem(errorMessages[errorType], 'Something went wrong!');
  }

  getPersonalizedMessage(player) {
    const { stats } = player;
    const winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;

    if (winRate >= 80) {
      return "You're absolutely dominating!";
    }
    if (winRate >= 60) {
      return "You're on fire today!";
    }
    if (winRate >= 40) {
      return 'Keep up the good work!';
    }
    if (stats.totalGames === 1) {
      return 'Welcome! Every expert was once a beginner!';
    }
    return 'Practice makes perfect!';
  }

  formatMessage(template, variables = {}) {
    let message = template;

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{${key}}`, 'g');
      message = message.replace(regex, variables[key]);
    });

    return message;
  }

  getSpecialMessage() {
    const specialDateMessage = getSpecialDateMessage(new Date());
    if (specialDateMessage) {
      return specialDateMessage;
    }
    return this.getContextualMessage('gameStart');
  }
}

module.exports = new MessageGenerator();
