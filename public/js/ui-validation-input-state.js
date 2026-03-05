(function attachUIValidationInputState(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    showInputError(input, message) {
      input.classList.add('error');
      input.classList.remove('success');
      this.updateInputHint(input, message, 'error');
      if (typeof input.setAttribute === 'function') {
        input.setAttribute('aria-invalid', 'true');
      }
    },

    showInputSuccess(input, message) {
      input.classList.add('success');
      input.classList.remove('error');
      this.updateInputHint(input, message, 'success');
      if (typeof input.setAttribute === 'function') {
        input.setAttribute('aria-invalid', 'false');
      }
    },

    clearInputError(input) {
      input.classList.remove('error');
      if (typeof input.setAttribute === 'function') {
        input.setAttribute('aria-invalid', 'false');
      }
    },

    clearInputState(input) {
      input.classList.remove('error', 'success');
      if (typeof input.removeAttribute === 'function') {
        input.removeAttribute('aria-invalid');
      }
      this.clearInputHint(input);
    },

    updateInputHint(input, message, type) {
      let hint = input.parentElement.querySelector('.input-hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'input-hint';
        input.parentElement.appendChild(hint);
      }

      if (input?.id) {
        hint.id = `${input.id}-error`;
        if (typeof input.setAttribute === 'function') {
          input.setAttribute('aria-describedby', hint.id);
        }
      }

      hint.textContent = message;
      hint.className = `input-hint ${type}`;
    },

    clearInputHint(input) {
      const hint = input.parentElement.querySelector('.input-hint');
      if (hint) {
        hint.remove();
      }
      if (typeof input.removeAttribute === 'function') {
        input.removeAttribute('aria-describedby');
      }
    },
  });
})(window);
