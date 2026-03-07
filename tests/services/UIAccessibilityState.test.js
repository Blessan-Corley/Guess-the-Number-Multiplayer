describe('UI accessibility announcer', () => {
  beforeEach(() => {
    jest.resetModules();

    global.window = global;
    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'appLiveRegion') {
          return {
            id,
            textContent: '',
            dataset: {},
            setAttribute: jest.fn(),
          };
        }

        return null;
      }),
    };

    delete global.UI;

    require('../../public/js/ui');

    try {
      require('../../public/js/ui-accessibility');
    } catch (_error) {
      // Expected during the red phase before the helper exists.
    }
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.UI;
  });

  test('UI.announceStatus stores and exposes the latest live-region announcement', () => {
    expect(typeof global.UI.announceStatus).toBe('function');

    global.UI.announceStatus('Connection restored', { priority: 'polite' });

    expect(global.UI.getAnnouncementState()).toEqual({
      message: 'Connection restored',
      priority: 'polite',
    });
  });
});
