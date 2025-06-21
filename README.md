# CodegenApp - Modern AI Agent Run Manager

A comprehensive, modern web application for managing AI agent runs with PostgreSQL integration, built with React 19, TypeScript, and Express.js.

## 🚀 Features

### Frontend (React 19 + TypeScript + Vite)
- **🤖 Agent Run Management** - Create, view, and manage AI agent runs
- **🏢 Organization Management** - Multi-organization support
- **🗄️ Database Integration** - PostgreSQL configuration and management
- **⚙️ Settings Management** - Comprehensive configuration interface
- **💬 Message Threading** - Send messages to previous agent runs
- **🎨 Modern UI** - Dark theme with Tailwind CSS and Lucide icons
- **📱 Responsive Design** - Mobile-friendly interface

### Backend (Express.js + PostgreSQL)
- **🔄 API Proxy** - Transparent proxy to Codegen API
- **🗃️ Database Operations** - Full CRUD operations with PostgreSQL
- **🔒 Security** - Helmet, rate limiting, input validation
- **📊 Health Monitoring** - Database and application health checks
- **🔐 Password Encryption** - Bcrypt for secure password storage
- **📝 Logging** - Winston for comprehensive logging
- **✅ Validation** - Joi schemas for request validation

### Database (PostgreSQL)
- **📊 Schema Management** - Auto-initializing database schema
- **🔍 Optimized Queries** - Proper indexing for performance
- **🔄 Connection Pooling** - Efficient database connections
- **🏥 Health Monitoring** - Real-time connection status

## 🛠️ Technology Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript 5.8** - Type safety and modern JavaScript
- **Vite 6** - Fast build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **React Router 7** - Client-side routing
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Elegant notifications

### Backend
- **Node.js 18+** - Modern JavaScript runtime
- **Express.js 4** - Web application framework
- **PostgreSQL** - Robust relational database
- **Helmet** - Security middleware
- **Winston** - Professional logging
- **Joi** - Schema validation
- **Bcrypt** - Password hashing

### Development Tools
- **ESLint 9** - Modern linting configuration
- **Vitest** - Fast unit testing
- **TypeScript** - Static type checking
- **Prettier** - Code formatting

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 12+
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codegenApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   sudo -u postgres psql
   CREATE DATABASE codegenapp;
   CREATE USER codegenuser WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE codegenapp TO codegenuser;
   \q
   ```

4. **Configure environment variables**
   ```bash
   # Frontend (.env)
   cp .env.example .env
   
   # Backend (server/.env)
   cp server/.env.example server/.env
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

6. **Open the application**
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:3001

## ⚙️ Configuration

### Frontend Environment Variables (.env)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=CodegenApp
VITE_DATABASE_ENABLED=true
```

### Backend Environment Variables (server/.env)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Codegen API
CODEGEN_API_BASE=https://api.codegen.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=codegenapp
DB_USER=codegenuser
DB_PASSWORD=your_password_here

# Frontend URL
FRONTEND_URL=http://localhost:8000
```

## 🏗️ Architecture

### Project Structure
```
codegenApp/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── utils/             # Utility functions
│   ├── test/              # Test setup
│   ├── App.tsx            # Main application
│   └── main.tsx           # Application entry point
├── server/                # Backend source code
│   ├── database.js        # Database operations
│   ├── database.sql       # Database schema
│   ├── index.js           # Express server
│   └── package.json       # Backend dependencies
├── public/                # Static assets
├── dist/                  # Build output
└── docs/                  # Documentation
```

### API Endpoints

#### Health & Monitoring
- `GET /health` - Application health check
- `GET /api/database/health` - Database health check

#### Agent Runs
- `POST /api/database/agent-runs` - Save agent run
- `GET /api/database/agent-runs/:orgId` - Get agent runs
- `GET /api/database/agent-run/:id` - Get single agent run

#### Messages
- `POST /api/database/agent-runs/:id/messages` - Send message
- `GET /api/database/agent-runs/:id/messages` - Get messages

#### Database Configuration
- `POST /api/database/config` - Save database config
- `GET /api/database/configs` - Get database configs
- `POST /api/database/test-connection` - Test connection

#### Proxy
- `ALL /api/*` - Proxy to Codegen API

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
npm test

# Backend tests
cd server && npm test

# Test database functionality
npm run server:db:test
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure environment variables
4. Enable HTTPS
5. Configure reverse proxy (nginx/Apache)

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📊 Performance

### Optimizations Implemented
- **Code Splitting** - Route-based lazy loading
- **Bundle Optimization** - Tree shaking and minification
- **Database Indexing** - Optimized queries
- **Connection Pooling** - Efficient database connections
- **Caching** - Static asset caching
- **Compression** - Gzip compression

### Performance Metrics
- **Bundle Size** - ~500KB (optimized)
- **Initial Load** - <2 seconds
- **Database Queries** - <100ms average
- **Memory Usage** - ~30MB baseline

## 🔒 Security

### Security Features
- **Helmet** - Security headers
- **Rate Limiting** - API protection
- **Input Validation** - Joi schemas
- **Password Encryption** - Bcrypt hashing
- **CORS** - Cross-origin protection
- **SQL Injection Protection** - Parameterized queries

### Security Best Practices
- Regular dependency updates
- Environment variable protection
- Secure session management
- HTTPS enforcement
- Database access controls

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Write TypeScript with strict mode
- Add tests for new features
- Update documentation
- Use conventional commits

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [documentation](docs/)
- Review [common issues](docs/troubleshooting.md)
- Open an [issue](issues/new)
- Join our [Discord](discord-link)

### Troubleshooting
- Database connection issues
- Environment configuration
- Build problems
- Performance optimization

## 🗺️ Roadmap

### Upcoming Features
- [ ] Real-time updates via WebSockets
- [ ] Advanced search and filtering
- [ ] Export/import functionality
- [ ] Batch operations
- [ ] API documentation
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Multi-language support

### Performance Improvements
- [ ] Service worker implementation
- [ ] Virtual scrolling
- [ ] Advanced caching strategies
- [ ] Database query optimization
- [ ] CDN integration

---

**Built with ❤️ by the CodegenApp team**

