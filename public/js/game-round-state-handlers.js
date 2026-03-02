(function registerGameRoundStateHandlers(global) {
  global.GameRoundStateHandlers = {
    handleSettingsChangeStarted(data) {
      UI.hideLoadingOverlay();

      this.currentState.party = data.party;
      this.currentState.gamePhase = 'lobby';

      UI.showScreen('lobbyScreen');
      UI.updatePartyInfo(data.party);
      UI.updateLobbyPlayers(data.party);
      UI.updateGameSettings(data.party.gameSettings);

      const myPlayer = data.party.players.find(
        (player) => player.id === socketClient.gameState.playerId
      );
      const isHost = myPlayer?.isHost || false;
      UI.disableSettings(!isHost);

      if (isHost) {
        UI.showNotification('Change settings and start!', 'info', 3000);
      } else {
        UI.showNotification('Waiting for host...', 'info', 3000);
      }
    },

    handleNextRoundStarted(data) {
      this.currentState.party = data.party;
      this.currentState.gamePhase = 'selection';
      this.currentState.hasFinished = false;

      UI.showScreen('selectionScreen');
      UI.updateSelectionScreen(data.party, data.selectionTimeLimit);

      UI.showNotification(`Round ${data.party.currentRound} started! Choose wisely!`, 'success');
    },

    handleRematchRequested(data) {
      if (data.playerId === socketClient.gameState.playerId) {
        UI.showNotification('Rematch requested! Waiting for opponent to agree...', 'info', 3000);
        this.updateRematchButtons('waiting');
      } else {
        UI.showNotification(
          `${data.requestedBy} wants a rematch. Click "Accept Rematch".`,
          'info',
          5000
        );
        this.updateRematchButtons('requested');
      }
    },

    handleRematchStarted(data) {
      this.currentState.party = data.party;
      this.currentState.hasFinished = false;
      this.updateRematchButtons('default');
      this.clearGameInputs();

      this.currentState.gamePhase = 'selection';
      UI.showScreen('selectionScreen');
      UI.updateSelectionScreen(data.party, data.selectionTimeLimit);

      const range = `${data.party.gameSettings.rangeStart}-${data.party.gameSettings.rangeEnd}`;
      UI.showNotification(`Rematch! Range: ${range} - Choose your secret number!`, 'success');
    },

    handlePlayerTyping() {},

    handleReconnected(data) {
      this.currentState.party = data.party;
      this.currentState.player = data.player;
      this.currentState.gameMode = 'multiplayer';
      this.currentState.hasFinished = Boolean(data.player?.hasFinished);

      const phase = data.party.phase;
      switch (phase) {
        case 'lobby':
          UI.showScreen('lobbyScreen');
          UI.updatePartyInfo(data.party);
          UI.updateLobbyPlayers(data.party);
          UI.updateGameSettings(data.party.gameSettings);
          break;
        case 'selection':
          UI.showScreen('selectionScreen');
          UI.updateSelectionScreen(data.party);
          break;
        case 'playing':
          UI.showScreen('gameScreen');
          UI.updateGameScreen(data.party);
          if (this.currentState.hasFinished) {
            const guessInput = document.getElementById('guessInput');
            const guessBtn = document.getElementById('makeGuessBtn');
            if (guessInput) {
              guessInput.disabled = true;
              guessInput.placeholder = 'You found it!';
            }
            if (guessBtn) {
              guessBtn.disabled = true;
              guessBtn.classList.add('finished');
            }
            UI.showGameMessage(
              'You already found the number! Waiting for your opponent...',
              'success'
            );
          }
          break;
        case 'results':
          UI.showScreen('resultsScreen');
          break;
        default:
          UI.showScreen('welcomeScreen');
      }

      UI.showNotification('Reconnected successfully!', 'success');
    },
  };
})(window);
