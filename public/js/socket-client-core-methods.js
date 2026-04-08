(function registerSocketClientCoreMethods(global) {
  const appActions = global.AppActions;

  global.SocketClientCoreMethods = {
    createInitialGameState() {
      return {
        playerId: null,
        partyCode: null,
        playerName: null,
        isHost: false,
        reconnectSecret: null,
      };
    },

    createInitialConnectionTelemetry() {
      return {
        lastHeartbeatSentAt: null,
        lastHeartbeatSentAtMonotonic: null,
        latencyMs: null,
        smoothedLatencyMs: null,
        sampleCount: 0,
        unstableSampleCount: 0,
        signal: 'unknown',
      };
    },

    resetGameState() {
      this.gameState = this.createInitialGameState();
      if (appActions && typeof appActions.clearPartySession === 'function') {
        appActions.clearPartySession();
      }
    },

    resetConnectionTelemetry() {
      this.connectionTelemetry = this.createInitialConnectionTelemetry();
      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: Boolean(this.isConnected),
          socketId: this.socket?.id || null,
          reconnectAttempts: this.reconnectAttempts || 0,
          latencyMs: null,
          smoothedLatencyMs: null,
          signal: this.connectionTelemetry.signal,
        });
      }
    },

    init() {
      try {
        this.socket = io({
          transports: ['websocket'],
          upgrade: false,
          rememberUpgrade: true,
          timeout: 20000,
          forceNew: true,
        });

        this.setupEventListeners();
        this.startHeartbeat();
      } catch (error) {
        this.handleConnectionError(error);
      }
    },

    evaluateConnectionSignal(latencyMs) {
      if (!Number.isFinite(latencyMs)) {
        return 'unknown';
      }

      if (latencyMs <= 120) {
        return 'strong';
      }

      if (latencyMs <= 320) {
        return 'fair';
      }

      if (latencyMs <= 700) {
        return 'weak';
      }

      return 'unstable';
    },

    recordHeartbeatAck(serverPayload = {}) {
      const monotonicNow =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const reportedMonotonicSendTime = Number(serverPayload?.clientPerfNow);
      const fallbackMonotonicSendTime = Number(
        this.connectionTelemetry.lastHeartbeatSentAtMonotonic
      );
      const monotonicSentAt = Number.isFinite(reportedMonotonicSendTime)
        ? reportedMonotonicSendTime
        : fallbackMonotonicSendTime;

      if (!Number.isFinite(monotonicSentAt)) {
        return null;
      }

      const rawLatencyMs = monotonicNow - monotonicSentAt;
      if (!Number.isFinite(rawLatencyMs) || rawLatencyMs < 0 || rawLatencyMs > 10000) {
        return null;
      }

      const rounded = Math.round(rawLatencyMs);
      const previous = this.connectionTelemetry.smoothedLatencyMs;
      const smoothed = Number.isFinite(previous)
        ? Math.round(previous * 0.7 + rounded * 0.3)
        : rounded;
      const severeLatencyThresholdMs = 700;
      const unstableSampleCount =
        smoothed > severeLatencyThresholdMs
          ? (this.connectionTelemetry.unstableSampleCount || 0) + 1
          : 0;
      const signal =
        smoothed > severeLatencyThresholdMs && unstableSampleCount < 3
          ? 'weak'
          : this.evaluateConnectionSignal(smoothed);

      this.connectionTelemetry.latencyMs = rounded;
      this.connectionTelemetry.smoothedLatencyMs = smoothed;
      this.connectionTelemetry.sampleCount += 1;
      this.connectionTelemetry.unstableSampleCount = unstableSampleCount;
      this.connectionTelemetry.signal = signal;

      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: Boolean(this.isConnected),
          socketId: this.socket?.id || null,
          reconnectAttempts: this.reconnectAttempts || 0,
          latencyMs: rounded,
          smoothedLatencyMs: smoothed,
          signal,
        });
      }

      return {
        latencyMs: smoothed,
        signal,
      };
    },

    getConnectionBadgeState(statusOverride = null) {
      const status = statusOverride || (this.isConnected ? 'connected' : 'disconnected');
      return {
        status,
        latencyMs: this.connectionTelemetry.smoothedLatencyMs,
        signal: this.connectionTelemetry.signal,
      };
    },

    setupEventListeners() {
      if (!this.socket) {
        return;
      }

      if (!window.SocketClientEvents || typeof window.SocketClientEvents.register !== 'function') {
        this.handleConnectionError(new Error('Socket event handlers are not available'));
        return;
      }

      window.SocketClientEvents.register(this);
    },

    handleServerError(data) {
      if (
        window.SocketClientErrors &&
        typeof window.SocketClientErrors.handleServerError === 'function'
      ) {
        window.SocketClientErrors.handleServerError(data);
        return;
      }

      if (typeof UI !== 'undefined') {
        UI.showNotification(data?.message || 'An error occurred', 'error', 5000);
      }
    },

    enqueueAction(action) {
      this.pendingActions.push(action);
    },

    flushPendingActions() {
      if (!this.pendingActions.length) {
        return;
      }

      const pending = [...this.pendingActions];
      this.pendingActions = [];
      pending.forEach((action) => action());
    },

    isLoadingOverlayVisible() {
      const overlay = document.getElementById('loadingOverlay');
      return Boolean(overlay && overlay.style.display !== 'none');
    },

    scheduleOverlayTimeout(buttonId = null, buttonText = null) {
      setTimeout(() => {
        if (!this.isLoadingOverlayVisible()) {
          return;
        }

        if (typeof UI !== 'undefined') {
          UI.hideLoadingOverlay();
          UI.showNotification('Request timed out. Please try again.', 'warning');
        }

        if (buttonId && buttonText && typeof UI !== 'undefined') {
          const button = document.getElementById(buttonId);
          if (button) {
            UI.resetButton(button, buttonText);
          }
        }
      }, 10000);
    },

    getGameState() {
      return { ...this.gameState };
    },

    isInGame() {
      return this.gameState.partyCode !== null;
    },

    isHost() {
      return this.gameState.isHost;
    },

    disconnect() {
      this.stopHeartbeat();
      this.resetConnectionTelemetry();
      if (this.socket) {
        this.socket.disconnect();
      }
    },

    getConnectionStatus() {
      return {
        connected: this.isConnected,
        socketId: this.socket?.id,
        reconnectAttempts: this.reconnectAttempts,
        gameState: { ...this.gameState },
        connectionTelemetry: { ...this.connectionTelemetry },
      };
    },
  };
})(window);
