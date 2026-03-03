(function bootstrapUI(global) {
  function bindGlobalErrorNotifications() {
    window.addEventListener('error', () => {
      if (typeof UI !== 'undefined') {
        UI.showNotification(
          'An unexpected error occurred. Please refresh and try again.',
          'error',
          8000
        );
      }
    });

    let lastNetworkToastAt = 0;

    window.addEventListener('unhandledrejection', (event) => {
      const reasonMessage = event?.reason?.message || String(event?.reason || '');
      const isNetworkIssue =
        global.SocketClientErrors &&
        typeof global.SocketClientErrors.isTransientNetworkError === 'function' &&
        global.SocketClientErrors.isTransientNetworkError(reasonMessage);

      if (!isNetworkIssue) {
        return;
      }

      event.preventDefault();
      const now = Date.now();
      if (now - lastNetworkToastAt < 8000) {
        return;
      }
      lastNetworkToastAt = now;

      if (typeof UI !== 'undefined') {
        UI.showNotification('Temporary network issue. Retrying automatically.', 'warning', 6000);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!global.UI) {
      return;
    }

    global.UI.init();
    global.UI.checkAutoJoin();
    bindGlobalErrorNotifications();
  });
})(window);
