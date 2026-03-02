(function registerGameValidation(global) {
  function getRules() {
    return global.AppRules
      ? global.AppRules.getSharedConfig()
      : {
          PLAYER_NAME_MIN_LENGTH: 2,
          PLAYER_NAME_MAX_LENGTH: 20,
          PARTY_CODE_LENGTH: 6,
        };
  }

  function getPlayerNamePattern() {
    return global.AppRules ? global.AppRules.getPlayerNamePattern() : /^[a-zA-Z0-9\s\-_]+$/;
  }

  function getPartyCodePattern() {
    return global.AppRules ? global.AppRules.getPartyCodePattern() : /^[A-Z0-9]+$/;
  }

  const methods = {
    validatePlayerName(name) {
      const rules = getRules();
      if (!name || name.trim().length === 0) {
        UI.showNotification('Please enter your name', 'error');
        return false;
      }

      if (name.trim().length < rules.PLAYER_NAME_MIN_LENGTH) {
        UI.showNotification(
          `Name must be at least ${rules.PLAYER_NAME_MIN_LENGTH} characters`,
          'error'
        );
        return false;
      }

      if (name.length > rules.PLAYER_NAME_MAX_LENGTH) {
        UI.showNotification(
          `Name cannot exceed ${rules.PLAYER_NAME_MAX_LENGTH} characters`,
          'error'
        );
        return false;
      }

      if (!getPlayerNamePattern().test(name)) {
        UI.showNotification(
          'Name can only contain letters, numbers, spaces, hyphens, and underscores',
          'error'
        );
        return false;
      }

      return true;
    },

    validatePartyCode(code) {
      const rules = getRules();
      if (!code || code.trim().length === 0) {
        UI.showNotification('Please enter a party code', 'error');
        return false;
      }

      if (code.length !== rules.PARTY_CODE_LENGTH) {
        UI.showNotification(
          `Party code must be ${rules.PARTY_CODE_LENGTH} characters long`,
          'error'
        );
        return false;
      }

      if (!getPartyCodePattern().test(code.toUpperCase())) {
        UI.showNotification('Party code can only contain letters and numbers', 'error');
        return false;
      }

      return true;
    },
  };

  Object.assign(global.Game, methods);
})(window);
