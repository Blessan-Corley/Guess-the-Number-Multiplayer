const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');
const { generateSecret } = require('../lib/security');

class ProfileService {
  constructor(database) {
    this.database = database;
  }

  async resolveGuestProfile(displayName, guestToken, guestSessionSecret = null) {
    if (!guestToken) {
      return null;
    }

    return this.database.upsertGuestProfile({
      id: uuidv4(),
      guestToken,
      guestSessionSecret: guestSessionSecret || generateSecret(),
      displayName: this.normalizeDisplayName(displayName),
    });
  }

  async getProfileByGuestToken(guestToken, guestSessionSecret) {
    if (!guestToken || !guestSessionSecret) {
      return null;
    }

    return this.database.getProfileByGuestToken(guestToken, guestSessionSecret);
  }

  async getProfileById(profileId) {
    if (!profileId) {
      return null;
    }

    return this.database.getProfileById(profileId);
  }

  async getLeaderboard(limit = config.LEADERBOARD_LIMIT) {
    return this.database.getLeaderboard(limit);
  }

  async getMatchHistory(profileId, limit = config.PROFILE_MATCH_HISTORY_LIMIT) {
    return this.database.getMatchHistoryForProfile(profileId, limit);
  }

  normalizeDisplayName(displayName) {
    const normalized = typeof displayName === 'string' ? displayName : 'Guest';
    const collapsedWhitespace = normalized.replace(/\s+/g, ' ').trim();
    const sanitized = collapsedWhitespace.replace(/[^a-zA-Z0-9 _-]/g, '');
    return sanitized.slice(0, 20).trim() || 'Guest';
  }
}

module.exports = ProfileService;
