-- Memorial Call — owner accounts & "My memorials"
-- Run in Supabase SQL Editor AFTER migration.sql (Dashboard → SQL → New query)

-- ─── Owner column ─────────────────────────────────────────────────────────

ALTER TABLE memorials
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memorials_owner_id ON memorials(owner_id);

-- ─── RPC: Create memorial (attach owner when signed in) ───────────────────

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
      INSERT INTO memorials (title, note, share_id, edit_token, owner_id)
      VALUES (trim(p_title), coalesce(p_note, ''), v_share_id, v_edit_token, auth.uid())
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

-- ─── RPC: List memorials for signed-in user ────────────────────────────────

CREATE OR REPLACE FUNCTION list_my_memorials()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT coalesce(json_agg(
    json_build_object(
      'id', m.id,
      'title', m.title,
      'note', m.note,
      'share_id', m.share_id,
      'edit_token', m.edit_token,
      'created_at', m.created_at
    ) ORDER BY m.created_at DESC
  ), '[]'::json)
  INTO v_result
  FROM memorials m
  WHERE m.owner_id = v_user_id;

  RETURN v_result;
END;
$$;

-- ─── RPC: Claim orphaned memorial after sign-in ───────────────────────────

CREATE OR REPLACE FUNCTION claim_memorial(p_edit_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_memorial memorials%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE memorials
  SET owner_id = v_user_id
  WHERE edit_token = p_edit_token
    AND owner_id IS NULL
  RETURNING * INTO v_memorial;

  IF NOT FOUND THEN
    -- Already owned by this user — return it; otherwise invalid or taken
    SELECT * INTO v_memorial
    FROM memorials
    WHERE edit_token = p_edit_token AND owner_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Memorial not found or already claimed';
    END IF;
  END IF;

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

-- ─── Grants ───────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION create_memorial(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_my_memorials() TO authenticated;
GRANT EXECUTE ON FUNCTION claim_memorial(TEXT) TO authenticated;
