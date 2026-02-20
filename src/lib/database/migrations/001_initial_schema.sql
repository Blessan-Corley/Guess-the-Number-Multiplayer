CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY,
    guest_token TEXT UNIQUE NOT NULL,
    session_secret_hash TEXT NULL,
    display_name VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY,
    party_code VARCHAR(16),
    game_mode VARCHAR(32) NOT NULL DEFAULT 'multiplayer',
    status VARCHAR(32) NOT NULL,
    range_start INTEGER NOT NULL,
    range_end INTEGER NOT NULL,
    winner_profile_id UUID NULL REFERENCES player_profiles(id) ON DELETE SET NULL,
    winner_name VARCHAR(32),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER NOT NULL,
    round_count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS match_participants (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    profile_id UUID NULL REFERENCES player_profiles(id) ON DELETE SET NULL,
    player_name VARCHAR(32) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
