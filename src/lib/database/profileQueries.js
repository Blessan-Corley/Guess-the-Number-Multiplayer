const config = require('../../../config/config');
const { profileStatsSelect, normalizeProfileStats } = require('./utils');
const { hashSecret, secretsMatch } = require('../security');

function createInvalidGuestSessionError() {
  const error = new Error('Invalid guest session');
  error.code = 'INVALID_GUEST_SESSION';
  error.statusCode = 401;
  return error;
}

function attachGuestSessionSecret(profile, guestSessionSecret) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    guestSessionSecret,
  };
}

async function getGuestSessionHash(db, guestToken) {
  const result = await db.pool.query(
    'SELECT session_secret_hash AS "sessionSecretHash" FROM player_profiles WHERE guest_token = $1 LIMIT 1',
    [guestToken]
  );

  return result.rows[0] || null;
}

async function verifyGuestSession(db, guestToken, guestSessionSecret) {
  if (!guestToken || !guestSessionSecret) {
    throw createInvalidGuestSessionError();
  }

  const profileSession = await getGuestSessionHash(db, guestToken);
  if (!profileSession) {
    return false;
  }

  if (!profileSession.sessionSecretHash) {
    await db.pool.query(
      `UPDATE player_profiles
             SET session_secret_hash = $2, last_seen_at = NOW()
             WHERE guest_token = $1`,
      [guestToken, hashSecret(guestSessionSecret)]
    );
    return true;
  }

  if (!secretsMatch(guestSessionSecret, profileSession.sessionSecretHash)) {
    throw createInvalidGuestSessionError();
  }

  return true;
}

async function upsertGuestProfile(db, { id, guestToken, guestSessionSecret, displayName }) {
  if (!db.enabled) {
    return attachGuestSessionSecret(
      {
        id,
        guestToken,
        displayName,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        totalMatches: 0,
        totalWins: 0,
        bestScore: null,
        averageAttempts: 0,
      },
      guestSessionSecret
    );
  }

  await db.connect();
  const sessionSecretHash = hashSecret(guestSessionSecret);
  const existing = await getGuestSessionHash(db, guestToken);

  if (existing) {
    if (
      existing.sessionSecretHash &&
      !secretsMatch(guestSessionSecret, existing.sessionSecretHash)
    ) {
      throw createInvalidGuestSessionError();
    }

    await db.pool.query(
      `UPDATE player_profiles
             SET display_name = $2,
                 session_secret_hash = COALESCE(session_secret_hash, $3),
                 last_seen_at = NOW()
             WHERE guest_token = $1`,
      [guestToken, displayName, sessionSecretHash]
    );
  } else {
    await db.pool.query(
      `INSERT INTO player_profiles (id, guest_token, session_secret_hash, display_name)
             VALUES ($1, $2, $3, $4)`,
      [id, guestToken, sessionSecretHash, displayName]
    );
  }

  return getProfileByGuestToken(db, guestToken, guestSessionSecret);
}

async function getProfileByGuestToken(db, guestToken, guestSessionSecret) {
  if (!db.enabled) {
    return null;
  }

  await db.connect();
  const exists = await verifyGuestSession(db, guestToken, guestSessionSecret);
  if (!exists) {
    return null;
  }

  const result = await db.pool.query(
    `${profileStatsSelect}
         WHERE p.guest_token = $1
         GROUP BY p.id, p.guest_token, p.display_name, p.created_at, p.last_seen_at
         LIMIT 1`,
    [guestToken]
  );

  return attachGuestSessionSecret(
    normalizeProfileStats(result.rows[0] || null),
    guestSessionSecret
  );
}

async function getProfileById(db, profileId) {
  if (!db.enabled) {
    return null;
  }

  await db.connect();
  const result = await db.pool.query(
    `${profileStatsSelect}
         WHERE p.id = $1
         GROUP BY p.id, p.guest_token, p.display_name, p.created_at, p.last_seen_at
         LIMIT 1`,
    [profileId]
  );

  return normalizeProfileStats(result.rows[0] || null);
}

async function getLeaderboard(db, limit = config.LEADERBOARD_LIMIT) {
  if (!db.enabled) {
    return [];
  }

  await db.connect();
  const result = await db.pool.query(
    `
        SELECT
            p.id,
            p.guest_token AS "guestToken",
            p.display_name AS "displayName",
            p.created_at AS "createdAt",
            p.last_seen_at AS "lastSeenAt",
            COUNT(DISTINCT mp.match_id) AS "totalMatches",
            COALESCE(SUM(CASE WHEN mp.is_winner THEN 1 ELSE 0 END), 0) AS "totalWins",
            MIN(CASE WHEN mp.attempts > 0 THEN mp.attempts ELSE NULL END) AS "bestScore",
            AVG(CASE WHEN mp.attempts > 0 THEN mp.attempts ELSE NULL END) AS "averageAttempts"
        FROM player_profiles p
        INNER JOIN match_participants mp ON mp.profile_id = p.id
        GROUP BY p.id, p.guest_token, p.display_name, p.created_at, p.last_seen_at
        ORDER BY "totalWins" DESC, "totalMatches" DESC, "averageAttempts" ASC, p.created_at ASC
        LIMIT $1
        `,
    [limit]
  );

  return result.rows.map(normalizeProfileStats);
}

async function getMatchHistoryForProfile(
  db,
  profileId,
  limit = config.PROFILE_MATCH_HISTORY_LIMIT
) {
  if (!db.enabled) {
    return [];
  }

  await db.connect();
  const result = await db.pool.query(
    `
        SELECT
            m.id,
            m.party_code AS "partyCode",
            m.game_mode AS "gameMode",
            m.status,
            m.range_start AS "rangeStart",
            m.range_end AS "rangeEnd",
            m.winner_name AS "winnerName",
            m.started_at AS "startedAt",
            m.completed_at AS "completedAt",
            m.duration_ms AS "durationMs",
            m.round_count AS "roundCount",
            mp.player_name AS "playerName",
            mp.attempts,
            mp.wins,
            mp.is_winner AS "isWinner"
        FROM match_participants mp
        INNER JOIN matches m ON m.id = mp.match_id
        WHERE mp.profile_id = $1
        ORDER BY m.completed_at DESC
        LIMIT $2
        `,
    [profileId, limit]
  );

  return result.rows;
}

module.exports = {
  upsertGuestProfile,
  getProfileByGuestToken,
  getProfileById,
  getLeaderboard,
  getMatchHistoryForProfile,
};
