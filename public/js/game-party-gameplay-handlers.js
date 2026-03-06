(function registerGamePartyGameplayHandlers(global) {
  function createIcon(iconName, className = '') {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    if (className) {
      icon.className = className;
    }
    return icon;
  }

  function setButtonContent(button, iconName, label) {
    if (!button) {
      return;
    }

    button.textContent = '';
    button.appendChild(createIcon(iconName));
    button.appendChild(document.createTextNode(` ${label}`));
  }

  function setResultPlayerLabel(elementId, name, metaLabel) {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    element.textContent = '';
    element.appendChild(document.createTextNode(name));
    element.appendChild(document.createTextNode(' '));

    const meta = document.createElement('small');
    meta.textContent = `(${metaLabel})`;
    element.appendChild(meta);
  }

  function setTargetDisplay(elementId, className, text) {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    element.textContent = '';
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    element.appendChild(span);
  }

  global.GamePartyGameplayHandlers = {
    handleGameStarted(data) {
      this.currentState.party = data.party;
      this.currentState.gamePhase = 'selection';
      this.currentState.hasFinished = false;

      UI.showScreen('selectionScreen');
      UI.updateSelectionScreen(data.party, data.selectionTimeLimit);
      if (window.GameRuntime) {
        window.GameRuntime.recordGameStart();
      }

      UI.showNotification('Game started! Choose your secret number wisely!', 'success');
    },

    handlePlayerReady(data) {
      UI.updateReadyStatus(data.playerId, data.playerName, data.allReady);

      if (data.playerId !== socketClient.gameState.playerId) {
        UI.showNotification(`${data.playerName} is ready!`, 'info');
      }
    },

    handleSelectionTimer(data) {
      UI.updateSelectionTimer(data.timeLeft);

      if (data.timeLeft <= 0) {
        const secretInput = document.getElementById('secretNumber');
        const readyBtn = document.getElementById('readyBtn');
        if (secretInput && !secretInput.disabled) {
          secretInput.disabled = true;
          secretInput.placeholder = 'Time up! Auto-selecting...';
        }
        if (readyBtn && !readyBtn.disabled) {
          readyBtn.disabled = true;
          readyBtn.textContent = 'Auto-selecting...';
        }
      }
    },

    handlePlayingStarted(data) {
      this.currentState.party = data.party;
      this.currentState.gamePhase = 'playing';
      this.currentState.hasFinished = false;

      UI.showScreen('gameScreen');
      UI.updateGameScreen(data.party);

      UI.showNotification("Battle begins! Find your opponent's number!", 'success');
    },

    handleGuessResult(data) {
      const guessInput = document.getElementById('guessInput');
      const guessBtn = document.getElementById('makeGuessBtn');

      UI.updateGameStats(data.attempts, null);
      UI.showGameMessage(data.feedback.message, data.feedback.type);

      UI.addGuessToHistory(data.guess, {
        attempts: data.attempts,
        isCorrect: data.isCorrect,
        closeness: data.feedback.closeness,
        direction: data.feedback.direction,
      });

      if (!data.isCorrect && typeof UI.resetGuessSubmissionState === 'function') {
        UI.resetGuessSubmissionState({ focus: true });
      }

      if (data.isCorrect) {
        this.currentState.hasFinished = true;

        UI.showGameMessage(
          `Excellent! You found the number in ${data.attempts} attempts! Now wait for your opponent...`,
          'success'
        );

        if (guessBtn?._guessRecoveryTimeout) {
          clearTimeout(guessBtn._guessRecoveryTimeout);
          delete guessBtn._guessRecoveryTimeout;
        }

        if (guessInput) {
          guessInput.disabled = true;
          guessInput.placeholder = 'You found it!';
        }
        if (guessBtn) {
          guessBtn.disabled = true;
          setButtonContent(guessBtn, 'check-circle', 'Finished');
          guessBtn.classList.add('finished');
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }

        setTargetDisplay('opponentTarget', 'revealed-number', String(data.guess));
        this.playSound('success');
      } else {
        setTimeout(() => {
          if (guessInput && !guessInput.disabled) {
            guessInput.focus();
          }
        }, 1000);
      }
    },

    handlePlayerFinished(data) {
      if (data.playerId === socketClient.gameState.playerId) {
        if (data.isFirstToFinish) {
          UI.showNotification(
            `Excellent! You found it first in ${data.attempts} attempts! Waiting for opponent to finish...`,
            'success',
            4000
          );
        } else {
          UI.showNotification(
            `You found it in ${data.attempts} attempts! Let's see who wins...`,
            'success',
            4000
          );
        }
      } else if (data.isFirstToFinish && !this.currentState.hasFinished) {
        UI.showNotification(
          `${data.playerName} found it first in ${data.attempts} attempts! You need fewer attempts to win!`,
          'warning',
          5000
        );
      } else if (!this.currentState.hasFinished) {
        UI.showNotification(
          `${data.playerName} found it in ${data.attempts} attempts! Keep going!`,
          'info',
          4000
        );
      }

      if (data.playerId !== socketClient.gameState.playerId) {
        UI.updateGameStats(null, data.attempts);
      }
    },

    handleOpponentFinishedFirst(data) {
      const { opponentName, opponentAttempts, yourAttempts, attemptsToTie } = data;
      const attemptsLeft = (attemptsToTie || opponentAttempts) - yourAttempts;

      UI.showNotification(
        `${opponentName} found it in ${opponentAttempts} attempts! You have ${yourAttempts} so far. ${attemptsLeft} attempts left to win or tie!`,
        'warning',
        6000,
        'competitive'
      );

      UI.showGameMessage(
        `FINAL SPRINT! Find it in ${opponentAttempts} or fewer to win or tie! (Remaining: ${attemptsLeft})`,
        'warning'
      );

      const gameScreen = document.getElementById('gameScreen');
      if (gameScreen) {
        gameScreen.classList.add('competitive-mode');
      }

      setTargetDisplay('opponentTarget', 'finished-indicator', 'Found it!');
    },

    handleWaitingForOpponent(data) {
      UI.showNotification(data.message, 'success', 5000);

      const guessInput = document.getElementById('guessInput');
      const guessBtn = document.getElementById('makeGuessBtn');

      if (guessInput) {
        guessInput.disabled = true;
        guessInput.placeholder = 'You finished first!';
      }
      if (guessBtn) {
        guessBtn.disabled = true;
        guessBtn.textContent = 'Waiting...';
        guessBtn.classList.add('finished');
      }

      UI.showGameMessage('You finished first! Waiting for your opponent to complete...', 'success');

      if (data.opponentAttempts) {
        setTimeout(() => {
          UI.showNotification(
            `Your opponent has ${data.opponentAttempts} attempts so far...`,
            'info',
            3000
          );
        }, 2000);
      }
    },

    handleGameEndedByLeave(data) {
      this.currentState.hasFinished = false;
      UI.showScreen('resultsScreen');

      document.getElementById('resultEmoji').textContent = '';
      document.getElementById('resultTitle').textContent = 'Victory by Default!';

      setResultPlayerLabel('myResultName', data.winner.name, 'You');
      setResultPlayerLabel('opponentResultName', data.leftPlayer.name, 'Left');

      document.getElementById('myFinalAttempts').textContent = data.winner.attempts || 0;
      document.getElementById('opponentFinalAttempts').textContent = 'X';
      document.getElementById('myTotalWins').textContent =
        (this.currentState.player?.wins || 0) + 1;
      document.getElementById('opponentTotalWins').textContent = 0;

      const myCard = document.getElementById('myResultCard');
      const opponentCard = document.getElementById('opponentResultCard');
      myCard.classList.add('winner');
      opponentCard.classList.remove('winner');

      document.getElementById('finalResultMessage').textContent = data.message;
      document.getElementById('finalResultMessage').className = 'message success';

      document.getElementById('nextRoundBtn').style.display = 'none';
      UI.showNotification('Your opponent left the game. You win by default!', 'success');
    },

    handleOpponentGuessed(data) {
      UI.updateGameStats(null, data.attempts);

      if (data.isCorrect) {
        UI.showNotification(
          `${data.opponentName} found your number! The round is over.`,
          'warning'
        );
      } else if (data.attempts % 2 === 0 || data.attempts <= 5) {
        UI.showNotification(
          `${data.opponentName}: ${data.attempts} attempts so far...`,
          'info',
          2000
        );
      }
    },
  };
})(window);
