ALTER TABLE matches
    ADD CONSTRAINT matches_valid_range
    CHECK (range_start >= 1 AND range_end <= 10000 AND range_start < range_end);

ALTER TABLE matches
    ADD CONSTRAINT matches_non_negative_duration
    CHECK (duration_ms >= 0);

ALTER TABLE matches
    ADD CONSTRAINT matches_positive_round_count
    CHECK (round_count >= 1);

ALTER TABLE match_participants
    ADD CONSTRAINT match_participants_non_negative_attempts
    CHECK (attempts >= 0);

ALTER TABLE match_participants
    ADD CONSTRAINT match_participants_non_negative_wins
    CHECK (wins >= 0);

-- IF NOT EXISTS is safe here: pg12+ real Postgres and pg-mem both support it.
CREATE INDEX IF NOT EXISTS idx_match_participants_profile_id
    ON match_participants(profile_id);

CREATE INDEX IF NOT EXISTS idx_matches_completed_at
    ON matches(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_profiles_guest_token
    ON player_profiles(guest_token);
