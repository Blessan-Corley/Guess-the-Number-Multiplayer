(function attachUIActionMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  const selectors = global.AppStateSelectors || null;
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    submitReady() {
      const button = document.getElementById('readyBtn');
      const secretNumberInput = document.getElementById('secretNumber');

      if (!button || !secretNumberInput || button.disabled) {
        return;
      }

      if (typeof Game !== 'undefined' && Game.currentState?.gameMode === 'single') {
        singlePlayerGame.setPlayerReady();
        return;
      }

      if (!this.validateInput(secretNumberInput)) {
        if (typeof this.focusFirstInvalidInput === 'function') {
          this.focusFirstInvalidInput([secretNumberInput]);
        }
        this.showNotification(
          this.getNumberValidationMessage(secretNumberInput, 'Secret number'),
          'error'
        );
        return;
      }

      const secretNumber = Number.parseInt(secretNumberInput.value, 10);
      this.setButtonLoading(button, 'Setting...');
      Game.setReady(secretNumber);
    },

    submitGuess() {
      const button = document.getElementById('makeGuessBtn');
      const guessInput = document.getElementById('guessInput');

      if (!button || !guessInput || button.disabled) {
        return;
      }

      if (!this.validateInput(guessInput)) {
        if (typeof this.focusFirstInvalidInput === 'function') {
          this.focusFirstInvalidInput([guessInput]);
        }
        this.showNotification(this.getNumberValidationMessage(guessInput, 'Guess'), 'error');
        return;
      }

      const guess = Number.parseInt(guessInput.value, 10);
      this.setButtonLoading(button, 'Guessing...');
      guessInput.value = '';
      guessInput.disabled = true;
      guessInput.placeholder = 'Checking guess...';

      if (button._guessRecoveryTimeout) {
        clearTimeout(button._guessRecoveryTimeout);
      }

      button._guessRecoveryTimeout = setTimeout(() => {
        this.resetGuessSubmissionState({ focus: false });
      }, 5000);

      const accepted = Game.makeGuess(guess);
      if (!accepted) {
        this.resetGuessSubmissionState({ focus: true });
      }
    },

    resetGuessSubmissionState({ focus = true } = {}) {
      if (typeof Game !== 'undefined' && Game.currentState?.hasFinished) {
        return;
      }

      const button = document.getElementById('makeGuessBtn');
      const guessInput = document.getElementById('guessInput');

      if (button?._guessRecoveryTimeout) {
        clearTimeout(button._guessRecoveryTimeout);
        delete button._guessRecoveryTimeout;
      }

      if (button) {
        this.resetButton(button, '<i data-lucide="target"></i> Guess!');
        button.classList.remove('finished');
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      if (guessInput) {
        guessInput.disabled = false;
        guessInput.placeholder = 'Enter your guess';
        if (focus && document.getElementById('gameScreen')?.classList.contains('active')) {
          guessInput.focus();
        }
      }
    },

    getNumberValidationMessage(input, label = 'Number') {
      const rawValue = input?.value?.trim() || '';
      if (!rawValue) {
        return `Please enter a valid ${label.toLowerCase()}`;
      }

      const value = Number.parseInt(rawValue, 10);
      if (!Number.isInteger(value)) {
        return `Please enter a valid ${label.toLowerCase()}`;
      }

      const { min, max } = this.getCurrentNumberBounds();
      if (value < min || value > max) {
        return `${label} must be between ${min} and ${max}`;
      }

      return `Please enter a valid ${label.toLowerCase()}`;
    },

    getCurrentNumberBounds() {
      if (selectors && typeof selectors.getNumberBounds === 'function') {
        const bounds = selectors.getNumberBounds();
        if (Number.isFinite(bounds?.min) && Number.isFinite(bounds?.max)) {
          return bounds;
        }
      }

      const rangeStartEl = document.getElementById('rangeStart');
      const rangeEndEl = document.getElementById('rangeEnd');
      return {
        min: Number.parseInt(rangeStartEl?.value || '1', 10) || 1,
        max: Number.parseInt(rangeEndEl?.value || '100', 10) || 100,
      };
    },

    handlePrimaryButtonPointerDown(event, callback) {
      if (typeof event.button === 'number' && event.button !== 0) {
        return;
      }

      const button = event.currentTarget;
      if (!button || button.disabled) {
        return;
      }

      const now = Date.now();
      const pointerActivatedAt = Number.parseInt(button.dataset.pointerActivatedAt || '0', 10);
      if (pointerActivatedAt && now - pointerActivatedAt < 100) {
        return;
      }

      button.dataset.pointerActivatedAt = String(now);
      event.preventDefault();
      callback();
    },

    handlePrimaryButtonClick(event, callback) {
      const button = event.currentTarget;
      if (!button || button.disabled) {
        return;
      }

      const pointerActivatedAt = Number.parseInt(button.dataset.pointerActivatedAt || '0', 10);
      if (pointerActivatedAt && Date.now() - pointerActivatedAt < 1000) {
        delete button.dataset.pointerActivatedAt;
        return;
      }

      callback();
    },
  });
})(window);
