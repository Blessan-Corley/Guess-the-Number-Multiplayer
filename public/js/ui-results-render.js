(function registerUIResultsRenderMethods(global) {
  function createIcon(iconName, className = '') {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    if (className) {
      icon.className = className;
    }
    return icon;
  }

  function setElementWithMeta(elementId, name, metaLabel) {
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

  function setButtonContent(button, iconName, label) {
    if (!button) {
      return;
    }

    button.textContent = '';
    button.appendChild(createIcon(iconName));
    button.appendChild(document.createTextNode(` ${label}`));
  }

  function renderResultIcon(isWinner) {
    return isWinner ? 'trophy' : 'circle-alert';
  }

  function toTitleCase(value = '') {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  global.UIResultsRenderMethods = {
    updateResultsScreen(roundResult, isGameComplete, gameWinner, party) {
      const isWinner = roundResult.winner.id === socketClient.gameState.playerId;

      const resultEmoji = document.getElementById('resultEmoji');
      if (resultEmoji) {
        resultEmoji.textContent = '';
        resultEmoji.appendChild(createIcon(renderResultIcon(isWinner)));
        resultEmoji.style.animation = 'bounceIn 0.5s ease';
      }

      let title;
      if (isGameComplete) {
        if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
          title = 'Champion! You won the match!';
        } else if (gameWinner) {
          title = 'Good game. You lost the match.';
        } else {
          title = 'Tie match.';
        }
      } else {
        title = isWinner ? 'Round victory!' : 'Round lost. Match continues.';
      }

      const resultTitle = document.getElementById('resultTitle');
      if (resultTitle) {
        resultTitle.textContent = title;
      }

      const players = party.players;
      const myPlayer = players.find((player) => player.id === socketClient.gameState.playerId);
      const opponent = players.find((player) => player.id !== socketClient.gameState.playerId);

      if (myPlayer && opponent) {
        setElementWithMeta('myResultName', myPlayer.name, 'You');
        setElementWithMeta('opponentResultName', opponent.name, 'Opponent');

        document.getElementById('myFinalAttempts').textContent = myPlayer.attempts;
        document.getElementById('opponentFinalAttempts').textContent = opponent.attempts;

        const totalRoundsPlayed = myPlayer.wins + opponent.wins;
        document.getElementById('myTotalWins').textContent =
          `${myPlayer.wins} out of ${totalRoundsPlayed} rounds won`;
        document.getElementById('opponentTotalWins').textContent =
          `${opponent.wins} out of ${totalRoundsPlayed} rounds won`;

        const totalRounds = myPlayer.wins + opponent.wins;
        let sessionSummary = `Session: ${totalRounds} rounds played`;
        if (totalRounds > 0) {
          const myWinRate = ((myPlayer.wins / totalRounds) * 100).toFixed(0);
          sessionSummary += ` | Your win rate: ${myWinRate}%`;
        }

        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
          sessionInfo.hidden = false;
          sessionInfo.textContent = sessionSummary;
        }

        this.updatePerformanceBadge('myPerformance', roundResult.winner.performance, isWinner);
        this.updatePerformanceBadge('opponentPerformance', null, !isWinner);

        const myCard = document.getElementById('myResultCard');
        const opponentCard = document.getElementById('opponentResultCard');

        if (myCard) {
          myCard.classList.toggle('winner', isWinner);
          if (isWinner) {
            myCard.style.animation = 'winnerHighlight 1s ease';
          }
        }
        if (opponentCard) {
          opponentCard.classList.toggle('winner', !isWinner);
          if (!isWinner) {
            opponentCard.style.animation = 'winnerHighlight 1s ease';
          }
        }
      }

      if (!myPlayer || !opponent) {
        return;
      }

      let message;
      const totalRoundsPlayed = myPlayer.wins + opponent.wins;
      if (isGameComplete) {
        if (gameWinner && gameWinner.id === socketClient.gameState.playerId) {
          message = `You won ${myPlayer.wins} out of ${totalRoundsPlayed} rounds.`;
        } else if (gameWinner) {
          message = `Your opponent won ${opponent.wins} out of ${totalRoundsPlayed} rounds.`;
        } else {
          message = `Both players won ${myPlayer.wins} rounds.`;
        }
      } else {
        message = isWinner
          ? `You found it in ${myPlayer.attempts} attempts.`
          : `Opponent found it in ${opponent.attempts} attempts.`;
      }

      const finalMessage = document.getElementById('finalResultMessage');
      if (finalMessage) {
        finalMessage.textContent = message;
        finalMessage.className = `message ${isWinner ? 'success' : 'info'}`;
      }

      const nextRoundBtn = document.getElementById('nextRoundBtn');
      const rematchBtn = document.getElementById('rematchBtn');
      const leaveBtn = document.getElementById('leaveResultsBtn');

      if (nextRoundBtn && rematchBtn) {
        if (isGameComplete) {
          nextRoundBtn.style.display = 'none';
          setButtonContent(rematchBtn, 'rotate-ccw', 'Rematch');
          rematchBtn.classList.add('pulse-animation');
        } else {
          nextRoundBtn.style.display = socketClient.gameState.isHost ? 'inline-block' : 'none';
          if (socketClient.gameState.isHost) {
            nextRoundBtn.classList.add('pulse-animation');
          }
          setButtonContent(rematchBtn, 'rotate-ccw', 'Rematch');
        }
      }

      if (leaveBtn) {
        setButtonContent(leaveBtn, 'home', 'Back to Menu');
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },

    updateWinBadges(cardId, wins) {
      const card = document.getElementById(cardId);
      if (!card) {
        return;
      }

      const existingBadge = card.querySelector('.win-badge');
      if (existingBadge) {
        existingBadge.remove();
      }

      if (wins <= 0) {
        return;
      }

      const badge = document.createElement('div');
      badge.className = 'win-badge';
      const count = document.createElement('span');
      count.className = 'win-count';
      count.textContent = String(wins);

      const label = document.createElement('span');
      label.className = 'win-label';
      label.textContent = 'wins';

      badge.appendChild(count);
      badge.appendChild(label);

      if (wins >= 3) {
        badge.classList.add('hot-streak');
        badge.title = 'Strong streak';
      } else if (wins >= 2) {
        badge.classList.add('winning-streak');
        badge.title = 'Good momentum';
      }

      card.appendChild(badge);
    },

    updatePerformanceBadge(elementId, performance, isWinner) {
      const badge = document.getElementById(elementId);
      if (!badge) {
        return;
      }

      if (!performance) {
        const fallbackIcon = isWinner ? 'trophy' : 'target';
        const fallbackLabel = isWinner ? 'Winner' : 'Completed';
        badge.textContent = '';
        badge.appendChild(createIcon(fallbackIcon));
        badge.appendChild(document.createTextNode(` ${fallbackLabel}`));
        badge.className = `performance-badge ${isWinner ? 'excellent' : 'fair'}`;
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
        return;
      }

      const ratingLabel = toTitleCase(performance.rating);
      const iconName = performance.emoji || 'target';
      badge.textContent = '';
      badge.appendChild(createIcon(iconName));
      badge.appendChild(document.createTextNode(` ${ratingLabel}`));
      badge.className = `performance-badge ${performance.rating}`;
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },
  };
})(window);
