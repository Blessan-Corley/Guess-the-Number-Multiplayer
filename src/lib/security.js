const crypto = require('crypto');

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSecret(secret) {
  return crypto
    .createHash('sha256')
    .update(String(secret || ''))
    .digest('hex');
}

function secretsMatch(secret, expectedHash) {
  if (!secret || !expectedHash) {
    return false;
  }

  const actual = hashSecret(secret);
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expectedHash, 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

module.exports = {
  generateSecret,
  hashSecret,
  secretsMatch,
};
