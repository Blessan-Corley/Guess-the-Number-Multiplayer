(function registerSocketClientEmitMethods(global) {
  global.SocketClientEmitMethods = {
    createParty(playerName) {
      if (!this.isConnected) {
        if (typeof UI !== 'undefined') {
          UI.showLoadingOverlay('Connecting to server...');
          UI.showNotification(
            'Connecting to server. Creating your party as soon as the connection is ready.',
            'info'
          );
        }
        this.enqueueAction(() => this.createParty(playerName));
        return;
      }

      if (typeof UI !== 'undefined') {
        UI.showLoadingOverlay('Creating party...');
      }

      this.socket.emit('create_party', {
        playerName,
        guestToken: window.profileClient ? window.profileClient.getGuestToken() : null,
        guestSessionSecret: window.profileClient
          ? window.profileClient.getGuestSessionSecret()
          : null,
      });

      this.scheduleOverlayTimeout();
    },

    joinParty(partyCode, playerName) {
      if (!this.isConnected) {
        if (typeof UI !== 'undefined') {
          UI.showLoadingOverlay('Connecting to server...');
          UI.showNotification(
            'Connecting to server. Joining the party as soon as the connection is ready.',
            'info'
          );
        }
        this.enqueueAction(() => this.joinParty(partyCode, playerName));
        return;
      }

      if (typeof UI !== 'undefined') {
        UI.showLoadingOverlay('Joining party...');
      }

      this.socket.emit('join_party', {
        partyCode,
        playerName,
        guestToken: window.profileClient ? window.profileClient.getGuestToken() : null,
        guestSessionSecret: window.profileClient
          ? window.profileClient.getGuestSessionSecret()
          : null,
      });

      this.scheduleOverlayTimeout('joinPartySubmitBtn', 'Join Party');
    },

    joinPublicParty(partyCode, playerName) {
      if (!this.isConnected) {
        if (typeof UI !== 'undefined') {
          UI.showLoadingOverlay('Connecting to server...');
          UI.showNotification(
            'Connecting to server. Joining the public room as soon as the connection is ready.',
            'info'
          );
        }
        this.enqueueAction(() => this.joinPublicParty(partyCode, playerName));
        return;
      }

      if (typeof UI !== 'undefined') {
        UI.showLoadingOverlay('Joining public room...');
      }

      this.socket.emit('join_public_party', {
        partyCode,
        playerName,
        guestToken: window.profileClient ? window.profileClient.getGuestToken() : null,
        guestSessionSecret: window.profileClient
          ? window.profileClient.getGuestSessionSecret()
          : null,
      });

      this.scheduleOverlayTimeout();
    },

    leaveParty() {
      if (!this.isConnected) {
        return;
      }

      this.socket.emit('leave_party');
    },

    updateSettings(settings) {
      if (!this.isConnected || !this.gameState.isHost) {
        return;
      }

      this.socket.emit('update_settings', settings);
    },

    setPartyVisibility(visibility) {
      if (!this.isConnected || !this.gameState.isHost) {
        return;
      }

      this.socket.emit('set_party_visibility', { visibility });
    },

    startGame() {
      if (!this.isConnected || !this.gameState.isHost) {
        return;
      }

      this.socket.emit('start_game');
    },

    setReady(secretNumber) {
      if (!this.isConnected) {
        return;
      }

      this.socket.emit('set_ready', { secretNumber });
    },

    makeGuess(guess) {
      if (!this.isConnected) {
        return;
      }

      this.socket.emit('make_guess', { guess });
    },

    nextRound() {
      if (!this.isConnected || !this.gameState.isHost) {
        return;
      }

      this.socket.emit('next_round');
    },

    rematch() {
      if (!this.isConnected) {
        return;
      }

      this.socket.emit('rematch');
    },

    requestSettingsChange() {
      if (!this.isConnected) {
        return;
      }

      this.socket.emit('request_settings_change');
    },

    sendTyping(isTyping) {
      if (!this.isConnected) {
        return;
      }

      this.socket.emit('player_typing', { isTyping });
    },

    sendHeartbeat() {
      if (!this.isConnected) {
        return;
      }

      const sentAt = Date.now();
      const sentAtMonotonic =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : sentAt;

      this.connectionTelemetry.lastHeartbeatSentAt = sentAt;
      this.connectionTelemetry.lastHeartbeatSentAtMonotonic = sentAtMonotonic;
      this.socket.emit('heartbeat', {
        timestamp: sentAt,
        clientPerfNow: sentAtMonotonic,
      });
    },

    attemptGameReconnection() {
      if (!this.socket) {
        return;
      }

      this.socket.emit('reconnect_attempt', {
        partyCode: this.gameState.partyCode,
        playerId: this.gameState.playerId,
        reconnectSecret: this.gameState.reconnectSecret,
      });
    },
  };
})(window);
