describe('UI shared-state selectors', () => {
  beforeEach(() => {
    jest.resetModules();

    global.window = global;
    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'rangeStart') {
          return { value: '1' };
        }

        if (id === 'rangeEnd') {
          return { value: '100' };
        }

        return null;
      }),
    };

    delete global.AppState;
    delete global.AppActions;
    delete global.AppStateSelectors;
    delete global.UI;
    delete global.Game;
    delete global.singlePlayerGame;

    require('../../public/js/app-state');
    require('../../public/js/app-actions');
    require('../../public/js/app-state-selectors');
    require('../../public/js/ui');
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.AppState;
    delete global.AppActions;
    delete global.AppStateSelectors;
    delete global.UI;
    delete global.Game;
    delete global.singlePlayerGame;
  });

  test('UI.getCurrentNumberBounds reads single-player bounds from shared state without legacy globals', () => {
    global.AppActions.setMode('single');
    global.AppActions.setSinglePlayerBounds({ rangeStart: 8, rangeEnd: 22 });

    require('../../public/js/ui-actions');

    expect(global.UI.getCurrentNumberBounds()).toEqual({ min: 8, max: 22 });
  });

  test('UI.validateGameNumber uses shared multiplayer bounds without reading Game.currentState', () => {
    global.AppActions.applyPartySession({
      party: {
        code: 'ROOM12',
        gameSettings: {
          rangeStart: 5,
          rangeEnd: 15,
        },
      },
      localPlayer: {
        id: 'player-1',
        name: 'Host',
      },
      isHost: true,
    });

    global.UI.showInputError = jest.fn();
    global.UI.clearInputState = jest.fn();

    require('../../public/js/ui-validation-field-rules');

    const input = {
      id: 'guessInput',
      value: '20',
    };

    expect(global.UI.validateGameNumber(input)).toBe(false);
    expect(global.UI.showInputError).toHaveBeenCalledWith(input, 'Number must be between 5 and 15');
  });
});
