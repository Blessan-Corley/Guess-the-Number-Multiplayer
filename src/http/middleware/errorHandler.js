const config = require('../../../config/config');
const AppError = require('../../errors/AppError');
const ERROR_CODES = require('../../errors/errorCodes');

function normalizeError(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.safeMessage,
      label: error.statusCode >= 500 ? 'Internal server error' : 'Validation failed',
    };
  }

  if (error?.code === 'INVALID_GUEST_SESSION') {
    return {
      statusCode: 401,
      code: ERROR_CODES.INVALID_GUEST_SESSION,
      message: 'Guest session is invalid',
      label: 'Unauthorized',
    };
  }

  return {
    statusCode: 500,
    code: ERROR_CODES.INTERNAL_ERROR,
    message:
      config.NODE_ENV === 'development'
        ? error?.message || 'Something went wrong'
        : 'Something went wrong',
    label: 'Internal server error',
  };
}

function createErrorHandler(logger) {
  return (error, req, res, _next) => {
    const normalized = normalizeError(error);

    logger.error(
      {
        err: error?.message,
        code: error?.code || normalized.code,
        path: req.path,
        method: req.method,
      },
      'Request failed'
    );

    res.status(normalized.statusCode).json({
      error: normalized.label,
      code: normalized.code,
      message: normalized.message,
    });
  };
}

module.exports = {
  createErrorHandler,
  normalizeError,
};
