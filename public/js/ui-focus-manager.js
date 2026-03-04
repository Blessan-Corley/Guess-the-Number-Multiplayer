(function attachUIFocusManagerMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  function resolveTarget(targetOrId) {
    if (!targetOrId) {
      return null;
    }

    if (typeof targetOrId === 'string') {
      return document.getElementById(targetOrId);
    }

    return targetOrId;
  }

  Object.assign(UIClass, {
    focusTarget(targetOrId, { delay = 0 } = {}) {
      const attemptFocus = () => {
        const target = resolveTarget(targetOrId);
        if (!target || typeof target.focus !== 'function') {
          return false;
        }

        if (typeof target.setAttribute === 'function' && !target.hasAttribute?.('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }

        target.focus();
        return true;
      };

      if (delay > 0) {
        setTimeout(attemptFocus, delay);
        return;
      }

      setTimeout(attemptFocus, 0);
    },
  });
})(window);
