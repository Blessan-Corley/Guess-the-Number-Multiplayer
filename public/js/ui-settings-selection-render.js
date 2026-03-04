(function registerUISettingsSelectionRenderMethods(global) {
  global.UISettingsSelectionRenderMethods = {
    updateGameSettings(settings) {
      const rangeStartEl = document.getElementById('rangeStart');
      const rangeEndEl = document.getElementById('rangeEnd');
      if (rangeStartEl && rangeEndEl) {
        rangeStartEl.value = settings.rangeStart;
        rangeEndEl.value = settings.rangeEnd;

        this.clearInputState(rangeStartEl);
        this.clearInputState(rangeEndEl);

        if (socketClient && !socketClient.gameState.isHost) {
          this.showInputSuccess(rangeStartEl, 'Synced');
          this.showInputSuccess(rangeEndEl, 'Synced');
          setTimeout(() => {
            this.clearInputState(rangeStartEl);
            this.clearInputState(rangeEndEl);
          }, 2000);
        }
      }

      const singleStartEl = document.getElementById('singleRangeStart');
      const singleEndEl = document.getElementById('singleRangeEnd');
      if (singleStartEl && singleEndEl) {
        singleStartEl.value = settings.rangeStart;
        singleEndEl.value = settings.rangeEnd;
      }

      if (typeof Game !== 'undefined' && Game.updateRangeDisplay) {
        Game.updateRangeDisplay(settings.rangeStart, settings.rangeEnd);
      }
    },

    disableSettings(disabled = true) {
      const rangeStart = document.getElementById('rangeStart');
      const rangeEnd = document.getElementById('rangeEnd');
      const settingsSection = document.getElementById('gameSettings');
      if (!rangeStart || !rangeEnd || !settingsSection) {
        return;
      }

      rangeStart.disabled = disabled;
      rangeEnd.disabled = disabled;

      if (disabled) {
        settingsSection.classList.add('disabled');
        settingsSection.title = 'Only the host can change settings';
      } else {
        settingsSection.classList.remove('disabled');
        settingsSection.title = '';
      }
    },

    updateSelectionScreen(party) {
      const roundText =
        party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
      const selectionRoundInfo = document.getElementById('selectionRoundInfo');
      if (selectionRoundInfo) {
        const roundTextEl = selectionRoundInfo.querySelector('.round-text');
        if (roundTextEl) {
          roundTextEl.textContent = roundText;
        }
      }

      const rangeDisplay = `${party.gameSettings.rangeStart} - ${party.gameSettings.rangeEnd}`;
      const selectionRangeDisplay = document.getElementById('selectionRangeDisplay');
      if (selectionRangeDisplay) {
        selectionRangeDisplay.textContent = rangeDisplay;
      }

      const secretNumberInput = document.getElementById('secretNumber');
      if (secretNumberInput) {
        secretNumberInput.min = party.gameSettings.rangeStart;
        secretNumberInput.max = party.gameSettings.rangeEnd;
        secretNumberInput.value = '';
        secretNumberInput.disabled = false;
        secretNumberInput.placeholder = `Choose ${rangeDisplay}`;
      }

      const secretNumberRange = document.getElementById('secretNumberRange');
      if (secretNumberRange) {
        secretNumberRange.textContent = `(${rangeDisplay})`;
      }

      const secretNumberHint = document.getElementById('secretNumberHint');
      if (secretNumberHint) {
        secretNumberHint.innerHTML =
          '<i data-lucide="lightbulb" class="inline-icon"></i> Pick a good number.';
      }

      const selectionMessage = document.getElementById('selectionMessage');
      if (selectionMessage) {
        selectionMessage.innerHTML = `
                    <strong><i data-lucide="target" class="inline-icon"></i> Pick a number: ${rangeDisplay}</strong><br>
                    <small><i data-lucide="lightbulb" class="inline-icon"></i> Make it tricky.</small>
                `;
        selectionMessage.className = 'message info enhanced';
      }

      const readyBtn = document.getElementById('readyBtn');
      if (readyBtn) {
        readyBtn.disabled = false;
        readyBtn.innerHTML = '<i data-lucide="check-circle"></i> Ready';
        readyBtn.classList.remove('btn-disabled', 'loading', 'success', 'error');
        readyBtn.style.opacity = '1';
        readyBtn.style.pointerEvents = 'auto';
        readyBtn.style.cursor = 'pointer';
      }

      const readyStatus = document.getElementById('readyStatus');
      if (readyStatus) {
        readyStatus.textContent = '';
        readyStatus.innerHTML = '';
      }

      if (readyBtn && readyBtn._resetTimeout) {
        clearTimeout(readyBtn._resetTimeout);
        delete readyBtn._resetTimeout;
      }

      if (secretNumberInput) {
        setTimeout(() => secretNumberInput.focus(), 200);
        this.setupSecretNumberValidation(
          secretNumberInput,
          party.gameSettings.rangeStart,
          party.gameSettings.rangeEnd
        );
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },

    updateSelectionTimer(timeLeft) {
      const selectionTimer = document.getElementById('selectionTimer');
      if (!selectionTimer) {
        return;
      }

      selectionTimer.textContent = timeLeft;
      if (timeLeft <= 10) {
        selectionTimer.style.color = '#ff6b6b';
        selectionTimer.style.animation = 'pulse 0.5s infinite';
        if (timeLeft === 10) {
          this.showNotification('10 seconds left.', 'warning', 2000);
        } else if (timeLeft === 5) {
          this.showNotification('5 seconds left.', 'warning', 1000);
        }
        return;
      }

      if (timeLeft <= 20) {
        selectionTimer.style.color = '#ffc107';
        selectionTimer.style.animation = 'none';
        return;
      }

      selectionTimer.style.color = '#4CAF50';
      selectionTimer.style.animation = 'none';
    },

    updateReadyStatus(playerId, playerName, allReady) {
      const statusElement = document.getElementById('readyStatus');
      if (!statusElement) {
        return;
      }

      if (playerId === socketClient.gameState.playerId) {
        statusElement.innerHTML =
          '<i data-lucide="check-circle" class="inline-icon"></i> Ready. Waiting for opponent.<br><small><i data-lucide="gamepad-2" class="inline-icon"></i> Game starts soon.</small>';
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn) {
          readyBtn.disabled = true;
          readyBtn.innerHTML = '<i data-lucide="check-circle"></i> Ready';
        }
      } else {
        statusElement.innerHTML = `<i data-lucide="clock-3" class="inline-icon"></i> ${playerName} is ready.<br><small><i data-lucide="target" class="inline-icon"></i> Pick your number.</small>`;
      }

      if (allReady) {
        statusElement.innerHTML =
          '<i data-lucide="rocket" class="inline-icon"></i> Both players are ready.<br><small><i data-lucide="flame" class="inline-icon"></i> Starting game.</small>';
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },
  };
})(window);
