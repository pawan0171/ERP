# Operations Portal - Wholesale Management System

A full-stack wholesale operations management system with role-based access control, inventory tracking, customer management, and sales challan generation.

## 🌐 Live Deployment

**Live Application Link:** https://erp-by4z.vercel.app/  


**Status:** ✅ Live and Running

## 🚀 Features

- **Role-Based Authentication** - Admin, Sales, Warehouse, and Accounts roles
- **Customer Management (CRM)** - Track leads, contacts, and customer details
- **Inventory Management** - Product tracking with stock levels and locations
- **Sales Challans** - Create delivery challans with stock confirmation
- **Dashboard** - Overview of operations with key metrics
- **Real-time Updates** - Powered by Supabase real-time capabilities

## 🛠️ Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** - Fast build tool
- **Supabase Client** - Authentication and database
- **Lucide React** - Icons

### Backend
- **Express.js** with TypeScript
- **Prisma ORM** - Type-safe database access
- **Supabase** - PostgreSQL database
- **JWT** - Authentication tokens

## 📁 Project Structure

```
project-bolt-sb1-q8uzsncq/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── lib/            # Supabase client
│   │   └── styles.css      # Global styles
│   ├── .env                # Frontend environment variables (DO NOT COMMIT!)
│   └── package.json
│
├── backend/                 # Express backend API
│   ├── server/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Authentication middleware
│   │   └── utils/          # Validation, pagination, response helpers
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── .env                # Backend environment variables (DO NOT COMMIT!)
│   └── package.json
│
├── supabase-rls-policies.sql  # RLS policies for database
├── QUICK-FIX.md               # Quick troubleshooting guide
├── TROUBLESHOOTING.md         # Detailed troubleshooting
└── README.md                  # This file
```

## 🚦 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase account** - [Create one here](https://supabase.com)
- **Git** - For cloning the repository

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd project-bolt-sb1-q8uzsncq
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase-rls-policies.sql`
3. Note your project URL and keys from Settings → API

### 3. Configure Environment Variables

#### Frontend (.env in `frontend/` folder)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:4001/api
```

#### Backend (.env in `backend/` folder)

```env
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_minimum_32_characters
PORT=4001
```

### 4. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 5. Setup Database with Prisma

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 6. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs at: http://localhost:4001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:5173

### 7. Create Your First User

1. Go to http://localhost:5173
2. Click **Sign up**
3. Select a role (Admin, Sales, Warehouse, or Accounts)
4. Enter email and password
5. Sign up and log in!

## 🔒 User Roles & Permissions

| Role | Dashboard | Customers | Inventory | Challans |
|------|-----------|-----------|-----------|----------|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Sales** | ✅ | ✅ | ❌ | ✅ |
| **Warehouse** | ✅ | ❌ | ✅ | ✅ |
| **Accounts** | ✅ | ✅ | ❌ | ❌ |

## 🐛 Troubleshooting

### Data Not Saving to Database?

**Quick Fix:**
1. Open the app and click **"🔍 Debug DB"** button (top-right)
2. Press **F12** to open browser console
3. Read the error message
4. Most likely: Run `supabase-rls-policies.sql` in Supabase SQL Editor

See `QUICK-FIX.md` for detailed steps.

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 4001 already in use | Change PORT in backend/.env |
| "permission denied" errors | Run `supabase-rls-policies.sql` |
| Connection errors | Check DATABASE_URL format |
| Authentication fails | Verify SUPABASE_ANON_KEY is correct |

Full troubleshooting guide: `TROUBLESHOOTING.md`

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List customers (with pagination, search)
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Inventory
- `GET /api/inventory` - List products
- `POST /api/inventory` - Create product
- `PUT /api/inventory/:id` - Update product
- `DELETE /api/inventory/:id` - Delete product
- `POST /api/inventory/:id/adjust` - Adjust stock

### Challans
- `GET /api/challans` - List challans
- `POST /api/challans` - Create challan
- `POST /api/challans/:id/confirm` - Confirm challan (reduces stock)
- `POST /api/challans/:id/cancel` - Cancel challan

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

All endpoints (except auth) require JWT token in `Authorization: Bearer <token>` header.

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Building for Production

### Frontend Build
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend Build
```bash
cd backend
npm run build
# Output in backend/dist/
```

## 🔐 Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Use `.env.example`** - As a template for required variables
- **RLS Policies** - Always enable Row Level Security in production
- **JWT Secrets** - Use strong, random secrets (32+ characters)
- **HTTPS Only** - Use HTTPS in production for all API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: See `TROUBLESHOOTING.md` for detailed help
- **Quick Fix**: See `QUICK-FIX.md` for common issues
- **Database Issues**: Use the "🔍 Debug DB" button in the app

## 🎯 Roadmap

- [ ] Invoice generation from challans
- [ ] Payment tracking
- [ ] Multi-warehouse support
- [ ] Reports and analytics
- [ ] Export to Excel/PDF
- [ ] Email notifications
- [ ] Mobile app

## 👨‍💻 Author

Your Name - [GitHub Profile](https://github.com/pawan0171)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Prisma](https://prisma.io) - Database ORM
- [React](https://react.dev) - UI Library
- [Express](https://expressjs.com) - Backend Framework
