-- Enable the necessary extension for UUID generation (usually active by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  role VARCHAR CHECK (role IN ('buyer', 'seller', 'admin')) DEFAULT 'buyer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on users
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_role ON users(role);

-- 2. PETS TABLE
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  species VARCHAR NOT NULL,
  breed VARCHAR,
  age INTEGER,
  gender VARCHAR,
  price DECIMAL(10, 2),
  description TEXT,
  image_urls TEXT[],
  listing_type VARCHAR CHECK (listing_type IN ('sale', 'adoption')) NOT NULL,
  status VARCHAR CHECK (status IN ('available', 'pending', 'sold', 'adopted')) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on pets
CREATE INDEX idx_pets_seller_id ON pets(seller_id);
CREATE INDEX idx_pets_status ON pets(status);
CREATE INDEX idx_pets_listing_type ON pets(listing_type);

-- 3. ORDERS TABLE
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR CHECK (status IN ('created', 'paid', 'failed')) DEFAULT 'created',
  razorpay_order_id VARCHAR,
  razorpay_payment_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on orders
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_pet_id ON orders(pet_id);
CREATE INDEX idx_orders_status ON orders(status);

-- 4. ADOPTION_REQUESTS TABLE
CREATE TABLE adoption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes on adoption_requests
CREATE INDEX idx_adoption_requests_requester_id ON adoption_requests(requester_id);
CREATE INDEX idx_adoption_requests_pet_id ON adoption_requests(pet_id);
CREATE INDEX idx_adoption_requests_status ON adoption_requests(status);
