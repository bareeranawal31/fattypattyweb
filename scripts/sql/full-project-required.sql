-- Full Fatty Patty required SQL (idempotent)
-- Run in Supabase SQL Editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Ensure order numbers always exist
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := 'FP-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 5));
  END IF;
  RETURN NEW;
END;
$$;

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  image text,
  image_url text,
  display_order integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  image text,
  image_url text,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 4.5,
  sort_order integer DEFAULT 0,
  preparation_time_minutes integer,
  calories integer,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Deals
CREATE TABLE IF NOT EXISTS public.deals (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text,
  description text,
  items jsonb DEFAULT '[]'::jsonb,
  price numeric(10,2) DEFAULT 0,
  fixed_price numeric(10,2),
  image text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Public users mirror table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  phone text,
  address text,
  loyalty_points integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Customer profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  current_points integer DEFAULT 0,
  lifetime_points_earned integer DEFAULT 0,
  total_points_redeemed integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Branches
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  delivery_radius double precision DEFAULT 5,
  is_active boolean DEFAULT true,
  accepts_pickup boolean DEFAULT true,
  accepts_delivery boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Delivery areas
CREATE TABLE IF NOT EXISTS public.delivery_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  area_name text NOT NULL,
  delivery_fee numeric(10,2) DEFAULT 0,
  min_order_amount numeric(10,2) DEFAULT 0,
  estimated_time_minutes integer,
  polygon_coordinates jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Saved addresses
CREATE TABLE IF NOT EXISTS public.delivery_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text DEFAULT 'Home',
  address_line text NOT NULL,
  area text,
  city text,
  notes text,
  latitude double precision,
  longitude double precision,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  user_id uuid,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  order_type text,
  delivery_area text,
  delivery_address text,
  delivery_latitude double precision,
  delivery_longitude double precision,
  pickup_branch text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) DEFAULT 0,
  delivery_fee numeric(10,2) DEFAULT 0,
  total numeric(10,2),
  total_amount numeric(10,2),
  discount_amount numeric(10,2) DEFAULT 0,
  coupon_code text,
  status text DEFAULT 'pending',
  payment_method text,
  special_instructions text,
  notes text,
  estimated_time text,
  actual_ready_time timestamptz,
  loyalty_points_earned integer DEFAULT 0,
  loyalty_points_redeemed integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id text,
  item_name text,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  unit_price numeric(10,2),
  total_price numeric(10,2),
  special_instructions text,
  customizations jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Order status history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT NOW()
);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  menu_item_id text NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE (user_id, menu_item_id)
);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  ticket_type text DEFAULT 'query',
  status text DEFAULT 'open',
  admin_reply text,
  reply_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Legacy contact messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);

-- Loyalty settings
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rupees_per_point numeric(10,2) DEFAULT 100,
  redeem_value_per_point numeric(10,2) DEFAULT 1,
  min_order_amount numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Staff accounts
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Loyalty transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  points integer NOT NULL,
  note text,
  created_at timestamptz DEFAULT NOW()
);

-- Menu option tables (used by public menu API)
CREATE TABLE IF NOT EXISTS public.add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drink_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Backward compatibility columns and defaults
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2);

ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT ('FP-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 5)));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    EXECUTE 'UPDATE public.orders SET total = total_amount WHERE total IS NULL AND total_amount IS NOT NULL';
    EXECUTE 'UPDATE public.orders SET total_amount = total WHERE total_amount IS NULL AND total IS NOT NULL';
  END IF;
END
$$;

ALTER TABLE public.orders
  ALTER COLUMN total SET DEFAULT 0,
  ALTER COLUMN total_amount SET DEFAULT 0;

-- Triggers
DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_deals_updated_at ON public.deals;
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_delivery_areas_updated_at ON public.delivery_areas;
CREATE TRIGGER trg_delivery_areas_updated_at BEFORE UPDATE ON public.delivery_areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_delivery_addresses_updated_at ON public.delivery_addresses;
CREATE TRIGGER trg_delivery_addresses_updated_at BEFORE UPDATE ON public.delivery_addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_loyalty_settings_updated_at ON public.loyalty_settings;
CREATE TRIGGER trg_loyalty_settings_updated_at BEFORE UPDATE ON public.loyalty_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_add_ons_updated_at ON public.add_ons;
CREATE TRIGGER trg_add_ons_updated_at BEFORE UPDATE ON public.add_ons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_drink_options_updated_at ON public.drink_options;
CREATE TRIGGER trg_drink_options_updated_at BEFORE UPDATE ON public.drink_options FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON public.menu_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_deals_is_active ON public.deals(is_active);
CREATE INDEX IF NOT EXISTS idx_deals_sort_order ON public.deals(sort_order);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_areas_branch_id_active ON public.delivery_areas(branch_id, is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_coordinates ON public.branches(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_coords ON public.orders(delivery_latitude, delivery_longitude);

-- Seed minimal defaults
INSERT INTO public.loyalty_settings (rupees_per_point, redeem_value_per_point, min_order_amount, is_active)
SELECT 100, 1, 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_settings);

INSERT INTO public.categories (name, description, sort_order, display_order, is_active)
SELECT 'Beef Burgers', 'Beef burger options', 1, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Beef Burgers');

INSERT INTO public.categories (name, description, sort_order, display_order, is_active)
SELECT 'Chicken Burgers', 'Chicken burger options', 2, 2, true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Chicken Burgers');

INSERT INTO public.categories (name, description, sort_order, display_order, is_active)
SELECT 'Fries', 'Sides and fries', 3, 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Fries');

INSERT INTO public.categories (name, description, sort_order, display_order, is_active)
SELECT 'Drinks', 'Beverages', 4, 4, true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Drinks');

-- Storage bucket used by admin upload API
INSERT INTO storage.buckets (id, name, public)
SELECT 'images', 'images', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'images'
);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies safely
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS users_upsert_own ON public.users;
CREATE POLICY users_upsert_own ON public.users
FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_select_own ON public.customer_profiles;
CREATE POLICY customer_profiles_select_own ON public.customer_profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS customer_profiles_write_own ON public.customer_profiles;
CREATE POLICY customer_profiles_write_own ON public.customer_profiles
FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
CREATE POLICY favorites_select_own ON public.favorites
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS favorites_write_own ON public.favorites;
CREATE POLICY favorites_write_own ON public.favorites
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS delivery_addresses_select_own ON public.delivery_addresses;
CREATE POLICY delivery_addresses_select_own ON public.delivery_addresses
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS delivery_addresses_write_own ON public.delivery_addresses;
CREATE POLICY delivery_addresses_write_own ON public.delivery_addresses
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR lower(coalesce(customer_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS orders_insert_authenticated ON public.orders;
CREATE POLICY orders_insert_authenticated ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
CREATE POLICY support_tickets_select_own ON public.support_tickets
FOR SELECT TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_write_own ON public.support_tickets;
CREATE POLICY support_tickets_write_own ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Public read policies for storefront data
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories
FOR SELECT TO anon, authenticated
USING (is_active = true OR is_active IS NULL);

DROP POLICY IF EXISTS menu_items_public_read ON public.menu_items;
CREATE POLICY menu_items_public_read ON public.menu_items
FOR SELECT TO anon, authenticated
USING (is_available = true OR is_available IS NULL);

DROP POLICY IF EXISTS deals_public_read ON public.deals;
CREATE POLICY deals_public_read ON public.deals
FOR SELECT TO anon, authenticated
USING (is_active = true OR is_active IS NULL);

DROP POLICY IF EXISTS addons_public_read ON public.add_ons;
CREATE POLICY addons_public_read ON public.add_ons
FOR SELECT TO anon, authenticated
USING (is_active = true OR is_active IS NULL);

DROP POLICY IF EXISTS drink_options_public_read ON public.drink_options;
CREATE POLICY drink_options_public_read ON public.drink_options
FOR SELECT TO anon, authenticated
USING (is_active = true OR is_active IS NULL);

DROP POLICY IF EXISTS branches_public_read ON public.branches;
CREATE POLICY branches_public_read ON public.branches
FOR SELECT TO anon, authenticated
USING (is_active = true OR is_active IS NULL);

DROP POLICY IF EXISTS delivery_areas_public_read ON public.delivery_areas;
CREATE POLICY delivery_areas_public_read ON public.delivery_areas
FOR SELECT TO anon, authenticated
USING (is_active = true OR is_active IS NULL);

-- Storage policies for images bucket
DROP POLICY IF EXISTS images_public_read ON storage.objects;
CREATE POLICY images_public_read ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

DROP POLICY IF EXISTS images_authenticated_insert ON storage.objects;
CREATE POLICY images_authenticated_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS images_authenticated_update ON storage.objects;
CREATE POLICY images_authenticated_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS images_authenticated_delete ON storage.objects;
CREATE POLICY images_authenticated_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images');

COMMIT;
