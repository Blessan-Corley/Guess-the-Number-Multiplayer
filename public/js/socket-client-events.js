(function initializeSocketClientEvents(global) {
  const appActions = global.AppActions;

  function invokeGameHandler(method, payload) {
    if (!global.Game || typeof global.Game[method] !== 'function') {
      return;
    }

    global.Game[method](payload);
  }

  function applyPartyState(client, data) {
    client.gameState.playerId = data?.player?.id || null;
    client.gameState.partyCode = data?.party?.code || null;
    client.gameState.playerName = data?.player?.name || null;
    client.gameState.isHost = Boolean(data?.player?.isHost);
    if (typeof data?.reconnectSecret === 'string' && data.reconnectSecret.length > 0) {
      client.gameState.reconnectSecret = data.reconnectSecret;
    }

    if (appActions) {
      appActions.applyPartySession({
        party: data?.party || null,
        localPlayer: data?.player || null,
        isHost: Boolean(data?.player?.isHost),
        mode: 'multiplayer',
      });
      appActions.setReconnectSession({
        partyCode: data?.party?.code || null,
        playerId: data?.player?.id || null,
        reconnectSecret: client.gameState.reconnectSecret || null,
      });
    }
  }

  function consumeProfileSnapshot(profile) {
    if (!profile || !global.profileClient) {
      return;
    }

    global.profileClient.consumeProfile(profile);
  }

  function consumeCredentials(data) {
    if (
      !global.profileClient ||
      typeof global.profileClient.consumeProfileCredentials !== 'function'
    ) {
      return;
    }

    global.profileClient.consumeProfileCredentials(data);
  }

  function notify(message, type = 'info', duration = 5000) {
    if (typeof UI === 'undefined') {
      return;
    }

    UI.showNotification(message, type, duration);
  }

  function bindConnectionEvents(client) {
    client.socket.on('connect', () => {
      client.isConnected = true;
      client.reconnectAttempts = 0;
      if (typeof client.resetConnectionTelemetry === 'function') {
        client.resetConnectionTelemetry();
      }
      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: true,
          socketId: client.socket?.id || null,
          reconnectAttempts: 0,
          latencyMs: client.connectionTelemetry?.latencyMs ?? null,
          smoothedLatencyMs: client.connectionTelemetry?.smoothedLatencyMs ?? null,
          signal: client.connectionTelemetry?.signal || 'unknown',
        });
      }
      client.flushPendingActions();

      if (typeof UI !== 'undefined') {
        UI.updateConnectionStatus(client.getConnectionBadgeState('connected'));
        UI.hideLoadingOverlay();
      }

      client.sendHeartbeat();

      if (global.profileClient && typeof global.profileClient.refreshAll === 'function') {
        global.profileClient.refreshAll().catch(() => {});
      }
    });

    client.socket.on('disconnect', (reason) => {
      client.isConnected = false;
      if (typeof client.resetConnectionTelemetry === 'function') {
        client.resetConnectionTelemetry();
      }
      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: false,
          socketId: client.socket?.id || null,
          reconnectAttempts: client.reconnectAttempts || 0,
          latencyMs: null,
          smoothedLatencyMs: null,
          signal: 'unknown',
        });
      }

      if (typeof UI !== 'undefined') {
        UI.updateConnectionStatus(client.getConnectionBadgeState('disconnected'));
      }

      if (reason === 'io server disconnect') {
        notify('Disconnected by server', 'error');
        return;
      }

      client.handleReconnection();
    });

    client.socket.on('connect_error', (error) => {
      client.handleConnectionError(error);
    });

    client.socket.on('heartbeat_ack', (data) => {
      const telemetry = client.recordHeartbeatAck(data);
      if (!telemetry) {
        return;
      }

      if (appActions && typeof appActions.setConnectionStatus === 'function') {
        appActions.setConnectionStatus({
          connected: true,
          socketId: client.socket?.id || null,
          reconnectAttempts: client.reconnectAttempts || 0,
          latencyMs: telemetry.latencyMs,
          smoothedLatencyMs: telemetry.latencyMs,
          signal: telemetry.signal,
        });
      }

      if (typeof UI === 'undefined') {
        return;
      }

      UI.updateConnectionStatus({
        status: 'connected',
        latencyMs: telemetry.latencyMs,
        signal: telemetry.signal,
      });
    });
  }

  function bindPartyEvents(client) {
    client.socket.on('party_created', (data) => {
      applyPartyState(client, data);
      consumeCredentials(data);
      consumeProfileSnapshot(data?.profile);
      invokeGameHandler('handlePartyCreated', data);
    });

    client.socket.on('party_joined', (data) => {
      applyPartyState(client, data);
      consumeCredentials(data);
      consumeProfileSnapshot(data?.profile);
      invokeGameHandler('handlePartyJoined', data);
    });

    client.socket.on('player_joined', (data) => invokeGameHandler('handlePlayerJoined', data));
    client.socket.on('player_left', (data) => invokeGameHandler('handlePlayerLeft', data));
    client.socket.on('party_visibility_updated', (data) =>
      invokeGameHandler('handlePartyVisibilityUpdated', data)
    );

    client.socket.on('party_left', (data) => {
      client.resetGameState();
      if (appActions && typeof appActions.setReconnectSession === 'function') {
        appActions.setReconnectSession({
          partyCode: null,
          playerId: null,
          reconnectSecret: null,
          hasBackup: false,
          phase: null,
          hasFinished: false,
          timestamp: null,
        });
      }
      invokeGameHandler('handlePartyLeft', data);
    });

    client.socket.on('party_closed_host_left', (data) =>
      invokeGameHandler('handlePartyClosedHostLeft', data)
    );
    client.socket.on('settings_change_started', (data) =>
      invokeGameHandler('handleSettingsChangeStarted', data)
    );
    client.socket.on('settings_updated', (data) =>
      invokeGameHandler('handleSettingsUpdated', data)
    );
  }

  function bindGameplayEvents(client) {
    client.socket.on('game_started', (data) => invokeGameHandler('handleGameStarted', data));
    client.socket.on('player_ready', (data) => invokeGameHandler('handlePlayerReady', data));
    client.socket.on('selection_timer', (data) => invokeGameHandler('handleSelectionTimer', data));
    client.socket.on('playing_started', (data) => invokeGameHandler('handlePlayingStarted', data));
    client.socket.on('guess_result', (data) => invokeGameHandler('handleGuessResult', data));
    client.socket.on('opponent_guessed', (data) =>
      invokeGameHandler('handleOpponentGuessed', data)
    );
    client.socket.on('round_ended', (data) => invokeGameHandler('handleRoundEnded', data));
    client.socket.on('next_round_started', (data) =>
      invokeGameHandler('handleNextRoundStarted', data)
    );
    client.socket.on('rematch_started', (data) => invokeGameHandler('handleRematchStarted', data));
    client.socket.on('rematch_requested', (data) =>
      invokeGameHandler('handleRematchRequested', data)
    );
    client.socket.on('player_typing', (data) => invokeGameHandler('handlePlayerTyping', data));
    client.socket.on('opponent_finished_first', (data) =>
      invokeGameHandler('handleOpponentFinishedFirst', data)
    );
    client.socket.on('waiting_for_opponent', (data) =>
      invokeGameHandler('handleWaitingForOpponent', data)
    );
    client.socket.on('player_finished', (data) => invokeGameHandler('handlePlayerFinished', data));
  }

  function bindProfileEvents(client) {
    client.socket.on('profile_updated', (data) => {
      if (global.profileClient) {
        global.profileClient.handleRealtimeProfileUpdate(data);
      }
    });

    client.socket.on('leaderboard_updated', (data) => {
      if (global.profileClient) {
        global.profileClient.handleRealtimeLeaderboardUpdate(data);
      }
    });

    client.socket.on('public_directory_updated', (data) => {
      invokeGameHandler('handlePublicDirectoryUpdated', data);
    });
  }

  function bindConnectionStateEvents(client) {
    client.socket.on('player_disconnected', (data) => {
      const seconds = Math.ceil((data?.gracePeriod || 0) / 1000);
      if (seconds > 0) {
        notify(`${data.playerName} disconnected. Waiting ${seconds}s for reconnect.`, 'warning');
      } else {
        notify(`${data.playerName} disconnected`, 'warning');
      }
      invokeGameHandler('handlePlayerDisconnected', data);
    });

    client.socket.on('player_reconnected', (data) => {
      notify(`${data.playerName} reconnected`, 'success');
      invokeGameHandler('handlePlayerReconnected', data);
    });

    client.socket.on('reconnected', (data) => {
      applyPartyState(client, data);
      if (appActions && typeof appActions.setReconnectSession === 'function') {
        appActions.setReconnectSession({
          partyCode: data?.party?.code || null,
          playerId: data?.player?.id || null,
          reconnectSecret: client.gameState.reconnectSecret || null,
          hasBackup: true,
        });
      }
      invokeGameHandler('handleReconnected', data);
      if (typeof global.Game?.saveGameState === 'function') {
        global.Game.saveGameState();
      } else {
        sessionStorage.removeItem('gameStateBackup');
      }
      notify('Reconnected successfully!', 'success');
    });

    client.socket.on('reconnect_failed', () => {
      sessionStorage.removeItem('gameStateBackup');
      if (appActions && typeof appActions.setReconnectSession === 'function') {
        appActions.setReconnectSession({
          partyCode: null,
          playerId: null,
          reconnectSecret: null,
          hasBackup: false,
          phase: null,
          hasFinished: false,
          timestamp: null,
        });
      }
      notify('Failed to reconnect to game', 'error');
      invokeGameHandler('returnToWelcome');
    });
  }

  function bindErrorEvents(client) {
    client.socket.on('error', (data) => {
      if (typeof UI !== 'undefined') {
        UI.hideLoadingOverlay();

        if (typeof UI.resetGuessSubmissionState === 'function') {
          UI.resetGuessSubmissionState({ focus: true });
        }

        const readyButton = document.getElementById('readyBtn');
        if (readyButton && readyButton.textContent === 'Setting...') {
          UI.resetButton(readyButton, '<i data-lucide="check-circle"></i> Ready');
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }
      }

      const joinButton = document.getElementById('joinPartySubmitBtn');
      if (joinButton && typeof UI !== 'undefined') {
        UI.resetButton(joinButton, 'Join Party');
      }

      // When the selection timer fires and auto-selects numbers just as a player
      // clicks Ready, the server rejects the set_ready with "Not in selection phase"
      // because the timer already advanced the game to playing. The playing_started
      // event will arrive momentarily and transition the screen — suppress the
      // confusing error toast so the player isn't alarmed by a spurious message.
      if (
        data.context === 'set_ready' &&
        typeof data.message === 'string' &&
        data.message.toLowerCase().includes('not in selection phase')
      ) {
        return;
      }

      client.handleServerError(data);
    });
  }

  function register(client) {
    if (!client?.socket) {
      return;
    }

    bindConnectionEvents(client);
    bindPartyEvents(client);
    bindGameplayEvents(client);
    bindProfileEvents(client);
    bindConnectionStateEvents(client);
    bindErrorEvents(client);
  }

  global.SocketClientEvents = {
    register,
  };
})(window);
