describe('profile/leaderboard load config', () => {
  test('defaults to read-only mode without profile creation', () => {
    const {
      resolveProfileLeaderboardPlan,
    } = require('../../scripts/load/k6/profile-leaderboard-config');

    expect(resolveProfileLeaderboardPlan({})).toEqual({
      createProfiles: false,
      fetchProfile: false,
      runLeaderboard: true,
      runHealth: true,
      guestToken: null,
      guestSessionSecret: null,
    });
  });

  test('enables write mode only when CREATE_PROFILES=true', () => {
    const {
      resolveProfileLeaderboardPlan,
    } = require('../../scripts/load/k6/profile-leaderboard-config');

    expect(resolveProfileLeaderboardPlan({ CREATE_PROFILES: 'true' })).toMatchObject({
      createProfiles: true,
      fetchProfile: true,
    });
    expect(resolveProfileLeaderboardPlan({ CREATE_PROFILES: '1' })).toMatchObject({
      createProfiles: true,
      fetchProfile: true,
    });
    expect(resolveProfileLeaderboardPlan({ CREATE_PROFILES: 'false' })).toMatchObject({
      createProfiles: false,
      fetchProfile: false,
    });
  });

  test('enables profile fetch in read-only mode only when guest credentials are supplied', () => {
    const {
      resolveProfileLeaderboardPlan,
    } = require('../../scripts/load/k6/profile-leaderboard-config');

    expect(
      resolveProfileLeaderboardPlan({
        GUEST_TOKEN: 'guest-token-1',
        GUEST_SESSION_SECRET: 'guest-secret-1',
      })
    ).toEqual({
      createProfiles: false,
      fetchProfile: true,
      runLeaderboard: true,
      runHealth: true,
      guestToken: 'guest-token-1',
      guestSessionSecret: 'guest-secret-1',
    });
  });
});
