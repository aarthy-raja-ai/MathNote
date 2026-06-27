// Unified Supabase Database SQL Schema for MathNote
export const SQL_SCHEMA = `-- MathNote Unified Supabase Database Setup Script

-- 1. Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date DATE,
  "customerName" TEXT,
  "customerState" TEXT,
  "customerAddress" TEXT,
  "customerGSTIN" TEXT,
  "customerPhone" TEXT,
  "totalAmount" NUMERIC,
  "paidAmount" NUMERIC,
  "paymentMethod" TEXT,
  note TEXT,
  items JSONB,
  "invoiceNumber" TEXT,
  subtotal NUMERIC,
  "discountTotal" NUMERIC,
  "discountType" TEXT,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "taxMode" TEXT,
  "returnIds" JSONB,
  "linkedCreditId" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT,
  brand TEXT,
  sku TEXT,
  barcode TEXT,
  "hsnCode" TEXT,
  category TEXT,
  price NUMERIC,
  "costPrice" NUMERIC,
  stock NUMERIC,
  unit TEXT,
  "lowStockThreshold" NUMERIC,
  "taxRate" NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  gstin TEXT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date DATE,
  category TEXT,
  amount NUMERIC,
  note TEXT,
  "vendorName" TEXT,
  "vendorId" TEXT,
  "paymentMethod" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Credits Table
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  party TEXT,
  type TEXT,
  amount NUMERIC,
  "paidAmount" NUMERIC,
  status TEXT,
  date DATE,
  "dueDate" DATE,
  note TEXT,
  "linkedSaleId" TEXT,
  "linkedPurchaseId" TEXT,
  payments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  "saleId" TEXT,
  date DATE,
  party TEXT,
  amount NUMERIC,
  note TEXT,
  items JSONB,
  "linkedCreditId" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  date DATE,
  "vendorName" TEXT,
  "vendorState" TEXT,
  "totalAmount" NUMERIC,
  "paidAmount" NUMERIC,
  "paymentMethod" TEXT,
  note TEXT,
  items JSONB,
  "linkedExpenseId" TEXT,
  "linkedCreditId" TEXT,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  date DATE,
  "quotationNumber" TEXT,
  "customerName" TEXT,
  "customerState" TEXT,
  "customerAddress" TEXT,
  "customerGSTIN" TEXT,
  "customerPhone" TEXT,
  items JSONB,
  subtotal NUMERIC,
  "discountTotal" NUMERIC,
  "discountType" TEXT,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "taxMode" TEXT,
  "grandTotal" NUMERIC,
  "validUntil" DATE,
  terms TEXT,
  status TEXT,
  "convertedSaleId" TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  date DATE,
  "poNumber" TEXT,
  "vendorName" TEXT,
  "vendorState" TEXT,
  items JSONB,
  subtotal NUMERIC,
  "taxTotal" NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  igst NUMERIC,
  "gstRate" NUMERIC,
  "grandTotal" NUMERIC,
  "expectedDate" DATE,
  status TEXT,
  "convertedPurchaseId" TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  "staffId" TEXT,
  "staffName" TEXT,
  date DATE,
  status TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Users Table (Auth credentials)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  password TEXT,
  pin TEXT,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Business Profile Table
CREATE TABLE IF NOT EXISTS business_profile (
  id TEXT PRIMARY KEY,
  "businessName" TEXT,
  "ownerName" TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  gstin TEXT,
  "panNumber" TEXT,
  category TEXT,
  "taxType" TEXT,
  "logoBase64" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE REALTIME REPLICATION FOR ALL TABLES (using safe DO block to prevent errors if already added)
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY['sales', 'products', 'contacts', 'expenses', 'credits', 'returns', 'purchases', 'quotations', 'purchase_orders', 'attendance', 'users', 'business_profile'];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END
$$;


-- DISABLE ROW LEVEL SECURITY FOR ALL TABLES (Recommended for testing/simplicity)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile DISABLE ROW LEVEL SECURITY;
`;

