-- Phase 2: Smart location-based delivery migration (idempotent)
-- Run this in Supabase SQL editor.

BEGIN;

-- 1) Branch geo columns (required for nearest branch + radius validation)
ALTER TABLE IF EXISTS public.branches
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_radius DOUBLE PRECISION DEFAULT 5;

-- Keep radius sane
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'branches'
  ) THEN
    BEGIN
      ALTER TABLE public.branches
        ADD CONSTRAINT branches_delivery_radius_non_negative
        CHECK (delivery_radius IS NULL OR delivery_radius >= 0);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

-- 2) Delivery area polygon column (optional advanced geofencing)
ALTER TABLE IF EXISTS public.delivery_areas
  ADD COLUMN IF NOT EXISTS polygon_coordinates JSONB;

-- 3) Orders: capture delivery coordinates and selected branch
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;

-- 4) Saved addresses: optional coordinate persistence
ALTER TABLE IF EXISTS public.delivery_addresses
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_coordinates ON public.branches(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_delivery_areas_branch_id_active ON public.delivery_areas(branch_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_coords ON public.orders(delivery_latitude, delivery_longitude);

COMMIT;

-- Optional seed update example (edit coordinates/radius as needed):
-- UPDATE public.branches
-- SET latitude = 24.8078, longitude = 67.0647, delivery_radius = 8
-- WHERE name ILIKE '%DHA%';
--
-- UPDATE public.branches
-- SET latitude = 24.8765, longitude = 67.0776, delivery_radius = 7
-- WHERE name ILIKE '%Tipu%';

-- Optional polygon example:
-- UPDATE public.delivery_areas
-- SET polygon_coordinates = '[
--   {"lat":24.8401,"lng":67.0679},
--   {"lat":24.8362,"lng":67.0905},
--   {"lat":24.8188,"lng":67.0884},
--   {"lat":24.8214,"lng":67.0602}
-- ]'::jsonb
-- WHERE area_name = 'DHA Phase 8';
