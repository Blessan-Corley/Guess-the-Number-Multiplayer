const httpSchemas = require('../../contracts/httpSchemas');
const config = require('../../../config/config');

function getGuestSessionSecret(req) {
  return req.get('x-guest-session-secret') || null;
}

function getGuestToken(req) {
  return req.get('x-guest-token') || null;
}

function summarizeGuestToken(guestToken) {
  if (!guestToken || typeof guestToken !== 'string') {
    return 'missing';
  }

  const normalized = guestToken.trim();
  return normalized.length <= 8 ? normalized : `...${normalized.slice(-8)}`;
}

function registerProfileRoutes(gameServer) {
  gameServer.app.post(
    '/api/profiles/guest',
    gameServer.withReady(async (req, res) => {
      const payload = httpSchemas.parseGuestProfileRequest(req.body, getGuestSessionSecret(req));
      if (config.LOAD_TEST_DEBUG_LOGS) {
        gameServer.logger.info(
          {
            route: '/api/profiles/guest',
            guestToken: summarizeGuestToken(payload.guestToken),
            displayNameLength: payload.displayName.length,
          },
          'Guest profile create requested'
        );
      }

      const profile = await gameServer.profileService.resolveGuestProfile(
        payload.displayName,
        payload.guestToken,
        payload.guestSessionSecret
      );

      if (config.LOAD_TEST_DEBUG_LOGS) {
        gameServer.logger.info(
          {
            route: '/api/profiles/guest',
            guestToken: summarizeGuestToken(payload.guestToken),
            profileId: profile?.id || null,
          },
          'Guest profile create completed'
        );
      }

      return res.json({
        profile,
        credentials: {
          guestToken: profile ? profile.guestToken : payload.guestToken,
          guestSessionSecret: profile ? profile.guestSessionSecret : payload.guestSessionSecret,
        },
      });
    })
  );

  gameServer.app.get(
    '/api/profile',
    gameServer.withReady(async (req, res) => {
      const payload = httpSchemas.parseProfileQuery(
        req.query,
        getGuestSessionSecret(req),
        getGuestToken(req)
      );
      const profile = await gameServer.profileService.getProfileByGuestToken(
        payload.guestToken,
        payload.guestSessionSecret
      );

      if (!profile) {
        return res.json({ profile: null, matches: [] });
      }

      const matches = await gameServer.profileService.getMatchHistory(profile.id);
      return res.json({ profile, matches });
    })
  );

  gameServer.app.get(
    '/api/leaderboard',
    gameServer.withReady(async (req, res) => {
      const { limit } = httpSchemas.parseLeaderboardQuery(req.query, config.LEADERBOARD_LIMIT);
      const leaderboard = await gameServer.profileService.getLeaderboard(limit);
      res.json({ leaderboard });
    })
  );

  gameServer.app.get(
    '/api/profiles/:profileId/matches',
    gameServer.withReady(async (req, res) => {
      const { profileId, limit } = httpSchemas.parseMatchHistoryRequest(
        req.params,
        req.query,
        config.PROFILE_MATCH_HISTORY_LIMIT
      );
      const matches = await gameServer.profileService.getMatchHistory(profileId, limit);
      res.json({ matches });
    })
  );
}

module.exports = registerProfileRoutes;
