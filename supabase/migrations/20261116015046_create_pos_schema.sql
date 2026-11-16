/*
# Create POS & Inventory Schema

## Overview
Creates the full database schema for a POS and Inventory Management dashboard.
This is a single-tenant app with no sign-in screen, so all policies target
`anon, authenticated` and data is intentionally shared/public.

## New Tables

### stores
- Represents physical store/branch locations (e.g. Freshmart, Downtown Store)
- `id` (uuid PK), `name` (text), `address` (text), `created_at`

### categories
- Product categories (e.g. Electronics, Groceries, Beverages)
- `id` (uuid PK), `name` (text), `description` (text), `created_at`

### products
- Individual products in inventory
- `id` (uuid PK), `name`, `sku` (unique), `barcode` (text)
- `category_id` (FK -> categories)
- `store_id` (FK -> stores)
- `price` (numeric), `cost` (numeric)
- `stock_quantity` (integer), `low_stock_threshold` (integer, default 5)
- `unit` (text, e.g. Pcs, Kg, Box)
- `image_url` (text, nullable)
- `created_at`, `updated_at`

### sales
- Transaction/sale headers
- `id` (uuid PK), `invoice_number` (text, unique)
- `store_id` (FK -> stores)
- `customer_name` (text, nullable)
- `subtotal`, `tax_amount`, `discount_amount`, `total` (numeric)
- `payment_method` (text: cash, card, transfer)
- `payment_status` (text: paid, pending)
- `created_at`

### sale_items
- Line items for each sale
- `id` (uuid PK), `sale_id` (FK -> sales, CASCADE)
- `product_id` (FK -> products)
- `product_name` (text, snapshot at time of sale)
- `quantity` (integer), `unit_price` (numeric), `line_total` (numeric)

## Security
- RLS enabled on all tables
- CRUD granted to `anon, authenticated` (single-tenant, no auth)
- All policies use `USING (true)` / `WITH CHECK (true)` — data is intentionally public

## Seed Data
- 3 stores, 6 categories, 20+ products across categories
- Products have varied stock levels (some below threshold for low-stock alerts)
*/ 

-- Stores
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON stores TO anon, authenticated;

DROP POLICY IF EXISTS "stores_select" ON stores;
CREATE POLICY "stores_select" ON stores FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "stores_insert" ON stores;
CREATE POLICY "stores_insert" ON stores FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "stores_update" ON stores;
CREATE POLICY "stores_update" ON stores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "stores_delete" ON stores;
CREATE POLICY "stores_delete" ON stores FOR DELETE TO anon, authenticated USING (true);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon, authenticated;

DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_insert" ON categories;
CREATE POLICY "categories_insert" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categories_update" ON categories;
CREATE POLICY "categories_update" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "categories_delete" ON categories;
CREATE POLICY "categories_delete" ON categories FOR DELETE TO anon, authenticated USING (true);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  barcode text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  unit text NOT NULL DEFAULT 'Pcs',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO anon, authenticated;

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE TO anon, authenticated USING (true);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  customer_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'paid',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO anon, authenticated;

DROP POLICY IF EXISTS "sales_select" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sales_insert" ON sales;
CREATE POLICY "sales_insert" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sales_update" ON sales;
CREATE POLICY "sales_update" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sales_delete" ON sales;
CREATE POLICY "sales_delete" ON sales FOR DELETE TO anon, authenticated USING (true);

-- Sale items
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sale_items TO anon, authenticated;

DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sale_items_update" ON sale_items;
CREATE POLICY "sale_items_update" ON sale_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sale_items_delete" ON sale_items;
CREATE POLICY "sale_items_delete" ON sale_items FOR DELETE TO anon, authenticated USING (true);

-- ============ SEED DATA ============

-- Stores
INSERT INTO stores (name, address) VALUES
  ('Freshmart', '123 Main Street, Downtown'),
  ('Downtown Store', '456 Central Ave, Downtown'),
  ('Westside Branch', '789 West Blvd, Westside')
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Electronic devices and gadgets'),
  ('Groceries', 'Food and household items'),
  ('Beverages', 'Drinks and beverages'),
  ('Personal Care', 'Health and beauty products'),
  ('Snacks', 'Chips, cookies, and packaged snacks'),
  ('Household', 'Cleaning and home supplies')
ON CONFLICT DO NOTHING;

-- Products (using subqueries for category and store FKs)
INSERT INTO products (name, sku, barcode, category_id, store_id, price, cost, stock_quantity, low_stock_threshold, unit) VALUES
  -- Electronics
  ('Apple iPhone 15', 'ELC-001', '8901234567890', (SELECT id FROM categories WHERE name='Electronics'), (SELECT id FROM stores WHERE name='Freshmart'), 999.00, 750.00, 4, 5, 'Pcs'),
  ('Samsung Galaxy S24', 'ELC-002', '8901234567891', (SELECT id FROM categories WHERE name='Electronics'), (SELECT id FROM stores WHERE name='Freshmart'), 899.00, 680.00, 15, 5, 'Pcs'),
  ('Sony Wireless Headphones', 'ELC-003', '8901234567892', (SELECT id FROM categories WHERE name='Electronics'), (SELECT id FROM stores WHERE name='Freshmart'), 199.00, 120.00, 30, 5, 'Pcs'),
  ('Apple Watch Series 9', 'ELC-004', '8901234567893', (SELECT id FROM categories WHERE name='Electronics'), (SELECT id FROM stores WHERE name='Freshmart'), 399.00, 300.00, 12, 5, 'Pcs'),
  ('USB-C Charger 20W', 'ELC-005', '8901234567894', (SELECT id FROM categories WHERE name='Electronics'), (SELECT id FROM stores WHERE name='Freshmart'), 25.00, 8.00, 100, 10, 'Pcs'),
  -- Groceries
  ('Whole Milk 1L', 'GRO-001', '8902234567890', (SELECT id FROM categories WHERE name='Groceries'), (SELECT id FROM stores WHERE name='Freshmart'), 2.50, 1.80, 80, 20, 'Pcs'),
  ('Brown Bread', 'GRO-002', '8902234567891', (SELECT id FROM categories WHERE name='Groceries'), (SELECT id FROM stores WHERE name='Freshmart'), 3.00, 1.50, 40, 15, 'Pcs'),
  ('Free Range Eggs (12pk)', 'GRO-003', '8902234567892', (SELECT id FROM categories WHERE name='Groceries'), (SELECT id FROM stores WHERE name='Freshmart'), 4.50, 3.00, 50, 15, 'Box'),
  ('Basmati Rice 5kg', 'GRO-004', '8902234567893', (SELECT id FROM categories WHERE name='Groceries'), (SELECT id FROM stores WHERE name='Freshmart'), 12.00, 8.00, 25, 10, 'Pcs'),
  ('Cooking Oil 2L', 'GRO-005', '8902234567894', (SELECT id FROM categories WHERE name='Groceries'), (SELECT id FROM stores WHERE name='Freshmart'), 8.50, 6.00, 3, 10, 'Pcs'),
  -- Beverages
  ('Coca Cola 500ml', 'BEV-001', '8903234567890', (SELECT id FROM categories WHERE name='Beverages'), (SELECT id FROM stores WHERE name='Freshmart'), 1.50, 0.80, 200, 50, 'Pcs'),
  ('Orange Juice 1L', 'BEV-002', '8903234567891', (SELECT id FROM categories WHERE name='Beverages'), (SELECT id FROM stores WHERE name='Freshmart'), 3.50, 2.20, 60, 20, 'Pcs'),
  ('Mineral Water 1.5L', 'BEV-003', '8903234567892', (SELECT id FROM categories WHERE name='Beverages'), (SELECT id FROM stores WHERE name='Freshmart'), 1.20, 0.50, 150, 50, 'Pcs'),
  ('Green Tea 50bags', 'BEV-004', '8903234567893', (SELECT id FROM categories WHERE name='Beverages'), (SELECT id FROM stores WHERE name='Freshmart'), 5.00, 3.00, 35, 10, 'Box'),
  -- Personal Care
  ('Toothpaste Mint', 'PER-001', '8904234567890', (SELECT id FROM categories WHERE name='Personal Care'), (SELECT id FROM stores WHERE name='Freshmart'), 3.20, 1.50, 70, 20, 'Pcs'),
  ('Shampoo 400ml', 'PER-002', '8904234567891', (SELECT id FROM categories WHERE name='Personal Care'), (SELECT id FROM stores WHERE name='Freshmart'), 6.50, 3.50, 45, 15, 'Pcs'),
  ('Hand Soap 500ml', 'PER-003', '8904234567892', (SELECT id FROM categories WHERE name='Personal Care'), (SELECT id FROM stores WHERE name='Freshmart'), 4.00, 2.00, 2, 15, 'Pcs'),
  -- Snacks
  ('Potato Chips 150g', 'SNK-001', '8905234567890', (SELECT id FROM categories WHERE name='Snacks'), (SELECT id FROM stores WHERE name='Freshmart'), 2.20, 1.00, 120, 30, 'Pcs'),
  ('Chocolate Bar 100g', 'SNK-002', '8905234567891', (SELECT id FROM categories WHERE name='Snacks'), (SELECT id FROM stores WHERE name='Freshmart'), 1.80, 0.70, 90, 30, 'Pcs'),
  ('Mixed Nuts 200g', 'SNK-003', '8905234567892', (SELECT id FROM categories WHERE name='Snacks'), (SELECT id FROM stores WHERE name='Freshmart'), 4.80, 2.50, 55, 15, 'Pcs'),
  -- Household
  ('Dish Soap 750ml', 'HOU-001', '8906234567890', (SELECT id FROM categories WHERE name='Household'), (SELECT id FROM stores WHERE name='Freshmart'), 3.50, 1.80, 65, 20, 'Pcs'),
  ('Laundry Detergent 2kg', 'HOU-002', '8906234567891', (SELECT id FROM categories WHERE name='Household'), (SELECT id FROM stores WHERE name='Freshmart'), 9.00, 5.50, 28, 10, 'Pcs'),
  ('Paper Towels 6pk', 'HOU-003', '8906234567892', (SELECT id FROM categories WHERE name='Household'), (SELECT id FROM stores WHERE name='Freshmart'), 7.50, 4.00, 40, 15, 'Pcs')
ON CONFLICT (sku) DO NOTHING;
