const ERROR_CODES = require('./errorCodes');

class AppError extends Error {
  constructor({
    code = ERROR_CODES.INTERNAL_ERROR,
    statusCode = 500,
    safeMessage = 'Something went wrong',
    details = null,
    cause = null,
  } = {}) {
    super(safeMessage);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
    this.details = details;
    this.cause = cause;
  }
}

module.exports = AppError;
