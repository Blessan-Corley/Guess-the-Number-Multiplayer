# Load Testing

This project needs two different load-test tools because it has two different traffic patterns:

- `k6` for HTTP endpoints and database-backed profile/leaderboard flows
- a Socket.IO runner for end-to-end multiplayer matches

`k6` is a good fit for REST APIs. It is not a robust fit for Socket.IO session orchestration, so the real-time path is covered separately with `socket.io-client`.

## 1. HTTP / database load with k6

Run the HTTP load test with:

```bash
npm run test:load:http
```

The wrapper does this:

- uses a local `k6` install if `k6` is on `PATH`
- otherwise falls back to `docker run grafana/k6 ...` if Docker is available
- otherwise prints a clear install message

The default mode is now **read-only** so it does not keep creating guest-profile rows in Postgres on every iteration.

Useful environment variables:

```bash
BASE_URL=http://127.0.0.1:3000
START_VUS=5
WARMUP_VUS=10
STEADY_VUS=30
WARMUP_DURATION=30s
STEADY_DURATION=2m
COOLDOWN_DURATION=30s
LEADERBOARD_LIMIT=20
SLEEP_SECONDS=1
CREATE_PROFILES=false
GUEST_TOKEN=
GUEST_SESSION_SECRET=
LOAD_TEST_DEBUG_LOGS=false
```

What this covers:

- `GET /api/leaderboard`
- `GET /api/health`

Optional modes:

- Safe default: leaderboard + health only
- Read-only profile fetch: set both `GUEST_TOKEN` and `GUEST_SESSION_SECRET`
- Write-path stress: set `CREATE_PROFILES=true`

Examples:

```powershell
$env:BASE_URL='http://127.0.0.1:3000'
npm run test:load:http
```

```powershell
$env:BASE_URL='http://127.0.0.1:3000'
$env:GUEST_TOKEN='existing-guest-token'
$env:GUEST_SESSION_SECRET='existing-guest-session-secret'
npm run test:load:http
```

```powershell
$env:BASE_URL='http://127.0.0.1:3000'
$env:CREATE_PROFILES='true'
$env:LOAD_TEST_DEBUG_LOGS='true'
npm run test:load:http
```

Use `CREATE_PROFILES=true` only when you intentionally want to stress the guest-profile write path, because successful requests will create or update real rows.

Recommended production sequence:

1. Warm-up run: 5-10 VUs for 2-5 minutes
2. Baseline run: normal expected traffic for 10-15 minutes
3. Spike run: 3-5x normal traffic for 2-5 minutes
4. Soak run: normal traffic for 30-60 minutes

Watch:

- `http_req_failed`
- `http_req_duration p95/p99`
- database readiness
- error logs for guest-session/profile failures

## 2. Multiplayer Socket.IO load

Run the dedicated match runner:

```bash
node scripts/load/socketio-match-runner.js
```

Or:

```bash
npm run test:load:socket
```

To run both HTTP and Socket.IO load tests in sequence:

```bash
npm run test:load
```

Useful environment variables:

```bash
BASE_URL=http://127.0.0.1:3000
TOTAL_MATCHES=50
CONCURRENCY=10
SOCKET_TIMEOUT_MS=15000
START_DELAY_MS=0
```

What this covers:

- host/guest socket connect
- party creation and join
- game start
- secret-number selection
- guess flow
- round completion
- profile persistence side effects if the database is enabled

The runner prints JSON with:

- total matches
- success rate
- min / p50 / p95 / max match duration
- the first few failed scenarios

## 3. What to measure in production

For each run, capture:

- application logs
- `/api/health` and `/api/readiness`
- active party / player counts
- database connection health
- render host metrics if available

If the HTTP tests fail but gameplay stays healthy, the likely bottleneck is the database or the profile routes. If Socket.IO tests fail first, the pressure is in party/session orchestration rather than persistence.

## 4. Interpreting failures

- `401 INVALID_GUEST_SESSION`: guest token/session secret mismatch or client storage reset
- `503 readiness=false`: store or database is unhealthy
- match-runner timeouts during `party_created` or `party_joined`: socket/session pressure
- match-runner timeouts after `start_game`: gameplay/timer contention

## 5. Current architecture limit

This app is still single-instance for correct multiplayer behavior unless you add cross-instance Socket.IO coordination. Load test one process first. Horizontal scaling tests are not meaningful until that architecture gap is closed.
