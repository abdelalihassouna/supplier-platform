# Supplier Certification Management Platform

A comprehensive B2B platform for automated supplier certification and compliance management with Italian regulatory requirements (DURC, SOA, ISO certifications, White List).

## 🚀 Features

### Core Functionality
- **Supplier Management** - Advanced data tables with filtering, search, and bulk operations
- **Document Verification** - Automated verification workflows with manual review capabilities
- **Jaggaer Integration** - Real-time supplier data synchronization from Jaggaer procurement platform
- **Italian Compliance** - DURC, SOA, ISO 9001/14001/45001, White List verification
- **Document Processing** - OCR extraction using Mistral AI for CCIAA, DURC, ISO, SOA, VISURA documents
- **Analytics Dashboard** - Executive KPIs, compliance monitoring, and performance metrics
- **Workflow Management** - Task assignment, approval processes, and notification system
- **Project Tracking** - Q1 audit and ISO migration project management

### Technical Features
- **Authentication** - Supabase-based user management with role-based access
- **Database Support** - Both Supabase and local PostgreSQL options
- **File Storage** - Vercel Blob integration for document storage
- **Dark Mode** - Beautiful dark/light theme switching
- **Real-time Sync** - Live data synchronization with external systems
- **Export Functionality** - CSV/Excel data export capabilities

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ (if using local database)
- Supabase account (if using Supabase)
- Vercel account (for Blob storage)
- Mistral AI API key (for document OCR)
- Jaggaer API credentials (for supplier data)

## 🛠️ Installation

### 1. Clone the Repository
\`\`\`bash
git clone <repository-url>
cd supplier-platform
npm install
\`\`\`

### 2. Environment Variables
Create a `.env.local` file with the following variables:

#### Database Configuration (Choose one)

**Option A: Supabase (Recommended)**
\`\`\`env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Authentication Redirects
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
\`\`\`

**Option B: Local PostgreSQL**
\`\`\`env
# PostgreSQL Configuration
USE_POSTGRESQL=true
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=supplier_platform
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_URL=postgresql://username:password@localhost:5432/supplier_platform
\`\`\`

#### External Integrations
\`\`\`env
# Jaggaer Integration
JAGGAER_BASE_URL=your_jaggaer_api_url
JAGGAER_CLIENT_ID=your_jaggaer_client_id
JAGGAER_CLIENT_SECRET=your_jaggaer_client_secret

# Mistral OCR
MISTRAL_API_KEY=97ZQlsV45YrDusgZRwjArWGbh3nerFPb
MISTRAL_MODEL=mistral-large-latest
MISTRAL_MAX_TOKENS=4000

# File Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
\`\`\`

### 3. Database Setup

#### Option A: Supabase Setup
1. Create a new Supabase project
2. Run the database migration:
\`\`\`bash
npm run db:migrate
\`\`\`

#### Option B: Local PostgreSQL Setup
1. Install PostgreSQL locally
2. Create the database:
\`\`\`bash
createdb supplier_platform
\`\`\`
3. Run the migration scripts:
\`\`\`bash
psql -d supplier_platform -f scripts/postgresql_migration.sql
psql -d supplier_platform -f scripts/02_add_missing_tables.sql
psql -d supplier_platform -f scripts/03_add_document_extraction_tables.sql
\`\`\`

### 4. Run the Application
\`\`\`bash
# Development mode
npm run dev

# Production build
npm run build
npm start
\`\`\`

The application will be available at `http://localhost:3000`

## 🐳 Docker Setup

### Build and Run with Docker
\`\`\`bash
# Build the Docker image
docker build -t supplier-platform .

# Run the container
docker run -p 3000:3000 --env-file .env.local supplier-platform
\`\`\`

### Docker Compose (with PostgreSQL)
\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

### Supplier Management
- `GET /api/suppliers` - List suppliers with pagination and filtering
- `GET /api/suppliers/[id]/details` - Get detailed supplier information
- `POST /api/suppliers/sync` - Trigger supplier data synchronization
- `GET /api/suppliers/sync/status` - Get synchronization status

### Document Processing
- `POST /api/documents/upload` - Upload documents for processing
- `POST /api/documents/extract` - Extract data from uploaded documents
- `GET /api/jaggaer/download` - Download documents from Jaggaer

### System Management
- `GET /api/health` - Health check endpoint
- `POST /api/settings/mistral` - Configure Mistral OCR settings
- `GET /api/connections/test-jaggaer` - Test Jaggaer connectivity

## 🔧 Configuration

### User Settings
Access the settings page at `/settings` to configure:
- **General** - User preferences and notifications
- **Integrations** - Jaggaer, Mistral OCR, and Italian Government APIs
- **Appearance** - Dark/light mode and theme preferences
- **Security** - Password and authentication settings

### System Administration
- **Database Management** - Switch between Supabase and PostgreSQL
- **Integration Status** - Monitor external service connections
- **Performance Monitoring** - View system health and metrics

## 🚀 Deployment

### Vercel Deployment (Recommended)
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

### Docker Deployment
\`\`\`bash
# Build and push to registry
docker build -t your-registry/supplier-platform .
docker push your-registry/supplier-platform

# Deploy to your container platform
docker run -d -p 3000:3000 --env-file .env your-registry/supplier-platform
\`\`\`

## 🔍 Troubleshooting

### Common Issues

**Database Connection Issues**
- Verify environment variables are correctly set
- Check database server is running and accessible
- Ensure database migrations have been run

**Jaggaer Integration Issues**
- Verify API credentials in settings
- Check network connectivity to Jaggaer servers
- Review API rate limits and quotas

**Document Processing Issues**
- Ensure Mistral API key is valid and has sufficient credits
- Check file upload size limits (max 10MB)
- Verify supported document formats (PDF, JPG, PNG)

**Authentication Issues**
- Clear browser cookies and local storage
- Verify Supabase configuration
- Check redirect URLs match your domain

### Debug Mode
Enable debug logging by setting:
\`\`\`env
NODE_ENV=development
DEBUG=true
\`\`\`

### Health Check
Visit `/api/health` to check system status and integration connectivity.

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For technical support or questions:
- Check the troubleshooting section above
- Review API documentation
- Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: January 2025
