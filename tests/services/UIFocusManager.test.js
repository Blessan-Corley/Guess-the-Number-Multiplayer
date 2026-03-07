describe('UI focus manager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();

    const focus = jest.fn();
    const heading = {
      id: 'welcomeHeading',
      focus,
      setAttribute: jest.fn(),
    };

    global.window = global;
    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'welcomeHeading') {
          return heading;
        }

        return null;
      }),
    };

    delete global.UI;

    require('../../public/js/ui');

    try {
      require('../../public/js/ui-focus-manager');
    } catch (_error) {
      // Expected during the red phase before the helper exists.
    }

    global.__focusTarget = heading;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete global.__focusTarget;
    delete global.window;
    delete global.document;
    delete global.UI;
  });

  test('UI.focusTarget schedules focus to the requested element id', () => {
    expect(typeof global.UI.focusTarget).toBe('function');

    global.UI.focusTarget('welcomeHeading');
    jest.runAllTimers();

    expect(global.__focusTarget.focus).toHaveBeenCalledTimes(1);
  });
});
