function mapPlayerDetail(player) {
  return {
    id: player.id,
    name: player.name,
    socketId: player.socketId,
    isHost: player.isHost,
    isConnected: player.isConnected,
    isReady: player.isReady,
    attempts: player.attempts,
    wins: player.wins,
  };
}

function formatPartyDetails(party) {
  return {
    code: party.code,
    id: party.id,
    status: party.status,
    phase: party.gameState.phase,
    round: party.currentRound,
    maxRounds: party.maxRounds,
    players: Array.from(party.players.values()).map(mapPlayerDetail),
    settings: party.gameSettings,
    createdAt: party.createdAt,
    lastActivity: party.lastActivity,
    isInactive: party.isInactive(),
  };
}

function formatStats(stats, activeParties, activePlayers) {
  return {
    totalPartiesCreated: stats.totalPartiesCreated,
    activeParties: activeParties.length,
    totalPlayersJoined: stats.totalPlayersJoined,
    activePlayers,
    gamesCompleted: stats.gamesCompleted,
  };
}

function formatSystemHealth({ totalParties, activeParties, activePlayers, stats, memoryUsage }) {
  return {
    healthy: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    parties: {
      total: totalParties,
      active: activeParties.length,
      inactive: totalParties - activeParties.length,
    },
    players: {
      total: stats.totalPlayersJoined,
      active: activePlayers,
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    },
    stats,
  };
}

module.exports = {
  formatPartyDetails,
  formatStats,
  formatSystemHealth,
};
