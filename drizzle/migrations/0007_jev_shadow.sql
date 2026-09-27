CREATE TABLE IF NOT EXISTS jev_shadow_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observed_at TEXT NOT NULL,
  mode TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  definition_version TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  outcome TEXT NOT NULL,
  duration_ms REAL NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  about_choice TEXT,
  code_choice TEXT,
  posts_choice TEXT
);
CREATE INDEX IF NOT EXISTS jev_shadow_observed_at_idx ON jev_shadow_events (observed_at);
