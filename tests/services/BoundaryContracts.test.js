const AppError = require('../../src/errors/AppError');
const ERROR_CODES = require('../../src/errors/errorCodes');
const httpSchemas = require('../../src/contracts/httpSchemas');
const socketSchemas = require('../../src/contracts/socketSchemas');

describe('Backend boundary contracts', () => {
  test('AppError stores code, status, and safe message', () => {
    const error = new AppError({
      code: ERROR_CODES.INVALID_PARTY_CODE,
      statusCode: 400,
      safeMessage: 'Party code is invalid',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(ERROR_CODES.INVALID_PARTY_CODE);
    expect(error.statusCode).toBe(400);
    expect(error.safeMessage).toBe('Party code is invalid');
  });

  test('httpSchemas.parseLeaderboardQuery clamps the limit', () => {
    const result = httpSchemas.parseLeaderboardQuery({ limit: '9999' }, 20);
    expect(result.limit).toBe(50);
  });

  test('httpSchemas.parseProfileQuery rejects missing guest token', () => {
    expect(() => httpSchemas.parseProfileQuery({}, 'secret')).toThrow(AppError);
  });

  test('socketSchemas.validatePayload normalizes make_guess payload', () => {
    const result = socketSchemas.validatePayload('make_guess', { guess: '42' });
    expect(result).toEqual({ guess: 42 });
  });

  test('socketSchemas.validatePayload rejects malformed reconnect payload', () => {
    expect(() => socketSchemas.validatePayload('reconnect_attempt', { partyCode: 'bad' })).toThrow(
      AppError
    );
  });
});
