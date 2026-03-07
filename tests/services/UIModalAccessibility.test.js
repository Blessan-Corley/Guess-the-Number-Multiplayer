describe('UI modal accessibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();

    const opener = {
      id: 'welcomeHowToPlay',
      focus: jest.fn(),
    };
    const closeButton = {
      id: 'closeHowToPlay',
      focus: jest.fn(),
    };
    const gotItButton = {
      id: 'gotItBtn',
      focus: jest.fn(),
    };
    const modal = {
      id: 'howToPlayModal',
      style: {
        display: 'none',
      },
      querySelectorAll: jest.fn(() => [closeButton, gotItButton]),
      contains: jest.fn((target) => target === closeButton || target === gotItButton),
    };
    const content = {
      innerHTML: '',
    };

    global.window = global;
    global.window.location = {
      href: 'http://localhost/',
    };
    global.history = {
      pushState: jest.fn(),
    };
    global.document = {
      body: {
        style: {},
      },
      activeElement: opener,
      getElementById: jest.fn((id) => {
        if (id === 'howToPlayModal') {
          return modal;
        }
        if (id === 'howToPlayContent') {
          return content;
        }
        if (id === 'closeHowToPlay') {
          return closeButton;
        }
        if (id === 'gotItBtn') {
          return gotItButton;
        }
        return null;
      }),
    };

    delete global.UI;
    delete global.UIGuides;
    global.UIGuides = {
      getGuide: jest.fn(() => '<p>Guide</p>'),
    };

    require('../../public/js/ui');
    require('../../public/js/ui-focus-manager');
    require('../../public/js/ui-core-screen');

    try {
      require('../../public/js/ui-modal-accessibility');
    } catch (_error) {
      // Expected during the red phase before the helper exists.
    }

    global.__modalFixture = {
      opener,
      closeButton,
      gotItButton,
      modal,
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete global.__modalFixture;
    delete global.UIGuides;
    delete global.UI;
    delete global.window;
    delete global.document;
    delete global.history;
  });

  test('showHowToPlay focuses the modal close control and hideHowToPlay restores focus to the opener', () => {
    global.UI.showHowToPlay('general');
    jest.runAllTimers();

    expect(global.__modalFixture.closeButton.focus).toHaveBeenCalledTimes(1);

    global.UI.hideHowToPlay();
    jest.runAllTimers();

    expect(global.__modalFixture.opener.focus).toHaveBeenCalledTimes(1);
  });

  test('trapModalFocus loops focus from the last control back to the first', () => {
    expect(typeof global.UI.trapModalFocus).toBe('function');

    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: jest.fn(),
      target: global.__modalFixture.gotItButton,
    };

    global.UI.trapModalFocus(global.__modalFixture.modal, event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(global.__modalFixture.closeButton.focus).toHaveBeenCalledTimes(1);
  });
});
