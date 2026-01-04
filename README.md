# 🏠 Rentverse API - TypeScript + Drizzle ORM

Modern property rental management API built with **TypeScript**, **Drizzle ORM**, and **Supabase**.

## ✨ Features

- 🔐 **JWT Authentication** - Secure user authentication
- 🏠 **Property Management** - CRUD operations for properties
- 📱 **File Upload** - Supabase storage integration
- 🏷️ **Property Types & Amenities** - Categorization system
- 👥 **User Management** - Role-based access control
- 🔍 **Advanced Search** - Filter properties by various criteria
- 📊 **Type Safety** - Full TypeScript support
- 🚀 **High Performance** - Lightweight Drizzle ORM

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Supabase Storage
- **Authentication**: JWT
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account

### Installation

```bash
# Clone repository
git clone <repository-url>
cd rentverse-core-service

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Update .env with your database and Supabase credentials

# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Supabase Storage
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_BUCKET="rentverse-uploads"

# Server
PORT=3000
NODE_ENV=development
```

## 📚 API Endpoints

> **📋 Complete endpoint documentation available in Swagger UI when running the server**

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Users
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users` - Get all users (Admin only)

### Properties
- `GET /api/v1/properties` - Get all properties
- `GET /api/v1/properties/:id` - Get property by ID
- `POST /api/v1/properties` - Create new property
- `PUT /api/v1/properties/:id` - Update property
- `DELETE /api/v1/properties/:id` - Delete property

### Property Types
- `GET /api/v1/property-types` - Get all property types
- `POST /api/v1/property-types` - Create property type (Admin)

### Amenities
- `GET /api/v1/amenities` - Get all amenities
- `POST /api/v1/amenities` - Create amenity (Admin)

### File Upload
- `POST /api/v1/upload/single` - Upload single file
- `POST /api/v1/upload/multiple` - Upload multiple files
- `DELETE /api/v1/upload/delete` - Delete file

### Mobile API
All mobile endpoints are prefixed with `/api/v1/m/` and include:
- Authentication endpoints
- Property browsing and interactions
- User management
- File uploads
- Bookings management

### 🚧 New Endpoints (Untested)
**See [NEW_ENDPOINTS.md](./NEW_ENDPOINTS.md) for recently added endpoints that require testing.**

## 🏗️ Project Structure

```
src/
├── config/
│   ├── database.ts          # Database connection
│   └── storage.ts           # Supabase storage config
├── db/
│   ├── schema/
│   │   └── index.ts         # Database schema
│   └── index.ts             # Database exports
├── middleware/
│   └── auth.ts              # Authentication middleware
├── modules/
│   ├── properties/          # Property management
│   ├── users/               # User management
│   ├── amenities/           # Amenities management
│   └── propertyTypes/       # Property types management
├── routes/
│   ├── auth.ts              # Auth routes
│   ├── users.ts             # User routes
│   └── upload.ts            # Upload routes
├── types/
│   └── index.ts             # TypeScript types
├── utils/
│   └── fileUpload.ts        # File upload utilities
└── index.ts                 # Main server file
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -f Dockerfile.simple -t rentverse-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e SUPABASE_URL="your_supabase_url" \
  -e SUPABASE_ANON_KEY="your_key" \
  rentverse-api
```

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript and generate schema
- `npm start` - Start production server
- `npm run db:generate` - Generate Drizzle schema
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔧 Development

### Database Schema Changes

1. Update schema in `src/db/schema/index.ts`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`

### Adding New Endpoints

1. Create controller in `src/modules/[module]/[module].controller.ts`
2. Create routes in `src/modules/[module]/[module].routes.ts`
3. Add route to main app in `src/index.ts`

## 🚀 Deployment

The application can be deployed to any platform that supports Node.js:

- **Koyeb** - Recommended for easy deployment
- **Railway** - Great for development
- **Render** - Free tier available
- **Vercel** - Serverless deployment
- **AWS/GCP/Azure** - Enterprise deployment

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request
