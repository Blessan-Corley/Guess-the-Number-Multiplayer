const Validators = require('../../src/utils/validators');

describe('Validators', () => {
  test('validatePartyCode accepts valid codes and normalizes to uppercase', () => {
    const result = Validators.validatePartyCode('ab12cd');
    expect(result.valid).toBe(true);
    expect(result.cleanValue).toBe('AB12CD');
  });

  test('validatePlayerName rejects restricted words', () => {
    const result = Validators.validatePlayerName('AdminUser');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Player name contains restricted words');
  });

  test('validatePlayerName rejects one-character names', () => {
    const result = Validators.validatePlayerName('A');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Player name must be at least 2 characters long');
  });

  test('validateGameRange enforces configured bounds', () => {
    const tooSmallRange = Validators.validateGameRange(1, 3);
    expect(tooSmallRange.valid).toBe(false);
    expect(tooSmallRange.errors.length).toBeGreaterThan(0);

    const validRange = Validators.validateGameRange(1, 20);
    expect(validRange.valid).toBe(true);
    expect(validRange.cleanValue).toEqual({ start: 1, end: 20 });
  });

  test('sanitizeHtml escapes scriptable characters', () => {
    const result = Validators.sanitizeHtml('<script>alert("x")</script>');
    expect(result).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;');
  });

  test('validateRateLimit blocks repeated actions inside cooldown window', () => {
    const limits = new Map();
    const first = Validators.validateRateLimit('socket-1', 'make_guess', limits);
    const second = Validators.validateRateLimit('socket-1', 'make_guess', limits);

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(false);
    expect(second.error).toContain('Please wait');
  });

  test('validateBatch returns cleanData for valid fields only', () => {
    const result = Validators.validateBatch(
      {
        name: '  Player One  ',
        age: 24,
        score: 2.2,
      },
      {
        name: { required: true, type: 'string', minLength: 2 },
        age: { required: true, type: 'number', min: 18, integer: true },
        score: { required: true, type: 'number', integer: true },
      }
    );

    expect(result.valid).toBe(false);
    expect(result.cleanData).toEqual({
      name: 'Player One',
      age: 24,
    });
  });
});
