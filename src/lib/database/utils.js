const profileStatsSelect = `
    SELECT
        p.id,
        p.guest_token AS "guestToken",
        p.display_name AS "displayName",
        p.created_at AS "createdAt",
        p.last_seen_at AS "lastSeenAt",
        COALESCE(COUNT(DISTINCT mp.match_id), 0) AS "totalMatches",
        COALESCE(SUM(CASE WHEN mp.is_winner THEN 1 ELSE 0 END), 0) AS "totalWins",
        MIN(CASE WHEN mp.attempts > 0 THEN mp.attempts ELSE NULL END) AS "bestScore",
        AVG(CASE WHEN mp.attempts > 0 THEN mp.attempts ELSE NULL END) AS "averageAttempts"
    FROM player_profiles p
    LEFT JOIN match_participants mp ON mp.profile_id = p.id
`;

function normalizeProfileStats(profile) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    totalMatches: Number(profile.totalMatches || 0),
    totalWins: Number(profile.totalWins || 0),
    bestScore:
      profile.bestScore === null || profile.bestScore === undefined
        ? null
        : Number(profile.bestScore),
    averageAttempts:
      profile.averageAttempts === null || profile.averageAttempts === undefined
        ? 0
        : Math.round(Number(profile.averageAttempts) * 100) / 100,
  };
}

function normalizeConnectionString(connectionString = '') {
  if (typeof connectionString !== 'string') {
    return '';
  }

  // Strip any channel_binding parameter — the pg npm package does not support
  // SCRAM-SHA-256-PLUS (channel binding) and passing this parameter causes the
  // server to reject the connection with "unrecognized configuration parameter".
  const qIdx = connectionString.indexOf('?');
  if (qIdx === -1) {
    return connectionString;
  }

  const base = connectionString.slice(0, qIdx);
  const queryPart = connectionString.slice(qIdx + 1);
  const filteredParams = queryPart.split('&').filter((param) => !/^channel_binding=/i.test(param));

  return filteredParams.length > 0 ? `${base}?${filteredParams.join('&')}` : base;
}

function shouldEnableSsl(connectionString = '') {
  if (!connectionString) {
    return false;
  }

  if (/sslmode=disable/i.test(connectionString)) {
    return false;
  }

  return (
    /sslmode=(verify-full|verify-ca|require)/i.test(connectionString) ||
    /ssl=true/i.test(connectionString)
  );
}

module.exports = {
  profileStatsSelect,
  normalizeProfileStats,
  normalizeConnectionString,
  shouldEnableSsl,
};
