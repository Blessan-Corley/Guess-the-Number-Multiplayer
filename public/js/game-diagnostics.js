(function registerGameDiagnostics(global) {
  const methods = {
    playSound(type) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
          case 'success':
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            break;
          case 'win':
            [523, 659, 784, 1047].forEach((freq, index) => {
              const osc = audioContext.createOscillator();
              const gain = audioContext.createGain();
              osc.connect(gain);
              gain.connect(audioContext.destination);
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0.2, audioContext.currentTime + index * 0.2);
              gain.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime + index * 0.2 + 0.3
              );
              osc.start(audioContext.currentTime + index * 0.2);
              osc.stop(audioContext.currentTime + index * 0.2 + 0.3);
            });
            return;
          case 'lose':
            oscillator.frequency.value = 200;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
            break;
          default:
            oscillator.frequency.value = 440;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {}
    },

    debugInfo() {
      return {
        gameState: this.getGameState(),
        connectionStatus: socketClient.getConnectionStatus(),
        currentScreen: document.querySelector('.screen.active')?.id,
        hasFinished: this.currentState.hasFinished,
      };
    },

    simulateNetworkError() {
      socketClient.socket.disconnect();
    },

    simulateReconnection() {
      socketClient.socket.connect();
    },

    trackUserAction(action, data = {}) {
      if (window.gtag) {
        window.gtag('event', action, {
          game_state: this.currentState.screen,
          ...data,
        });
      }
    },

    handleError(error, context = 'Unknown', buttonId = null) {
      if (buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
          UI.setButtonError(button, 'Error!');
        }
      }

      let userMessage = 'An unexpected error occurred';

      if (error.message) {
        if (error.message.includes('network') || error.message.includes('connection')) {
          userMessage = 'Connection error. Please check your internet connection.';
        } else if (error.message.includes('party') || error.message.includes('Party')) {
          userMessage = error.message;
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          userMessage = 'Invalid input. Please check your entry and try again.';
        }
      }

      UI.showNotification(userMessage, 'error');

      this.trackUserAction('error', {
        error: error.message,
        context,
        stack: error.stack,
      });
    },
  };

  Object.assign(global.Game, methods);
})(window);
