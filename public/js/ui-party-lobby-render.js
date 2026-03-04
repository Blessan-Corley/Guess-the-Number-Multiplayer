(function registerUIPartyLobbyRenderMethods(global) {
  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function createIcon(iconName, className = '') {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    if (className) {
      icon.className = className;
    }
    return icon;
  }

  function renderPlayerLabel(container, player, { waiting = false } = {}) {
    clearChildren(container);

    const status = document.createElement('span');
    status.className = `status-indicator ${player?.isConnected ? 'online' : 'offline'}`;
    status.setAttribute('aria-label', player?.isConnected ? 'Online' : 'Offline');
    container.appendChild(status);
    container.appendChild(document.createTextNode(' '));

    if (waiting) {
      container.appendChild(document.createTextNode('Waiting for player...'));
      return;
    }

    container.appendChild(document.createTextNode(player.name));

    if (player.isHost) {
      container.appendChild(document.createTextNode(' '));
      container.appendChild(createIcon('crown', 'inline-icon host-crown'));
    }
  }

  global.UIPartyLobbyRenderMethods = {
    updatePartyInfo(party) {
      const partyCodeDisplay = document.getElementById('partyCodeDisplay');
      const partyInfo = document.getElementById('partyInfo');
      if (!partyCodeDisplay || !partyInfo) {
        return;
      }

      partyCodeDisplay.textContent = party.code;
      partyInfo.style.display = 'block';
    },

    hidePartyInfo() {
      const partyInfo = document.getElementById('partyInfo');
      if (partyInfo) {
        partyInfo.style.display = 'none';
      }
    },

    updateLobbyPlayers(party) {
      const players = party.players;
      const hostPlayer = players.find((player) => player.isHost);
      const guestPlayer = players.find((player) => !player.isHost);

      const player1Card = document.getElementById('player1Card');
      const player1Name = document.getElementById('player1Name');
      if (hostPlayer && player1Card && player1Name) {
        renderPlayerLabel(player1Name, hostPlayer);
        player1Card.classList.toggle('active', hostPlayer.isConnected);
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      const player2Card = document.getElementById('player2Card');
      const player2Name = document.getElementById('player2Name');
      if (guestPlayer && player2Card && player2Name) {
        renderPlayerLabel(player2Name, guestPlayer);
        player2Card.classList.toggle('active', guestPlayer.isConnected);

        const startBtn = document.getElementById('startGameBtn');
        if (
          startBtn &&
          party.players.some(
            (player) => player.isHost && socketClient.gameState.playerId === player.id
          )
        ) {
          startBtn.disabled = false;
          startBtn.textContent = 'Start Game';
          startBtn.classList.add('pulse-animation');
        }
        return;
      }

      if (player2Name) {
        renderPlayerLabel(player2Name, { isConnected: false }, { waiting: true });
      }
      if (player2Card) {
        player2Card.classList.remove('active');
      }

      this.showInvitationHelpers(party.code);
    },

    showInvitationHelpers(partyCode) {
      let helperDiv = document.getElementById('invitation-helper');
      if (helperDiv) {
        return;
      }

      helperDiv = document.createElement('div');
      helperDiv.id = 'invitation-helper';
      helperDiv.className = 'invitation-helper';
      const content = document.createElement('div');
      content.className = 'helper-content';

      const heading = document.createElement('h4');
      heading.textContent = 'Waiting for a friend?';

      const description = document.createElement('p');
      description.appendChild(document.createTextNode('Share your party code: '));
      const strong = document.createElement('strong');
      strong.textContent = partyCode;
      description.appendChild(strong);

      const shareOptions = document.createElement('div');
      shareOptions.className = 'share-options';

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'btn btn-copy';
      copyButton.dataset.partyAction = 'copy-code';
      copyButton.textContent = 'Copy Code';

      const shareButton = document.createElement('button');
      shareButton.type = 'button';
      shareButton.className = 'btn btn-secondary';
      shareButton.dataset.partyAction = 'share-link';
      shareButton.textContent = 'Share Link';

      shareOptions.appendChild(copyButton);
      shareOptions.appendChild(shareButton);

      const tip = document.createElement('p');
      tip.className = 'helper-tip';
      tip.textContent = 'Tip: Share the party code with your friend to join the game.';

      content.appendChild(heading);
      content.appendChild(description);
      content.appendChild(shareOptions);
      content.appendChild(tip);
      helperDiv.appendChild(content);

      const partyCodeSection = document.querySelector('.party-code-section');
      if (partyCodeSection) {
        partyCodeSection.after(helperDiv);
      }

      this.bindInvitationHelperActions(helperDiv, partyCode);
    },

    bindInvitationHelperActions(helperElement, partyCode) {
      const copyButton = helperElement.querySelector('[data-party-action="copy-code"]');
      if (copyButton) {
        copyButton.addEventListener('click', () => this.copyToClipboard(partyCode));
      }

      const shareButton = helperElement.querySelector('[data-party-action="share-link"]');
      if (shareButton) {
        shareButton.addEventListener('click', () => this.sharePartyLink(partyCode));
      }
    },

    sharePartyLink(partyCode) {
      const url = `${window.location.origin}${window.location.pathname}?join=${partyCode}`;

      if (navigator.share) {
        navigator
          .share({
            title: 'Join my NumDuel match',
            text: `Join my party with code: ${partyCode}`,
            url,
          })
          .then(() => {
            this.showNotification('Invitation shared!', 'success');
          })
          .catch(() => {
            this.copyToClipboard(url);
          });
        return;
      }

      this.copyToClipboard(url);
    },

    updatePartyVisibilityControl(party) {
      const toggle = document.getElementById('partyVisibilityToggle');
      const label = document.getElementById('partyVisibilityLabel');
      const helper = document.getElementById('partyVisibilityHelper');
      if (!toggle || !label || !helper) {
        return;
      }

      const visibility = party?.visibility === 'public' ? 'public' : 'private';
      const isHost = Boolean(socketClient?.gameState?.isHost);

      toggle.dataset.visibility = visibility;
      toggle.dataset.nextVisibility = visibility === 'public' ? 'private' : 'public';
      toggle.disabled = !isHost;
      toggle.setAttribute('aria-pressed', visibility === 'public' ? 'true' : 'false');

      if (visibility === 'public') {
        toggle.innerHTML =
          '<i data-lucide="globe-2"></i><span id="partyVisibilityLabel">Public Room</span>';
        helper.textContent = isHost
          ? 'Visible in the public room list until the match starts.'
          : 'This room is visible in the public room list.';
      } else {
        toggle.innerHTML =
          '<i data-lucide="lock"></i><span id="partyVisibilityLabel">Private Room</span>';
        helper.textContent = isHost
          ? 'Private room. Join with code only.'
          : 'Private room. Only code invites can enter.';
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },

    updatePublicDirectory(payload = {}) {
      const list = document.getElementById('publicRoomList');
      const roomCount = document.getElementById('publicRoomCount');
      if (!list || !roomCount) {
        return;
      }

      const parties = Array.isArray(payload.parties) ? payload.parties : [];
      const stats = payload.stats || {};

      const onlinePlayers = document.getElementById('publicOnlinePlayers');
      if (onlinePlayers) onlinePlayers.textContent = String(stats.onlinePlayers ?? 0);
      const activeMatches = document.getElementById('publicActiveMatches');
      if (activeMatches) activeMatches.textContent = String(stats.activeMatches ?? 0);

      const openCount = parties.filter((party) => party.joinStatus === 'open').length;
      roomCount.textContent = `${openCount} open`;

      clearChildren(list);

      if (parties.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'public-room-empty';
        empty.textContent = 'No public rooms yet.';
        list.appendChild(empty);
        return;
      }

      parties.forEach((party) => {
        const row = document.createElement('article');
        row.className = 'public-room-row';
        row.dataset.publicPartyCode = party.code;
        row.dataset.roomStatus = party.joinStatus;

        const main = document.createElement('div');
        main.className = 'public-room-main';

        const title = document.createElement('div');
        title.className = 'public-room-title';
        title.textContent = `${party.hostName}'s game`;

        const meta = document.createElement('div');
        meta.className = 'public-room-meta';
        meta.textContent = `${party.playerCount}/${party.maxPlayers} players • Range ${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd}`;

        const action = document.createElement('button');
        action.type = 'button';
        action.className = party.joinStatus === 'open' ? 'btn btn-primary' : 'btn btn-secondary';
        action.dataset.publicPartyJoin = party.code;
        action.textContent = party.joinStatus === 'open' ? 'Join' : 'Filled';
        action.disabled = party.joinStatus !== 'open';

        main.appendChild(title);
        main.appendChild(meta);
        row.appendChild(main);
        row.appendChild(action);
        list.appendChild(row);
      });
    },

    updateMultiplayerConnectionLatency(latencyMs, signal = 'unknown') {
      const latency = document.getElementById('publicConnectionLatency');
      if (!latency) {
        return;
      }

      if (!Number.isFinite(latencyMs)) {
        latency.textContent = signal === 'unknown' ? '-' : '...';
        return;
      }

      latency.textContent = `${latencyMs}ms`;
    },
  };
})(window);
