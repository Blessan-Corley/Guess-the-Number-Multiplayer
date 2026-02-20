async function recordCompletedMatch(db, match) {
  if (!db.enabled) {
    return null;
  }

  await db.connect();
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
            INSERT INTO matches (
                id,
                party_code,
                game_mode,
                status,
                range_start,
                range_end,
                winner_profile_id,
                winner_name,
                started_at,
                completed_at,
                duration_ms,
                round_count,
                metadata
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb
            )
            `,
      [
        match.id,
        match.partyCode,
        match.gameMode,
        match.status,
        match.rangeStart,
        match.rangeEnd,
        match.winnerProfileId,
        match.winnerName,
        match.startedAt,
        match.completedAt,
        match.durationMs,
        match.roundCount,
        JSON.stringify(match.metadata || {}),
      ]
    );

    for (const participant of match.participants) {
      await client.query(
        `
                INSERT INTO match_participants (
                    id,
                    match_id,
                    profile_id,
                    player_name,
                    attempts,
                    wins,
                    is_winner
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `,
        [
          participant.id,
          match.id,
          participant.profileId,
          participant.playerName,
          participant.attempts,
          participant.wins,
          participant.isWinner,
        ]
      );
    }

    await client.query('COMMIT');
    return match.id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  recordCompletedMatch,
};
