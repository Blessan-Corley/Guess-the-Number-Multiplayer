describe('UI connection status accessibility', () => {
  beforeEach(() => {
    jest.resetModules();

    const connectionStatus = {
      className: '',
      dataset: {},
      innerHTML: '',
      title: '',
    };
    const appLiveRegion = {
      textContent: '',
      dataset: {},
      setAttribute: jest.fn(),
    };

    global.window = global;
    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'connectionStatus') {
          return connectionStatus;
        }
        if (id === 'appLiveRegion') {
          return appLiveRegion;
        }
        return null;
      }),
    };

    delete global.UI;

    require('../../public/js/ui');
    require('../../public/js/ui-accessibility');
    require('../../public/js/ui-core-screen');

    global.UI.showNotification = jest.fn();
    global.__connectionFixture = {
      connectionStatus,
      appLiveRegion,
    };
  });

  afterEach(() => {
    delete global.__connectionFixture;
    delete global.UI;
    delete global.window;
    delete global.document;
  });

  test('updateConnectionStatus announces reconnecting and disconnected states', () => {
    global.UI.updateConnectionStatus('connecting');

    expect(global.UI.getAnnouncementState()).toEqual({
      message: 'Connecting to server...',
      priority: 'polite',
    });

    global.UI.updateConnectionStatus('disconnected');

    expect(global.UI.getAnnouncementState()).toEqual({
      message: 'Connection lost. Attempting to reconnect.',
      priority: 'assertive',
    });
  });
});
