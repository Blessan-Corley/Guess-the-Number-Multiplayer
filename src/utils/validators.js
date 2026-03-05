const {
  validatePartyCode,
  validatePlayerName,
  validateGuess,
  validateGameRange,
  validateGameSettings,
} = require('./validators/gameRules');
const {
  validateSocketData,
  validateReconnectionData,
  validateRateLimit,
  validateIPAddress,
  validateSession,
} = require('./validators/networkRules');
const { sanitizeHtml, validateInput, validateBatch } = require('./validators/inputRules');

class Validators {
  static validatePartyCode(code) {
    return validatePartyCode(code);
  }

  static validatePlayerName(name) {
    return validatePlayerName(name);
  }

  static validateGuess(guess, rangeStart, rangeEnd) {
    return validateGuess(guess, rangeStart, rangeEnd);
  }

  static validateSecretNumber(number, rangeStart, rangeEnd) {
    return validateGuess(number, rangeStart, rangeEnd);
  }

  static validateGameRange(rangeStart, rangeEnd) {
    return validateGameRange(rangeStart, rangeEnd);
  }

  static validateGameSettings(settings) {
    return validateGameSettings(settings);
  }

  static validateSocketData(data, requiredFields = []) {
    return validateSocketData(data, requiredFields);
  }

  static validateReconnectionData(data) {
    return validateReconnectionData(data);
  }

  static sanitizeHtml(input) {
    return sanitizeHtml(input);
  }

  static validateRateLimit(socketId, action, rateLimits = new Map()) {
    return validateRateLimit(socketId, action, rateLimits);
  }

  static validateIPAddress(ip) {
    return validateIPAddress(ip);
  }

  static validateSession(sessionData) {
    return validateSession(sessionData);
  }

  static validateInput(input, rules) {
    return validateInput(input, rules);
  }

  static validateBatch(data, validationRules) {
    return validateBatch(data, validationRules);
  }
}

module.exports = Validators;
