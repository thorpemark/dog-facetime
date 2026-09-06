-- Memorial Call — one-paste Supabase setup
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memorials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  note          TEXT NOT NULL DEFAULT '',
  share_id      TEXT NOT NULL UNIQUE,
  edit_token    TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id   UUID NOT NULL REFERENCES memorials(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('dog_a', 'dog_b', 'together')),
  display_name  TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  UNIQUE (memorial_id, kind)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_target_id  UUID NOT NULL REFERENCES call_targets(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  public_url      TEXT NOT NULL,
  reaction_tag    TEXT,  -- null = general/idle; future: per-reaction clips
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memorials_share_id ON memorials(share_id);
CREATE INDEX IF NOT EXISTS idx_call_targets_memorial ON call_targets(memorial_id);
CREATE INDEX IF NOT EXISTS idx_media_target ON media_assets(call_target_id);

-- ─── Helpers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_share_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION generate_edit_token()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT encode(gen_random_bytes(24), 'hex');
$$;

CREATE OR REPLACE FUNCTION memorial_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS memorials_updated ON memorials;
CREATE TRIGGER memorials_updated
  BEFORE UPDATE ON memorials
  FOR EACH ROW EXECUTE FUNCTION memorial_updated();

-- ─── Storage bucket ───────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memorial-photos',
  'memorial-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- SECURITY DEFINER helper so storage policies can verify edit_token without
-- granting anon SELECT on memorials (RLS blocks direct table reads).
CREATE OR REPLACE FUNCTION memorial_edit_token_exists(p_edit_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM memorials WHERE edit_token = p_edit_token);
$$;

-- Public read; uploads scoped to edit_token folder (first path segment)
DROP POLICY IF EXISTS "memorial_photos_public_read" ON storage.objects;
CREATE POLICY "memorial_photos_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'memorial-photos');

DROP POLICY IF EXISTS "memorial_photos_upload_with_edit_token" ON storage.objects;
CREATE POLICY "memorial_photos_upload_with_edit_token"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'memorial-photos'
    AND memorial_edit_token_exists((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "memorial_photos_update_with_edit_token" ON storage.objects;
CREATE POLICY "memorial_photos_update_with_edit_token"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'memorial-photos'
    AND memorial_edit_token_exists((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'memorial-photos'
    AND memorial_edit_token_exists((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "memorial_photos_delete_with_edit_token" ON storage.objects;
CREATE POLICY "memorial_photos_delete_with_edit_token"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (
    bucket_id = 'memorial-photos'
    AND memorial_edit_token_exists((storage.foldername(name))[1])
  );

-- ─── RLS on tables ────────────────────────────────────────────────────────

ALTER TABLE memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- No direct table access for anon — use RPC functions below

-- ─── RPC: Create memorial ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_memorial(
  p_title TEXT,
  p_note TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share_id TEXT;
  v_edit_token TEXT;
  v_memorial memorials%ROWTYPE;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_share_id := generate_share_id();
    v_edit_token := generate_edit_token();
    BEGIN
      INSERT INTO memorials (title, note, share_id, edit_token)
      VALUES (trim(p_title), coalesce(p_note, ''), v_share_id, v_edit_token)
      RETURNING * INTO v_memorial;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN json_build_object(
    'id', v_memorial.id,
    'title', v_memorial.title,
    'note', v_memorial.note,
    'share_id', v_memorial.share_id,
    'edit_token', v_memorial.edit_token,
    'created_at', v_memorial.created_at
  );
END;
$$;

-- ─── RPC: Get public memorial by share id ─────────────────────────────────

CREATE OR REPLACE FUNCTION get_memorial_public(p_share_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial memorials%ROWTYPE;
  v_targets JSON;
BEGIN
  SELECT * INTO v_memorial FROM memorials WHERE share_id = p_share_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', ct.id,
      'kind', ct.kind,
      'display_name', ct.display_name,
      'sort_order', ct.sort_order,
      'media', (
        SELECT coalesce(json_agg(
          json_build_object(
            'id', ma.id,
            'public_url', ma.public_url,
            'storage_path', ma.storage_path,
            'reaction_tag', ma.reaction_tag,
            'sort_order', ma.sort_order
          ) ORDER BY ma.sort_order, ma.created_at
        ), '[]'::json)
        FROM media_assets ma
        WHERE ma.call_target_id = ct.id
      )
    ) ORDER BY ct.sort_order, ct.kind
  ), '[]'::json)
  INTO v_targets
  FROM call_targets ct
  WHERE ct.memorial_id = v_memorial.id;

  RETURN json_build_object(
    'id', v_memorial.id,
    'title', v_memorial.title,
    'note', v_memorial.note,
    'share_id', v_memorial.share_id,
    'created_at', v_memorial.created_at,
    'targets', v_targets
  );
END;
$$;

-- ─── RPC: Get memorial for editing ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_memorial_for_edit(p_edit_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial memorials%ROWTYPE;
  v_targets JSON;
BEGIN
  SELECT * INTO v_memorial FROM memorials WHERE edit_token = p_edit_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', ct.id,
      'kind', ct.kind,
      'display_name', ct.display_name,
      'sort_order', ct.sort_order,
      'media', (
        SELECT coalesce(json_agg(
          json_build_object(
            'id', ma.id,
            'public_url', ma.public_url,
            'storage_path', ma.storage_path,
            'reaction_tag', ma.reaction_tag,
            'sort_order', ma.sort_order
          ) ORDER BY ma.sort_order, ma.created_at
        ), '[]'::json)
        FROM media_assets ma
        WHERE ma.call_target_id = ct.id
      )
    ) ORDER BY ct.sort_order, ct.kind
  ), '[]'::json)
  INTO v_targets
  FROM call_targets ct
  WHERE ct.memorial_id = v_memorial.id;

  RETURN json_build_object(
    'id', v_memorial.id,
    'title', v_memorial.title,
    'note', v_memorial.note,
    'share_id', v_memorial.share_id,
    'edit_token', v_memorial.edit_token,
    'created_at', v_memorial.created_at,
    'targets', v_targets
  );
END;
$$;

-- ─── RPC: Update memorial metadata ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_memorial(
  p_edit_token TEXT,
  p_title TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial memorials%ROWTYPE;
BEGIN
  UPDATE memorials
  SET
    title = coalesce(trim(p_title), title),
    note = coalesce(p_note, note)
  WHERE edit_token = p_edit_token
  RETURNING * INTO v_memorial;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token';
  END IF;

  RETURN json_build_object(
    'id', v_memorial.id,
    'title', v_memorial.title,
    'note', v_memorial.note,
    'share_id', v_memorial.share_id,
    'edit_token', v_memorial.edit_token
  );
END;
$$;

-- ─── RPC: Upsert call target ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_call_target(
  p_edit_token TEXT,
  p_kind TEXT,
  p_display_name TEXT,
  p_sort_order INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial_id UUID;
  v_target call_targets%ROWTYPE;
BEGIN
  SELECT id INTO v_memorial_id FROM memorials WHERE edit_token = p_edit_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token';
  END IF;

  INSERT INTO call_targets (memorial_id, kind, display_name, sort_order)
  VALUES (v_memorial_id, p_kind, trim(p_display_name), p_sort_order)
  ON CONFLICT (memorial_id, kind) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    sort_order = EXCLUDED.sort_order
  RETURNING * INTO v_target;

  RETURN json_build_object(
    'id', v_target.id,
    'kind', v_target.kind,
    'display_name', v_target.display_name,
    'sort_order', v_target.sort_order
  );
END;
$$;

-- ─── RPC: Register uploaded media ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_media_asset(
  p_edit_token TEXT,
  p_target_id UUID,
  p_storage_path TEXT,
  p_public_url TEXT,
  p_sort_order INT DEFAULT 0,
  p_reaction_tag TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial_id UUID;
  v_asset media_assets%ROWTYPE;
BEGIN
  SELECT m.id INTO v_memorial_id
  FROM memorials m
  JOIN call_targets ct ON ct.memorial_id = m.id
  WHERE m.edit_token = p_edit_token AND ct.id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token or target';
  END IF;

  IF NOT p_storage_path LIKE p_edit_token || '/%' THEN
    RAISE EXCEPTION 'Storage path must start with edit token folder';
  END IF;

  INSERT INTO media_assets (call_target_id, storage_path, public_url, sort_order, reaction_tag)
  VALUES (p_target_id, p_storage_path, p_public_url, p_sort_order, p_reaction_tag)
  RETURNING * INTO v_asset;

  RETURN json_build_object(
    'id', v_asset.id,
    'public_url', v_asset.public_url,
    'storage_path', v_asset.storage_path,
    'sort_order', v_asset.sort_order,
    'reaction_tag', v_asset.reaction_tag
  );
END;
$$;

-- ─── RPC: Delete media asset ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_media_asset(
  p_edit_token TEXT,
  p_media_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_storage_path TEXT;
BEGIN
  SELECT ma.storage_path INTO v_storage_path
  FROM media_assets ma
  JOIN call_targets ct ON ct.id = ma.call_target_id
  JOIN memorials m ON m.id = ct.memorial_id
  WHERE ma.id = p_media_id AND m.edit_token = p_edit_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token or media';
  END IF;

  DELETE FROM media_assets WHERE id = p_media_id;
  RETURN true;
END;
$$;

-- ─── RPC: Regenerate share link ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION regenerate_share_id(p_edit_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial memorials%ROWTYPE;
  v_new_share_id TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_new_share_id := generate_share_id();
    BEGIN
      UPDATE memorials
      SET share_id = v_new_share_id
      WHERE edit_token = p_edit_token
      RETURNING * INTO v_memorial;
      IF FOUND THEN EXIT; END IF;
      RAISE EXCEPTION 'Invalid edit token';
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN json_build_object(
    'share_id', v_memorial.share_id,
    'edit_token', v_memorial.edit_token
  );
END;
$$;

-- ─── RPC: Delete call target ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION delete_call_target(
  p_edit_token TEXT,
  p_target_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM call_targets ct
  USING memorials m
  WHERE ct.id = p_target_id
    AND ct.memorial_id = m.id
    AND m.edit_token = p_edit_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token or target';
  END IF;

  RETURN true;
END;
$$;

-- ─── Grants ───────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION memorial_edit_token_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_memorial(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_memorial_public(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_memorial_for_edit(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_memorial(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_call_target(TEXT, TEXT, TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_media_asset(TEXT, UUID, TEXT, TEXT, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_media_asset(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION regenerate_share_id(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_call_target(TEXT, UUID) TO anon, authenticated;
