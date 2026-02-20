const config = require('../../../config/config');

function registerStatsRoutes(gameServer) {
  gameServer.app.get(
    '/api/stats',
    gameServer.withReady(async (req, res) => {
      res.json({
        totalParties: gameServer.partyService.getTotalPartiesCreated(),
        activeParties: await gameServer.partyService.getActivePartiesCount(),
        totalPlayers: gameServer.partyService.getTotalPlayersCount(),
        activePlayers: await gameServer.partyService.getActivePlayersCount(),
        gamesCompleted: gameServer.partyService.getGamesCompletedCount(),
        storeMode: config.STORE_MODE,
        databaseEnabled: gameServer.database.enabled,
      });
    })
  );
}

module.exports = registerStatsRoutes;
