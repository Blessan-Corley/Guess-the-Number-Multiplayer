class ProfileApi {
  constructor() {
    this.storageKey = 'numberGuesserGuestToken';
    this.sessionSecretKey = 'numberGuesserGuestSessionSecret';
    this.profileNameKey = 'numberGuesserProfileName';
  }

  loadOrCreateGuestToken() {
    const existing = localStorage.getItem(this.storageKey);
    if (existing) {
      return existing;
    }

    const uuid =
      window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const token = `guest_${uuid}`;
    localStorage.setItem(this.storageKey, token);
    return token;
  }

  loadOrCreateGuestSessionSecret() {
    const existing = localStorage.getItem(this.sessionSecretKey);
    if (existing) {
      return existing;
    }

    const uuid =
      window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const secret = `session_${uuid}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(this.sessionSecretKey, secret);
    return secret;
  }

  loadSavedName() {
    return localStorage.getItem(this.profileNameKey) || '';
  }

  persistName(displayName) {
    if (!displayName) {
      return;
    }

    localStorage.setItem(this.profileNameKey, displayName);
  }

  persistGuestSessionSecret(guestSessionSecret) {
    if (!guestSessionSecret) {
      return;
    }

    localStorage.setItem(this.sessionSecretKey, guestSessionSecret);
  }

  async ensureProfile(displayName, guestToken, guestSessionSecret) {
    const response = await fetch('/api/profiles/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-session-secret': guestSessionSecret,
      },
      body: JSON.stringify({
        displayName,
        guestToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save player profile');
    }

    return response.json();
  }

  async fetchProfile(guestToken, guestSessionSecret) {
    const response = await fetch('/api/profile', {
      cache: 'no-store',
      headers: {
        'x-guest-token': guestToken,
        'x-guest-session-secret': guestSessionSecret,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load player profile');
    }

    const data = await response.json();
    if (!data || !data.profile) {
      return null;
    }

    return data;
  }

  async fetchLeaderboard(limit = 10) {
    const response = await fetch(`/api/leaderboard?limit=${limit}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to load leaderboard');
    }

    return response.json();
  }
}

window.ProfileApi = ProfileApi;
