(function attachUIValidationFieldRules(global) {
  function getRules() {
    return global.AppRules
      ? global.AppRules.getSharedConfig()
      : {
          PLAYER_NAME_MIN_LENGTH: 2,
          PLAYER_NAME_MAX_LENGTH: 20,
          PARTY_CODE_LENGTH: 6,
          MIN_RANGE_VALUE: 1,
          MAX_RANGE_VALUE: 10000,
        };
  }

  function getPlayerNamePattern() {
    return global.AppRules ? global.AppRules.getPlayerNamePattern() : /^[a-zA-Z0-9\s\-_]+$/;
  }

  function getPartyCodePattern() {
    return global.AppRules ? global.AppRules.getPartyCodePattern() : /^[A-Z0-9]+$/;
  }

  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  const selectors = global.AppStateSelectors || null;
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    validateInput(input) {
      const id = input.id;

      switch (id) {
        case 'playerName':
          return this.validatePlayerName(input);
        case 'partyCodeInput':
          return this.validatePartyCode(input);
        case 'secretNumber':
        case 'guessInput':
          return this.validateGameNumber(input);
        case 'rangeStart':
        case 'rangeEnd':
        case 'singleRangeStart':
        case 'singleRangeEnd':
          return this.validateRangeNumber(input);
        default:
          return true;
      }
    },

    validatePlayerName(input) {
      const rules = getRules();
      const value = input.value.trim();

      if (!value) {
        this.showInputError(input, 'Name is required');
        return false;
      }

      if (value.length < rules.PLAYER_NAME_MIN_LENGTH) {
        this.showInputError(
          input,
          `Name must be at least ${rules.PLAYER_NAME_MIN_LENGTH} characters`
        );
        return false;
      }

      if (value.length > rules.PLAYER_NAME_MAX_LENGTH) {
        this.showInputError(input, `Name cannot exceed ${rules.PLAYER_NAME_MAX_LENGTH} characters`);
        return false;
      }

      if (!getPlayerNamePattern().test(value)) {
        this.showInputError(
          input,
          'Name can only contain letters, numbers, spaces, hyphens, and underscores'
        );
        return false;
      }

      this.showInputSuccess(input, 'Name looks good');
      return true;
    },

    validatePartyCode(input) {
      const rules = getRules();
      const value = input.value.trim();

      if (!value) {
        this.clearInputState(input);
        return false;
      }

      if (value.length !== rules.PARTY_CODE_LENGTH) {
        this.showInputError(input, `Party code must be ${rules.PARTY_CODE_LENGTH} characters`);
        return false;
      }

      if (!getPartyCodePattern().test(value)) {
        this.showInputError(input, 'Party code can only contain letters and numbers');
        return false;
      }

      this.showInputSuccess(input, 'Party code format is correct');
      return true;
    },

    validateGameNumber(input) {
      const value = Number.parseInt(input.value, 10);

      if (Number.isNaN(value)) {
        this.clearInputState(input);
        return false;
      }

      let min = 1;
      let max = 100;

      if (selectors && typeof selectors.getNumberBounds === 'function') {
        const bounds = selectors.getNumberBounds();
        if (Number.isFinite(bounds?.min) && Number.isFinite(bounds?.max)) {
          min = bounds.min;
          max = bounds.max;
        }
      } else {
        const rangeStartEl = document.getElementById('rangeStart');
        const rangeEndEl = document.getElementById('rangeEnd');
        if (rangeStartEl && rangeEndEl) {
          min = Number.parseInt(rangeStartEl.value, 10) || 1;
          max = Number.parseInt(rangeEndEl.value, 10) || 100;
        }
      }

      if (value < min || value > max) {
        this.showInputError(input, `Number must be between ${min} and ${max}`);
        return false;
      }

      this.clearInputState(input);
      return true;
    },

    validateRangeNumber(input) {
      const rules = getRules();
      const value = Number.parseInt(input.value, 10);

      if (Number.isNaN(value)) {
        this.clearInputState(input);
        return false;
      }

      const min = input.id.includes('Start') ? rules.MIN_RANGE_VALUE : rules.MIN_RANGE_VALUE + 1;
      const max = rules.MAX_RANGE_VALUE;
      if (value < min || value > max) {
        this.showInputError(input, `Must be between ${min} and ${max}`);
        return false;
      }

      this.clearInputState(input);
      return true;
    },
  });
})(window);
