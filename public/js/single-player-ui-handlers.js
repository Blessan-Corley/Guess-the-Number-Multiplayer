(function registerSinglePlayerUiHandlers(global) {
  function createIcon(iconName, className = '') {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    if (className) {
      icon.className = className;
    }
    return icon;
  }

  const SinglePlayerGameClass =
    global.SinglePlayerGame || (typeof SinglePlayerGame !== 'undefined' ? SinglePlayerGame : null);
  if (!SinglePlayerGameClass) {
    return;
  }

  Object.assign(SinglePlayerGameClass.prototype, {
    showSinglePlayerSelection() {
      UI.showScreen('selectionScreen');

      const selectionRoundInfo = document.getElementById('selectionRoundInfo');
      const selectionRoundText = selectionRoundInfo
        ? selectionRoundInfo.querySelector('.round-text')
        : null;
      if (selectionRoundText) {
        selectionRoundText.textContent = 'Single Player vs Bot';
      }

      const rangeDisplay = `${this.gameState.rangeStart} - ${this.gameState.rangeEnd}`;
      const selectionRangeDisplay = document.getElementById('selectionRangeDisplay');
      if (selectionRangeDisplay) {
        selectionRangeDisplay.textContent = rangeDisplay;
      }

      const secretNumberInput = document.getElementById('secretNumber');
      if (!secretNumberInput) {
        return;
      }
      secretNumberInput.min = this.gameState.rangeStart;
      secretNumberInput.max = this.gameState.rangeEnd;
      secretNumberInput.value = '';
      secretNumberInput.disabled = false;
      secretNumberInput.placeholder = `Choose ${rangeDisplay}`;

      const selectionMessage = document.getElementById('selectionMessage');
      if (selectionMessage) {
        selectionMessage.innerHTML = `
                    <strong>Choose your secret number between ${rangeDisplay}</strong><br>
                    <small>The AI bot will try to guess your number.</small>
                `;
        selectionMessage.className = 'message info enhanced';
      }

      const readyBtn = document.getElementById('readyBtn');
      if (readyBtn) {
        readyBtn.disabled = false;
        readyBtn.textContent = 'Start Game';
      }

      const readyStatus = document.getElementById('readyStatus');
      if (readyStatus) {
        readyStatus.innerHTML = '';
      }
      setTimeout(() => secretNumberInput.focus(), 200);

      UI.showNotification(
        'Choose your secret number. The AI bot will try to guess it.',
        'info',
        4000
      );
    },

    setPlayerReady() {
      const secretNumberInput = document.getElementById('secretNumber');
      const secretNumber = parseInt(secretNumberInput.value, 10);

      if (
        !secretNumber ||
        secretNumber < this.gameState.rangeStart ||
        secretNumber > this.gameState.rangeEnd
      ) {
        UI.showNotification(
          `Please enter a number between ${this.gameState.rangeStart} and ${this.gameState.rangeEnd}`,
          'error'
        );
        secretNumberInput.focus();
        return;
      }

      this.gameState.playerSecretNumber = secretNumber;

      secretNumberInput.disabled = true;
      const readyBtn = document.getElementById('readyBtn');
      readyBtn.disabled = true;
      readyBtn.textContent = 'Starting Game...';

      document.getElementById('readyStatus').innerHTML =
        `Ready with secret number: ${secretNumber}<br><small>Starting game with AI bot...</small>`;
      UI.showNotification(`Secret number ${secretNumber} selected. Starting game...`, 'success');

      setTimeout(() => {
        this.showSinglePlayerGame();
      }, 2000);
    },

    showSinglePlayerGame() {
      document.querySelector('.game-container').classList.add('single-player-mode');
      UI.showScreen('gameScreen');

      const gameRoundInfo = document.getElementById('gameRoundInfo');
      const gameRoundText = gameRoundInfo ? gameRoundInfo.querySelector('.round-text') : null;
      if (gameRoundText) {
        gameRoundText.textContent = 'Single Player vs Bot';
      }

      const opponentBattleName = document.getElementById('opponentBattleName');
      document.getElementById('myBattleName').textContent = this.gameState.playerName;
      opponentBattleName.innerHTML = `
                <div class="bot-avatar"><i data-lucide="bot"></i></div>
                AI Bot (${this.gameState.botDifficulty})
            `;

      document.getElementById('myAttempts').textContent = this.gameState.playerAttempts;
      document.getElementById('myWins').textContent = this.gameState.playerWins;
      document.getElementById('opponentAttempts').textContent = this.gameState.botAttempts;
      document.getElementById('opponentWins').textContent = this.gameState.botWins;

      document.getElementById('myTarget').textContent = this.gameState.playerSecretNumber;
      document.getElementById('opponentTarget').textContent = '???';

      const guessInput = document.getElementById('guessInput');
      guessInput.min = this.gameState.rangeStart;
      guessInput.max = this.gameState.rangeEnd;
      guessInput.value = '';
      guessInput.placeholder = `Guess bot number (${this.gameState.rangeStart}-${this.gameState.rangeEnd})`;
      guessInput.focus();

      const guessRange = document.getElementById('guessRange');
      if (guessRange) {
        guessRange.textContent = `(${this.gameState.rangeStart}-${this.gameState.rangeEnd})`;
      }

      document.getElementById('gameMessage').textContent =
        `Bot picked a number between ${this.gameState.rangeStart} and ${this.gameState.rangeEnd}.`;
      document.getElementById('gameMessage').className = 'message info';
      UI.clearGuessHistory();

      this.gameState.gamePhase = 'playing';

      setTimeout(() => {
        this.botMakeGuess();
      }, 2000);
    },

    showSinglePlayerResults(winner) {
      UI.showScreen('resultsScreen');

      const isPlayerWinner = winner === 'player';
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

      const resultEmoji = document.getElementById('resultEmoji');
      resultEmoji.textContent = '';
      resultEmoji.appendChild(createIcon(isPlayerWinner ? 'trophy' : 'bot'));
      document.getElementById('resultTitle').textContent = isPlayerWinner ? 'You Won!' : 'Bot Won!';

      document.getElementById('myResultName').textContent = this.gameState.playerName;
      const opponentResultName = document.getElementById('opponentResultName');
      opponentResultName.textContent = '';
      opponentResultName.appendChild(createIcon('bot'));
      opponentResultName.appendChild(
        document.createTextNode(` AI Bot (${this.gameState.botDifficulty})`)
      );

      document.getElementById('myFinalAttempts').textContent = this.gameState.playerAttempts;
      document.getElementById('opponentFinalAttempts').textContent = this.gameState.botAttempts;
      document.getElementById('myTotalWins').textContent = this.gameState.playerWins;
      document.getElementById('opponentTotalWins').textContent = this.gameState.botWins;

      const optimalAttempts = Math.ceil(
        Math.log2(this.gameState.rangeEnd - this.gameState.rangeStart + 1)
      );
      let playerPerformance = 'Good Try!';
      const botPerformance = 'AI Performance';

      if (isPlayerWinner) {
        if (this.gameState.playerAttempts === 1) {
          playerPerformance = 'Lucky Shot!';
        } else if (this.gameState.playerAttempts <= optimalAttempts) {
          playerPerformance = 'Excellent!';
        } else if (this.gameState.playerAttempts <= optimalAttempts * 1.5) {
          playerPerformance = 'Good!';
        } else {
          playerPerformance = 'Not bad!';
        }
      }

      document.getElementById('myPerformance').textContent = playerPerformance;
      document.getElementById('opponentPerformance').textContent = botPerformance;

      const myCard = document.getElementById('myResultCard');
      const opponentCard = document.getElementById('opponentResultCard');
      myCard.classList.toggle('winner', isPlayerWinner);
      opponentCard.classList.toggle('winner', !isPlayerWinner);

      const message = isPlayerWinner
        ? `You beat the ${this.gameState.botDifficulty} bot in ${this.gameState.playerAttempts} attempts!`
        : `The ${this.gameState.botDifficulty} bot found your number in ${this.gameState.botAttempts} attempts.`;

      document.getElementById('finalResultMessage').textContent = message;
      document.getElementById('finalResultMessage').className =
        `message ${isPlayerWinner ? 'success' : 'info'}`;

      document.getElementById('nextRoundBtn').style.display = 'none';

      const rematchBtn = document.getElementById('rematchBtn');
      if (rematchBtn) {
        rematchBtn.textContent = 'Play Again';
        rematchBtn.onclick = null;
      }

      const leaveBtn = document.getElementById('leaveResultsBtn');
      if (leaveBtn) {
        leaveBtn.textContent = 'Main Menu';
        leaveBtn.onclick = null;
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },

    rematch() {
      if (typeof Game !== 'undefined' && Game.currentState) {
        Game.currentState.gameMode = 'single';
        Game.currentState.party = null;
        Game.currentState.hasFinished = false;
      }

      this.gameState.playerAttempts = 0;
      this.gameState.botAttempts = 0;
      this.gameState.playerGuessHistory = [];
      this.gameState.botGuessHistory = [];
      this.gameState.gamePhase = 'selection';

      this.gameState.playerSecretNumber = null;
      this.gameState.botSecretNumber = this.generateRandomNumber(
        this.gameState.rangeStart,
        this.gameState.rangeEnd
      );
      this.initializeBotStrategy();

      this.showSinglePlayerSelection();
      UI.showNotification('New game started. Choose your secret number again.', 'success');
    },

    returnToMenu() {
      document.querySelector('.game-container').classList.remove('single-player-mode');

      const playerWins = this.gameState.playerWins;
      const botWins = this.gameState.botWins;
      this.gameState = this.createInitialGameState();
      this.gameState.playerWins = playerWins;
      this.gameState.botWins = botWins;

      if (typeof Game !== 'undefined' && Game.currentState) {
        Game.currentState.gameMode = null;
        Game.currentState.party = null;
        Game.currentState.hasFinished = false;
      }

      UI.showScreen('welcomeScreen');
      UI.clearInputs();
    },
  });
})(window);
