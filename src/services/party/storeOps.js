async function removePlayerFromParty(store, partyCode, playerId) {
  const party = await store.getParty(partyCode);
  if (!party) {
    return null;
  }

  const removeResult = party.removePlayer(playerId);
  if (removeResult === 'HOST_LEFT' || party.isEmpty()) {
    await store.deleteParty(partyCode);
  } else {
    await store.saveParty(party);
  }

  return { party, removeResult };
}

async function detachExistingSession(store, socketId, skipPartyCode = null) {
  const existingPlayerId = await store.getPlayerIdForSocket(socketId);
  if (!existingPlayerId) {
    return null;
  }

  const existingPartyCode = await store.getPartyCodeForPlayer(existingPlayerId);
  if (existingPartyCode && existingPartyCode === skipPartyCode) {
    return {
      playerId: existingPlayerId,
      partyCode: existingPartyCode,
      skipped: true,
    };
  }

  if (existingPartyCode && existingPartyCode !== skipPartyCode) {
    await removePlayerFromParty(store, existingPartyCode, existingPlayerId);
  }

  await store.removePlayerMapping(existingPlayerId);
  await store.removeSocketMapping(socketId);

  return {
    playerId: existingPlayerId,
    partyCode: existingPartyCode,
  };
}

async function clearPartyMappings(store, party) {
  for (const player of party.players.values()) {
    await store.removePlayerMapping(player.id);
    await store.removeSocketMapping(player.socketId);
  }
}

module.exports = {
  removePlayerFromParty,
  detachExistingSession,
  clearPartyMappings,
};
