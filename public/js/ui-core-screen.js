(function attachUIScreenMethods(global) {
  const UIClass = global.UI || (typeof UI !== 'undefined' ? UI : null);
  if (!UIClass) {
    return;
  }

  Object.assign(UIClass, {
    showScreen(screenId) {
      document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.remove('active');
      });

      const targetScreen = document.getElementById(screenId);
      if (targetScreen) {
        targetScreen.classList.add('active');
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      if (screenId === 'gameScreen') {
        setTimeout(() => {
          const guessBtn = document.getElementById('makeGuessBtn');
          if (guessBtn) {
            guessBtn.disabled = false;
            guessBtn.innerHTML = '<i data-lucide="target"></i> Guess';
            guessBtn.classList.remove('finished', 'loading', 'btn-loading');
            guessBtn.style.backgroundColor = '';
            guessBtn.style.transform = '';
            if (typeof lucide !== 'undefined') {
              lucide.createIcons();
            }
          }
        }, 100);
      }

      if (screenId === 'selectionScreen') {
        setTimeout(() => {
          const readyBtn = document.getElementById('readyBtn');
          if (readyBtn) {
            readyBtn.disabled = false;
            readyBtn.innerHTML = '<i data-lucide="check-circle"></i> Ready';
            readyBtn.classList.remove('finished', 'loading', 'btn-loading');
            readyBtn.style.backgroundColor = '';
            readyBtn.style.transform = '';
            if (typeof lucide !== 'undefined') {
              lucide.createIcons();
            }
          }
        }, 100);
      }

      this.focusFirstInput(screenId);
      window.location.hash = screenId;
    },

    focusFirstInput(screenId) {
      setTimeout(() => {
        const screen = document.getElementById(screenId);
        if (!screen) {
          return;
        }

        const firstInput = screen.querySelector('input:not([disabled]), button:not([disabled])');
        if (firstInput && !firstInput.classList.contains('back-btn')) {
          if (typeof this.focusTarget === 'function') {
            this.focusTarget(firstInput);
            return;
          }

          firstInput.focus();
        }
      }, 100);
    },

    updateConnectionStatus(statusInput) {
      const statusElement = document.getElementById('connectionStatus');
      if (!statusElement) {
        return;
      }

      const payload = typeof statusInput === 'string' ? { status: statusInput } : statusInput || {};
      const status = payload.status || 'disconnected';
      const latencyMs = Number(payload.latencyMs);
      const signal = payload.signal || 'unknown';
      const hasLatency = Number.isFinite(latencyMs);

      const signalLabelMap = {
        strong: 'Strong',
        fair: 'Fair',
        weak: 'Weak',
        unstable: 'Unstable',
        unknown: 'Checking',
      };

      statusElement.className = `connection-status ${status}`;
      statusElement.dataset.signal = signal;

      switch (status) {
        case 'connected':
          if (hasLatency) {
            statusElement.innerHTML = `Connected - ${latencyMs}ms - ${signalLabelMap[signal] || signalLabelMap.unknown}`;
            statusElement.title = `Connected to server (${latencyMs}ms, ${signalLabelMap[signal] || 'Checking'} signal)`;
          } else {
            statusElement.innerHTML = 'Connected - Checking latency...';
            statusElement.title = 'Connected to server (measuring latency)';
          }
          if (typeof this.announceStatus === 'function') {
            this.announceStatus('Connected to server.', { priority: 'polite' });
          }
          break;
        case 'connecting':
          statusElement.innerHTML = 'Connecting...';
          statusElement.title = 'Connecting to server...';
          if (typeof this.announceStatus === 'function') {
            this.announceStatus('Connecting to server...', { priority: 'polite' });
          }
          break;
        case 'disconnected':
          statusElement.innerHTML = 'Disconnected';
          statusElement.title = 'Disconnected from server - attempting to reconnect';
          if (typeof this.announceStatus === 'function') {
            this.announceStatus('Connection lost. Attempting to reconnect.', {
              priority: 'assertive',
            });
          }
          {
            const now = Date.now();
            const cooldownMs = 15000;
            const lastToastAt = this._lastConnectionLostToastAt || 0;
            const shouldNotify =
              this._lastConnectionStatus !== 'disconnected' || now - lastToastAt >= cooldownMs;

            if (shouldNotify) {
              this._lastConnectionLostToastAt = now;
              this.showNotification(
                'Connection lost. Attempting to reconnect...',
                'critical',
                10000
              );
            }
          }
          break;
        default:
          break;
      }

      if (typeof this.updateMultiplayerConnectionLatency === 'function') {
        this.updateMultiplayerConnectionLatency(hasLatency ? latencyMs : null, signal);
      }

      this._lastConnectionStatus = status;
    },

    showLoadingOverlay(message = 'Loading...') {
      const overlay = document.getElementById('loadingOverlay');
      if (!overlay) {
        return;
      }

      const text = overlay.querySelector('.loading-text');
      if (text) {
        text.textContent = message;
      }
      overlay.style.display = 'flex';
    },

    hideLoadingOverlay() {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    },

    showHowToPlay(mode = 'multiplayer') {
      const modal = document.getElementById('howToPlayModal');
      const content = document.getElementById('howToPlayContent');
      if (!modal || !content) {
        return;
      }

      content.innerHTML = window.UIGuides ? window.UIGuides.getGuide(mode) : '';

      if (history.pushState) {
        history.pushState({ modal: 'howToPlay' }, '', window.location.href);
      }

      if (typeof this.openModalWithFocus === 'function') {
        this.openModalWithFocus(modal, {
          trigger: document.activeElement || null,
          initialFocusId: 'closeHowToPlay',
        });
        return;
      }

      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    },

    hideHowToPlay() {
      const modal = document.getElementById('howToPlayModal');
      if (modal && modal.style.display === 'flex') {
        if (typeof this.closeModalWithFocus === 'function') {
          this.closeModalWithFocus(modal);
          return;
        }
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    },

    clearInputs() {
      // Preserve the player name — it is user preference data persisted in
      // localStorage and should survive returning to the welcome screen.
      // Restore from localStorage if the field is somehow empty.
      const playerNameInput = document.getElementById('playerName');
      if (playerNameInput && !playerNameInput.value) {
        const savedName =
          localStorage.getItem('numberGuesserProfileName') ||
          (() => {
            try {
              return (
                JSON.parse(localStorage.getItem('numberGuesserPrefs') || '{}').lastPlayerName || ''
              );
            } catch (_) {
              return '';
            }
          })();
        if (savedName) {
          playerNameInput.value = savedName;
        }
      }

      document.getElementById('partyCodeInput').value = '';
      document.getElementById('joinPartyDiv').style.display = 'none';
      document.getElementById('joinPartyBtn').textContent = 'Join Party';

      document.getElementById('singlePlayerOptions').style.display = 'none';
      document.getElementById('multiplayerOptions').style.display = 'none';
      document.getElementById('singlePlayerBtn').classList.remove('active');
      document.getElementById('multiplayerBtn').classList.remove('active');

      const helperDiv = document.getElementById('invitation-helper');
      if (helperDiv) {
        helperDiv.remove();
      }
    },

    resetGameState() {
      this.hidePartyInfo();
      this.clearInputs();
      this.showScreen('welcomeScreen');

      document.querySelectorAll('.pulse-animation').forEach((element) => {
        element.classList.remove('pulse-animation');
      });

      this.cleanup();
    },

    checkAutoJoin() {
      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get('join');
      if (!joinCode) {
        return;
      }

      document.getElementById('partyCodeInput').value = joinCode.toUpperCase();
      document.getElementById('multiplayerBtn').click();
      document.getElementById('joinPartyBtn').click();
      document.getElementById('playerName').focus();

      this.showNotification('Party code loaded from link. Enter your name to join.', 'info', 6000);
    },

    simpleButtonCheck() {
      const readyBtn = document.getElementById('readyBtn');
      if (readyBtn && readyBtn.textContent === 'Setting...') {
        readyBtn.disabled = false;
        readyBtn.innerHTML = '<i data-lucide="check-circle"></i> Ready';
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      const guessBtn = document.getElementById('makeGuessBtn');
      if (guessBtn && guessBtn.textContent === 'Guessing...') {
        if (typeof this.resetGuessSubmissionState === 'function') {
          this.resetGuessSubmissionState({ focus: false });
        } else {
          guessBtn.disabled = false;
          guessBtn.innerHTML = '<i data-lucide="target"></i> Guess';
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }
      }
    },
  });
})(window);
