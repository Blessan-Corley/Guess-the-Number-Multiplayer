(function attachUIActionMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    showConfirmDialog(title, message, onConfirm, onCancel = null) {
      const existingDialog = document.querySelector('.confirm-dialog');
      if (existingDialog) {
        existingDialog.remove();
      }

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.innerHTML = `
                <div class="confirm-overlay"></div>
                <div class="confirm-content active">
                    <div class="confirm-header">
                        <i data-lucide="help-circle" class="confirm-icon"></i>
                        <h3 class="confirm-title">${title}</h3>
                    </div>
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-buttons">
                        <button class="btn btn-danger confirm-yes"><i data-lucide="log-out"></i> Leave</button>
                        <button class="btn btn-secondary confirm-no">Cancel</button>
                    </div>
                </div>
            `;

      document.body.appendChild(dialog);
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      dialog.querySelector('.confirm-yes').onclick = () => {
        dialog.remove();
        if (onConfirm) {
          onConfirm();
        }
      };

      dialog.querySelector('.confirm-no').onclick = () => {
        dialog.remove();
        if (onCancel) {
          onCancel();
        }
      };

      dialog.querySelector('.confirm-overlay').onclick = () => {
        dialog.remove();
        if (onCancel) {
          onCancel();
        }
      };

      setTimeout(() => {
        dialog.querySelector('.confirm-no').focus();
      }, 100);
    },

    copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            this.showNotification(
              'Party code copied to clipboard! Share it with your friend.',
              'success'
            );
          })
          .catch(() => {
            this.fallbackCopyToClipboard(text);
          });
        return;
      }

      this.fallbackCopyToClipboard(text);
    },

    fallbackCopyToClipboard(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        this.showNotification('Party code copied! Share it with your friend.', 'success');
      } catch (error) {
        this.showNotification(`Failed to copy. Please copy manually: ${text}`, 'error', 8000);
      }

      document.body.removeChild(textArea);
    },

    setButtonLoading(button, text = 'Loading...') {
      if (!button) {
        return;
      }

      button.dataset.originalText = button.innerHTML;
      button.innerHTML = text;
      button.classList.add('loading');
      button.disabled = true;
    },

    setButtonSuccess(button, text = 'Success!', duration = 2000) {
      if (!button) {
        return;
      }

      const originalText = button.dataset.originalText || button.innerHTML;
      button.innerHTML = text;
      button.classList.remove('loading');
      button.classList.add('success');
      button.disabled = false;

      setTimeout(() => {
        this.resetButton(button, originalText);
      }, duration);
    },

    setButtonError(button, text = 'Error!', duration = 2000) {
      if (!button) {
        return;
      }

      const originalText = button.dataset.originalText || button.innerHTML;
      button.innerHTML = text;
      button.classList.remove('loading');
      button.classList.add('error');
      button.disabled = false;

      setTimeout(() => {
        this.resetButton(button, originalText);
      }, duration);
    },

    resetButton(button, text = null) {
      if (!button) {
        return;
      }

      const originalText = text || button.dataset.originalText;
      if (originalText) {
        button.innerHTML = originalText;
        delete button.dataset.originalText;
      }

      button.classList.remove('loading', 'success', 'error');
      button.disabled = false;
    },
  });
})(window);
