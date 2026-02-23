(function initializeSocketClientErrors(global) {
  function isTransientNetworkError(message = '') {
    const normalized = String(message || '').toLowerCase();
    return (
      normalized.includes('fetch failed') ||
      normalized.includes('networkerror') ||
      normalized.includes('network error') ||
      normalized.includes('timeout') ||
      normalized.includes('econnreset') ||
      normalized.includes('econnrefused') ||
      normalized.includes('socket hang up') ||
      normalized.includes('temporarily unavailable')
    );
  }

  function normalizeServerError(data = {}) {
    let message = data.message || 'An error occurred';
    let type = 'error';

    if (data.type === 'party_full') {
      message = 'Session is full. This party already has two players.';
      type = 'warning';
    } else if (data.type === 'not_found') {
      message = 'Party not found. Please check the party code and try again.';
      type = 'error';
    } else if (data.type === 'validation') {
      message = data.message || 'Validation failed. Please check your input and try again.';
      type = 'error';
    } else if (data.type === 'already_in_party') {
      message = 'You are already in a party. Please leave your current party first.';
      type = 'warning';
    } else if (isTransientNetworkError(message)) {
      message = 'Connection issue detected. Retrying in the background.';
      type = 'warning';
    } else if (data.context === 'make_guess' && message.toLowerCase().includes('wait')) {
      type = 'info';
    }

    return { message, type };
  }

  function handleServerError(data) {
    const normalized = normalizeServerError(data);
    if (typeof UI !== 'undefined') {
      UI.showNotification(normalized.message, normalized.type, 5000);
    }
  }

  global.SocketClientErrors = {
    isTransientNetworkError,
    normalizeServerError,
    handleServerError,
  };
})(window);
