/**
 * main.js — Vite bundle entry point
 *
 * Imports every client-side module in the exact same order they were loaded
 * as individual <script> tags.  All files attach their exports to `window.*`
 * so execution order is the only coupling that matters here.
 *
 * External globals that must already exist before this module executes:
 *   window.io          (socket.io — loaded as a regular <script> before this)
 *   window.lucide      (lucide-icons CDN — loaded as a regular <script> before this)
 *   window.confetti    (canvas-confetti CDN — loaded as a regular <script> before this)
 *   window.SHARED_CONFIG / window.APP_CONFIG  (/app-config.js — loaded as a regular <script>)
 */

// ── App core ────────────────────────────────────────────────────────────────
import './app-rules.js';
import './app-state.js';
import './app-actions.js';
import './app-state-selectors.js';

// ── Profile ──────────────────────────────────────────────────────────────────
import './profile-api.js';
import './profile-view.js';
import './profile-client.js';

// ── Socket client ─────────────────────────────────────────────────────────────
import './socket-client-errors.js';
import './socket-client-events.js';
import './socket-client-core-methods.js';
import './socket-client-emit-methods.js';
import './socket-client-reconnect-methods.js';
import './socket-client.js';

// ── UI core ───────────────────────────────────────────────────────────────────
import './ui.js';
import './ui-accessibility.js';
import './ui-focus-manager.js';
import './ui-modal-accessibility.js';
import './ui-core-screen.js';
import './ui-core-notification-flow.js';
import './ui-core-actions.js';
import './ui-core-effects.js';
import './ui-core.js';
import './ui-interaction-setup.js';
import './ui-event-bindings.js';
import './ui-events.js';
import './ui-actions.js';

// ── UI renderers ──────────────────────────────────────────────────────────────
import './ui-party-lobby-render.js';
import './ui-settings-selection-render.js';
import './ui-live-game-render.js';
import './ui-multiplayer-render.js';
import './ui-guess-history-render.js';
import './ui-results-render.js';
import './ui-game-render.js';
import './ui-notifications.js';
import './ui-action-state.js';

// ── UI validation ─────────────────────────────────────────────────────────────
import './ui-validation-input-state.js';
import './ui-validation-field-rules.js';
import './ui-validation-live-hooks.js';
import './ui-validation-range-rules.js';
import './ui-validation.js';
import './ui-guides.js';
import './ui-bootstrap.js';

// ── Single-player ─────────────────────────────────────────────────────────────
import './single-player.js';
import './single-player-bot-logic.js';
import './single-player-ui-handlers.js';

// ── Multiplayer game ──────────────────────────────────────────────────────────
import './game.js';
import './game-mode-actions.js';
import './game-multiplayer-actions.js';
import './game-validation.js';
import './game-state-utils.js';
import './game-diagnostics.js';
import './game-party-lifecycle-handlers.js';
import './game-party-gameplay-handlers.js';
import './game-party-handlers.js';
import './game-round-results-handlers.js';
import './game-round-action-handlers.js';
import './game-round-state-handlers.js';
import './game-round-handlers.js';
import './game-socket-handlers.js';
import './game-runtime.js';
