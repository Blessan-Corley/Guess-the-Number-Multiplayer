const AppError = require('../errors/AppError');
const ERROR_CODES = require('../errors/errorCodes');
const SOCKET_EVENTS = require('./socketEvents');
const {
  validatePartyCode,
  validatePlayerName,
  validateGameSettings,
} = require('../utils/validators/gameRules');
const { validateReconnectionData } = require('../utils/validators/networkRules');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function requireInteger(value, { code, safeMessage }) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new AppError({
      code,
      statusCode: 400,
      safeMessage,
    });
  }

  return parsed;
}

function parsePlayerName(playerName) {
  const validation = validatePlayerName(playerName);
  if (!validation.valid) {
    throw new AppError({
      code: ERROR_CODES.INVALID_PLAYER_NAME,
      statusCode: 400,
      safeMessage: validation.errors[0],
    });
  }

  return validation.cleanValue;
}

function parsePartyCode(partyCode) {
  const validation = validatePartyCode(partyCode);
  if (!validation.valid) {
    throw new AppError({
      code: ERROR_CODES.INVALID_PARTY_CODE,
      statusCode: 400,
      safeMessage: validation.errors[0],
    });
  }

  return validation.cleanValue;
}

function validateSettingsPayload(data = {}) {
  const candidate = {};

  if (data.rangeStart !== undefined) {
    candidate.rangeStart = requireInteger(data.rangeStart, {
      code: ERROR_CODES.INVALID_GAME_SETTINGS,
      safeMessage: 'rangeStart must be a whole number',
    });
  }

  if (data.rangeEnd !== undefined) {
    candidate.rangeEnd = requireInteger(data.rangeEnd, {
      code: ERROR_CODES.INVALID_GAME_SETTINGS,
      safeMessage: 'rangeEnd must be a whole number',
    });
  }

  if (data.selectionTimeLimit !== undefined) {
    candidate.selectionTimeLimit = requireInteger(data.selectionTimeLimit, {
      code: ERROR_CODES.INVALID_GAME_SETTINGS,
      safeMessage: 'selectionTimeLimit must be a whole number',
    });
  }

  const validation = validateGameSettings(candidate);
  if (!validation.valid) {
    throw new AppError({
      code: ERROR_CODES.INVALID_GAME_SETTINGS,
      statusCode: 400,
      safeMessage: validation.errors[0],
    });
  }

  return validation.cleanValue;
}

const validators = {
  [SOCKET_EVENTS.INBOUND.CREATE_PARTY]: (data = {}) => ({
    playerName: parsePlayerName(data.playerName),
    guestToken: optionalString(data.guestToken),
    guestSessionSecret: optionalString(data.guestSessionSecret),
  }),
  [SOCKET_EVENTS.INBOUND.JOIN_PARTY]: (data = {}) => ({
    partyCode: parsePartyCode(data.partyCode),
    playerName: parsePlayerName(data.playerName),
    guestToken: optionalString(data.guestToken),
    guestSessionSecret: optionalString(data.guestSessionSecret),
  }),
  [SOCKET_EVENTS.INBOUND.JOIN_PUBLIC_PARTY]: (data = {}) => ({
    partyCode: parsePartyCode(data.partyCode),
    playerName: parsePlayerName(data.playerName),
    guestToken: optionalString(data.guestToken),
    guestSessionSecret: optionalString(data.guestSessionSecret),
  }),
  [SOCKET_EVENTS.INBOUND.SET_PARTY_VISIBILITY]: (data = {}) => {
    const visibility = normalizeString(data.visibility).toLowerCase();
    if (!['public', 'private'].includes(visibility)) {
      throw new AppError({
        code: ERROR_CODES.INVALID_VISIBILITY,
        statusCode: 400,
        safeMessage: 'visibility must be public or private',
      });
    }

    return { visibility };
  },
  [SOCKET_EVENTS.INBOUND.UPDATE_SETTINGS]: (data = {}) => validateSettingsPayload(data),
  [SOCKET_EVENTS.INBOUND.START_GAME]: () => ({}),
  [SOCKET_EVENTS.INBOUND.SET_READY]: (data = {}) => ({
    secretNumber: requireInteger(data.secretNumber, {
      code: ERROR_CODES.INVALID_SECRET_NUMBER,
      safeMessage: 'secretNumber must be a whole number',
    }),
  }),
  [SOCKET_EVENTS.INBOUND.MAKE_GUESS]: (data = {}) => ({
    guess: requireInteger(data.guess, {
      code: ERROR_CODES.INVALID_GUESS,
      safeMessage: 'guess must be a whole number',
    }),
  }),
  [SOCKET_EVENTS.INBOUND.NEXT_ROUND]: () => ({}),
  [SOCKET_EVENTS.INBOUND.REMATCH]: () => ({}),
  [SOCKET_EVENTS.INBOUND.REQUEST_SETTINGS_CHANGE]: () => ({}),
  [SOCKET_EVENTS.INBOUND.PLAYER_TYPING]: (data = {}) => ({
    isTyping: Boolean(data.isTyping),
  }),
  [SOCKET_EVENTS.INBOUND.HEARTBEAT]: (data = {}) => ({
    timestamp: data.timestamp === undefined ? null : Number(data.timestamp),
    clientPerfNow: data.clientPerfNow === undefined ? null : Number(data.clientPerfNow),
  }),
  [SOCKET_EVENTS.INBOUND.RECONNECT_ATTEMPT]: (data = {}) => {
    const validation = validateReconnectionData(data);
    if (!validation.valid) {
      throw new AppError({
        code: ERROR_CODES.INVALID_RECONNECT_PAYLOAD,
        statusCode: 400,
        safeMessage: validation.errors[0],
      });
    }

    return validation.cleanValue;
  },
};

function validatePayload(eventName, payload) {
  const validator = validators[eventName];
  if (!validator) {
    return payload || {};
  }

  return validator(payload || {});
}

module.exports = {
  validatePayload,
};
