(function registerGameRoundResultHandlers(global) {
  global.GameRoundResultHandlers = {
    handleRoundEnded(data) {
      this.currentState.party = data.party;
      this.currentState.gamePhase = 'results';
      this.currentState.hasFinished = false;
      if (data.isGameComplete && window.GameRuntime) {
        window.GameRuntime.recordGameEnd(
          data.roundResult?.winner?.id === socketClient.gameState.playerId ? 'win' : 'loss'
        );
      }

      const gameScreen = document.getElementById('gameScreen');
      gameScreen.classList.remove('competitive-mode');

      UI.showScreen('resultsScreen');
      UI.updateResultsScreen(
        data.roundResult,
        data.isGameComplete,
        data.gameWinner,
        data.party,
        data.additionalData
      );

      const isWinner = data.roundResult.winner.id === socketClient.gameState.playerId;
      const additionalData = data.additionalData || {};
      let message = '';

      if (isWinner) {
        if (additionalData.winReason === 'fewer_attempts') {
          message = `Victory! You won with ${additionalData.winnerAttempts} attempts vs ${additionalData.loserAttempts} attempts!`;
        } else if (additionalData.winReason === 'same_attempts_faster') {
          message = `Victory! Same attempts (${additionalData.winnerAttempts}), but you were faster!`;
        } else if (additionalData.winReason === 'exceeded_attempts') {
          message = `Victory! Your opponent exceeded your ${additionalData.winnerAttempts} attempts!`;
        } else {
          message = `Round victory! You won in ${data.roundResult.winner.attempts} attempts!`;
        }
        this.playSound('win');
      } else {
        if (additionalData.winReason === 'fewer_attempts') {
          message = `Defeat! Opponent won with ${additionalData.winnerAttempts} vs your ${additionalData.loserAttempts} attempts.`;
        } else if (additionalData.winReason === 'same_attempts_faster') {
          message = `So close! Same attempts (${additionalData.winnerAttempts}), but they were faster!`;
        } else if (additionalData.winReason === 'exceeded_attempts') {
          message = `You exceeded their ${additionalData.winnerAttempts} attempts. Better luck next round!`;
        } else {
          message = 'Round complete! Better luck next time!';
        }
        this.playSound('lose');
      }

      UI.showNotification(
        message,
        isWinner ? 'success' : 'warning',
        6000,
        isWinner ? 'victory' : null
      );

      if (additionalData.earlyEnd) {
        setTimeout(() => {
          UI.showNotification(
            'Game ended early - no point continuing when victory is impossible!',
            'info',
            4000
          );
        }, 400);
      } else if (additionalData.bothFinished) {
        setTimeout(() => {
          UI.showNotification(
            'Both players found the number! Winner determined by performance.',
            'info',
            4000
          );
        }, 400);
      }

      setTimeout(() => {
        this.showEndGameOptions(data.isGameComplete);
      }, 500);

      if (data.isGameComplete && window.profileClient) {
        window.profileClient.refreshProfile().catch(() => {});
        window.profileClient.refreshLeaderboard().catch(() => {});
      }
    },

    showEndGameOptions() {
      const endGameDiv = document.getElementById('endGameActions');
      if (!endGameDiv) {
        return;
      }

      endGameDiv.hidden = false;
      endGameDiv.innerHTML = `
                <h4>What's Next?</h4>
                <div class="quick-actions">
                    <button class="btn btn-primary" data-endgame-action="settings"><i data-lucide="settings"></i> Change Settings</button>
                    <button class="btn btn-danger" data-endgame-action="leave"><i data-lucide="home"></i> Main Menu</button>
                </div>
                <p class="action-help" id="resultsActionHelp" data-rematch-state="default"><small><i data-lucide="info" class="inline-icon"></i> Use the main <strong>Rematch</strong> button above to restart quickly, or pick one option below.</small></p>
            `;
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      this.bindEndGameActionHandlers(endGameDiv);
    },

    bindEndGameActionHandlers(container) {
      container.querySelectorAll('[data-endgame-action]').forEach((button) => {
        button.addEventListener('click', () => {
          const action = button.dataset.endgameAction;
          if (action === 'rematch') {
            this.requestRematch();
          } else if (action === 'settings') {
            this.changeSettings();
          } else if (action === 'leave') {
            this.confirmLeaveParty();
          }
        });
      });
    },

    clearGameInputs() {
      const guessInput = document.getElementById('guessInput');
      if (guessInput) {
        guessInput.value = '';
        guessInput.disabled = false;
        guessInput.placeholder = 'Enter your guess...';
      }

      const guessBtn = document.getElementById('makeGuessBtn');
      if (guessBtn) {
        guessBtn.disabled = false;
        guessBtn.innerHTML = '<i data-lucide="target"></i> Guess!';
        guessBtn.classList.remove('finished');
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      const secretNumberInput = document.getElementById('secretNumber');
      if (secretNumberInput) {
        secretNumberInput.value = '';
        secretNumberInput.disabled = false;
        secretNumberInput.placeholder = 'Enter secret number...';
        secretNumberInput.style.borderColor = '';
        secretNumberInput.classList.remove('error', 'success');
      }

      const readyStatus = document.getElementById('readyStatus');
      if (readyStatus) {
        readyStatus.textContent = '';
        readyStatus.innerHTML = '';
      }

      const sessionInfo = document.getElementById('sessionInfo');
      if (sessionInfo) {
        sessionInfo.hidden = true;
        sessionInfo.textContent = '';
      }

      const endGameActions = document.getElementById('endGameActions');
      if (endGameActions) {
        endGameActions.hidden = true;
        endGameActions.textContent = '';
      }

      UI.updateGameStats(0, 0);
      UI.clearGuessHistory();

      const gameMessage = document.getElementById('gameMessage');
      if (gameMessage) {
        gameMessage.textContent = '';
        gameMessage.className = 'message';
      }

      const gameScreen = document.getElementById('gameScreen');
      if (gameScreen) {
        gameScreen.classList.remove('competitive-mode');
      }

      this.currentState.hasFinished = false;
      this.currentState.gamePhase = null;

      const loadingElements = document.querySelectorAll('.loading');
      loadingElements.forEach((element) => element.classList.remove('loading'));
    },

    updateRematchButtons(state) {
      const primaryRematchBtn = document.getElementById('rematchBtn');
      const actionHelp = document.getElementById('resultsActionHelp');

      switch (state) {
        case 'waiting':
          if (primaryRematchBtn) {
            primaryRematchBtn.innerHTML = '<i data-lucide="clock"></i> Waiting for opponent...';
            primaryRematchBtn.disabled = true;
          }
          if (actionHelp) {
            actionHelp.dataset.rematchState = 'waiting';
            actionHelp.innerHTML =
              '<small><i data-lucide="clock" class="inline-icon"></i> Rematch requested. Waiting for your opponent to respond.</small>';
          }
          break;
        case 'requested':
          if (primaryRematchBtn) {
            primaryRematchBtn.innerHTML = '<i data-lucide="check-circle"></i> Accept Rematch';
            primaryRematchBtn.disabled = false;
          }
          if (actionHelp) {
            actionHelp.dataset.rematchState = 'requested';
            actionHelp.innerHTML =
              '<small><i data-lucide="sparkles" class="inline-icon"></i> Your opponent wants a rematch. Click <strong>Accept Rematch</strong> to start again.</small>';
          }
          break;
        default:
          if (primaryRematchBtn) {
            primaryRematchBtn.innerHTML = '<i data-lucide="rotate-ccw"></i> Rematch';
            primaryRematchBtn.disabled = false;
          }
          if (actionHelp) {
            actionHelp.dataset.rematchState = 'default';
            actionHelp.innerHTML =
              '<small><i data-lucide="info" class="inline-icon"></i> Use the main <strong>Rematch</strong> button above to restart quickly, or pick one option below.</small>';
          }
      }
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },
  };
})(window);
