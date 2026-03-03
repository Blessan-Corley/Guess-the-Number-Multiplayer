(function registerUIEventBindingMethods(global) {
  function getRules() {
    return global.AppRules
      ? global.AppRules.getSharedConfig()
      : {
          MIN_RANGE_VALUE: 1,
          MAX_RANGE_VALUE: 10000,
        };
  }

  global.UIEventBindingMethods = {
    setupEventListeners() {
      const rules = getRules();
      const bindPrimaryAction = (button, callback) => {
        if (!button) {
          return;
        }

        button.addEventListener('pointerdown', (event) =>
          this.handlePrimaryButtonPointerDown(event, callback)
        );
        button.addEventListener('mousedown', (event) =>
          this.handlePrimaryButtonPointerDown(event, callback)
        );
        button.addEventListener('click', (event) => this.handlePrimaryButtonClick(event, callback));
      };
      const triggerSinglePlayerStart = () => {
        Game.startSinglePlayer();
      };
      const triggerCreateParty = () => {
        const button = document.getElementById('createPartyBtn');
        const playerName = document.getElementById('playerName').value.trim();

        if (!this.validateInput(document.getElementById('playerName'))) {
          this.showNotification('Please enter a valid name', 'error');
          return;
        }

        this.setButtonLoading(button, 'Creating...');
        Game.createParty(playerName);
      };
      const triggerJoinParty = () => {
        const button = document.getElementById('joinPartySubmitBtn');
        const playerNameInput = document.getElementById('playerName');
        const partyCodeInput = document.getElementById('partyCodeInput');

        if (!this.validateInput(playerNameInput) || !this.validateInput(partyCodeInput)) {
          this.showNotification('Please enter valid name and party code', 'error');
          return;
        }

        this.setButtonLoading(button, 'Joining...');
        Game.joinParty(partyCodeInput.value.trim(), playerNameInput.value.trim());
      };

      document.getElementById('singlePlayerBtn').addEventListener('click', () => {
        Game.selectSinglePlayer();
      });

      document.getElementById('multiplayerBtn').addEventListener('click', () => {
        Game.selectMultiplayer();
      });

      const startSinglePlayerBtn = document.getElementById('startSinglePlayerBtn');
      bindPrimaryAction(startSinglePlayerBtn, triggerSinglePlayerStart);

      const howToPlaySingleBtn = document.getElementById('howToPlaySingleBtn');
      if (howToPlaySingleBtn) {
        howToPlaySingleBtn.addEventListener('click', () => {
          this.showHowToPlay('singleplayer');
        });
      }

      const welcomeHowToPlay = document.getElementById('welcomeHowToPlay');
      if (welcomeHowToPlay) {
        welcomeHowToPlay.addEventListener('click', (event) => {
          event.preventDefault();
          this.showHowToPlay('general');
        });
      }

      const createPartyBtn = document.getElementById('createPartyBtn');
      bindPrimaryAction(createPartyBtn, triggerCreateParty);

      document.getElementById('joinPartyBtn').addEventListener('click', () => {
        const joinDiv = document.getElementById('joinPartyDiv');
        const isVisible = joinDiv.style.display === 'block';

        if (isVisible) {
          joinDiv.style.display = 'none';
          document.getElementById('joinPartyBtn').textContent = 'Join Party';
        } else {
          joinDiv.style.display = 'block';
          document.getElementById('joinPartyBtn').textContent = 'Cancel';
          document.getElementById('partyCodeInput').focus();
        }
      });

      const joinPartySubmitBtn = document.getElementById('joinPartySubmitBtn');
      bindPrimaryAction(joinPartySubmitBtn, triggerJoinParty);

      const publicRoomList = document.getElementById('publicRoomList');
      if (publicRoomList) {
        publicRoomList.addEventListener('click', (event) => {
          const joinButton = event.target.closest('[data-public-party-join]');
          if (!joinButton || joinButton.disabled) {
            return;
          }

          const playerNameInput = document.getElementById('playerName');
          if (!this.validateInput(playerNameInput)) {
            this.showNotification('Please enter a valid name', 'error');
            return;
          }

          this.setButtonLoading(joinButton, 'Joining...');
          Game.joinPublicParty(joinButton.dataset.publicPartyJoin, playerNameInput.value.trim());
        });
      }

      const partyVisibilityToggle = document.getElementById('partyVisibilityToggle');
      if (partyVisibilityToggle) {
        partyVisibilityToggle.addEventListener('click', () => {
          if (!Game.currentState?.isHost || partyVisibilityToggle.disabled) {
            return;
          }

          const nextVisibility = partyVisibilityToggle.dataset.nextVisibility || 'public';
          Game.setPartyVisibility(nextVisibility);
        });
      }

      const readyBtn = document.getElementById('readyBtn');
      bindPrimaryAction(readyBtn, () => this.submitReady());

      const guessBtn = document.getElementById('makeGuessBtn');
      bindPrimaryAction(guessBtn, () => this.submitGuess());

      document
        .querySelectorAll('.btn-preset[data-range-start][data-range-end]')
        .forEach((button) => {
          button.addEventListener('click', () => {
            const start = Number.parseInt(button.dataset.rangeStart, 10);
            const end = Number.parseInt(button.dataset.rangeEnd, 10);
            Game.setRangePreset(start, end);
          });
        });

      this.setupBackButtons();

      document.getElementById('copyCodeBtn').addEventListener('click', () => {
        const partyCode = document.getElementById('lobbyPartyCode').textContent;
        this.copyToClipboard(partyCode);
      });

      document.getElementById('startGameBtn').addEventListener('click', () => {
        Game.startGame();
      });

      document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
        this.showConfirmDialog('Leave Party', 'Are you sure you want to leave this party?', () =>
          Game.leaveParty()
        );
      });

      const howToPlayBtn = document.getElementById('howToPlayBtn');
      if (howToPlayBtn) {
        howToPlayBtn.addEventListener('click', () => {
          this.showHowToPlay('multiplayer');
        });
      }

      const rangeStartEl = document.getElementById('rangeStart');
      if (rangeStartEl) {
        rangeStartEl.addEventListener('change', (event) => {
          this.validateAndFixRange(event.target, 'start', 'rangeEnd', Game.updateSettings);
        });
        rangeStartEl.addEventListener('input', (event) => {
          const value = Number.parseInt(event.target.value, 10);
          if (value < rules.MIN_RANGE_VALUE) {
            event.target.value = rules.MIN_RANGE_VALUE;
          }
          if (value > rules.MAX_RANGE_VALUE) {
            event.target.value = rules.MAX_RANGE_VALUE;
          }
        });
      }

      const rangeEndEl = document.getElementById('rangeEnd');
      if (rangeEndEl) {
        rangeEndEl.addEventListener('change', (event) => {
          this.validateAndFixRange(event.target, 'end', 'rangeStart', Game.updateSettings);
        });
        rangeEndEl.addEventListener('input', (event) => {
          const value = Number.parseInt(event.target.value, 10);
          if (value < rules.MIN_RANGE_VALUE + 1) {
            event.target.value = rules.MIN_RANGE_VALUE + 1;
          }
          if (value > rules.MAX_RANGE_VALUE) {
            event.target.value = rules.MAX_RANGE_VALUE;
          }
        });
      }

      const singleRangeStartEl = document.getElementById('singleRangeStart');
      if (singleRangeStartEl) {
        singleRangeStartEl.addEventListener('change', (event) => {
          this.validateAndFixRange(event.target, 'start', 'singleRangeEnd');
        });
        singleRangeStartEl.addEventListener('input', (event) => {
          const value = Number.parseInt(event.target.value, 10);
          if (value < rules.MIN_RANGE_VALUE) {
            event.target.value = rules.MIN_RANGE_VALUE;
          }
          if (value > rules.MAX_RANGE_VALUE) {
            event.target.value = rules.MAX_RANGE_VALUE;
          }
        });
      }

      const singleRangeEndEl = document.getElementById('singleRangeEnd');
      if (singleRangeEndEl) {
        singleRangeEndEl.addEventListener('change', (event) => {
          this.validateAndFixRange(event.target, 'end', 'singleRangeStart');
        });
        singleRangeEndEl.addEventListener('input', (event) => {
          const value = Number.parseInt(event.target.value, 10);
          if (value < rules.MIN_RANGE_VALUE + 1) {
            event.target.value = rules.MIN_RANGE_VALUE + 1;
          }
          if (value > rules.MAX_RANGE_VALUE) {
            event.target.value = rules.MAX_RANGE_VALUE;
          }
        });
      }

      document.getElementById('nextRoundBtn').addEventListener('click', () => {
        Game.nextRound();
      });

      document.getElementById('rematchBtn').addEventListener('click', () => {
        if (Game.currentState?.gameMode === 'single') {
          singlePlayerGame.rematch();
          return;
        }
        if (typeof Game.requestRematch === 'function') {
          Game.requestRematch();
          return;
        }
        Game.rematch();
      });

      document.getElementById('leaveResultsBtn').addEventListener('click', () => {
        if (Game.currentState?.gameMode === 'single') {
          singlePlayerGame.returnToMenu();
          return;
        }
        this.showConfirmDialog('Leave Game', 'Are you sure you want to leave this game?', () =>
          Game.leaveParty()
        );
      });
    },
  };
})(window);
