(function registerProfileLeaderboardConfig(globalScope) {
  function isTruthyFlag(value) {
    if (value === true || value === 1) {
      return true;
    }

    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  function normalizeCredential(value) {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : null;
  }

  function resolveProfileLeaderboardPlan(env = {}) {
    const createProfiles = isTruthyFlag(env.CREATE_PROFILES);
    const guestToken = normalizeCredential(env.GUEST_TOKEN);
    const guestSessionSecret = normalizeCredential(env.GUEST_SESSION_SECRET);
    const hasReadOnlyCredentials = Boolean(guestToken && guestSessionSecret);

    return {
      createProfiles,
      fetchProfile: createProfiles || hasReadOnlyCredentials,
      runLeaderboard: true,
      runHealth: true,
      guestToken: createProfiles ? null : guestToken,
      guestSessionSecret: createProfiles ? null : guestSessionSecret,
    };
  }

  const exported = {
    isTruthyFlag,
    resolveProfileLeaderboardPlan,
  };

  globalScope.ProfileLeaderboardLoadConfig = exported;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
