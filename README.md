# Pet Sales & Adoption Backend

A Node.js Express backend for a Pet Sales and Adoption application. Built with Firebase Auth for authentication, Supabase for PostgreSQL database management, and Razorpay for payment processing.

## 🚀 Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- Firebase Project (for Auth)
- Supabase Project (for Postgres Database)
- Razorpay Account (for Payments)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Fill in all the required variables inside `.env`. Check the comments inside the file for instructions on where to get each key.

### 4. Database Setup
Execute the SQL provided in `schema.sql` in your Supabase SQL editor. This sets up all tables (`users`, `pets`, `orders`, `adoption_requests`) and their relationships, indexes, and constraints.

### 5. Running Locally
Run the development server using nodemon:
```bash
npm run dev
```
Start the production server:
```bash
npm start
```

---

## 🔐 Authentication
All protected routes expect a Bearer token in the Authorization header provided by Firebase Auth.
```
Authorization: Bearer <YOUR_FIREBASE_ID_TOKEN>
```
The server will automatically map your Firebase user to a Supabase record on the first successful request.

---

## 🌐 Endpoints

### 🧑‍💻 Users
- **POST** `/api/users/sync`
  - **Auth**: Protected
  - **Description**: Upserts the logged-in user's profile from Firebase.
  - **Body**: None
  - **Response**: The synced Supabase user object.

- **GET** `/api/users/me`
  - **Auth**: Protected
  - **Description**: Fetch the current user's profile.
  - **Response**: The Supabase user object.

- **PATCH** `/api/users/me`
  - **Auth**: Protected
  - **Description**: Updates user profile info.
  - **Body**: `{ name?: string, phone?: string, role?: "buyer" | "seller" | "admin" }`
  - **Response**: Updated user object.

### 🐾 Pets
- **GET** `/api/pets`
  - **Auth**: Public
  - **Description**: Fetch pet listings. Supports pagination & filtering.
  - **Query Params**: `species`, `breed`, `listing_type`, `status`, `min_price`, `max_price`, `page`, `limit`
  - **Response**: `{ data: [...], count: number, page, limit }`

- **GET** `/api/pets/:id`
  - **Auth**: Public
  - **Description**: Fetch a single pet by ID (includes seller details).
  
- **GET** `/api/pets/mine`
  - **Auth**: Protected (Seller)
  - **Description**: Fetch listings created by the logged-in user.

- **POST** `/api/pets`
  - **Auth**: Protected (Seller/Admin)
  - **Description**: Create a new pet listing.
  - **Body**: `{ name*, species*, breed, age, gender, price, description, image_urls, listing_type* }`
  
- **PATCH** `/api/pets/:id`
  - **Auth**: Protected (Owner/Admin)
  - **Description**: Update a pet listing.
  - **Body**: `{ ...any pet fields }`
  
- **DELETE** `/api/pets/:id`
  - **Auth**: Protected (Owner/Admin)
  - **Description**: Delete a pet listing.

### 🏠 Adoptions
- **POST** `/api/adoptions/:petId`
  - **Auth**: Protected
  - **Description**: Request to adopt a pet.
  - **Body**: `{ message?: string }`
  
- **GET** `/api/adoptions/incoming`
  - **Auth**: Protected (Seller/Admin)
  - **Description**: See adoption requests for pets owned by the current user.
  
- **GET** `/api/adoptions/mine`
  - **Auth**: Protected
  - **Description**: See adoption requests initiated by the current user.

- **PATCH** `/api/adoptions/:id`
  - **Auth**: Protected (Seller/Admin)
  - **Description**: Approve or reject an adoption request.
  - **Body**: `{ status: "approved" | "rejected" }`

### 💳 Payments
- **POST** `/api/payments/order`
  - **Auth**: Protected
  - **Description**: Create a Razorpay order for purchasing a pet.
  - **Body**: `{ petId*: uuid }`
  - **Response**: `{ order, razorpayOrder, key_id }`
  
- **POST** `/api/payments/verify`
  - **Auth**: Protected
  - **Description**: Verify successful payment on the frontend.
  - **Body**: `{ razorpay_order_id*, razorpay_payment_id*, razorpay_signature* }`
  
- **POST** `/api/payments/webhook`
  - **Auth**: Public (HMAC Verified)
  - **Description**: Razorpay async webhook endpoint. Matches signature and fulfills order.
