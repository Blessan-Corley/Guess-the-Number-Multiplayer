const { validatePartyCode } = require('./gameRules');

function validateSocketData(data, requiredFields = []) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { valid: false, errors };
  }

  requiredFields.forEach((field) => {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: data,
  };
}

function validateReconnectionData(data) {
  const errors = [];

  if (!data.partyCode) {
    errors.push('Party code is required for reconnection');
  } else {
    const codeValidation = validatePartyCode(data.partyCode);
    if (!codeValidation.valid) {
      errors.push(...codeValidation.errors);
    }
  }

  if (!data.playerId) {
    errors.push('Player ID is required for reconnection');
  } else if (typeof data.playerId !== 'string') {
    errors.push('Player ID must be a string');
  }

  if (!data.reconnectSecret || typeof data.reconnectSecret !== 'string') {
    errors.push('Reconnect secret is required for reconnection');
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: {
      partyCode: data.partyCode ? data.partyCode.trim().toUpperCase() : null,
      playerId: data.playerId,
      reconnectSecret: data.reconnectSecret,
    },
  };
}

function validateRateLimit(socketId, action, rateLimits = new Map()) {
  const now = Date.now();
  const key = `${socketId}_${action}`;
  const lastAction = rateLimits.get(key);

  const cooldowns = {
    create_party: 30000,
    join_party: 5000,
    make_guess: 1000,
    start_game: 10000,
    rematch: 5000,
  };

  const cooldown = cooldowns[action] || 1000;

  if (lastAction && now - lastAction < cooldown) {
    return {
      valid: false,
      error: `Please wait ${Math.ceil((cooldown - (now - lastAction)) / 1000)} seconds before ${action.replace('_', ' ')}`,
      remainingTime: cooldown - (now - lastAction),
    };
  }

  rateLimits.set(key, now);
  return { valid: true };
}

function validateIPAddress(ip) {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function validateSession(sessionData) {
  const errors = [];

  if (!sessionData) {
    errors.push('Session data is required');
    return { valid: false, errors };
  }

  if (!sessionData.playerId || typeof sessionData.playerId !== 'string') {
    errors.push('Valid player ID is required');
  }

  if (!sessionData.partyCode) {
    errors.push('Valid party code is required');
  } else {
    const codeValidation = validatePartyCode(sessionData.partyCode);
    if (!codeValidation.valid) {
      errors.push('Valid party code is required');
    }
  }

  if (sessionData.timestamp && typeof sessionData.timestamp !== 'number') {
    errors.push('Invalid timestamp format');
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: sessionData,
  };
}

module.exports = {
  validateSocketData,
  validateReconnectionData,
  validateRateLimit,
  validateIPAddress,
  validateSession,
};
