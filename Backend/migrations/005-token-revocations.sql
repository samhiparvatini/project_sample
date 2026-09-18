BEGIN;
CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    token_hash text PRIMARY KEY,
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS revoked_tokens_expiry ON public.revoked_tokens (expires_at);
COMMIT;
