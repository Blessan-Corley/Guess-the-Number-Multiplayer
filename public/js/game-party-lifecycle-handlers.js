(function registerGamePartyLifecycleHandlers(global) {
  global.GamePartyLifecycleHandlers = {
    handlePartyCreated(data) {
      this.currentState.party = data.party;
      this.currentState.player = data.player;
      this.currentState.profile = data.profile || this.currentState.profile;
      this.currentState.isHost = true;
      this.currentState.gameMode = 'multiplayer';
      this.currentState.hasFinished = false;

      socketClient.gameState.isHost = true;
      socketClient.gameState.playerId = data.player.id;

      const createBtn = document.getElementById('createPartyBtn');
      UI.setButtonSuccess(createBtn, 'Created!');

      UI.hideLoadingOverlay();
      UI.showScreen('lobbyScreen');
      UI.updatePartyInfo(data.party);
      UI.updateLobbyPlayers(data.party);
      UI.updateGameSettings(data.party.gameSettings);
      UI.updatePartyVisibilityControl(data.party);

      document.getElementById('lobbyPartyCode').textContent = data.party.code;

      UI.showNotification(
        `Party ${data.party.code} created. Use Copy Code or Share Link to invite your friend.`,
        'success'
      );
    },

    handlePartyJoined(data) {
      this.currentState.party = data.party;
      this.currentState.player = data.player;
      this.currentState.profile = data.profile || this.currentState.profile;
      this.currentState.isHost = false;
      this.currentState.gameMode = 'multiplayer';
      this.currentState.hasFinished = false;

      socketClient.gameState.isHost = false;
      socketClient.gameState.playerId = data.player.id;

      const joinBtn = document.getElementById('joinPartySubmitBtn');
      UI.setButtonSuccess(joinBtn, 'Joined!');

      UI.hideLoadingOverlay();
      UI.showScreen('lobbyScreen');
      UI.updatePartyInfo(data.party);
      UI.updateLobbyPlayers(data.party);
      UI.updateGameSettings(data.party.gameSettings);
      UI.updatePartyVisibilityControl(data.party);
      UI.disableSettings(true);

      document.getElementById('lobbyPartyCode').textContent = data.party.code;
      document.getElementById('startGameBtn').style.display = 'none';

      UI.showNotification(
        `Joined party ${data.party.code}! Wait for the host to start.`,
        'success'
      );
    },

    handlePlayerJoined(data) {
      this.currentState.party = data.party;
      UI.updateLobbyPlayers(data.party);
      UI.updatePartyVisibilityControl(data.party);
      UI.showNotification(`${data.newPlayer.name} joined the party!`, 'success');

      const helperDiv = document.getElementById('invitation-helper');
      if (helperDiv) {
        helperDiv.remove();
      }
    },

    handlePlayerLeft(data) {
      this.currentState.party = data.party;
      UI.updateLobbyPlayers(data.party);
      UI.updatePartyVisibilityControl(data.party);
      UI.showNotification(`${data.leftPlayer.name} left the party`, 'warning');

      if (data.party.players.length < 2) {
        const startBtn = document.getElementById('startGameBtn');
        startBtn.disabled = true;
        startBtn.textContent = 'Waiting for player...';
        startBtn.classList.remove('pulse-animation');
      }
    },

    handlePartyLeft() {
      this.resetGameState();
      sessionStorage.removeItem('gameStateBackup');
      if (window.profileClient) {
        window.profileClient.refreshProfile().catch(() => {});
        window.profileClient.refreshLeaderboard().catch(() => {});
      }
      UI.showNotification('Left the party', 'info');
    },

    handlePartyClosedHostLeft(data) {
      this.resetGameState();
      UI.showScreen('welcomeScreen');
      sessionStorage.removeItem('gameStateBackup');
      if (window.profileClient) {
        window.profileClient.refreshProfile().catch(() => {});
        window.profileClient.refreshLeaderboard().catch(() => {});
      }

      UI.showNotification(data.message || 'Party closed - host left', 'warning', 5000);

      setTimeout(() => {
        UI.showNotification(
          'Returned to main menu. You can create or join a new party!',
          'info',
          4000
        );
      }, 2000);
    },

    handleSettingsUpdated(data) {
      if (this.currentState.party) {
        this.currentState.party.gameSettings = data.settings;
      }

      UI.updateGameSettings(data.settings);
      this.updateRangeDisplay(data.settings.rangeStart, data.settings.rangeEnd);

      if (data.updatedBy !== socketClient.gameState.playerName) {
        const rangeText = `${data.settings.rangeStart}-${data.settings.rangeEnd}`;
        UI.showNotification(`${data.updatedBy} changed range to ${rangeText}`, 'info');
      }
    },

    handlePartyVisibilityUpdated(data) {
      if (this.currentState.party) {
        this.currentState.party.visibility = data.party.visibility;
      }

      UI.updatePartyVisibilityControl(data.party);
      UI.showNotification(
        data.visibility === 'public' ? 'Room is now public.' : 'Room is now private.',
        'info'
      );
    },

    handlePublicDirectoryUpdated(data) {
      UI.updatePublicDirectory(data);
    },

    handlePlayerDisconnected(data) {
      const party = this.currentState.party;
      if (party?.players) {
        const player = party.players.find((p) => p.id === data?.playerId);
        if (player) {
          player.isConnected = false;
        }
        UI.updateLobbyPlayers(party);
      }

      const opponentCard = document.getElementById('opponentBattleCard');
      if (opponentCard) {
        opponentCard.classList.add('opponent-disconnected');
        let banner = opponentCard.querySelector('.reconnect-banner');
        if (!banner) {
          banner = document.createElement('div');
          banner.className = 'reconnect-banner';
          opponentCard.appendChild(banner);
        }
        const seconds = Math.ceil((data?.gracePeriod || 0) / 1000);
        banner.textContent =
          seconds > 0 ? `Reconnecting\u2026 (${seconds}s)` : 'Opponent disconnected';
      }
    },

    handlePlayerReconnected(data) {
      const party = this.currentState.party;
      if (party?.players) {
        const player = party.players.find((p) => p.id === data?.playerId);
        if (player) {
          player.isConnected = true;
        }
        UI.updateLobbyPlayers(party);
      }

      const opponentCard = document.getElementById('opponentBattleCard');
      if (opponentCard) {
        opponentCard.classList.remove('opponent-disconnected');
        const banner = opponentCard.querySelector('.reconnect-banner');
        if (banner) {
          banner.remove();
        }
      }
    },
  };
})(window);
