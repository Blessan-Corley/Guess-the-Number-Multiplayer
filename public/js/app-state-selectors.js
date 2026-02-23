(function registerAppStateSelectors(global) {
  const appState =
    global.AppState || (typeof require === 'function' ? require('./app-state') : null);

  if (!appState) {
    throw new Error('AppState must be available before AppStateSelectors');
  }

  function getSnapshot() {
    return appState.getState();
  }

  const selectors = {
    getSnapshot,
    getScreen() {
      return getSnapshot().screen;
    },
    getMode() {
      return getSnapshot().mode;
    },
    isSinglePlayerMode() {
      return getSnapshot().mode === 'single';
    },
    getPartyCode() {
      return getSnapshot().party?.code || null;
    },
    getLocalPlayerId() {
      return getSnapshot().localPlayer?.id || null;
    },
    getNumberBounds() {
      const state = getSnapshot();

      if (state.party?.gameSettings) {
        return {
          min: state.party.gameSettings.rangeStart,
          max: state.party.gameSettings.rangeEnd,
        };
      }

      return {
        min: state.singlePlayer.rangeStart,
        max: state.singlePlayer.rangeEnd,
      };
    },
  };

  global.AppStateSelectors = selectors;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = selectors;
  }
})(typeof window !== 'undefined' ? window : globalThis);
