(function attachUINotificationFlowMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    getNotificationDedupKey(message, type = 'info', specialStyle = null) {
      const normalizedMessage = String(message || '')
        .trim()
        .toLowerCase();
      return `${type}|${specialStyle || ''}|${normalizedMessage}`;
    },

    getNotificationCooldownMs(message, type = 'info') {
      const normalized = String(message || '').toLowerCase();

      if (
        normalized.includes('connection') ||
        normalized.includes('reconnect') ||
        normalized.includes('disconnected') ||
        normalized.includes('network')
      ) {
        return 10000;
      }

      if (type === 'error' || type === 'critical') {
        return 3000;
      }

      return 1500;
    },

    shouldSuppressNotification(dedupKey, cooldownMs) {
      if (!this.notificationLastShownAt) {
        this.notificationLastShownAt = new Map();
      }

      const lastShownAt = this.notificationLastShownAt.get(dedupKey) || 0;
      const now = Date.now();
      if (now - lastShownAt < cooldownMs) {
        return true;
      }

      this.notificationLastShownAt.set(dedupKey, now);
      return false;
    },

    hasNotificationQueued(dedupKey) {
      if (!Array.isArray(this.notificationQueue)) {
        return false;
      }

      return this.notificationQueue.some((item) => item && item.dedupKey === dedupKey);
    },

    showNotification(message, type = 'info', duration = 4000, specialStyle = null) {
      const trimmedMessage = String(message || '').trim();
      if (!trimmedMessage) {
        return;
      }

      if (!this.notificationQueue) {
        this.notificationQueue = [];
      }
      if (!this.maxNotifications) {
        this.maxNotifications = 3;
      }

      const dedupKey = this.getNotificationDedupKey(trimmedMessage, type, specialStyle);
      const cooldownMs = this.getNotificationCooldownMs(trimmedMessage, type);
      if (this.shouldSuppressNotification(dedupKey, cooldownMs)) {
        return;
      }

      if (this.getActiveNotifications().length >= this.maxNotifications) {
        if (!this.hasNotificationQueued(dedupKey)) {
          this.notificationQueue.push({
            message: trimmedMessage,
            type,
            duration,
            specialStyle,
            dedupKey,
          });
        }
        return;
      }

      this.displayNotification(trimmedMessage, type, duration, specialStyle);
    },
  });
})(window);
