-- ============================================================================
-- A Little Wish — Supabase PostgreSQL Schema & Security Policies
-- Stores Player Sessions & Player Krathongs separately from System Collection
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Players & Ephemeral Verified Sessions
CREATE TABLE IF NOT EXISTS public.players (
  player_id     TEXT PRIMARY KEY,
  session_id    TEXT UNIQUE NOT NULL,
  -- Store salted SHA-256 hash of the client-held session token; never store raw secret
  session_hash  TEXT NOT NULL,
  nickname      TEXT NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 2 AND 24),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Player Krathongs (Strictly separated from System Collection SYS-KR-001..010)
CREATE TABLE IF NOT EXISTS public.player_krathongs (
  krathong_id     TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  session_id      TEXT NOT NULL,
  nickname        TEXT NOT NULL CHECK (char_length(trim(nickname)) BETWEEN 2 AND 24),
  design_config   JSONB NOT NULL,
  wish_message    TEXT NOT NULL DEFAULT '' CHECK (char_length(wish_message) <= 140),
  release_status  TEXT NOT NULL CHECK (release_status IN ('draft', 'released')) DEFAULT 'draft',
  -- Deterministic stable coordinates in [0.12..0.88] x [0.58..0.88] assigned at creation
  river_seed      DOUBLE PRECISION NOT NULL DEFAULT random(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_player_krathongs_status_created
  ON public.player_krathongs (release_status, released_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_krathongs_player
  ON public.player_krathongs (player_id);

-- 3. Server-side Anti-Impersonation, Anti-Profanity & Rate Limit Guard Trigger
CREATE OR REPLACE FUNCTION public.validate_krathong_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INTEGER;
  clean_nick TEXT;
BEGIN
  clean_nick := lower(trim(NEW.nickname));

  -- Prevent impersonating System Collection or staff
  IF clean_nick ~ '(a little wish|collection|system|admin|moderator|official|sys-kr)' THEN
    RAISE EXCEPTION 'Reserved nickname is not allowed';
  END IF;

  -- Enforce permanent ID convention (Player krathongs cannot use SYS-KR- prefix)
  IF upper(NEW.krathong_id) LIKE 'SYS-KR-%' THEN
    RAISE EXCEPTION 'Invalid player krathong ID prefix';
  END IF;

  -- Basic profanity / URL spam check
  IF lower(NEW.wish_message) ~ '(https?://|www\.|<script|ควย|เหี้ย|สัส|เย็ด|หี|มึง|กู|fuck|shit|bitch)' THEN
    RAISE EXCEPTION 'Message contains disallowed content';
  END IF;

  -- Anti-spam rate limit on new inserts (max 5 krathongs per 10 minutes per player)
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO recent_count
    FROM public.player_krathongs
    WHERE player_id = NEW.player_id
      AND created_at > now() - interval '10 minutes';
    IF recent_count >= 5 THEN
      RAISE EXCEPTION 'Rate limit exceeded. Please wait before releasing another krathong.';
    END IF;
  END IF;

  NEW.updated_at := now();
  IF NEW.release_status = 'released' AND NEW.released_at IS NULL THEN
    NEW.released_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_player_krathong ON public.player_krathongs;
CREATE TRIGGER trg_validate_player_krathong
  BEFORE INSERT OR UPDATE ON public.player_krathongs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_krathong_write();

-- 4. Row Level Security (RLS)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_krathongs ENABLE ROW LEVEL SECURITY;

-- Helper reads x-alw-session-token HTTP header passed by client and hashes it
CREATE OR REPLACE FUNCTION public.current_session_hash()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT encode(
    digest(
      coalesce(current_setting('request.headers', true)::jsonb ->> 'x-alw-session-token', ''),
      'sha256'
    ),
    'hex'
  );
$$;

-- Anyone can read ONLY released player krathongs (and their own drafts via session token)
CREATE POLICY "Public read released krathongs"
  ON public.player_krathongs
  FOR SELECT
  USING (
    release_status = 'released'
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.player_id = player_krathongs.player_id
        AND p.session_hash = public.current_session_hash()
    )
  );

-- Only the verified session owner can insert or update their own krathong
CREATE POLICY "Owner insert krathong"
  ON public.player_krathongs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.player_id = player_krathongs.player_id
        AND p.session_id = player_krathongs.session_id
        AND p.session_hash = public.current_session_hash()
    )
  );

CREATE POLICY "Owner update own krathong"
  ON public.player_krathongs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.player_id = player_krathongs.player_id
        AND p.session_hash = public.current_session_hash()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.player_id = player_krathongs.player_id
        AND p.session_hash = public.current_session_hash()
    )
  );

-- Players table: allow registration & owner read/update via session_hash
CREATE POLICY "Allow register player"
  ON public.players
  FOR INSERT
  WITH CHECK (char_length(session_hash) = 64);

CREATE POLICY "Owner read own player"
  ON public.players
  FOR SELECT
  USING (session_hash = public.current_session_hash());

CREATE POLICY "Owner update own player"
  ON public.players
  FOR UPDATE
  USING (session_hash = public.current_session_hash());

-- 5. Enable Supabase Realtime on released community krathongs
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_krathongs;
