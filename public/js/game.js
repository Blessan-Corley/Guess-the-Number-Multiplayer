(function registerGame(global) {
  const appState =
    global.AppState || (typeof require === 'function' ? require('./app-state') : null);
  const appActions =
    global.AppActions || (typeof require === 'function' ? require('./app-actions') : null);

  if (!appState) {
    throw new Error('AppState must be available before Game');
  }

  const LEGACY_KEYS = [
    'screen',
    'party',
    'player',
    'profile',
    'gamePhase',
    'isHost',
    'gameMode',
    'hasFinished',
  ];

  function readLegacyValue(key) {
    const state = appState.getState();

    switch (key) {
      case 'screen':
        return state.screen;
      case 'party':
        return state.party;
      case 'player':
        return state.localPlayer;
      case 'profile':
        return state.profile;
      case 'gamePhase':
        return state.gamePhase;
      case 'isHost':
        return Boolean(state.flags?.isHost);
      case 'gameMode':
        return state.mode;
      case 'hasFinished':
        return Boolean(state.flags?.hasFinished);
      default:
        return undefined;
    }
  }

  function writeLegacyValue(key, value) {
    if (!appActions) {
      throw new Error('AppActions must be available before mutating Game.currentState');
    }

    switch (key) {
      case 'screen':
        appActions.setScreen(value);
        break;
      case 'party':
        appState.updateState({
          party: value,
          reconnect: {
            partyCode: value?.code || null,
          },
        });
        break;
      case 'player':
        appState.updateState({
          localPlayer: value,
          reconnect: {
            playerId: value?.id || null,
          },
        });
        break;
      case 'profile':
        appActions.setProfileSnapshot({ profile: value });
        break;
      case 'gamePhase':
        appActions.setGamePhase(value);
        break;
      case 'isHost':
        appState.updateState({
          flags: {
            isHost: Boolean(value),
          },
        });
        break;
      case 'gameMode':
        appActions.setMode(value);
        break;
      case 'hasFinished':
        appActions.setFinished(value);
        break;
      default:
        break;
    }

    return true;
  }

  function applyLegacySnapshot(snapshot = {}) {
    LEGACY_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        writeLegacyValue(key, snapshot[key]);
      }
    });
  }

  function createCurrentStateProxy() {
    return new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'toJSON') {
            return function toJSON() {
              return LEGACY_KEYS.reduce((result, key) => {
                result[key] = readLegacyValue(key);
                return result;
              }, {});
            };
          }

          if (property === Symbol.toStringTag) {
            return 'GameStateProxy';
          }

          return readLegacyValue(property);
        },
        set(_target, property, value) {
          return writeLegacyValue(property, value);
        },
        ownKeys() {
          return [...LEGACY_KEYS];
        },
        getOwnPropertyDescriptor() {
          return {
            enumerable: true,
            configurable: true,
          };
        },
      }
    );
  }

  class Game {
    static init() {
      if (!this._currentStateProxy) {
        this._currentStateProxy = createCurrentStateProxy();
      }

      if (!this._stateInitialized) {
        appState.reset();
        this._stateInitialized = true;
      }

      return this.currentState;
    }
  }

  Object.defineProperty(Game, 'currentState', {
    configurable: true,
    enumerable: true,
    get() {
      if (!this._currentStateProxy) {
        this._currentStateProxy = createCurrentStateProxy();
      }

      return this._currentStateProxy;
    },
    set(nextState) {
      applyLegacySnapshot(nextState);
    },
  });

  global.Game = Game;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
  }
})(typeof window !== 'undefined' ? window : globalThis);
