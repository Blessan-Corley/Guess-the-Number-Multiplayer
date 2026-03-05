(function attachUIValidationRangeRules(global) {
  function getRules() {
    return global.AppRules
      ? global.AppRules.getSharedConfig()
      : {
          MIN_RANGE_VALUE: 1,
          MAX_RANGE_VALUE: 10000,
          MIN_RANGE_SIZE: 5,
          MAX_RANGE_SIZE: 10000,
        };
  }

  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    validateAndFixRange(input, type, otherInputId, callback = null) {
      const rules = getRules();
      const value = Number.parseInt(input.value, 10);
      const otherInput = document.getElementById(otherInputId);
      if (!otherInput) {
        return;
      }

      const otherValue = Number.parseInt(otherInput.value, 10);

      if (Number.isNaN(value) || value < rules.MIN_RANGE_VALUE) {
        this.showNotification(
          `Please enter a valid number (minimum ${rules.MIN_RANGE_VALUE})`,
          'error'
        );
        input.value = type === 'start' ? rules.MIN_RANGE_VALUE : rules.MIN_RANGE_VALUE + 1;
        this.showInputError(input, 'Invalid number');
        return;
      }

      if (Number.isNaN(otherValue) || otherValue < rules.MIN_RANGE_VALUE) {
        this.showNotification('Please set both start and end numbers', 'warning');
        return;
      }

      if (value > rules.MAX_RANGE_VALUE) {
        this.showNotification(`Maximum number is ${rules.MAX_RANGE_VALUE}`, 'warning');
        input.value = rules.MAX_RANGE_VALUE;
        this.showInputError(input, 'Too large');
        return;
      }

      if (type === 'start' && value >= otherValue) {
        if (value === otherValue) {
          this.showNotification('Start and end cannot be the same', 'error');
        } else {
          this.showNotification('Start must be less than end', 'warning');
        }

        input.value = Math.max(rules.MIN_RANGE_VALUE, otherValue - 1);
        this.showInputError(input, 'Invalid range');
        return;
      }

      if (type === 'end' && value <= otherValue) {
        if (value === otherValue) {
          this.showNotification('Start and end cannot be the same', 'error');
        } else {
          this.showNotification('End must be greater than start', 'warning');
        }

        input.value = Math.min(rules.MAX_RANGE_VALUE, otherValue + 1);
        this.showInputError(input, 'Invalid range');
        return;
      }

      const rangeSize = type === 'start' ? otherValue - value + 1 : value - otherValue + 1;
      if (rangeSize < rules.MIN_RANGE_SIZE) {
        this.showNotification(
          `Range must have at least ${rules.MIN_RANGE_SIZE} numbers`,
          'warning'
        );
        if (type === 'start') {
          input.value = Math.max(rules.MIN_RANGE_VALUE, otherValue - (rules.MIN_RANGE_SIZE - 1));
        } else {
          input.value = Math.min(rules.MAX_RANGE_VALUE, otherValue + (rules.MIN_RANGE_SIZE - 1));
        }
        this.showInputError(input, 'Range too small');
        return;
      }

      if (rangeSize > rules.MAX_RANGE_SIZE) {
        this.showNotification(
          `Range too large. Maximum ${rules.MAX_RANGE_SIZE} numbers`,
          'warning'
        );
        if (type === 'start') {
          input.value = Math.max(rules.MIN_RANGE_VALUE, otherValue - (rules.MAX_RANGE_SIZE - 1));
        } else {
          input.value = Math.min(rules.MAX_RANGE_VALUE, otherValue + (rules.MAX_RANGE_SIZE - 1));
        }
        this.showInputError(input, 'Range too large');
        return;
      }

      this.clearInputState(input);
      this.clearInputState(otherInput);

      const actualStart = type === 'start' ? value : otherValue;
      const actualEnd = type === 'start' ? otherValue : value;
      const actualSize = actualEnd - actualStart + 1;
      this.showNotification(
        `Range: ${actualStart}-${actualEnd} (${actualSize} numbers)`,
        'success',
        2000
      );

      if (typeof callback === 'function') {
        callback();
      }
    },

    validateRangePair(startValue, endValue) {
      const rules = getRules();
      if (Number.isNaN(startValue) || Number.isNaN(endValue)) {
        this.showNotification('Please enter valid numbers', 'error');
        return false;
      }

      if (startValue < rules.MIN_RANGE_VALUE || endValue < rules.MIN_RANGE_VALUE) {
        this.showNotification(`Numbers must be at least ${rules.MIN_RANGE_VALUE}`, 'error');
        return false;
      }

      if (startValue > rules.MAX_RANGE_VALUE || endValue > rules.MAX_RANGE_VALUE) {
        this.showNotification(`Maximum value is ${rules.MAX_RANGE_VALUE}`, 'error');
        return false;
      }

      if (startValue >= endValue) {
        this.showNotification('Start must be less than end', 'error');
        return false;
      }

      const rangeSize = endValue - startValue + 1;
      if (rangeSize < rules.MIN_RANGE_SIZE) {
        this.showNotification(`Range must have at least ${rules.MIN_RANGE_SIZE} numbers`, 'error');
        return false;
      }

      if (rangeSize > rules.MAX_RANGE_SIZE) {
        this.showNotification(`Range too large (max ${rules.MAX_RANGE_SIZE} numbers)`, 'warning');
        return false;
      }

      return true;
    },
  });
})(window);
