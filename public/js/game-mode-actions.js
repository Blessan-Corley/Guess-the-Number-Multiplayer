(function registerGameModeActions(global) {
  function updateSelectionHint(message) {
    const hint = document.getElementById('welcomeSelectionHint');
    if (hint) {
      hint.textContent = message;
    }
  }

  const methods = {
    selectSinglePlayer() {
      this.currentState.gameMode = 'single';
      document.getElementById('multiplayerOptions').style.display = 'none';
      document.getElementById('singlePlayerOptions').style.display = 'block';

      document.getElementById('singlePlayerBtn').classList.add('active');
      document.getElementById('multiplayerBtn').classList.remove('active');
      updateSelectionHint('Solo mode selected.');
    },

    selectMultiplayer() {
      this.currentState.gameMode = 'multiplayer';
      document.getElementById('singlePlayerOptions').style.display = 'none';
      document.getElementById('multiplayerOptions').style.display = 'block';

      document.getElementById('multiplayerBtn').classList.add('active');
      document.getElementById('singlePlayerBtn').classList.remove('active');
      updateSelectionHint('Private match selected.');
    },

    startSinglePlayer() {
      const playerName = document.getElementById('playerName').value.trim();
      const rangeStart = parseInt(document.getElementById('singleRangeStart').value, 10);
      const rangeEnd = parseInt(document.getElementById('singleRangeEnd').value, 10);
      const botDifficulty = document.getElementById('botDifficulty').value;

      if (!this.validatePlayerName(playerName)) return;
      if (!this.validateSinglePlayerRange(rangeStart, rangeEnd)) return;

      this.currentState.gameMode = 'single';
      this.currentState.party = null;
      this.currentState.hasFinished = false;
      singlePlayerGame.startGame(playerName, rangeStart, rangeEnd, botDifficulty);
      this.trackUserAction('single_player_start', {
        botDifficulty,
        range: `${rangeStart}-${rangeEnd}`,
      });
    },

    validateSinglePlayerRange(start, end) {
      return UI.validateRangePair(start, end);
    },
  };

  Object.assign(global.Game, methods);
})(window);
