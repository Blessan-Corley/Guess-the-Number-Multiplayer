(function registerUIInteractionSetupMethods(global) {
  function getRules() {
    return global.AppRules
      ? global.AppRules.getSharedConfig()
      : {
          PLAYER_NAME_MAX_LENGTH: 20,
        };
  }

  global.UIInteractionSetupMethods = {
    setupEnhancedUI() {
      document.body.classList.add('enhanced-ui');
      this.setupRealTimeValidation();
      this.setupHowToPlayModal();
    },

    setupHowToPlayModal() {
      const closeBtn = document.getElementById('closeHowToPlay');
      const gotItBtn = document.getElementById('gotItBtn');
      const modal = document.getElementById('howToPlayModal');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.hideHowToPlay();
        });
      }

      if (gotItBtn) {
        gotItBtn.addEventListener('click', () => {
          this.hideHowToPlay();
        });
      }

      if (modal) {
        modal.addEventListener('click', (event) => {
          if (event.target === modal) {
            this.hideHowToPlay();
          }
        });
      }

      document.addEventListener('keydown', (event) => {
        if (
          event.key === 'Tab' &&
          modal &&
          modal.style.display === 'flex' &&
          typeof this.trapModalFocus === 'function'
        ) {
          this.trapModalFocus(modal, event);
        }

        if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
          this.hideHowToPlay();
        }

        const playerDataModal = document.getElementById('playerDataModal');
        if (
          event.key === 'Escape' &&
          playerDataModal &&
          playerDataModal.style.display === 'flex' &&
          window.profileClient
        ) {
          window.profileClient.closeModal();
        }
      });

      window.addEventListener('popstate', () => {
        if (modal && modal.style.display === 'flex') {
          if (typeof this.closeModalWithFocus === 'function') {
            this.closeModalWithFocus(modal);
            return;
          }

          modal.style.display = 'none';
          document.body.style.overflow = '';
        }
      });
    },

    setupBackButtons() {
      this.addBackButtonToScreen('lobbyScreen', () => {
        this.showConfirmDialog('Leave Party', 'Are you sure you want to leave this party?', () => {
          Game.leaveParty();
        });
      });

      this.addBackButtonToScreen('selectionScreen', () => {
        this.showConfirmDialog('Leave Game', 'Are you sure you want to leave this game?', () => {
          Game.leaveParty();
        });
      });

      this.addBackButtonToScreen('gameScreen', () => {
        this.showConfirmDialog(
          'Leave Game',
          'Are you sure you want to leave this active game? You will lose progress.',
          () => {
            Game.leaveParty();
          }
        );
      });
    },

    addBackButtonToScreen(screenId, onBack) {
      const screen = document.getElementById(screenId);
      if (!screen) {
        return;
      }

      let backBtn = screen.querySelector('.back-btn');
      if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.className = 'btn btn-secondary back-btn';
        backBtn.type = 'button';
        backBtn.innerHTML = '<i data-lucide="arrow-left"></i> Back';
        screen.insertBefore(backBtn, screen.firstChild);

        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      backBtn.onclick = onBack;
    },

    setupInputValidation() {
      document.getElementById('partyCodeInput').addEventListener('input', (event) => {
        event.target.value = event.target.value.toUpperCase();
      });

      const numberInputs = [
        'rangeStart',
        'rangeEnd',
        'secretNumber',
        'guessInput',
        'singleRangeStart',
        'singleRangeEnd',
      ];
      numberInputs.forEach((inputId) => {
        const input = document.getElementById(inputId);
        if (input) {
          input.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/[^0-9-]/g, '');
          });
        }
      });

      document.getElementById('playerName').addEventListener('input', (event) => {
        const rules = getRules();
        const value = event.target.value;
        if (value.length > rules.PLAYER_NAME_MAX_LENGTH) {
          event.target.value = value.substring(0, rules.PLAYER_NAME_MAX_LENGTH);
          this.showNotification(
            `Name cannot exceed ${rules.PLAYER_NAME_MAX_LENGTH} characters`,
            'warning'
          );
        }
      });
    },

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          const activeScreen = document.querySelector('.screen.active');
          if (!activeScreen) {
            return;
          }

          const screenId = activeScreen.id;
          switch (screenId) {
            case 'welcomeScreen':
              if (document.getElementById('joinPartyDiv').style.display === 'block') {
                document.getElementById('joinPartySubmitBtn').click();
              } else if (document.getElementById('singlePlayerOptions').style.display === 'block') {
                document.getElementById('startSinglePlayerBtn').click();
              } else if (document.getElementById('multiplayerOptions').style.display === 'block') {
                document.getElementById('createPartyBtn').click();
              }
              break;
            case 'selectionScreen':
              if (!document.getElementById('readyBtn').disabled) {
                document.getElementById('readyBtn').click();
              }
              break;
            case 'gameScreen': {
              const guessInput = document.getElementById('guessInput');
              if (document.activeElement === guessInput && !guessInput.disabled) {
                document.getElementById('makeGuessBtn').click();
              }
              break;
            }
            default:
              break;
          }
        }

        if (event.key === 'Escape') {
          const joinDiv = document.getElementById('joinPartyDiv');
          if (joinDiv.style.display === 'block') {
            joinDiv.style.display = 'none';
            document.getElementById('joinPartyBtn').textContent = 'Join Party';
          }

          const confirmDialog = document.querySelector('.confirm-dialog');
          if (confirmDialog) {
            confirmDialog.remove();
          }
        }
      });
    },

    setupNavigationConfirmation() {
      window.addEventListener('beforeunload', (event) => {
        const activeScreen = document.querySelector('.screen.active');
        if (
          activeScreen &&
          (activeScreen.id === 'gameScreen' || activeScreen.id === 'selectionScreen')
        ) {
          event.preventDefault();
          event.returnValue = 'You are in an active game. Are you sure you want to leave?';
          return event.returnValue;
        }

        return undefined;
      });
    },
  };
})(window);
