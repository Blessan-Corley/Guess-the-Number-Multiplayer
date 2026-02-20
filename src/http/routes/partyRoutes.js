const httpSchemas = require('../../contracts/httpSchemas');
const AppError = require('../../errors/AppError');
const ERROR_CODES = require('../../errors/errorCodes');

// Short-lived in-memory cache for the public directory listing.
// Prevents Redis/store round-trips on every frontend poll tick.
const DIRECTORY_CACHE_TTL_MS = 2000;
let _directoryCache = null;
let _directoryCacheAt = 0;

function registerPartyRoutes(gameServer) {
  gameServer.app.get(
    '/api/public-parties',
    gameServer.withReady(async (req, res) => {
      const now = Date.now();
      if (_directoryCache && now - _directoryCacheAt < DIRECTORY_CACHE_TTL_MS) {
        return res.json(_directoryCache);
      }

      const [parties, stats] = await Promise.all([
        gameServer.partyService.listPublicParties(),
        gameServer.partyService.getPublicLobbyStats(),
      ]);

      _directoryCache = { parties, stats };
      _directoryCacheAt = now;

      return res.json(_directoryCache);
    })
  );

  gameServer.app.post(
    '/api/validate-party',
    gameServer.withReady(async (req, res) => {
      const { partyCode } = httpSchemas.parseValidatePartyRequest(req.body);
      const party = await gameServer.partyService.getParty(partyCode);

      if (!party) {
        throw new AppError({
          code: ERROR_CODES.PARTY_NOT_FOUND,
          statusCode: 404,
          safeMessage: 'Party not found',
        });
      }

      if (party.players.size >= 2) {
        throw new AppError({
          code: ERROR_CODES.PARTY_FULL,
          statusCode: 400,
          safeMessage: 'Party is full',
        });
      }

      res.json({ valid: true, party: party.getPublicInfo() });
    })
  );
}

module.exports = registerPartyRoutes;
