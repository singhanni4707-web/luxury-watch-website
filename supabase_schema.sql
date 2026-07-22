-- ============================================================
-- SUPABASE DATABASE TABLES & RLS POLICIES FOR CALCI CHECKOUT
-- Execute this SQL script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ohieslrkmkgxhmnemikw/sql
-- ============================================================

-- 1. Create public.orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_reference TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure order_reference column exists on existing orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_reference TEXT;

-- 2. Create public.order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for public.orders
DROP POLICY IF EXISTS "Allow anonymous insert into orders" ON public.orders;
CREATE POLICY "Allow anonymous insert into orders" 
ON public.orders 
FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous select from orders" ON public.orders;
CREATE POLICY "Allow anonymous select from orders" 
ON public.orders 
FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow update on orders" ON public.orders;
CREATE POLICY "Allow update on orders" 
ON public.orders 
FOR UPDATE 
TO public, anon, authenticated 
USING (true)
WITH CHECK (true);

-- 5. RLS Policies for public.order_items
DROP POLICY IF EXISTS "Allow anonymous insert into order_items" ON public.order_items;
CREATE POLICY "Allow anonymous insert into order_items" 
ON public.order_items 
FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous select from order_items" ON public.order_items;
CREATE POLICY "Allow anonymous select from order_items" 
ON public.order_items 
FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- 6. Secure RLS Policies for public.products
-- Public Website: SELECT ONLY (read products)
-- Authenticated Admin: INSERT, UPDATE, DELETE allowed
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow public read access (SELECT) for everyone (anon and authenticated)
DROP POLICY IF EXISTS "Allow public select from products" ON public.products;
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
CREATE POLICY "Allow public read products" 
ON public.products 
FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- Allow product INSERT ONLY for authenticated admin users
DROP POLICY IF EXISTS "Allow public insert into products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated admin insert products" ON public.products;
CREATE POLICY "Allow authenticated admin insert products" 
ON public.products 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

-- Allow product UPDATE ONLY for authenticated admin users
DROP POLICY IF EXISTS "Allow public update on products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated admin update products" ON public.products;
CREATE POLICY "Allow authenticated admin update products" 
ON public.products 
FOR UPDATE 
TO authenticated 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Allow product DELETE ONLY for authenticated admin users
DROP POLICY IF EXISTS "Allow public delete from products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated admin delete products" ON public.products;
CREATE POLICY "Allow authenticated admin delete products" 
ON public.products 
FOR DELETE 
TO authenticated 
USING (auth.role() = 'authenticated');

-- ============================================================
-- 7. CREATE TABLE public.reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on public.reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow public read access (SELECT) for reviews
DROP POLICY IF EXISTS "Allow public select from reviews" ON public.reviews;
CREATE POLICY "Allow public select from reviews" 
ON public.reviews 
FOR SELECT 
TO public, anon, authenticated 
USING (true);

-- Allow public review submission (INSERT)
DROP POLICY IF EXISTS "Allow public insert into reviews" ON public.reviews;
CREATE POLICY "Allow public insert into reviews" 
ON public.reviews 
FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

