(function attachUINotificationMethods(global) {
  function createIcon(iconName) {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    return icon;
  }

  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    displayNotification(message, type = 'info', duration = 4000, specialStyle = null) {
      const container = document.getElementById('notificationContainer');
      if (!container) {
        return;
      }

      const notification = document.createElement('div');
      let className = `notification ${type}`;
      if (specialStyle) {
        className += ` ${specialStyle}`;
      }
      notification.className = className;

      const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info',
        competitive: 'flame',
        victory: 'trophy',
        critical: 'shield-alert',
      };

      const iconName = icons[specialStyle] || icons[type] || icons.info;

      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'notification-icon';
      iconWrapper.appendChild(createIcon(iconName));

      const messageWrapper = document.createElement('div');
      messageWrapper.className = 'notification-message';
      messageWrapper.textContent = String(message);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.appendChild(createIcon('x'));

      notification.appendChild(iconWrapper);
      notification.appendChild(messageWrapper);
      notification.appendChild(closeBtn);

      container.appendChild(notification);

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      closeBtn.onclick = () => this.removeNotification(notification);

      const autoRemoveDelay = type === 'critical' ? duration * 2 : duration;
      const timeoutId = setTimeout(() => {
        this.removeNotification(notification);
      }, autoRemoveDelay);

      notification.dataset.timeoutId = timeoutId;

      notification.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
      });

      notification.addEventListener('mouseleave', () => {
        if (notification.dataset.timeoutId) {
          clearTimeout(notification.dataset.timeoutId);
        }

        const newTimeoutId = setTimeout(() => {
          this.removeNotification(notification);
        }, 2000);
        notification.dataset.timeoutId = newTimeoutId;
      });
    },

    removeNotification(notification) {
      if (!notification || !notification.parentNode) {
        return;
      }

      clearTimeout(notification.dataset.timeoutId);

      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          this.processNotificationQueue();
        }
      }, 300);
    },

    processNotificationQueue() {
      if (!this.notificationQueue) {
        this.notificationQueue = [];
      }
      if (!this.maxNotifications) {
        this.maxNotifications = 3;
      }

      if (!Array.isArray(this.notificationQueue) || this.notificationQueue.length === 0) {
        return;
      }

      if (this.getActiveNotifications().length >= this.maxNotifications) {
        return;
      }

      const next = this.notificationQueue.shift();
      if (!next) {
        return;
      }

      this.displayNotification(next.message, next.type, next.duration, next.specialStyle);
    },

    getActiveNotifications() {
      return document.querySelectorAll('.notification');
    },

    clearAllNotifications() {
      const notifications = this.getActiveNotifications();
      notifications.forEach((notification) => {
        this.removeNotification(notification);
      });
      this.notificationQueue = [];
    },

    updateRangeVisualizer(rangeStart, rangeEnd) {
      const visualMin = document.getElementById('visualRangeMin');
      const visualMax = document.getElementById('visualRangeMax');
      const visualBar = document.getElementById('visualRangeBar');

      if (!visualMin || !visualMax || !visualBar) {
        return;
      }

      visualMin.textContent = this.currentPossibleMin;
      visualMax.textContent = this.currentPossibleMax;

      const totalRange = rangeEnd - rangeStart;
      const possibleRange = this.currentPossibleMax - this.currentPossibleMin;

      const widthPercent = (possibleRange / totalRange) * 100;
      const leftPercent = ((this.currentPossibleMin - rangeStart) / totalRange) * 100;

      visualBar.style.width = `${widthPercent}%`;
      visualBar.style.left = `${leftPercent}%`;
    },

    triggerWinConfetti() {
      if (typeof confetti !== 'function') {
        return;
      }

      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    },

    cleanup() {
      this.clearAllNotifications();

      const readyBtn = document.getElementById('readyBtn');
      if (readyBtn && readyBtn._resetTimeout) {
        clearTimeout(readyBtn._resetTimeout);
        delete readyBtn._resetTimeout;
      }

      this.notificationQueue = [];
    },
  });
})(window);
