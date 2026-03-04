(function attachUIModalAccessibilityMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  function getFocusableElements(modal) {
    if (!modal || typeof modal.querySelectorAll !== 'function') {
      return [];
    }

    return Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]')
    );
  }

  Object.assign(UIClass, {
    trapModalFocus(modal, event) {
      if (!modal || event?.key !== 'Tab') {
        return false;
      }

      const focusable = getFocusableElements(modal).filter(
        (element) => element && typeof element.focus === 'function' && !element.disabled
      );

      if (focusable.length === 0) {
        return false;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
        return true;
      }

      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
        return true;
      }

      return false;
    },

    openModalWithFocus(modal, { trigger = null, initialFocusId = null } = {}) {
      if (!modal) {
        return;
      }

      this._activeModalTrigger = trigger || document.activeElement || null;
      this._activeModal = modal;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      const initialTarget = initialFocusId ? document.getElementById(initialFocusId) : null;
      if (initialTarget && typeof this.focusTarget === 'function') {
        this.focusTarget(initialTarget);
      }
    },

    closeModalWithFocus(modal) {
      if (!modal || modal.style.display !== 'flex') {
        return;
      }

      modal.style.display = 'none';
      document.body.style.overflow = '';

      const trigger = this._activeModalTrigger;
      this._activeModal = null;
      this._activeModalTrigger = null;

      if (trigger && typeof this.focusTarget === 'function') {
        this.focusTarget(trigger);
      }
    },
  });
})(window);
