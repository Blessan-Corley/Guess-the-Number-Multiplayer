const AppError = require('../errors/AppError');
const ERROR_CODES = require('../errors/errorCodes');
const { validatePartyCode } = require('../utils/validators/gameRules');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clampInteger(value, fallback, { min = 1, max = 50 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function requireGuestSessionSecret(guestSessionSecret) {
  const normalized = normalizeString(guestSessionSecret);
  if (!normalized) {
    throw new AppError({
      code: ERROR_CODES.INVALID_GUEST_SESSION,
      statusCode: 400,
      safeMessage: 'guestSessionSecret is required',
    });
  }

  return normalized;
}

function requireGuestToken(guestToken) {
  const normalized = normalizeString(guestToken);
  if (!normalized) {
    throw new AppError({
      code: ERROR_CODES.INVALID_GUEST_TOKEN,
      statusCode: 400,
      safeMessage: 'guestToken is required',
    });
  }

  return normalized;
}

function parseDisplayName(displayName) {
  if (displayName === undefined || displayName === null) {
    return '';
  }

  if (typeof displayName !== 'string') {
    throw new AppError({
      code: ERROR_CODES.INVALID_PLAYER_NAME,
      statusCode: 400,
      safeMessage: 'displayName must be a string',
    });
  }

  return displayName;
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

function parseLeaderboardQuery(query = {}, fallbackLimit) {
  return {
    limit: clampInteger(query.limit, fallbackLimit, { min: 1, max: 50 }),
  };
}

function parseProfileQuery(_query = {}, guestSessionSecret, guestToken) {
  return {
    guestToken: requireGuestToken(guestToken),
    guestSessionSecret: requireGuestSessionSecret(guestSessionSecret),
  };
}

function parseGuestProfileRequest(body = {}, guestSessionSecret) {
  return {
    guestToken: requireGuestToken(body.guestToken),
    guestSessionSecret: requireGuestSessionSecret(guestSessionSecret),
    displayName: parseDisplayName(body.displayName),
  };
}

function parseMatchHistoryRequest(params = {}, query = {}, fallbackLimit) {
  const profileId = normalizeString(params.profileId);
  if (!profileId) {
    throw new AppError({
      code: ERROR_CODES.INVALID_REQUEST,
      statusCode: 400,
      safeMessage: 'profileId is required',
    });
  }

  return {
    profileId,
    limit: clampInteger(query.limit, fallbackLimit, { min: 1, max: 50 }),
  };
}

function parseValidatePartyRequest(body = {}) {
  return {
    partyCode: parsePartyCode(body.partyCode),
  };
}

module.exports = {
  clampInteger,
  requireGuestSessionSecret,
  requireGuestToken,
  parseDisplayName,
  parsePartyCode,
  parseLeaderboardQuery,
  parseProfileQuery,
  parseGuestProfileRequest,
  parseMatchHistoryRequest,
  parseValidatePartyRequest,
};
