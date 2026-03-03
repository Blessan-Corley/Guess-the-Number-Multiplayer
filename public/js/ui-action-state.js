(function attachUIActionStateMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    focusFirstInvalidInput(inputs = []) {
      const firstInvalidInput = inputs.find(
        (input) => input && typeof input.focus === 'function' && !input.disabled
      );

      if (!firstInvalidInput) {
        return false;
      }

      if (typeof this.focusTarget === 'function') {
        this.focusTarget(firstInvalidInput);
        return true;
      }

      firstInvalidInput.focus();
      return true;
    },
  });
})(window);
