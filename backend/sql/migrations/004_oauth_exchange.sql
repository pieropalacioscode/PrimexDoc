-- DocenteSmart: intercambio temporal de sesiones OAuth.
-- No ejecutar todavía en producción.

CREATE TABLE oauth_exchange_codes (
    code_hash VARCHAR(64) PRIMARY KEY,
    browser_hash VARCHAR(64) NOT NULL,

    user_id UUID NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    session_id UUID NOT NULL
        REFERENCES user_sessions(id)
        ON DELETE CASCADE,

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()
);

CREATE INDEX idx_oauth_exchange_expiry
    ON oauth_exchange_codes(expires_at);

CREATE INDEX idx_oauth_exchange_session
    ON oauth_exchange_codes(session_id);
