const GameRuntime = {
  gameStartTime: null,

  init() {
    Game.init();
    this.setupAccessibility();
    this.monitorConnection();
    this.optimizePerformance();
    this.loadPreferences();

    Game.updateRangeDisplay(1, 100);

    setTimeout(() => {
      this.restoreGameState();
    }, 1000);

    setInterval(() => {
      this.saveGameState();
    }, 30000);

    setInterval(() => {
      if (Game.currentState.gamePhase === 'playing' && Math.random() < 0.3) {
        this.showGameTips();
      }
    }, 120000);
  },

  setupAccessibility() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        this.manageFocus();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        const lobbyScreen = document.getElementById('lobbyScreen');
        if (lobbyScreen.classList.contains('active')) {
          const partyCode = document.getElementById('lobbyPartyCode').textContent;
          if (partyCode) {
            UI.copyToClipboard(partyCode);
            event.preventDefault();
          }
        }
      }
    });

    this.announceScreenChanges();
  },

  manageFocus() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) {
      return;
    }

    const firstInput = activeScreen.querySelector('input:not([disabled]), button:not([disabled])');
    if (firstInput && document.activeElement === document.body) {
      firstInput.focus();
    }
  },

  announceScreenChanges() {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList.contains('screen') && target.classList.contains('active')) {
            announcer.textContent = `Navigated to ${target.id.replace('Screen', ' screen')}`;
          }
        }
      });
    });

    document.querySelectorAll('.screen').forEach((screen) => {
      observer.observe(screen, { attributes: true });
    });
  },

  recordGameStart() {
    this.gameStartTime = Date.now();
    Game.trackUserAction('game_start', {
      isHost: Game.currentState.isHost,
      partyCode: Game.currentState.party?.code,
      gameMode: Game.currentState.gameMode,
    });
  },

  recordGameEnd(result) {
    Game.trackUserAction('game_end', {
      result,
      duration: Date.now() - (this.gameStartTime || Date.now()),
      rounds: Game.currentState.party?.currentRound,
      gameMode: Game.currentState.gameMode,
    });
  },

  savePreferences() {
    const nameValue = (document.getElementById('playerName')?.value || '').trim();
    // Keep the profile name key in sync so the field restores correctly on reload.
    if (nameValue) {
      try {
        localStorage.setItem('numberGuesserProfileName', nameValue);
      } catch (_) {}
    }
    const preferences = {
      lastPlayerName: nameValue,
      preferredSettings: {
        rangeStart: document.getElementById('rangeStart')?.value || 1,
        rangeEnd: document.getElementById('rangeEnd')?.value || 100,
      },
      lastGameMode: Game.currentState.gameMode,
      soundEnabled: true,
      notifications: true,
    };

    try {
      localStorage.setItem('numberGuesserPrefs', JSON.stringify(preferences));
    } catch (error) {}
  },

  loadPreferences() {
    try {
      const saved = localStorage.getItem('numberGuesserPrefs');
      if (!saved) {
        return;
      }

      const preferences = JSON.parse(saved);
      if (preferences.lastPlayerName) {
        document.getElementById('playerName').value = preferences.lastPlayerName;
      }

      if (preferences.preferredSettings && Game.currentState.isHost) {
        const rangeStartEl = document.getElementById('rangeStart');
        const rangeEndEl = document.getElementById('rangeEnd');

        if (rangeStartEl) rangeStartEl.value = preferences.preferredSettings.rangeStart || 1;
        if (rangeEndEl) rangeEndEl.value = preferences.preferredSettings.rangeEnd || 100;
      }

      if (preferences.lastGameMode === 'single') {
        Game.selectSinglePlayer();
      } else if (preferences.lastGameMode === 'multiplayer') {
        Game.selectMultiplayer();
      }
    } catch (error) {}
  },

  showGameTips() {
    const tips = [
      'Use binary search strategy: start with the middle number!',
      "Pay attention to 'close' vs 'far' feedback!",
      'Remember your previous guesses to narrow down the range!',
      'The fewer attempts, the better your performance rating!',
      "In multiplayer, both players must find the number - it's not a race!",
      'Choose your secret number wisely - not too obvious!',
      'Optimal attempts for range 1-100: about 7 guesses maximum!',
      'Smaller ranges reward precision, larger ranges reward disciplined narrowing.',
    ];

    UI.showNotification(tips[Math.floor(Math.random() * tips.length)], 'info', 8000);
  },

  monitorConnection() {
    setInterval(() => {
      if (!socketClient.isConnected && Game.currentState.gamePhase) {
        UI.showNotification('Connection unstable. Trying to reconnect...', 'warning');
      }
    }, 30000);
  },

  saveGameState() {
    if (!Game.currentState.party) {
      return;
    }

    try {
      sessionStorage.setItem(
        'gameStateBackup',
        JSON.stringify({
          partyCode: Game.currentState.party.code,
          playerId: socketClient.gameState.playerId,
          reconnectSecret: socketClient.gameState.reconnectSecret,
          phase: Game.currentState.gamePhase,
          hasFinished: Game.currentState.hasFinished,
          timestamp: Date.now(),
        })
      );

      if (window.AppActions && typeof window.AppActions.setReconnectSession === 'function') {
        window.AppActions.setReconnectSession({
          partyCode: Game.currentState.party.code,
          playerId: socketClient.gameState.playerId,
          reconnectSecret: socketClient.gameState.reconnectSecret,
          phase: Game.currentState.gamePhase,
          hasFinished: Game.currentState.hasFinished,
          timestamp: Date.now(),
          hasBackup: true,
        });
      }
    } catch (error) {}
  },

  restoreGameState() {
    try {
      const saved = sessionStorage.getItem('gameStateBackup');
      if (!saved) {
        return;
      }

      const gameState = JSON.parse(saved);
      if (Date.now() - gameState.timestamp >= 600000) {
        sessionStorage.removeItem('gameStateBackup');
        return;
      }

      if (!gameState.partyCode || !gameState.playerId || !gameState.reconnectSecret) {
        sessionStorage.removeItem('gameStateBackup');
        return;
      }

      UI.showNotification('Previous game session detected. Attempting to reconnect...', 'info');
      if (window.AppActions && typeof window.AppActions.setMode === 'function') {
        window.AppActions.setMode('multiplayer');
      }
      if (window.AppActions && typeof window.AppActions.setReconnectSession === 'function') {
        window.AppActions.setReconnectSession({
          partyCode: gameState.partyCode,
          playerId: gameState.playerId,
          reconnectSecret: gameState.reconnectSecret,
          phase: gameState.phase || null,
          hasFinished: Boolean(gameState.hasFinished),
          timestamp: gameState.timestamp,
          hasBackup: true,
        });
      }
      socketClient.gameState.partyCode = gameState.partyCode;
      socketClient.gameState.playerId = gameState.playerId;
      socketClient.gameState.reconnectSecret = gameState.reconnectSecret;

      if (socketClient.isConnected) {
        socketClient.attemptGameReconnection();
      } else {
        socketClient.enqueueAction(() => socketClient.attemptGameReconnection());
      }
    } catch (error) {
      sessionStorage.removeItem('gameStateBackup');
    }
  },

  optimizePerformance() {
    let settingsTimeout;
    const originalUpdateSettings = Game.updateSettings;
    Game.updateSettings = function debouncedUpdateSettings() {
      clearTimeout(settingsTimeout);
      settingsTimeout = setTimeout(() => {
        originalUpdateSettings.call(this);
      }, 500);
    };

    let lastGuessTime = 0;
    const originalMakeGuess = Game.makeGuess;
    Game.makeGuess = function throttledMakeGuess(guess) {
      const now = Date.now();
      if (now - lastGuessTime < 150) {
        return false;
      }

      lastGuessTime = now;
      return originalMakeGuess.call(this, guess);
    };
  },

  handleVisibilityChange() {
    if (document.hidden) {
      this.saveGameState();
      return;
    }

    if (socketClient && !socketClient.isConnected) {
      UI.showNotification('Checking connection...', 'info');
      socketClient.socket.connect();
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  GameRuntime.init();
});

window.addEventListener('beforeunload', () => {
  GameRuntime.savePreferences();
  GameRuntime.saveGameState();
});

document.addEventListener('visibilitychange', () => {
  GameRuntime.handleVisibilityChange();
});

window.GameRuntime = GameRuntime;
