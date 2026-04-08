#!/usr/bin/env node

const { io } = require('socket.io-client');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const TOTAL_MATCHES = Math.max(1, Number(process.env.TOTAL_MATCHES || 50));
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 10));
const SOCKET_TIMEOUT_MS = Math.max(1000, Number(process.env.SOCKET_TIMEOUT_MS || 15000));
const START_DELAY_MS = Math.max(0, Number(process.env.START_DELAY_MS || 0));

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createIdentity(prefix, index) {
  return {
    playerName: `${prefix}${index}`.slice(0, 20),
    guestToken: `${prefix.toLowerCase()}-token-${index}-${Date.now()}`,
    guestSessionSecret: `${prefix.toLowerCase()}-session-${index}-${Date.now()}`,
  };
}

function createSocket() {
  return io(BASE_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: SOCKET_TIMEOUT_MS,
  });
}

function waitForEvent(socket, eventName, timeoutMs = SOCKET_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeoutMs);

    const onEvent = (payload) => {
      cleanup();
      resolve(payload);
    };

    const onError = (error) => {
      cleanup();
      reject(new Error(error?.message || `Socket error while waiting for ${eventName}`));
    };

    function cleanup() {
      clearTimeout(timer);
      socket.off(eventName, onEvent);
      socket.off('error', onError);
      socket.off('connect_error', onError);
    }

    socket.once(eventName, onEvent);
    socket.once('error', onError);
    socket.once('connect_error', onError);
  });
}

async function runMatch(matchNumber) {
  const host = createSocket();
  const guest = createSocket();
  const hostIdentity = createIdentity('HostLoad', matchNumber);
  const guestIdentity = createIdentity('GuestLoad', matchNumber);
  const startedAt = Date.now();

  try {
    await Promise.all([waitForEvent(host, 'connected'), waitForEvent(guest, 'connected')]);

    const hostCreatedPromise = waitForEvent(host, 'party_created');
    host.emit('create_party', hostIdentity);
    const hostCreated = await hostCreatedPromise;

    const guestJoinedPromise = waitForEvent(guest, 'party_joined');
    guest.emit('join_party', {
      partyCode: hostCreated.party.code,
      ...guestIdentity,
    });
    await guestJoinedPromise;

    const gameStartedPromise = waitForEvent(host, 'game_started');
    host.emit('start_game');
    await gameStartedPromise;

    const playingStartedPromise = waitForEvent(host, 'playing_started');
    host.emit('set_ready', { secretNumber: 10 });
    guest.emit('set_ready', { secretNumber: 20 });
    await playingStartedPromise;

    const hostGuessPromise = waitForEvent(host, 'guess_result');
    host.emit('make_guess', { guess: 12 });
    await hostGuessPromise;

    const roundEndedPromise = waitForEvent(host, 'round_ended');
    guest.emit('make_guess', { guess: 10 });
    const roundEnded = await roundEndedPromise;

    const durationMs = Date.now() - startedAt;
    return {
      ok: true,
      matchNumber,
      durationMs,
      winner: roundEnded?.roundResult?.winner?.name || 'unknown',
    };
  } catch (error) {
    return {
      ok: false,
      matchNumber,
      durationMs: Date.now() - startedAt,
      error: error.message,
    };
  } finally {
    host.disconnect();
    guest.disconnect();
  }
}

async function runBatch(matchNumbers) {
  return Promise.all(matchNumbers.map((matchNumber) => runMatch(matchNumber)));
}

function summarize(results) {
  const completed = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  const durations = completed
    .map((result) => result.durationMs)
    .sort((left, right) => left - right);

  const percentile = (value) => {
    if (durations.length === 0) {
      return 0;
    }

    const index = Math.min(
      durations.length - 1,
      Math.max(0, Math.ceil((value / 100) * durations.length) - 1)
    );
    return durations[index];
  };

  return {
    baseUrl: BASE_URL,
    totalMatches: results.length,
    successfulMatches: completed.length,
    failedMatches: failed.length,
    successRate:
      results.length === 0 ? 0 : Number(((completed.length / results.length) * 100).toFixed(2)),
    latencyMs: {
      min: durations[0] || 0,
      p50: percentile(50),
      p95: percentile(95),
      max: durations[durations.length - 1] || 0,
    },
    failures: failed.slice(0, 10),
  };
}

async function main() {
  const allResults = [];

  for (let start = 0; start < TOTAL_MATCHES; start += CONCURRENCY) {
    const batch = [];
    for (let offset = 0; offset < CONCURRENCY && start + offset < TOTAL_MATCHES; offset += 1) {
      batch.push(start + offset + 1);
    }

    const batchResults = await runBatch(batch);
    allResults.push(...batchResults);

    if (START_DELAY_MS > 0 && start + CONCURRENCY < TOTAL_MATCHES) {
      await wait(START_DELAY_MS);
    }
  }

  const summary = summarize(allResults);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (summary.failedMatches > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
