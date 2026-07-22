-- ============================================================
-- SUPABASE DATABASE TABLES & RLS POLICIES FOR CALCI CHECKOUT
-- Execute this SQL script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ohieslrkmkgxhmnemikw/sql
-- ============================================================

-- 1. Create public.orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
