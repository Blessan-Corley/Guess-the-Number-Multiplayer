(function registerAppActions(global) {
  const appState =
    global.AppState || (typeof require === 'function' ? require('./app-state') : null);

  if (!appState) {
    throw new Error('AppState must be available before AppActions');
  }

  const appActions = {
    resetSharedState() {
      return appState.reset();
    },

    setScreen(screen) {
      return appState.updateState({ screen });
    },

    setMode(mode) {
      return appState.updateState({ mode });
    },

    setGamePhase(gamePhase) {
      return appState.updateState({ gamePhase });
    },

    setFinished(hasFinished) {
      return appState.updateState({
        flags: {
          hasFinished: Boolean(hasFinished),
        },
        reconnect: {
          hasFinished: Boolean(hasFinished),
        },
      });
    },

    setSinglePlayerBounds({ rangeStart, rangeEnd }) {
      return appState.updateState({
        singlePlayer: {
          rangeStart,
          rangeEnd,
        },
      });
    },

    applyPartySession({
      party = null,
      localPlayer = null,
      isHost = false,
      mode = 'multiplayer',
    } = {}) {
      return appState.updateState({
        mode,
        party,
        localPlayer,
        flags: {
          isHost: Boolean(isHost),
        },
        reconnect: {
          partyCode: party?.code || null,
          playerId: localPlayer?.id || null,
        },
      });
    },

    clearPartySession() {
      return appState.updateState({
        party: null,
        localPlayer: null,
        gamePhase: null,
        flags: {
          isHost: false,
          hasFinished: false,
        },
        reconnect: {
          partyCode: null,
          playerId: null,
          reconnectSecret: null,
          phase: null,
          hasFinished: false,
          timestamp: null,
          hasBackup: false,
        },
      });
    },

    setProfileSnapshot({ profile = null, matches = null } = {}) {
      const patch = {
        profile,
      };

      if (Array.isArray(matches)) {
        patch.matches = matches;
      }

      return appState.updateState(patch);
    },

    setLeaderboardSnapshot(leaderboard = []) {
      return appState.updateState({
        leaderboard: Array.isArray(leaderboard) ? leaderboard : [],
      });
    },

    setReconnectSession(reconnect) {
      return appState.updateState({
        reconnect: {
          ...reconnect,
        },
      });
    },

    setConnectionStatus(connection) {
      return appState.updateState({
        connection: {
          ...connection,
        },
      });
    },
  };

  global.AppActions = appActions;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = appActions;
  }
})(typeof window !== 'undefined' ? window : globalThis);
