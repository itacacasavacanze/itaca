-- Site-wide settings (currently: whether nightly prices are shown on the public site).
-- Run once in Supabase → SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default: prices visible (keeps the current behaviour).
INSERT INTO public.site_settings (key, value)
VALUES ('show_prices', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (the public website and /api/availability) can read settings.
DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only a logged-in admin (Supabase Auth user) can change settings.
DROP POLICY IF EXISTS "site_settings admin insert" ON public.site_settings;
CREATE POLICY "site_settings admin insert"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "site_settings admin update" ON public.site_settings;
CREATE POLICY "site_settings admin update"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
