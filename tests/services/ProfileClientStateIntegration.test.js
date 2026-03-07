describe('Profile and single-player shared state integration', () => {
  function createStorageMock() {
    const store = new Map();
    return {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    };
  }

  beforeEach(() => {
    jest.resetModules();

    global.window = global;
    global.document = {
      addEventListener: jest.fn(),
      getElementById: jest.fn(() => null),
    };
    global.localStorage = createStorageMock();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    global.UI = {
      showNotification: jest.fn(),
    };

    delete global.AppState;
    delete global.AppActions;
    delete global.AppStateSelectors;
    require('../../public/js/app-state');
    require('../../public/js/app-actions');
    require('../../public/js/app-state-selectors');
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.fetch;
    delete global.UI;
    delete global.AppState;
    delete global.AppActions;
    delete global.AppStateSelectors;
    delete global.ProfileApi;
    delete global.ProfileView;
  });

  test('ProfileClient publishes profile, matches, and leaderboard snapshots to shared state', () => {
    global.ProfileApi = class ProfileApi {};
    global.ProfileView = class ProfileView {};

    const ProfileClient = require('../../public/js/profile-client');

    const client = new ProfileClient(
      {
        loadOrCreateGuestToken: () => 'guest-1',
        loadOrCreateGuestSessionSecret: () => 'secret-1',
        loadSavedName: () => 'Player',
        persistName: jest.fn(),
        ensureProfile: jest.fn(),
        persistGuestSessionSecret: jest.fn(),
      },
      {
        bindShellEvents: jest.fn(),
        restoreSavedName: jest.fn(),
        renderSummary: jest.fn(),
        renderLeaderboardPreview: jest.fn(),
        isModalOpen: jest.fn(() => false),
        openModal: jest.fn(),
        closeModal: jest.fn(),
      }
    );

    client.consumeProfileSnapshot({
      profile: {
        displayName: 'Player One',
        guestToken: 'guest-1',
      },
      matches: [{ id: 'match-1' }],
    });
    client.consumeLeaderboard([{ guestToken: 'guest-1', displayName: 'Player One', totalWins: 3 }]);

    expect(global.AppState.getState()).toMatchObject({
      profile: {
        displayName: 'Player One',
        guestToken: 'guest-1',
      },
      matches: [{ id: 'match-1' }],
      leaderboard: [{ guestToken: 'guest-1', displayName: 'Player One', totalWins: 3 }],
    });
  });

  test('ProfileClient refresh methods publish fetched snapshots to shared state', async () => {
    global.ProfileApi = class ProfileApi {};
    global.ProfileView = class ProfileView {};

    const ProfileClient = require('../../public/js/profile-client');

    const client = new ProfileClient(
      {
        loadOrCreateGuestToken: () => 'guest-2',
        loadOrCreateGuestSessionSecret: () => 'secret-2',
        loadSavedName: () => 'Player Two',
        persistName: jest.fn(),
        ensureProfile: jest.fn(),
        persistGuestSessionSecret: jest.fn(),
        fetchProfile: jest.fn().mockResolvedValue({
          profile: {
            displayName: 'Player Two',
            guestToken: 'guest-2',
          },
          matches: [{ id: 'match-2' }],
        }),
        fetchLeaderboard: jest.fn().mockResolvedValue({
          leaderboard: [{ guestToken: 'guest-2', displayName: 'Player Two', totalWins: 8 }],
        }),
      },
      {
        bindShellEvents: jest.fn(),
        restoreSavedName: jest.fn(),
        renderSummary: jest.fn(),
        renderLeaderboardPreview: jest.fn(),
        isModalOpen: jest.fn(() => false),
        openModal: jest.fn(),
        closeModal: jest.fn(),
      }
    );

    await client.refreshProfile();
    await client.refreshLeaderboard();

    expect(global.AppState.getState()).toMatchObject({
      profile: {
        displayName: 'Player Two',
        guestToken: 'guest-2',
      },
      matches: [{ id: 'match-2' }],
      leaderboard: [{ guestToken: 'guest-2', displayName: 'Player Two', totalWins: 8 }],
    });
  });

  test('SinglePlayerGame updates shared app mode and range bounds when starting a game', async () => {
    global.Game = {
      currentState: {},
    };

    const SinglePlayerGame = require('../../public/js/single-player');
    const game = new SinglePlayerGame();

    game.config = {
      GAME_MESSAGES: {},
    };
    game.generateRandomNumber = jest.fn(() => 24);
    game.initializeBotStrategy = jest.fn();
    game.showSinglePlayerSelection = jest.fn();

    game.startGame('Solo Player', 12, 36, 'hard');

    expect(global.AppState.getState()).toMatchObject({
      mode: 'single',
      flags: {
        hasFinished: false,
      },
      singlePlayer: {
        rangeStart: 12,
        rangeEnd: 36,
      },
    });
    expect(game.gameState.gamePhase).toBe('selection');
    expect(game.showSinglePlayerSelection).toHaveBeenCalled();
  });
});
