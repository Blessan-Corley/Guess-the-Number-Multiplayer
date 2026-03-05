(function attachUIValidationLiveHooks(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    setupSecretNumberValidation(input, rangeStart, rangeEnd) {
      input.removeEventListener('input', input._secretValidationHandler);
      input.removeEventListener('blur', input._secretBlurHandler);

      const validationHandler = (event) => {
        const value = Number.parseInt(event.target.value, 10);
        if (!event.target.value || Number.isNaN(value)) {
          return;
        }

        if (value < rangeStart) {
          this.showNotification(
            `Number too low. Choose between ${rangeStart} and ${rangeEnd}.`,
            'warning',
            3000
          );
          event.target.style.borderColor = '#ffc107';
          return;
        }

        if (value > rangeEnd) {
          this.showNotification(
            `Number too high. Choose between ${rangeStart} and ${rangeEnd}.`,
            'warning',
            3000
          );
          event.target.style.borderColor = '#ffc107';
          return;
        }

        event.target.style.borderColor = '';
      };

      const blurHandler = (event) => {
        const value = Number.parseInt(event.target.value, 10);
        if (!event.target.value) {
          return;
        }

        if (Number.isNaN(value) || value < rangeStart || value > rangeEnd) {
          this.showNotification(
            `Enter a number between ${rangeStart} and ${rangeEnd}.`,
            'error',
            4000
          );
          event.target.focus();
        }
      };

      input._secretValidationHandler = validationHandler;
      input._secretBlurHandler = blurHandler;
      input.addEventListener('input', validationHandler);
      input.addEventListener('blur', blurHandler);
    },

    setupGuessInputValidation(input, rangeStart, rangeEnd) {
      input.removeEventListener('input', input._guessValidationHandler);

      const validationHandler = (event) => {
        const value = Number.parseInt(event.target.value, 10);
        if (!event.target.value || Number.isNaN(value)) {
          return;
        }

        if (value < rangeStart || value > rangeEnd) {
          this.showInputError(event.target, `Guess must be between ${rangeStart} and ${rangeEnd}`);
          return;
        }

        this.clearInputError(event.target);
      };

      input._guessValidationHandler = validationHandler;
      input.addEventListener('input', validationHandler);
    },

    setupRealTimeValidation() {
      document.addEventListener(
        'blur',
        (event) => {
          if (event.target.matches('input')) {
            this.validateInput(event.target);
          }
        },
        true
      );

      document.addEventListener(
        'input',
        (event) => {
          if (event.target.matches('input')) {
            this.clearInputError(event.target);
          }
        },
        true
      );
    },
  });
})(window);
