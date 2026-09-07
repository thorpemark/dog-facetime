-- Dual-orientation framing per media asset (run after migration_focal_crop.sql)
-- Existing focal_* columns remain portrait phone framing.
-- landscape_focal_* stores landscape phone / desktop widescreen framing.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS landscape_focal_x REAL
    CHECK (landscape_focal_x IS NULL OR (landscape_focal_x >= 0 AND landscape_focal_x <= 1)),
  ADD COLUMN IF NOT EXISTS landscape_focal_y REAL
    CHECK (landscape_focal_y IS NULL OR (landscape_focal_y >= 0 AND landscape_focal_y <= 1)),
  ADD COLUMN IF NOT EXISTS landscape_focal_zoom REAL
    CHECK (landscape_focal_zoom IS NULL OR (landscape_focal_zoom >= 1 AND landscape_focal_zoom <= 4)),
  ADD COLUMN IF NOT EXISTS landscape_focal_crop_w REAL
    CHECK (landscape_focal_crop_w IS NULL OR (landscape_focal_crop_w >= 0.08 AND landscape_focal_crop_w <= 1)),
  ADD COLUMN IF NOT EXISTS landscape_focal_crop_h REAL
    CHECK (landscape_focal_crop_h IS NULL OR (landscape_focal_crop_h >= 0.08 AND landscape_focal_crop_h <= 1));

-- ─── RPC: Update media focal point ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_media_focal_point(
  p_edit_token TEXT,
  p_media_id UUID,
  p_focal_x REAL DEFAULT 0.5,
  p_focal_y REAL DEFAULT 0.5,
  p_focal_zoom REAL DEFAULT 1,
  p_focal_crop_w REAL DEFAULT NULL,
  p_focal_crop_h REAL DEFAULT NULL,
  p_landscape_focal_x REAL DEFAULT NULL,
  p_landscape_focal_y REAL DEFAULT NULL,
  p_landscape_focal_zoom REAL DEFAULT NULL,
  p_landscape_focal_crop_w REAL DEFAULT NULL,
  p_landscape_focal_crop_h REAL DEFAULT NULL
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
    focal_y = LEAST(1, GREATEST(0, COALESCE(p_focal_y, 0.5))),
    focal_zoom = LEAST(4, GREATEST(1, COALESCE(p_focal_zoom, 1))),
    focal_crop_w = CASE
      WHEN p_focal_crop_w IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_focal_crop_w))
    END,
    focal_crop_h = CASE
      WHEN p_focal_crop_h IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_focal_crop_h))
    END,
    landscape_focal_x = CASE
      WHEN p_landscape_focal_x IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0, p_landscape_focal_x))
    END,
    landscape_focal_y = CASE
      WHEN p_landscape_focal_y IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0, p_landscape_focal_y))
    END,
    landscape_focal_zoom = CASE
      WHEN p_landscape_focal_zoom IS NULL THEN NULL
      ELSE LEAST(4, GREATEST(1, p_landscape_focal_zoom))
    END,
    landscape_focal_crop_w = CASE
      WHEN p_landscape_focal_crop_w IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_landscape_focal_crop_w))
    END,
    landscape_focal_crop_h = CASE
      WHEN p_landscape_focal_crop_h IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_landscape_focal_crop_h))
    END
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
    'focal_y', v_asset.focal_y,
    'focal_zoom', v_asset.focal_zoom,
    'focal_crop_w', v_asset.focal_crop_w,
    'focal_crop_h', v_asset.focal_crop_h,
    'landscape_focal_x', v_asset.landscape_focal_x,
    'landscape_focal_y', v_asset.landscape_focal_y,
    'landscape_focal_zoom', v_asset.landscape_focal_zoom,
    'landscape_focal_crop_w', v_asset.landscape_focal_crop_w,
    'landscape_focal_crop_h', v_asset.landscape_focal_crop_h
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_media_focal_point(TEXT, UUID, REAL, REAL, REAL, REAL, REAL, REAL, REAL, REAL, REAL, REAL) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_memorial_public(p_share_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial memorials%ROWTYPE;
BEGIN
  SELECT * INTO v_memorial FROM memorials WHERE share_id = p_share_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id', v_memorial.id,
    'title', v_memorial.title,
    'note', v_memorial.note,
    'share_id', v_memorial.share_id,
    'created_at', v_memorial.created_at,
    'targets', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ct.id,
          'kind', ct.kind,
          'display_name', ct.display_name,
          'sort_order', ct.sort_order,
          'media', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', ma.id,
                'public_url', ma.public_url,
                'storage_path', ma.storage_path,
                'sort_order', ma.sort_order,
                'reaction_tag', ma.reaction_tag,
                'focal_x', ma.focal_x,
                'focal_y', ma.focal_y,
                'focal_zoom', ma.focal_zoom,
                'focal_crop_w', ma.focal_crop_w,
                'focal_crop_h', ma.focal_crop_h,
                'landscape_focal_x', ma.landscape_focal_x,
                'landscape_focal_y', ma.landscape_focal_y,
                'landscape_focal_zoom', ma.landscape_focal_zoom,
                'landscape_focal_crop_w', ma.landscape_focal_crop_w,
                'landscape_focal_crop_h', ma.landscape_focal_crop_h
              ) ORDER BY ma.sort_order
            ), '[]'::json)
            FROM media_assets ma
            WHERE ma.call_target_id = ct.id
          )
        ) ORDER BY ct.sort_order
      ), '[]'::json)
      FROM call_targets ct
      WHERE ct.memorial_id = v_memorial.id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_memorial_for_edit(p_edit_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memorial memorials%ROWTYPE;
BEGIN
  SELECT * INTO v_memorial FROM memorials WHERE edit_token = p_edit_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id', v_memorial.id,
    'title', v_memorial.title,
    'note', v_memorial.note,
    'share_id', v_memorial.share_id,
    'edit_token', v_memorial.edit_token,
    'created_at', v_memorial.created_at,
    'targets', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ct.id,
          'kind', ct.kind,
          'display_name', ct.display_name,
          'sort_order', ct.sort_order,
          'media', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', ma.id,
                'public_url', ma.public_url,
                'storage_path', ma.storage_path,
                'sort_order', ma.sort_order,
                'reaction_tag', ma.reaction_tag,
                'focal_x', ma.focal_x,
                'focal_y', ma.focal_y,
                'focal_zoom', ma.focal_zoom,
                'focal_crop_w', ma.focal_crop_w,
                'focal_crop_h', ma.focal_crop_h,
                'landscape_focal_x', ma.landscape_focal_x,
                'landscape_focal_y', ma.landscape_focal_y,
                'landscape_focal_zoom', ma.landscape_focal_zoom,
                'landscape_focal_crop_w', ma.landscape_focal_crop_w,
                'landscape_focal_crop_h', ma.landscape_focal_crop_h
              ) ORDER BY ma.sort_order
            ), '[]'::json)
            FROM media_assets ma
            WHERE ma.call_target_id = ct.id
          )
        ) ORDER BY ct.sort_order
      ), '[]'::json)
      FROM call_targets ct
      WHERE ct.memorial_id = v_memorial.id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION register_media_asset(
  p_edit_token TEXT,
  p_target_id UUID,
  p_storage_path TEXT,
  p_public_url TEXT,
  p_sort_order INT DEFAULT 0,
  p_reaction_tag TEXT DEFAULT NULL,
  p_focal_x REAL DEFAULT 0.5,
  p_focal_y REAL DEFAULT 0.5,
  p_focal_zoom REAL DEFAULT 1,
  p_focal_crop_w REAL DEFAULT NULL,
  p_focal_crop_h REAL DEFAULT NULL,
  p_landscape_focal_x REAL DEFAULT NULL,
  p_landscape_focal_y REAL DEFAULT NULL,
  p_landscape_focal_zoom REAL DEFAULT NULL,
  p_landscape_focal_crop_w REAL DEFAULT NULL,
  p_landscape_focal_crop_h REAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset media_assets%ROWTYPE;
BEGIN
  IF p_storage_path IS NULL OR NOT p_storage_path LIKE p_edit_token || '/%' THEN
    RAISE EXCEPTION 'Storage path must start with edit token folder';
  END IF;

  INSERT INTO media_assets (
    call_target_id,
    storage_path,
    public_url,
    sort_order,
    reaction_tag,
    focal_x,
    focal_y,
    focal_zoom,
    focal_crop_w,
    focal_crop_h,
    landscape_focal_x,
    landscape_focal_y,
    landscape_focal_zoom,
    landscape_focal_crop_w,
    landscape_focal_crop_h
  )
  SELECT
    ct.id,
    p_storage_path,
    p_public_url,
    COALESCE(p_sort_order, 0),
    p_reaction_tag,
    LEAST(1, GREATEST(0, COALESCE(p_focal_x, 0.5))),
    LEAST(1, GREATEST(0, COALESCE(p_focal_y, 0.5))),
    LEAST(4, GREATEST(1, COALESCE(p_focal_zoom, 1))),
    CASE
      WHEN p_focal_crop_w IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_focal_crop_w))
    END,
    CASE
      WHEN p_focal_crop_h IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_focal_crop_h))
    END,
    CASE
      WHEN p_landscape_focal_x IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0, p_landscape_focal_x))
    END,
    CASE
      WHEN p_landscape_focal_y IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0, p_landscape_focal_y))
    END,
    CASE
      WHEN p_landscape_focal_zoom IS NULL THEN NULL
      ELSE LEAST(4, GREATEST(1, p_landscape_focal_zoom))
    END,
    CASE
      WHEN p_landscape_focal_crop_w IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_landscape_focal_crop_w))
    END,
    CASE
      WHEN p_landscape_focal_crop_h IS NULL THEN NULL
      ELSE LEAST(1, GREATEST(0.08, p_landscape_focal_crop_h))
    END
  FROM call_targets ct
  JOIN memorials m ON m.id = ct.memorial_id
  WHERE ct.id = p_target_id AND m.edit_token = p_edit_token
  RETURNING * INTO v_asset;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid edit token or target';
  END IF;

  RETURN json_build_object(
    'id', v_asset.id,
    'public_url', v_asset.public_url,
    'storage_path', v_asset.storage_path,
    'sort_order', v_asset.sort_order,
    'reaction_tag', v_asset.reaction_tag,
    'focal_x', v_asset.focal_x,
    'focal_y', v_asset.focal_y,
    'focal_zoom', v_asset.focal_zoom,
    'focal_crop_w', v_asset.focal_crop_w,
    'focal_crop_h', v_asset.focal_crop_h,
    'landscape_focal_x', v_asset.landscape_focal_x,
    'landscape_focal_y', v_asset.landscape_focal_y,
    'landscape_focal_zoom', v_asset.landscape_focal_zoom,
    'landscape_focal_crop_w', v_asset.landscape_focal_crop_w,
    'landscape_focal_crop_h', v_asset.landscape_focal_crop_h
  );
END;
$$;

GRANT EXECUTE ON FUNCTION register_media_asset(TEXT, UUID, TEXT, TEXT, INT, TEXT, REAL, REAL, REAL, REAL, REAL, REAL, REAL, REAL, REAL, REAL) TO anon, authenticated;
