(function registerSocketClientReconnectMethods(global) {
  const appActions = global.AppActions;

  global.SocketClientReconnectMethods = {
    handleConnectionError() {
      this.isConnected = false;
      if (typeof this.resetConnectionTelemetry === 'function') {
        this.resetConnectionTelemetry();
      }
      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: false,
          socketId: this.socket?.id || null,
          reconnectAttempts: this.reconnectAttempts || 0,
          latencyMs: null,
          smoothedLatencyMs: null,
          signal: 'unknown',
        });
      }
      if (typeof UI !== 'undefined') {
        UI.updateConnectionStatus(this.getConnectionBadgeState('disconnected'));
      }
      this.handleReconnection();
    },

    handleReconnection() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        if (typeof UI !== 'undefined') {
          UI.showNotification('Unable to connect to server. Please refresh the page.', 'error');
        }
        return;
      }

      this.reconnectAttempts++;
      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: false,
          socketId: this.socket?.id || null,
          reconnectAttempts: this.reconnectAttempts,
          latencyMs: this.connectionTelemetry?.latencyMs ?? null,
          smoothedLatencyMs: this.connectionTelemetry?.smoothedLatencyMs ?? null,
          signal: this.connectionTelemetry?.signal || 'unknown',
        });
      }
      if (typeof UI !== 'undefined') {
        UI.updateConnectionStatus(this.getConnectionBadgeState('connecting'));
      }

      setTimeout(() => {
        if (this.isConnected || !this.socket) {
          return;
        }

        if (this.gameState.partyCode && this.gameState.playerId) {
          this.attemptGameReconnection();
          return;
        }

        this.socket.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    },

    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, 3000);
    },

    stopHeartbeat() {
      if (!this.heartbeatInterval) {
        return;
      }

      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    },
  };
})(window);
