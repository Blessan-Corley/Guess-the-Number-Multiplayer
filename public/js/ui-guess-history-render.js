(function registerUIGuessHistoryRenderMethods(global) {
  function createIcon(iconName, className = '') {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    if (className) {
      icon.className = className;
    }
    return icon;
  }

  function createFeedbackContent(feedback) {
    const fragment = document.createDocumentFragment();
    let iconName = 'trending-down';
    let label = 'Too Low';

    if (feedback.isCorrect) {
      iconName = 'check-circle';
      label = 'Correct!';
    } else if (feedback.closeness === 'very_close') {
      iconName = 'flame';
      label = feedback.direction === 'high' ? 'Very Close High' : 'Very Close Low';
    } else if (feedback.closeness === 'close') {
      iconName = 'target';
      label = feedback.direction === 'high' ? 'Close High' : 'Close Low';
    } else if (feedback.direction === 'high') {
      iconName = 'trending-up';
      label = 'Too High';
    }

    fragment.appendChild(createIcon(iconName, 'inline-icon'));
    fragment.appendChild(document.createTextNode(` ${label}`));
    return fragment;
  }

  function renderPlaceholder(container) {
    container.textContent = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'history-placeholder';
    placeholder.textContent = 'Make your first guess to start the round log.';
    container.appendChild(placeholder);
  }

  global.UIGuessHistoryRenderMethods = {
    updateGameStats(myAttempts, opponentAttempts) {
      if (myAttempts !== null && myAttempts !== undefined) {
        document.getElementById('myAttempts').textContent = myAttempts;
      }

      if (opponentAttempts !== null && opponentAttempts !== undefined) {
        document.getElementById('opponentAttempts').textContent = opponentAttempts;
      }

      const myCard = document.getElementById('myBattleCard');
      const opponentCard = document.getElementById('opponentBattleCard');

      if (myCard && myAttempts !== null && myAttempts !== undefined) {
        const attemptsDisplay =
          myCard.querySelector('.attempts-display') || myCard.querySelector('.attempts');
        if (attemptsDisplay) {
          attemptsDisplay.textContent = `${myAttempts} attempts`;
        }
      }

      if (opponentCard && opponentAttempts !== null && opponentAttempts !== undefined) {
        const attemptsDisplay =
          opponentCard.querySelector('.attempts-display') ||
          opponentCard.querySelector('.attempts');
        if (attemptsDisplay) {
          attemptsDisplay.textContent = `${opponentAttempts} attempts`;
        }
      }
    },

    showGameMessage(message, type) {
      const messageElement = document.getElementById('gameMessage');
      if (!messageElement) {
        return;
      }

      messageElement.textContent = message;
      messageElement.className = `message ${type}`;

      if (type === 'success' || type === 'warning') {
        messageElement.style.animation = 'messageHighlight 0.5s ease';
        setTimeout(() => {
          messageElement.style.animation = '';
        }, 500);
      }
    },

    addGuessToHistory(guess, feedback) {
      const historyContent = document.querySelector('#gameGuessHistory .history-content');
      if (!historyContent) {
        return;
      }

      const placeholder = historyContent.querySelector('.history-placeholder');
      if (placeholder) {
        placeholder.remove();
      }

      const guessItem = document.createElement('div');
      guessItem.className = 'guess-item';
      if (feedback.isCorrect) {
        guessItem.classList.add('correct-guess');
      }

      const guessNumber = document.createElement('div');
      guessNumber.className = 'guess-number';
      const attemptLabel = document.createElement('strong');
      attemptLabel.textContent = `#${feedback.attempts || document.querySelectorAll('.guess-item').length + 1}`;
      const guessValue = document.createElement('span');
      guessValue.className = 'guess-value';
      guessValue.textContent = String(guess);
      guessNumber.appendChild(attemptLabel);
      guessNumber.appendChild(document.createTextNode(' '));
      guessNumber.appendChild(guessValue);

      const guessFeedback = document.createElement('div');
      guessFeedback.className = `guess-feedback ${feedback.closeness || 'far'}`;
      guessFeedback.appendChild(createFeedbackContent(feedback));

      guessItem.appendChild(guessNumber);
      guessItem.appendChild(guessFeedback);
      historyContent.insertBefore(guessItem, historyContent.firstChild);

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    },

    clearGuessHistory() {
      const historyContent = document.querySelector('#gameGuessHistory .history-content');
      if (!historyContent) {
        return;
      }
      renderPlaceholder(historyContent);
    },
  };
})(window);
