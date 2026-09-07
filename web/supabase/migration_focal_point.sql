-- Focal point for portrait crop framing (run after migration.sql)
-- Adds normalized 0–1 coordinates per media asset for object-position / Ken Burns origin.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS focal_x REAL NOT NULL DEFAULT 0.5
    CHECK (focal_x >= 0 AND focal_x <= 1),
  ADD COLUMN IF NOT EXISTS focal_y REAL NOT NULL DEFAULT 0.5
    CHECK (focal_y >= 0 AND focal_y <= 1);

-- ─── RPC: Update media focal point ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_media_focal_point(
  p_edit_token TEXT,
  p_media_id UUID,
  p_focal_x REAL DEFAULT 0.5,
  p_focal_y REAL DEFAULT 0.5
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset media_assets%ROWTYPE;
BEGIN
  UPDATE media_assets ma
  SET
    focal_x = LEAST(1, GREATEST(0, COALESCE(p_focal_x, 0.5))),
    focal_y = LEAST(1, GREATEST(0, COALESCE(p_focal_y, 0.5)))
  FROM call_targets ct
  JOIN memorials m ON m.id = ct.memorial_id
  WHERE ma.id = p_media_id
    AND ma.call_target_id = ct.id
    AND m.edit_token = p_edit_token
  RETURNING ma.* INTO v_asset;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token or media';
  END IF;

  RETURN json_build_object(
    'id', v_asset.id,
    'public_url', v_asset.public_url,
    'storage_path', v_asset.storage_path,
    'sort_order', v_asset.sort_order,
    'reaction_tag', v_asset.reaction_tag,
    'focal_x', v_asset.focal_x,
    'focal_y', v_asset.focal_y
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_media_focal_point(TEXT, UUID, REAL, REAL) TO anon, authenticated;

-- Patch get_memorial_public to include focal columns
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
            'sort_order', ma.sort_order,
            'focal_x', ma.focal_x,
            'focal_y', ma.focal_y
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

-- Patch get_memorial_for_edit to include focal columns
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
            'sort_order', ma.sort_order,
            'focal_x', ma.focal_x,
            'focal_y', ma.focal_y
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

-- Patch register_media_asset to accept optional focal point
CREATE OR REPLACE FUNCTION register_media_asset(
  p_edit_token TEXT,
  p_target_id UUID,
  p_storage_path TEXT,
  p_public_url TEXT,
  p_sort_order INT DEFAULT 0,
  p_reaction_tag TEXT DEFAULT NULL,
  p_focal_x REAL DEFAULT 0.5,
  p_focal_y REAL DEFAULT 0.5
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

  INSERT INTO media_assets (
    call_target_id,
    storage_path,
    public_url,
    sort_order,
    reaction_tag,
    focal_x,
    focal_y
  )
  VALUES (
    p_target_id,
    p_storage_path,
    p_public_url,
    p_sort_order,
    p_reaction_tag,
    LEAST(1, GREATEST(0, COALESCE(p_focal_x, 0.5))),
    LEAST(1, GREATEST(0, COALESCE(p_focal_y, 0.5)))
  )
  RETURNING * INTO v_asset;

  RETURN json_build_object(
    'id', v_asset.id,
    'public_url', v_asset.public_url,
    'storage_path', v_asset.storage_path,
    'sort_order', v_asset.sort_order,
    'reaction_tag', v_asset.reaction_tag,
    'focal_x', v_asset.focal_x,
    'focal_y', v_asset.focal_y
  );
END;
$$;
