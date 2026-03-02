(function registerGameMultiplayerActions(global) {
  const methods = {
    makeGuess(guess) {
      if (this.currentState.gameMode === 'single') {
        singlePlayerGame.makePlayerGuess(guess);
        return true;
      }

      if (this.currentState.hasFinished) {
        UI.showNotification(
          'You have already found the number! Wait for your opponent.',
          'warning'
        );
        return false;
      }

      if (!this.currentState.party) {
        return false;
      }

      const { rangeStart, rangeEnd } = this.currentState.party.gameSettings;

      if (guess < rangeStart || guess > rangeEnd) {
        UI.showNotification(`Guess must be between ${rangeStart} and ${rangeEnd}`, 'error');
        return false;
      }

      socketClient.makeGuess(guess);
      return true;
    },

    createParty(playerName) {
      if (!this.validatePlayerName(playerName)) return;

      if (window.profileClient) {
        window.profileClient.persistName(playerName);
      }

      socketClient.createParty(playerName);
    },

    joinParty(partyCode, playerName) {
      if (!this.validatePlayerName(playerName)) return;
      if (!this.validatePartyCode(partyCode)) return;

      if (window.profileClient) {
        window.profileClient.persistName(playerName);
      }

      socketClient.joinParty(partyCode, playerName);
    },

    joinPublicParty(partyCode, playerName) {
      if (!this.validatePlayerName(playerName)) return;
      if (!this.validatePartyCode(partyCode)) return;

      if (window.profileClient) {
        window.profileClient.persistName(playerName);
      }

      socketClient.joinPublicParty(partyCode, playerName);
    },

    leaveParty() {
      this.currentState.hasFinished = false;
      socketClient.leaveParty();
      sessionStorage.removeItem('gameStateBackup');

      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    },

    updateSettings() {
      if (!socketClient.isHost()) return;

      const settings = {
        rangeStart: parseInt(document.getElementById('rangeStart').value, 10),
        rangeEnd: parseInt(document.getElementById('rangeEnd').value, 10),
      };

      if (!UI.validateRangePair(settings.rangeStart, settings.rangeEnd)) {
        return;
      }

      socketClient.updateSettings(settings);
      this.updateRangeDisplay(settings.rangeStart, settings.rangeEnd);

      const rangeText = `${settings.rangeStart}-${settings.rangeEnd}`;
      UI.showNotification(`Range updated to ${rangeText}`, 'info');
    },

    setRangePreset(start, end) {
      if (!socketClient.isHost()) {
        UI.showNotification('Only the host can change settings', 'error');
        return;
      }

      document.getElementById('rangeStart').value = start;
      document.getElementById('rangeEnd').value = end;

      this.updateRangeDisplay(start, end);
      this.updateSettings();
    },

    startGame() {
      if (!socketClient.isHost()) {
        UI.showNotification('Only the host can start the game', 'error');
        return;
      }

      socketClient.startGame();
    },

    setPartyVisibility(visibility) {
      if (!socketClient.isHost()) {
        UI.showNotification('Only the host can change room visibility', 'error');
        return;
      }

      socketClient.setPartyVisibility(visibility);
    },

    setReady(secretNumber) {
      if (!this.currentState.party) {
        UI.showNotification('Game not properly initialized', 'error');
        return;
      }

      const { rangeStart, rangeEnd } = this.currentState.party.gameSettings;

      if (Number.isNaN(secretNumber) || !Number.isInteger(secretNumber)) {
        UI.showNotification('Please enter a valid whole number', 'error');
        return;
      }

      if (secretNumber < rangeStart || secretNumber > rangeEnd) {
        UI.showNotification(`Secret number must be between ${rangeStart} and ${rangeEnd}`, 'error');
        document.getElementById('secretNumber').focus();
        return;
      }

      UI.showNotification(`Number ${secretNumber} chosen!`, 'success');

      document.getElementById('secretNumber').disabled = true;
      document.getElementById('readyBtn').disabled = true;
      document.getElementById('readyBtn').textContent = 'Ready!';

      socketClient.setReady(secretNumber);
    },

    nextRound() {
      if (this.currentState.gameMode === 'single') {
        singlePlayerGame.rematch();
        return;
      }

      if (!socketClient.isHost()) {
        UI.showNotification('Only the host can start the next round', 'error');
        return;
      }

      this.currentState.hasFinished = false;
      socketClient.nextRound();
    },

    rematch() {
      if (this.currentState.gameMode === 'single') {
        singlePlayerGame.rematch();
        return;
      }

      this.currentState.hasFinished = false;
      socketClient.rematch();
    },
  };

  Object.assign(global.Game, methods);
})(window);
