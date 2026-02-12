const config = require('../../../config/config');
const {
  validatePartyCode: validateSharedPartyCode,
  validatePlayerName: validateSharedPlayerName,
} = require('../../utils/validators/gameRules');

function validatePartyCode(code, expectedLength = config.PARTY_CODE_LENGTH) {
  const result = validateSharedPartyCode(code);
  if (!result.valid) {
    return { valid: false, error: result.errors[0] };
  }

  if (result.cleanValue.length !== expectedLength) {
    return { valid: false, error: `Party code must be ${expectedLength} characters long` };
  }

  return {
    valid: true,
    code: result.cleanValue,
  };
}

function validatePlayerName(name) {
  const result = validateSharedPlayerName(name);
  if (!result.valid) {
    return { valid: false, error: result.errors[0] };
  }

  return {
    valid: true,
    name: result.cleanValue,
  };
}

module.exports = {
  validatePartyCode,
  validatePlayerName,
};
