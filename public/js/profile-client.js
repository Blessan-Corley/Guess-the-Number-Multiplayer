class ProfileClient {
  constructor(api = new ProfileApi(), view = new ProfileView()) {
    this.api = api;
    this.view = view;
    this.guestToken = null;
    this.guestSessionSecret = null;
    this.profile = null;
    this.matches = [];
    this.leaderboard = [];
    this.activeModal = null;
    this.refreshInterval = null;
  }

  init() {
    this.guestToken = this.api.loadOrCreateGuestToken();
    this.guestSessionSecret = this.api.loadOrCreateGuestSessionSecret();
    this.view.bindShellEvents({
      onViewProfile: async () => {
        try {
          await this.refreshProfile();
          this.showProfileModal();
        } catch (error) {
          if (typeof UI !== 'undefined') {
            UI.showNotification(
              'Unable to load your profile right now. Please try again.',
              'warning',
              5000
            );
          }
        }
      },
      onViewLeaderboard: async () => {
        try {
          await this.refreshLeaderboard();
          this.showLeaderboardModal();
        } catch (error) {
          if (typeof UI !== 'undefined') {
            UI.showNotification(
              'Unable to load leaderboard right now. Please try again.',
              'warning',
              5000
            );
          }
        }
      },
      onCloseModal: () => this.closeModal(),
      onNameChange: (name) => this.persistName(name),
      onNameBlur: async (name) => {
        if (name.length >= 2) {
          try {
            await this.ensureProfile(name);
          } catch (error) {
            if (typeof UI !== 'undefined') {
              UI.showNotification('Could not save player name. Please retry.', 'warning', 5000);
            }
          }
        }
      },
    });
    this.view.restoreSavedName(this.api.loadSavedName());
    this.startBackgroundRefresh();
    this.refreshAll().catch(() => {});
  }

  startBackgroundRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      if (document.hidden) {
        return;
      }

      this.refreshAll().catch(() => {});
    }, 60000);
  }

  persistName(displayName) {
    this.api.persistName(displayName);
  }

  getGuestToken() {
    return this.guestToken;
  }

  getGuestSessionSecret() {
    return this.guestSessionSecret;
  }

  getPreferredDisplayName() {
    const playerNameInput = document.getElementById('playerName');
    const inputValue = playerNameInput ? playerNameInput.value.trim() : '';
    return inputValue || this.api.loadSavedName() || 'Player';
  }

  async ensureProfile(displayName = this.getPreferredDisplayName()) {
    const normalizedName = (displayName || '').trim();
    if (normalizedName.length < 2) {
      return this.profile;
    }

    this.persistName(normalizedName);
    const data = await this.api.ensureProfile(
      normalizedName,
      this.guestToken,
      this.guestSessionSecret
    );
    this.consumeProfileCredentials(data);
    this.consumeProfile(data.profile);
    return this.profile;
  }

  async refreshProfile() {
    if (this._profileFetching) {
      return this._profileFetching;
    }

    this._profileFetching = this.api
      .fetchProfile(this.guestToken, this.guestSessionSecret)
      .finally(() => {
        this._profileFetching = null;
      });
    const data = await this._profileFetching;
    if (!data) {
      this.profile = null;
      this.matches = [];
      if (window.AppActions && typeof window.AppActions.setProfileSnapshot === 'function') {
        window.AppActions.setProfileSnapshot({
          profile: null,
          matches: [],
        });
      }
      this.render();
      return null;
    }

    this.profile = data.profile;
    this.matches = data.matches || [];
    if (window.AppActions && typeof window.AppActions.setProfileSnapshot === 'function') {
      window.AppActions.setProfileSnapshot({
        profile: this.profile,
        matches: this.matches,
      });
    }
    this.render();
    return this.profile;
  }

  async refreshLeaderboard() {
    if (this._leaderboardFetching) {
      return this._leaderboardFetching;
    }

    this._leaderboardFetching = this.api.fetchLeaderboard().finally(() => {
      this._leaderboardFetching = null;
    });
    const data = await this._leaderboardFetching;
    this.leaderboard = data.leaderboard || [];
    if (window.AppActions && typeof window.AppActions.setLeaderboardSnapshot === 'function') {
      window.AppActions.setLeaderboardSnapshot(this.leaderboard);
    }
    this.render();
    return this.leaderboard;
  }

  async refreshAll() {
    await Promise.allSettled([this.refreshProfile(), this.refreshLeaderboard()]);
  }

  consumeProfile(profile) {
    if (!profile) {
      return;
    }

    if (profile.guestSessionSecret) {
      this.guestSessionSecret = profile.guestSessionSecret;
      this.api.persistGuestSessionSecret(profile.guestSessionSecret);
    }

    this.profile = profile;
    if (window.AppActions && typeof window.AppActions.setProfileSnapshot === 'function') {
      window.AppActions.setProfileSnapshot({
        profile: this.profile,
        matches: this.matches,
      });
    }
    this.render();
  }

  consumeProfileCredentials(data) {
    const guestSessionSecret =
      data?.credentials?.guestSessionSecret || data?.profile?.guestSessionSecret;
    if (!guestSessionSecret) {
      return;
    }

    this.guestSessionSecret = guestSessionSecret;
    this.api.persistGuestSessionSecret(guestSessionSecret);
  }

  consumeProfileSnapshot(data) {
    if (!data || !data.profile) {
      return;
    }

    this.profile = data.profile;
    this.matches = data.matches || this.matches;
    if (window.AppActions && typeof window.AppActions.setProfileSnapshot === 'function') {
      window.AppActions.setProfileSnapshot({
        profile: this.profile,
        matches: this.matches,
      });
    }
    this.render();
  }

  consumeLeaderboard(leaderboard) {
    if (!Array.isArray(leaderboard)) {
      return;
    }

    this.leaderboard = leaderboard;
    if (window.AppActions && typeof window.AppActions.setLeaderboardSnapshot === 'function') {
      window.AppActions.setLeaderboardSnapshot(this.leaderboard);
    }
    this.render();
  }

  handleRealtimeProfileUpdate(data) {
    this.consumeProfileSnapshot(data);
  }

  handleRealtimeLeaderboardUpdate(data) {
    this.consumeLeaderboard(data?.leaderboard || []);
  }

  render() {
    this.view.renderSummary(this.profile, this.getPreferredDisplayName());
    this.view.renderLeaderboardPreview(this.leaderboard, this.guestToken);

    if (this.activeModal === 'profile' && this.view.isModalOpen()) {
      this.showProfileModal();
    } else if (this.activeModal === 'leaderboard' && this.view.isModalOpen()) {
      this.showLeaderboardModal();
    }
  }

  showProfileModal() {
    this.activeModal = 'profile';
    this.view.openModal(
      '<i data-lucide="badge-info"></i> Your Profile',
      this.view.renderProfileModal(this.profile, this.matches, this.getPreferredDisplayName())
    );
  }

  showLeaderboardModal() {
    this.activeModal = 'leaderboard';
    this.view.openModal(
      '<i data-lucide="trophy"></i> Multiplayer Leaderboard',
      this.view.renderLeaderboardModal(this.leaderboard, this.guestToken)
    );
  }

  closeModal() {
    this.activeModal = null;
    this.view.closeModal();
  }
}

const profileClient = new ProfileClient();

if (typeof document !== 'undefined' && document?.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    profileClient.init();
  });
}

window.profileClient = profileClient;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileClient;
}
