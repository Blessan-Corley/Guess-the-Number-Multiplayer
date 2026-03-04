(function registerUILiveGameRenderMethods(global) {
  function setLabelWithMeta(element, name, relationLabel, sessionSummary) {
    if (!element) {
      return;
    }

    element.textContent = '';
    element.appendChild(document.createTextNode(name));
    element.appendChild(document.createTextNode(' '));

    const meta = document.createElement('small');
    meta.textContent = `(${relationLabel}) - Session: ${sessionSummary}`;
    element.appendChild(meta);
  }

  function setTargetState(element, className, text) {
    if (!element) {
      return;
    }

    element.textContent = '';
    const content = document.createElement('span');
    content.className = className;
    content.textContent = text;
    element.appendChild(content);
  }

  global.UILiveGameRenderMethods = {
    updateGameScreen(party) {
      this.currentPossibleMin = party.gameSettings.rangeStart;
      this.currentPossibleMax = party.gameSettings.rangeEnd;
      this.updateRangeVisualizer(party.gameSettings.rangeStart, party.gameSettings.rangeEnd);

      const roundText =
        party.maxRounds > 1 ? `Round ${party.currentRound} of ${party.maxRounds}` : 'Game Round';
      const gameRoundInfo = document.getElementById('gameRoundInfo');
      if (gameRoundInfo) {
        const roundTextEl = gameRoundInfo.querySelector('.round-text');
        if (roundTextEl) {
          roundTextEl.textContent = roundText;
        }
      }

      const players = party.players;
      const myPlayer = players.find((player) => player.id === socketClient.gameState.playerId);
      const opponent = players.find((player) => player.id !== socketClient.gameState.playerId);

      if (myPlayer && opponent) {
        const myWins = myPlayer.wins || 0;
        const opponentWins = opponent.wins || 0;
        const totalRoundsPlayed = myWins + opponentWins;
        const myWinDisplay =
          totalRoundsPlayed > 0 ? `${myWins} out of ${totalRoundsPlayed} won` : `${myWins} wins`;
        const opponentWinDisplay =
          totalRoundsPlayed > 0
            ? `${opponentWins} out of ${totalRoundsPlayed} won`
            : `${opponentWins} wins`;

        const myBattleName = document.getElementById('myBattleName');
        setLabelWithMeta(myBattleName, myPlayer.name, 'You', myWinDisplay);

        const opponentBattleName = document.getElementById('opponentBattleName');
        setLabelWithMeta(opponentBattleName, opponent.name, 'Opponent', opponentWinDisplay);

        const myAttempts = document.getElementById('myAttempts');
        if (myAttempts) {
          myAttempts.textContent = myPlayer.attempts || 0;
        }

        const myWinsEl = document.getElementById('myWins');
        if (myWinsEl) {
          myWinsEl.textContent = myWins;
        }

        const opponentAttempts = document.getElementById('opponentAttempts');
        if (opponentAttempts) {
          opponentAttempts.textContent = opponent.attempts || 0;
        }

        const opponentWinsEl = document.getElementById('opponentWins');
        if (opponentWinsEl) {
          opponentWinsEl.textContent = opponentWins;
        }

        const winDifference = myWins - opponentWins;
        let performanceClass = 'neutral';
        let performanceText = 'Tied';

        if (winDifference > 0) {
          performanceClass = 'leading';
          performanceText = `+${winDifference} ahead`;
        } else if (winDifference < 0) {
          performanceClass = 'trailing';
          performanceText = `${Math.abs(winDifference)} behind`;
        }

        const myCard = document.getElementById('myBattleCard');
        if (myCard) {
          myCard.className = myCard.className.replace(/\b(leading|trailing|neutral)\b/g, '');
          myCard.classList.add(performanceClass);

          let statusIndicator =
            myCard.querySelector('.win-status') || document.createElement('div');
          statusIndicator.className = 'win-status';
          statusIndicator.textContent = performanceText;
          if (!myCard.contains(statusIndicator)) {
            myCard.appendChild(statusIndicator);
          }
        }

        const myTarget = document.getElementById('myTarget');
        if (myTarget) {
          myTarget.textContent = myPlayer.secretNumber || '???';
        }

        const opponentTarget = document.getElementById('opponentTarget');
        setTargetState(opponentTarget, 'hidden-number', '???');
      }

      const guessInput = document.getElementById('guessInput');
      if (guessInput) {
        guessInput.min = party.gameSettings.rangeStart;
        guessInput.max = party.gameSettings.rangeEnd;
        guessInput.value = '';
        guessInput.placeholder = `Guess ${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd}`;
        guessInput.disabled = false;
        this.setupGuessInputValidation(
          guessInput,
          party.gameSettings.rangeStart,
          party.gameSettings.rangeEnd
        );
        setTimeout(() => guessInput.focus(), 300);
      }

      const guessBtn = document.getElementById('makeGuessBtn');
      if (guessBtn) {
        guessBtn.disabled = false;
        guessBtn.innerHTML = '<i data-lucide="target"></i> Guess';
        guessBtn.classList.remove('finished', 'loading', 'btn-loading');
        guessBtn.style.backgroundColor = '';
        guessBtn.style.transform = '';
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

      const guessRangeEl = document.getElementById('guessRange');
      if (guessRangeEl) {
        guessRangeEl.textContent = `(${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd})`;
      }

      const gameMessage = document.getElementById('gameMessage');
      if (gameMessage) {
        gameMessage.textContent = `Guess the number: ${party.gameSettings.rangeStart}-${party.gameSettings.rangeEnd}`;
        gameMessage.className = 'message info';
      }

      this.clearGuessHistory();
    },
  };
})(window);
