(function registerGameRoundActionHandlers(global) {
  global.GameRoundActionHandlers = {
    requestRematch() {
      UI.showNotification('Rematch requested. Waiting for opponent...', 'info', 2500);
      this.currentState.hasFinished = false;
      if (typeof this.updateRematchButtons === 'function') {
        this.updateRematchButtons('waiting');
      }
      socketClient.rematch();
    },

    changeSettings() {
      UI.showLoadingOverlay('Returning to lobby...');
      UI.showNotification('Back to lobby...', 'info', 2000);

      this.currentState.hasFinished = false;
      this.currentState.gamePhase = 'lobby';
      this.clearGameInputs();

      socketClient.requestSettingsChange();
    },

    confirmLeaveParty() {
      UI.showConfirmDialog(
        'Leave Game?',
        'Are you sure you want to leave this party and return to the main menu? Your session progress will be lost.',
        () => {
          this.leaveParty();
        }
      );
    },

    playAgain() {
      this.requestRematch();
    },

    newGame() {
      if (socketClient.isHost()) {
        UI.showNotification('Returning to lobby for new game setup...', 'info');
        this.currentState.hasFinished = false;
        UI.showScreen('lobbyScreen');
      } else {
        UI.showNotification('Only the host can start a new game', 'warning');
      }
    },
  };
})(window);
