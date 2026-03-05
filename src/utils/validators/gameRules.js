const config = require('../../../config/config');

const RESTRICTED_NAME_WORDS = ['admin', 'bot', 'system', 'server', 'null', 'undefined'];
const PLAYER_NAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;
const PARTY_CODE_PATTERN = /^[A-Z0-9]+$/;

function validatePartyCode(code) {
  const errors = [];

  if (!code) {
    errors.push('Party code is required');
  } else if (typeof code !== 'string') {
    errors.push('Party code must be a string');
  } else {
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length !== config.PARTY_CODE_LENGTH) {
      errors.push(`Party code must be exactly ${config.PARTY_CODE_LENGTH} characters long`);
    }

    if (!PARTY_CODE_PATTERN.test(cleanCode)) {
      errors.push('Party code can only contain letters and numbers');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: code && typeof code === 'string' ? code.trim().toUpperCase() : null,
  };
}

function validatePlayerName(name) {
  const errors = [];

  if (!name) {
    errors.push('Player name is required');
  } else if (typeof name !== 'string') {
    errors.push('Player name must be a string');
  } else {
    const cleanName = name.trim();

    if (cleanName.length === 0) {
      errors.push('Player name cannot be empty');
    } else if (cleanName.length > config.PLAYER_NAME_MAX_LENGTH) {
      errors.push(`Player name cannot be longer than ${config.PLAYER_NAME_MAX_LENGTH} characters`);
    } else if (cleanName.length < config.PLAYER_NAME_MIN_LENGTH) {
      errors.push(`Player name must be at least ${config.PLAYER_NAME_MIN_LENGTH} characters long`);
    }

    if (!PLAYER_NAME_PATTERN.test(cleanName)) {
      errors.push(
        'Player name can only contain letters, numbers, spaces, hyphens, and underscores'
      );
    }

    if (RESTRICTED_NAME_WORDS.some((word) => cleanName.toLowerCase().includes(word))) {
      errors.push('Player name contains restricted words');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: name && typeof name === 'string' ? name.trim() : null,
  };
}

function validateGuess(guess, rangeStart, rangeEnd) {
  const errors = [];

  if (guess === null || guess === undefined) {
    errors.push('Guess is required');
  } else if (typeof guess !== 'number' || Number.isNaN(guess)) {
    errors.push('Guess must be a valid number');
  } else if (!Number.isInteger(guess)) {
    errors.push('Guess must be a whole number');
  } else {
    if (guess < rangeStart) {
      errors.push(`Guess must be at least ${rangeStart}`);
    }

    if (guess > rangeEnd) {
      errors.push(`Guess must be at most ${rangeEnd}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: typeof guess === 'number' ? Math.floor(guess) : null,
  };
}

function validateGameRange(rangeStart, rangeEnd) {
  const errors = [];

  if (typeof rangeStart !== 'number' || Number.isNaN(rangeStart)) {
    errors.push('Range start must be a valid number');
  }

  if (typeof rangeEnd !== 'number' || Number.isNaN(rangeEnd)) {
    errors.push('Range end must be a valid number');
  }

  if (errors.length === 0) {
    const start = Math.floor(rangeStart);
    const end = Math.floor(rangeEnd);

    if (start < config.MIN_RANGE_VALUE) {
      errors.push(`Range start must be at least ${config.MIN_RANGE_VALUE}`);
    }

    if (end > config.MAX_RANGE_VALUE) {
      errors.push(`Range end cannot exceed ${config.MAX_RANGE_VALUE}`);
    }

    if (end <= start) {
      errors.push('Range end must be greater than range start');
    }

    const rangeSize = end - start + 1;
    if (rangeSize < config.MIN_RANGE_SIZE) {
      errors.push(`Range must be at least ${config.MIN_RANGE_SIZE} numbers`);
    }

    if (rangeSize > config.MAX_RANGE_SIZE) {
      errors.push(`Range cannot exceed ${config.MAX_RANGE_SIZE} numbers`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue:
      errors.length === 0
        ? {
            start: Math.floor(rangeStart),
            end: Math.floor(rangeEnd),
          }
        : null,
  };
}

function validateGameSettings(settings) {
  const errors = [];
  const cleanSettings = {};

  if (settings.rangeStart !== undefined || settings.rangeEnd !== undefined) {
    const rangeValidation = validateGameRange(
      settings.rangeStart ?? config.DEFAULT_RANGE_START,
      settings.rangeEnd ?? config.DEFAULT_RANGE_END
    );

    if (!rangeValidation.valid) {
      errors.push(...rangeValidation.errors);
    } else {
      cleanSettings.rangeStart = rangeValidation.cleanValue.start;
      cleanSettings.rangeEnd = rangeValidation.cleanValue.end;
    }
  }

  if (settings.selectionTimeLimit !== undefined) {
    if (
      typeof settings.selectionTimeLimit !== 'number' ||
      settings.selectionTimeLimit < 10 ||
      settings.selectionTimeLimit > 120
    ) {
      errors.push('Selection time limit must be between 10 and 120 seconds');
    } else {
      cleanSettings.selectionTimeLimit = Math.floor(settings.selectionTimeLimit);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cleanValue: cleanSettings,
  };
}

module.exports = {
  validatePartyCode,
  validatePlayerName,
  validateGuess,
  validateGameRange,
  validateGameSettings,
};
