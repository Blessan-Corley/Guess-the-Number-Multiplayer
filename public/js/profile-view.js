class ProfileView {
  static escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static formatCount(value, fallback = '0') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : fallback;
  }

  static formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString();
  }

  bindShellEvents({ onViewProfile, onViewLeaderboard, onCloseModal, onNameChange, onNameBlur }) {
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
    const closeModalBtn = document.getElementById('closePlayerDataModal');
    const playerDataModal = document.getElementById('playerDataModal');
    const playerNameInput = document.getElementById('playerName');

    if (viewProfileBtn) {
      viewProfileBtn.addEventListener('click', onViewProfile);
    }

    if (viewLeaderboardBtn) {
      viewLeaderboardBtn.addEventListener('click', onViewLeaderboard);
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', onCloseModal);
    }

    if (playerDataModal) {
      playerDataModal.addEventListener('click', (event) => {
        if (event.target === playerDataModal) {
          onCloseModal();
        }
      });
    }

    if (playerNameInput) {
      playerNameInput.addEventListener('change', () => onNameChange(playerNameInput.value.trim()));
      playerNameInput.addEventListener('blur', () => onNameBlur(playerNameInput.value.trim()));
    }
  }

  restoreSavedName(savedName) {
    const playerNameInput = document.getElementById('playerName');
    if (savedName && playerNameInput && !playerNameInput.value) {
      playerNameInput.value = savedName;
    }
  }

  renderSummary(profile, preferredName) {
    const nameEl = document.getElementById('welcomeProfileName');
    const metaEl = document.getElementById('welcomeProfileMeta');
    const matchesEl = document.getElementById('profileTotalMatches');
    const winsEl = document.getElementById('profileTotalWins');
    const bestScoreEl = document.getElementById('profileBestScore');

    if (!nameEl || !metaEl || !matchesEl || !winsEl || !bestScoreEl) {
      return;
    }

    nameEl.textContent = profile?.displayName || preferredName || 'Player';

    if (profile) {
      metaEl.textContent = 'Wins, matches, best score.';
      matchesEl.textContent = profile.totalMatches || 0;
      winsEl.textContent = profile.totalWins || 0;
      bestScoreEl.textContent = profile.bestScore || '-';
    } else {
      metaEl.textContent = 'Play a match to unlock stats.';
      matchesEl.textContent = '0';
      winsEl.textContent = '0';
      bestScoreEl.textContent = '-';
    }
  }

  renderLeaderboardPreview(leaderboard, guestToken) {
    const preview = document.getElementById('leaderboardPreview');
    if (!preview) {
      return;
    }

    if (!leaderboard || leaderboard.length === 0) {
      preview.innerHTML = '';
      preview.hidden = true;
      return;
    }

    preview.hidden = false;

    const topThree = leaderboard
      .slice(0, 3)
      .map(
        (entry, index) => `
            <article class="leaderboard-preview-row ${entry.guestToken === guestToken ? 'is-current-player' : ''}">
                <div class="leaderboard-preview-rank">#${index + 1}</div>
                <div class="leaderboard-preview-main">
                    <strong>${ProfileView.escapeHtml(entry.displayName || 'Player')}</strong>
                    <span>${ProfileView.formatCount(entry.totalWins)} wins | ${ProfileView.formatCount(entry.totalMatches)} matches</span>
                </div>
                <div class="leaderboard-preview-score">${ProfileView.escapeHtml(entry.bestScore || '-')} best</div>
            </article>
        `
      )
      .join('');

    preview.innerHTML = `
            <div class="leaderboard-preview-header">
                <h4>Leaderboard</h4>
            </div>
            <div class="leaderboard-preview-list">
                ${topThree}
            </div>
        `;
  }

  renderProfileModal(profile, matches, preferredName) {
    const matchesMarkup =
      matches.length > 0
        ? matches
            .map(
              (match) => `
                <article class="player-data-row">
                    <div>
                        <h4>${match.isWinner ? 'Victory' : 'Completed Match'}</h4>
                        <p>${ProfileView.escapeHtml(match.gameMode || 'multiplayer')} match | Range ${ProfileView.formatCount(match.rangeStart, '1')}-${ProfileView.formatCount(match.rangeEnd, '100')}</p>
                    </div>
                    <div class="player-data-row-meta">
                        <strong>${ProfileView.formatCount(match.attempts)} attempts</strong>
                        <span>${ProfileView.formatDate(match.completedAt)}</span>
                    </div>
                </article>
            `
            )
            .join('')
        : '<p class="player-data-empty">No multiplayer matches recorded yet.</p>';

    return `
            <section class="player-data-panel">
                <div class="player-data-grid">
                    <div class="player-data-stat">
                        <span>Display Name</span>
                        <strong>${ProfileView.escapeHtml(profile?.displayName || preferredName || 'Player')}</strong>
                    </div>
                    <div class="player-data-stat">
                        <span>Total Matches</span>
                        <strong>${ProfileView.formatCount(profile?.totalMatches)}</strong>
                    </div>
                    <div class="player-data-stat">
                        <span>Total Wins</span>
                        <strong>${ProfileView.formatCount(profile?.totalWins)}</strong>
                    </div>
                    <div class="player-data-stat">
                        <span>Best Score</span>
                        <strong>${ProfileView.escapeHtml(profile?.bestScore || '-')}</strong>
                    </div>
                </div>
                <div class="player-data-list">
                    <h3>Recent Matches</h3>
                    ${matchesMarkup}
                </div>
            </section>
        `;
  }

  renderLeaderboardModal(leaderboard, guestToken) {
    const leaderboardMarkup =
      leaderboard.length > 0
        ? leaderboard
            .map(
              (entry, index) => `
                <article class="leaderboard-row ${entry.guestToken === guestToken ? 'is-current-player' : ''}">
                    <div class="leaderboard-rank">#${index + 1}</div>
                    <div class="leaderboard-main">
                        <strong>${ProfileView.escapeHtml(entry.displayName || 'Player')}</strong>
                        <span>${ProfileView.formatCount(entry.totalMatches)} matches | avg ${ProfileView.escapeHtml(entry.averageAttempts || 0)} attempts</span>
                    </div>
                    <div class="leaderboard-score">${ProfileView.formatCount(entry.totalWins)} wins</div>
                </article>
            `
            )
            .join('')
        : `
                <div class="leaderboard-preview-empty leaderboard-modal-empty">
                    <strong>No completed multiplayer matches yet.</strong>
                    <span>The leaderboard appears automatically after the first finished match.</span>
                </div>
            `;

    return `
            <section class="player-data-panel">
                <p class="player-data-lead">Top players ranked by multiplayer wins.</p>
                <div class="leaderboard-list">
                    ${leaderboardMarkup}
                </div>
            </section>
        `;
  }

  openModal(titleHtml, bodyHtml) {
    const modal = document.getElementById('playerDataModal');
    const title = document.getElementById('playerDataTitle');
    const body = document.getElementById('playerDataBody');
    if (!modal || !title || !body) {
      return;
    }

    title.innerHTML = titleHtml;
    body.innerHTML = bodyHtml;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  closeModal() {
    const modal = document.getElementById('playerDataModal');
    if (!modal) {
      return;
    }

    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  isModalOpen() {
    const modal = document.getElementById('playerDataModal');
    return Boolean(modal && modal.style.display === 'flex');
  }
}

window.ProfileView = ProfileView;
