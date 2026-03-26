# Architecture

## Overview

NumDuel is a single-service application. Express, Socket.IO, and REST APIs all run in one Node.js process.

```
Browser
  │
  ├── HTTP  ──► Express routes  (/api/*)
  │
  └── WebSocket ──► Socket.IO handlers
                         │
              ┌──────────┼──────────┐
              │          │          │
           Redis      PostgreSQL  Memory
         (sessions)  (profiles,  (fallback)
                      leaderboard,
                      match history)
```

## Data separation

| Store            | What lives here                                          | Technology                       |
| ---------------- | -------------------------------------------------------- | -------------------------------- |
| Session store    | Active party state, live game sessions, reconnect tokens | Redis (Upstash) or in-memory Map |
| Persistent store | Player profiles, completed match records, leaderboard    | PostgreSQL (Neon)                |

Active game state is short-lived and changes on every guess. Player profiles are durable and written once per completed match. Keeping these two stores separate lets tests run entirely without a real database while still exercising the full game logic.

## Multiplayer game lifecycle

```
Player A                    Server                    Player B
   │                           │                          │
   │── create-party ──────────►│                          │
   │◄─ party-created ──────────│                          │
   │                           │                          │
   │                           │◄──── join-party ─────────│
   │◄─ player-joined ──────────│─── player-joined ───────►│
   │                           │                          │
   │── player-ready ──────────►│◄───── player-ready ──────│
   │                           │  (lobby → selection)     │
   │                           │                          │
   │── set-secret-number ─────►│◄── set-secret-number ────│
   │                           │  (selection → playing)   │
   │                           │                          │
   │── submit-guess ──────────►│                          │
   │◄─ guess-result ───────────│                          │
   │                           │──── opponent-guessed ───►│
   │                           │                          │
   │  (rounds continue...)     │                          │
   │                           │                          │
   │◄─ game-over ──────────────│────── game-over ────────►│
   │                           │  write match to DB       │
   │◄─ profile-updated ────────│────── profile-updated ──►│
```

## Reconnection flow

1. Player disconnects — party stays active for 120 seconds
2. Player reconnects with their session token and party code
3. Server locates the party in Redis/memory, restores socket room membership, resumes the game

## Key source files

| File                                 | Responsibility                                   |
| ------------------------------------ | ------------------------------------------------ |
| `server.js`                          | Entry point — Express + Socket.IO setup          |
| `src/models/Party.js`                | Game state machine: phases, rounds, player state |
| `src/services/GameService.js`        | Guess processing, feedback generation, scoring   |
| `src/services/PartyService.js`       | Party creation, join, cleanup, reconnect logic   |
| `src/services/SocketService.js`      | Socket event routing to handlers                 |
| `src/services/PersistenceService.js` | Match history writes to PostgreSQL               |
| `src/services/ProfileService.js`     | Profile and leaderboard queries                  |
| `src/storage/RedisStore.js`          | Redis adapter (Upstash REST or ioredis)          |
| `src/storage/MemoryStore.js`         | In-memory Map store (tests, local fallback)      |
| `src/lib/database.js`                | PostgreSQL connection and schema migrations      |
| `src/http/routes/`                   | REST endpoint handlers                           |
| `src/contracts/`                     | Zod-style schemas for socket and HTTP payloads   |

## Game phases

```
lobby ──► selection ──► playing ──► results
  │           │            │           │
  │      30s timeout    per-guess    rematch or
  │      → auto-assign  feedback    leave
  │
host configures
range and privacy
```

## Frontend

No framework. The client is ~70 vanilla JS modules organized by concern:

- `app-state.js` — centralized client state
- `game-*.js` — socket event handlers per phase
- `ui-*.js` — render functions and DOM updates
- `socket-client*.js` — Socket.IO connection and reconnect logic
- `profile-*.js` — profile API calls and local cache

Vite is used for local development (hot reload, dev server). Production serves the `public/` directory directly from Express with gzip/Brotli compression.

## Deployment topology

The project is deployed as a single instance on Render:

- Single Node.js process handles HTTP and WebSocket traffic
- Upstash Redis stores active game sessions
- Neon PostgreSQL stores profiles and match history

Horizontal scaling requires a Socket.IO Redis adapter (not currently implemented). Running multiple instances without it will split Socket.IO rooms across processes and break multiplayer. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

## CI pipeline

Four parallel jobs run on every push:

| Job                      | What it does                                           |
| ------------------------ | ------------------------------------------------------ |
| Lint & Format            | ESLint + Prettier check                                |
| Unit & Integration Tests | Jest with coverage thresholds, Redis service container |
| End-to-End Tests         | Playwright against a built preview server              |
| Docker Build             | Verifies the Dockerfile builds successfully            |

E2E and Docker jobs wait for the test job to pass before running.
