(function attachUIAccessibilityMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    announceStatus(message, { priority = 'polite' } = {}) {
      const safeMessage = String(message || '');
      const normalizedPriority = priority === 'assertive' ? 'assertive' : 'polite';

      this._announcementState = {
        message: safeMessage,
        priority: normalizedPriority,
      };

      const liveRegion = document.getElementById('appLiveRegion');
      if (!liveRegion) {
        return this._announcementState;
      }

      if (typeof liveRegion.setAttribute === 'function') {
        liveRegion.setAttribute('aria-live', normalizedPriority);
      }

      liveRegion.dataset.priority = normalizedPriority;
      liveRegion.textContent = safeMessage;
      return this._announcementState;
    },

    getAnnouncementState() {
      return this._announcementState
        ? { ...this._announcementState }
        : {
            message: '',
            priority: 'polite',
          };
    },
  });
})(window);
