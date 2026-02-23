(function registerAppState(global) {
  function createInitialState() {
    return {
      screen: 'welcome',
      mode: null,
      party: null,
      localPlayer: null,
      profile: null,
      matches: [],
      leaderboard: [],
      gamePhase: null,
      singlePlayer: {
        rangeStart: 1,
        rangeEnd: 100,
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
      connection: {
        connected: false,
        socketId: null,
        reconnectAttempts: 0,
        latencyMs: null,
        smoothedLatencyMs: null,
        signal: 'unknown',
      },
      flags: {
        isHost: false,
        hasFinished: false,
      },
    };
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneValue(value) {
    if (Array.isArray(value)) {
      return value.map(cloneValue);
    }

    if (isPlainObject(value)) {
      return Object.keys(value).reduce((result, key) => {
        result[key] = cloneValue(value[key]);
        return result;
      }, {});
    }

    return value;
  }

  function mergeValue(target, patch) {
    if (Array.isArray(patch)) {
      return patch.map(cloneValue);
    }

    if (!isPlainObject(patch)) {
      return patch;
    }

    const base = isPlainObject(target) ? target : {};
    return Object.keys(patch).reduce(
      (result, key) => {
        result[key] = mergeValue(base[key], patch[key]);
        return result;
      },
      { ...base }
    );
  }

  let state = createInitialState();
  const listeners = new Set();

  function notify() {
    const snapshot = cloneValue(state);
    listeners.forEach((listener) => listener(snapshot));
  }

  const appState = {
    createInitialState,
    cloneValue,
    getState() {
      return cloneValue(state);
    },
    replaceState(nextState) {
      state = cloneValue(nextState);
      notify();
      return this.getState();
    },
    updateState(updater) {
      const patch = typeof updater === 'function' ? updater(this.getState()) : updater;
      state = mergeValue(state, patch || {});
      notify();
      return this.getState();
    },
    reset() {
      state = createInitialState();
      notify();
      return this.getState();
    },
    subscribe(listener) {
      if (typeof listener !== 'function') {
        return function noop() {};
      }

      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    },
  };

  global.AppState = appState;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = appState;
  }
})(typeof window !== 'undefined' ? window : globalThis);
