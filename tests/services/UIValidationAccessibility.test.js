describe('UI validation accessibility', () => {
  beforeEach(() => {
    jest.resetModules();

    global.window = global;
    global.document = {};

    delete global.UI;

    require('../../public/js/ui');
    require('../../public/js/ui-validation-input-state');

    try {
      require('../../public/js/ui-action-state');
    } catch (_error) {
      // Expected during the red phase before the helper exists.
    }
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.UI;
  });

  function createInputFixture(id) {
    let hint = null;
    const parentElement = {
      querySelector: jest.fn((selector) => {
        if (selector === '.input-hint') {
          return hint;
        }

        return null;
      }),
      appendChild: jest.fn((node) => {
        hint = node;
        return node;
      }),
    };

    return {
      input: {
        id,
        parentElement,
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
        },
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        focus: jest.fn(),
      },
      getHint: () => hint,
    };
  }

  test('showInputError marks the field invalid and links it to an inline error message', () => {
    const { input, getHint } = createInputFixture('playerName');

    global.document.createElement = jest.fn(() => ({
      className: '',
      id: '',
      textContent: '',
    }));

    global.UI.showInputError(input, 'Name is required');

    expect(input.setAttribute).toHaveBeenCalledWith('aria-invalid', 'true');
    expect(input.setAttribute).toHaveBeenCalledWith('aria-describedby', 'playerName-error');
    expect(getHint()).toMatchObject({
      id: 'playerName-error',
      textContent: 'Name is required',
    });
  });

  test('focusFirstInvalidInput moves focus to the first invalid field', () => {
    const first = createInputFixture('playerName').input;
    const second = createInputFixture('partyCodeInput').input;

    expect(typeof global.UI.focusFirstInvalidInput).toBe('function');

    global.UI.focusFirstInvalidInput([first, second]);

    expect(first.focus).toHaveBeenCalledTimes(1);
    expect(second.focus).not.toHaveBeenCalled();
  });

  test('submitGuess returns focus to the guess field when validation fails', () => {
    const guessInput = createInputFixture('guessInput').input;
    guessInput.value = '999';
    const button = {
      disabled: false,
    };

    global.document.getElementById = jest.fn((id) => {
      if (id === 'makeGuessBtn') {
        return button;
      }

      if (id === 'guessInput') {
        return guessInput;
      }

      if (id === 'gameScreen') {
        return {
          classList: {
            contains: jest.fn(() => true),
          },
        };
      }

      return null;
    });

    global.UI.validateInput = jest.fn(() => false);
    global.UI.getNumberValidationMessage = jest.fn(() => 'Guess must be between 1 and 100');
    global.UI.showNotification = jest.fn();

    require('../../public/js/ui-actions');

    global.UI.submitGuess();

    expect(guessInput.focus).toHaveBeenCalledTimes(1);
  });
});
