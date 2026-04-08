import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import './profile-leaderboard-config.js';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const LEADERBOARD_LIMIT = Number(__ENV.LEADERBOARD_LIMIT || 20);
const loadPlan = globalThis.ProfileLeaderboardLoadConfig.resolveProfileLeaderboardPlan(__ENV);

export const errorRate = new Rate('profile_flow_errors');

export const options = {
  scenarios: {
    profile_flow: {
      executor: __ENV.EXECUTOR || 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || 5),
      stages: [
        { duration: __ENV.WARMUP_DURATION || '30s', target: Number(__ENV.WARMUP_VUS || 10) },
        { duration: __ENV.STEADY_DURATION || '2m', target: Number(__ENV.STEADY_VUS || 30) },
        { duration: __ENV.COOLDOWN_DURATION || '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    profile_flow_errors: ['rate<0.01'],
  },
};

function uniqueSuffix() {
  return `${__VU}-${__ITER}-${Date.now()}`;
}

function createGuestIdentity() {
  const suffix = uniqueSuffix();
  return {
    guestToken: `k6-guest-${suffix}`,
    guestSessionSecret: `k6-session-${suffix}`,
    displayName: `K6User${suffix}`.slice(0, 20),
  };
}

export default function () {
  const identity = loadPlan.createProfiles
    ? createGuestIdentity()
    : {
        guestToken: loadPlan.guestToken,
        guestSessionSecret: loadPlan.guestSessionSecret,
        displayName: null,
      };

  let allChecksPassed = true;

  if (loadPlan.createProfiles) {
    const createProfile = http.post(
      `${BASE_URL}/api/profiles/guest`,
      JSON.stringify({
        displayName: identity.displayName,
        guestToken: identity.guestToken,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'x-guest-session-secret': identity.guestSessionSecret,
        },
        tags: { endpoint: 'create_profile' },
      }
    );

    allChecksPassed =
      check(createProfile, {
        'create profile returns 200': (response) => response.status === 200,
      }) && allChecksPassed;
  }

  if (loadPlan.fetchProfile) {
    const profile = http.get(`${BASE_URL}/api/profile`, {
      headers: {
        'x-guest-token': identity.guestToken,
        'x-guest-session-secret': identity.guestSessionSecret,
      },
      tags: { endpoint: 'fetch_profile' },
    });

    allChecksPassed =
      check(profile, {
        'fetch profile returns 200': (response) => response.status === 200,
        'fetch profile returns same guest token': (response) => {
          if (response.status !== 200) {
            return false;
          }
          const body = response.json();
          return body?.profile?.guestToken === identity.guestToken;
        },
      }) && allChecksPassed;
  }

  const leaderboard = http.get(`${BASE_URL}/api/leaderboard?limit=${LEADERBOARD_LIMIT}`, {
    tags: { endpoint: 'fetch_leaderboard' },
  });

  const health = http.get(`${BASE_URL}/api/health`, {
    tags: { endpoint: 'health' },
  });

  allChecksPassed =
    check(leaderboard, {
      'leaderboard returns 200': (response) => response.status === 200,
      'leaderboard shape is valid': (response) =>
        response.status === 200 && Array.isArray(response.json()?.leaderboard),
    }) && allChecksPassed;

  allChecksPassed =
    check(health, {
      'health returns 200': (response) => response.status === 200,
    }) && allChecksPassed;

  errorRate.add(!allChecksPassed);
  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}
