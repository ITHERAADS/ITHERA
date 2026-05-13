CREATE TABLE IF NOT EXISTS export_share_links (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id     UUID        NOT NULL,
  usuario_id   UUID        NOT NULL,
  token        TEXT        NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token    ON export_share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_grupo    ON export_share_links(grupo_id, expires_at);
