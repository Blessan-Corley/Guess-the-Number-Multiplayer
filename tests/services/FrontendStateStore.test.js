describe('Frontend shared app state', () => {
  function loadStateModules() {
    global.window = global.window || global;

    const appState = require('../../public/js/app-state');
    const appActions = require('../../public/js/app-actions');
    const selectors = require('../../public/js/app-state-selectors');

    return {
      appState,
      appActions,
      selectors,
    };
  }

  beforeEach(() => {
    jest.resetModules();
    global.window = global;
    delete global.AppState;
    delete global.AppActions;
    delete global.AppStateSelectors;
    delete global.Game;
  });

  afterEach(() => {
    delete global.window;
    delete global.AppState;
    delete global.AppActions;
    delete global.AppStateSelectors;
    delete global.Game;
  });

  test('creates a stable initial shared state snapshot', () => {
    const { appState } = loadStateModules();

    const snapshot = appState.getState();

    expect(snapshot).toMatchObject({
      screen: 'welcome',
      mode: null,
      party: null,
      localPlayer: null,
      profile: null,
      matches: [],
      leaderboard: [],
      reconnect: {
        partyCode: null,
        playerId: null,
        reconnectSecret: null,
        hasBackup: false,
      },
      connection: {
        connected: false,
        signal: 'unknown',
      },
      flags: {
        isHost: false,
        hasFinished: false,
      },
    });
  });

  test('returns defensive snapshots instead of exposing mutable internals', () => {
    const { appState, appActions } = loadStateModules();

    appActions.applyPartySession({
      party: {
        code: 'ABC123',
        gameSettings: {
          rangeStart: 3,
          rangeEnd: 55,
        },
      },
      localPlayer: {
        id: 'player-1',
        name: 'Host',
      },
      isHost: true,
    });

    const snapshot = appState.getState();
    snapshot.party.code = 'MUTATE';
    snapshot.flags.isHost = false;

    expect(appState.getState().party.code).toBe('ABC123');
    expect(appState.getState().flags.isHost).toBe(true);
  });

  test('notifies subscribers when actions update shared app state', () => {
    const { appState, appActions } = loadStateModules();
    const updates = [];
    const unsubscribe = appState.subscribe((state) => {
      updates.push({
        screen: state.screen,
        mode: state.mode,
        partyCode: state.party?.code || null,
      });
    });

    appActions.setMode('multiplayer');
    appActions.setScreen('lobby');
    appActions.applyPartySession({
      party: { code: 'ZXCV12', gameSettings: { rangeStart: 1, rangeEnd: 100 } },
      localPlayer: { id: 'player-1', name: 'Host' },
      isHost: true,
    });

    unsubscribe();

    expect(updates).toEqual([
      { screen: 'welcome', mode: 'multiplayer', partyCode: null },
      { screen: 'lobby', mode: 'multiplayer', partyCode: null },
      { screen: 'lobby', mode: 'multiplayer', partyCode: 'ZXCV12' },
    ]);
  });

  test('derives common selector values from the shared state', () => {
    const { appActions, selectors } = loadStateModules();

    appActions.setMode('single');
    appActions.setSinglePlayerBounds({ rangeStart: 10, rangeEnd: 25 });

    expect(selectors.isSinglePlayerMode()).toBe(true);
    expect(selectors.getNumberBounds()).toEqual({ min: 10, max: 25 });

    appActions.applyPartySession({
      party: {
        code: 'ROOM99',
        gameSettings: {
          rangeStart: 5,
          rangeEnd: 500,
        },
      },
      localPlayer: {
        id: 'player-7',
        name: 'Guest',
      },
      isHost: false,
    });

    expect(selectors.getPartyCode()).toBe('ROOM99');
    expect(selectors.getLocalPlayerId()).toBe('player-7');
    expect(selectors.getNumberBounds()).toEqual({ min: 5, max: 500 });
  });

  test('keeps Game.currentState synchronized with the shared app store', () => {
    const { appState, appActions } = loadStateModules();
    const Game = require('../../public/js/game');

    Game.init();
    Game.currentState.gameMode = 'multiplayer';
    Game.currentState.screen = 'lobby';
    Game.currentState.player = { id: 'player-9', name: 'Host' };

    expect(appState.getState()).toMatchObject({
      mode: 'multiplayer',
      screen: 'lobby',
      localPlayer: {
        id: 'player-9',
        name: 'Host',
      },
    });

    appActions.applyPartySession({
      party: { code: 'SYNC11', gameSettings: { rangeStart: 1, rangeEnd: 100 } },
      localPlayer: { id: 'player-9', name: 'Host' },
      isHost: true,
    });

    expect(Game.currentState.party).toEqual({
      code: 'SYNC11',
      gameSettings: { rangeStart: 1, rangeEnd: 100 },
    });
    expect(Game.currentState.isHost).toBe(true);
  });

  test('routes socket party and connection updates through the shared state store', () => {
    const { appState } = loadStateModules();

    global.UI = {
      updateConnectionStatus: jest.fn(),
      hideLoadingOverlay: jest.fn(),
      showNotification: jest.fn(),
      resetGuessSubmissionState: jest.fn(),
      resetButton: jest.fn(),
    };
    global.profileClient = {
      refreshAll: jest.fn().mockResolvedValue(undefined),
      consumeProfile: jest.fn(),
      consumeProfileCredentials: jest.fn(),
    };
    global.Game = {
      handlePartyCreated: jest.fn(),
    };

    require('../../public/js/socket-client-events');

    const handlers = {};
    const client = {
      socket: {
        on(eventName, handler) {
          handlers[eventName] = handler;
        },
      },
      isConnected: false,
      reconnectAttempts: 2,
      gameState: {
        playerId: null,
        partyCode: null,
        playerName: null,
        isHost: false,
        reconnectSecret: null,
      },
      connectionTelemetry: {
        signal: 'unknown',
        smoothedLatencyMs: null,
      },
      resetConnectionTelemetry() {
        this.connectionTelemetry = {
          signal: 'unknown',
          smoothedLatencyMs: null,
        };
      },
      flushPendingActions: jest.fn(),
      sendHeartbeat: jest.fn(),
      handleReconnection: jest.fn(),
      handleConnectionError: jest.fn(),
      recordHeartbeatAck: jest.fn(() => ({
        latencyMs: 87,
        signal: 'strong',
      })),
      getConnectionBadgeState: jest.fn((status) => ({
        status,
        latencyMs: null,
        signal: 'unknown',
      })),
    };

    global.SocketClientEvents.register(client);

    handlers.connect();
    handlers.party_created({
      party: {
        code: 'REAL01',
        gameSettings: { rangeStart: 1, rangeEnd: 100 },
      },
      player: {
        id: 'player-1',
        name: 'Host',
        isHost: true,
      },
      reconnectSecret: 'secret-1',
    });
    handlers.heartbeat_ack({ clientPerfNow: 10 });

    expect(appState.getState()).toMatchObject({
      connection: {
        connected: true,
        reconnectAttempts: 0,
        signal: 'strong',
        latencyMs: 87,
      },
      party: {
        code: 'REAL01',
      },
      localPlayer: {
        id: 'player-1',
        name: 'Host',
      },
      flags: {
        isHost: true,
      },
      reconnect: {
        partyCode: 'REAL01',
        playerId: 'player-1',
        reconnectSecret: 'secret-1',
      },
    });

    expect(client.gameState.partyCode).toBe('REAL01');
    expect(client.gameState.playerId).toBe('player-1');
    expect(global.Game.handlePartyCreated).toHaveBeenCalled();
  });
});
