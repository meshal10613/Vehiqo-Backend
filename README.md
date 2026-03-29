# 🚗 Vehiqo — Vehicle Rental System (Backend)

Vehiqo is a robust, production-ready **Vehicle Rental System REST API** built with **Node.js**, **Express**, and **TypeScript** on top of a **PostgreSQL** database managed via **Prisma ORM**.

The system supports two roles — **Admin** and **Customer** — with a complete rental workflow covering vehicle discovery, booking, advance payment, pickup, return, and final billing. Media assets (vehicle and category images) are handled through **Cloudinary** with **Multer** for multipart upload processing. All request payloads are strictly validated using **Zod** schemas before reaching business logic.

Authentication is managed by **Better Auth** with access and refresh token rotation, email verification, and password reset flows. Role-based route guards ensure that sensitive operations — such as managing vehicles, updating fuel prices, or applying damage charges — are restricted to admins only.

The booking engine enforces a strict lifecycle: `PENDING → ADVANCE_PAID → PICKED_UP → RETURNED → COMPLETED`. Billing is calculated at return time and accounts for late fees (10% per extra day), fuel delta charges (monetary value at pickup vs. return, with surplus credited back), and manual damage charges applied by staff.

A **node-cron** scheduler runs background jobs on a fixed schedule to automate state transitions:
- **Pending booking cancellation** — bookings that remain in `PENDING` status for more than 24 hours are automatically cancelled and the associated vehicle is marked back as `AVAILABLE`.
- **Maintenance release** — vehicles placed in `MAINTENANCE` status are automatically returned to `AVAILABLE` after 24 hours, ensuring the fleet is kept up to date without manual intervention.

Fuel pricing is managed per fuel type (Petrol, Octane, Diesel, Electric, Hybrid, CNG) with units adjusted accordingly (litre, kWh, cubic metre), reflecting real-world Bangladesh Petroleum Corporation rates.

---

## 🌐 Live API

**Base URL:** [https://vehiqo-backend.vercel.app](https://vehiqo-backend.vercel.app/)

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |
| File Upload | Multer + Cloudinary |
| Auth | Better Auth (Access + Refresh Tokens) |

---

## 📁 Project Structure

```
prisma/
└── schema/
src/
├── app/
│   ├── config/
│   ├── cron/
│   ├── errorHelper/
│   ├── interface/
│   ├── lib/
│   ├── middleware/
│   ├── modules/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── fuelPrice/
│   │   ├── vehicleCategory/
│   │   ├── vehicleType/
│   │   ├── vehicle/
│   │   ├── booking/
│   │   ├── payment/
│   │   └── review/
│   ├── routes/
│   ├── shared/
│   ├── templates/
│   └── utils/
├── app.ts
└── server.ts
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vehiqo
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/meshal10613/vehiqo-backend.git
cd vehiqo-backend

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate dev

# 5. Seed the database (optional)
npx prisma db seed

# 6. Start the development server
npm run dev
```

---

## 📡 API Reference

**Base URL:** `http://localhost:5000/api/v1`

---

### 🔐 Auth — `/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/register` | Public | Register a new user |
| `POST` | `/login` | Public | Login and receive tokens |
| `GET` | `/me` | Auth | Get current user info |
| `POST` | `/change-password` | Auth | Change password |
| `PATCH` | `/update-profile` | Auth | Update profile info |
| `PATCH` | `/update-role` | Admin | Update a user's role |
| `POST` | `/verify-email` | Public | Verify email address |
| `POST` | `/forget-password` | Public | Send password reset email |
| `POST` | `/reset-password` | Public | Reset password via token |
| `DELETE` | `/delete-account/:id` | Admin | Delete Account by id |
| `POST` | `/logout` | Auth | Logout and invalidate token |

---

### 👤 Users — `/user`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/` | Admin | Get all users |


---

### 👤 Stats — `/stats`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/` | Admin / Customer | Get dashboard stats |

---

### ⛽ Fuel Prices — `/fuel-price`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Admin | Create a fuel price entry |
| `PATCH` | `/:id` | Admin | Update a fuel price |
| `GET` | `/` | Public | Get all fuel prices |

---

### 🗂️ Vehicle Categories — `/vehicle-category`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Admin | Create a vehicle category (with image) |
| `GET` | `/` | Public | Get all vehicle categories |
| `GET` | `/:id` | Public | Get a vehicle category by ID |
| `PATCH` | `/:id` | Admin | Update a vehicle category (with image) |
| `DELETE` | `/:id` | Admin | Delete a vehicle category |

---

### 🏷️ Vehicle Types — `/vehicle-type`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Admin | Create a vehicle type (with image) |
| `GET` | `/` | Public | Get all vehicle types |
| `GET` | `/:id` | Public | Get a vehicle type by ID |
| `PATCH` | `/:id` | Admin | Update a vehicle type (with image) |
| `DELETE` | `/:id` | Admin | Delete a vehicle type |

---

### 🚙 Vehicles — `/vehicle`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Admin | Create a vehicle (up to 10 images) |
| `GET` | `/` | Public | Get all vehicles |
| `GET` | `/:id` | Public | Get a vehicle by ID |
| `PATCH` | `/:id` | Admin | Update a vehicle (up to 10 images) |
| `DELETE` | `/:id` | Admin | Delete a vehicle |

---

### 📅 Bookings — `/booking`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Customer | Create a new booking |
| `GET` | `/` | Admin | Get all bookings |
| `GET` | `/my-booking` | Customer | Get current user's bookings |
| `PATCH` | `/:id` | Admin / Customer | Update a booking |

---

### 💳 Payments — `/payment`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/create-session/:bookingId` | Customer | Create a payment session |
| `POST` | `/webhook` | Customer | Handle payment webhook |
| `GET` | `/booking/:bookingId` | Admin / Customer | Get payments for a booking |
| `GET` | `/:id` | Admin / Customer | Get a payment by ID |
| `GET` | `/` | Admin | Get all payments |

---

### ⭐ Reviews — `/review`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Auth | Create a review |
| `GET` | `/` | Public | Get all reviews |
| `GET` | `/vehicle/:vehicleId` | Public | Get reviews for a vehicle |
| `GET` | `/:id` | Public | Get a review by ID |
| `PATCH` | `/:id` | Auth | Update a review |
| `DELETE` | `/:id` | Auth | Delete a review |

---

## 🔖 Booking Lifecycle

```
PENDING → ADVANCE_PAID → PICKED_UP → RETURNED → COMPLETED
```

| Status | Description |
|--------|-------------|
| `PENDING` | Booking created, awaiting payment |
| `ADVANCE_PAID` | Advance payment received |
| `PICKED_UP` | Vehicle handed over to customer |
| `RETURNED` | Vehicle returned by customer |
| `COMPLETED` | Booking finalized with full billing |

---

## 💰 Billing Rules

- **Advance payment** is fixed and collected at booking time
- **Late fee** → 10% surcharge per extra day beyond the agreed return date
- **Fuel charge** → calculated using monetary value at pickup vs. return (customer credited for surplus fuel)
- **Damage charge** → manually applied by admin post-return

---

## 🛡️ User Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full access — manage vehicles, bookings, users, pricing |
| `CUSTOMER` | Can book vehicles, make payments, and leave reviews |

---

## 📦 Scripts

```bash
npm run dev       # Start development server with hot reload
npm run build     # Compile TypeScript
npm run start     # Start production server
npm run lint      # Run ESLint
```

---

## 🔗 Links

- **GitHub:** [github.com/meshal10613](https://github.com/meshal10613)
- **Portfolio:** [syedmohiuddinmeshal.netlify.app](https://syedmohiuddinmeshal.netlify.app)
- **LinkedIn:** [linkedin.com/in/10613-meshal](https://linkedin.com/in/10613-meshal)

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).