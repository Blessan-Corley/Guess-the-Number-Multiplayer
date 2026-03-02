(function registerGameStateUtils(global) {
  const methods = {
    updateRangeDisplay(start, end) {
      const rangeSize = end - start + 1;
      const currentRangeDisplay = document.getElementById('currentRangeDisplay');
      if (currentRangeDisplay) {
        currentRangeDisplay.textContent = `${start} to ${end}`;
      }

      let difficultyText = '';
      let difficultyClass = '';

      if (rangeSize <= 10) {
        difficultyText = ' - Beginner';
        difficultyClass = 'difficulty-beginner';
      } else if (rangeSize <= 50) {
        difficultyText = ' - Easy';
        difficultyClass = 'difficulty-easy';
      } else if (rangeSize <= 100) {
        difficultyText = ' - Medium';
        difficultyClass = 'difficulty-medium';
      } else if (rangeSize <= 500) {
        difficultyText = ' - Hard';
        difficultyClass = 'difficulty-hard';
      } else if (rangeSize <= 1000) {
        difficultyText = ' - Expert';
        difficultyClass = 'difficulty-expert';
      } else if (rangeSize <= 5000) {
        difficultyText = ' - Insane';
        difficultyClass = 'difficulty-insane';
      } else {
        difficultyText = ' - Legendary';
        difficultyClass = 'difficulty-legendary';
      }

      const rangeSizeElement = document.getElementById('rangeSize');
      if (rangeSizeElement) {
        rangeSizeElement.textContent = rangeSize + difficultyText;
        rangeSizeElement.className = `range-size ${difficultyClass}`;
      }

      const optimalAttempts = Math.ceil(Math.log2(rangeSize));
      const rangeOptimalHint = document.getElementById('rangeOptimalHint');
      if (rangeOptimalHint) {
        rangeOptimalHint.textContent = '';
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'target');
        icon.className = 'inline-icon';
        rangeOptimalHint.appendChild(icon);
        rangeOptimalHint.appendChild(
          document.createTextNode(` Optimal strategy: ~${optimalAttempts} attempts max`)
        );
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },

    resetGameState() {
      if (window.AppActions && typeof window.AppActions.resetSharedState === 'function') {
        window.AppActions.resetSharedState();
      } else {
        this.currentState = {
          screen: 'welcome',
          party: null,
          player: null,
          profile: null,
          gamePhase: null,
          isHost: false,
          gameMode: null,
          hasFinished: false,
        };
      }

      UI.resetGameState();
    },

    returnToWelcome() {
      this.resetGameState();
      UI.showNotification('Returned to main menu', 'info');
    },

    getGameState() {
      return {
        ...this.currentState,
        socketState: socketClient.getGameState(),
      };
    },
  };

  Object.assign(global.Game, methods);
})(window);
