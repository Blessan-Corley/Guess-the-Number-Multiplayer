(function initializeAppRules(global) {
  const fallbackConfig = {
    DEFAULT_RANGE_START: 1,
    DEFAULT_RANGE_END: 100,
    MIN_RANGE_VALUE: 1,
    MAX_RANGE_VALUE: 10000,
    MIN_RANGE_SIZE: 5,
    PARTY_CODE_LENGTH: 6,
    PLAYER_NAME_MIN_LENGTH: 2,
    PLAYER_NAME_MAX_LENGTH: 20,
  };

  function getSharedConfig() {
    return {
      ...fallbackConfig,
      ...(global.SHARED_CONFIG || {}),
    };
  }

  function getPlayerNamePattern() {
    return /^[a-zA-Z0-9\s\-_]+$/;
  }

  function getPartyCodePattern() {
    return /^[A-Z0-9]+$/;
  }

  global.AppRules = {
    getSharedConfig,
    getPlayerNamePattern,
    getPartyCodePattern,
  };
})(window);
