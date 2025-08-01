# 🚀 CodegenApp Deployment Guide

This guide provides step-by-step instructions for deploying CodegenApp in various environments.

## 📋 Prerequisites

Before deploying CodegenApp, ensure you have the following installed:

### Required Software
- **Python 3.8+** - [Download Python](https://python.org/downloads/)
- **Node.js 16+** - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download Git](https://git-scm.com/)

### Optional (for advanced features)
- **Docker** - For Grainchain sandboxing
- **Redis** - For caching and task queues (can use local or cloud)
- **PostgreSQL/MySQL** - For production database (SQLite used by default)

## 🎯 Quick Start Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

### 2. Run Automated Deployment
```bash
bash deploy.sh
```

This script will:
- ✅ Check system requirements
- ✅ Create Python virtual environment
- ✅ Install all Python dependencies
- ✅ Build the React frontend
- ✅ Create `.env` from `.env.example`
- ✅ Set up directory structure
- ✅ Verify the installation

### 3. Configure Environment Variables
```bash
nano .env
```

**Required variables to update:**
```env
CODEGEN_API_KEY=your_actual_api_key
CODEGEN_ORG_ID=your_actual_org_id
JWT_SECRET_KEY=your_secure_secret_key
```

**Optional but recommended:**
```env
GEMINI_API_KEY=your_gemini_key
GITHUB_TOKEN=your_github_token
```

### 4. Start the Application
```bash
bash start.sh
```

### 5. Access Your Application
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3001
- **API Documentation**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/health

## 🔧 Manual Deployment

If you prefer manual deployment or need to customize the process:

### 1. Python Environment Setup
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Upgrade pip
pip install --upgrade pip

# Install the package
pip install -e .
```

### 2. Frontend Build
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start the Server
```bash
source venv/bin/activate
python backend/main.py
```

## 🌐 Production Deployment

### Environment Variables for Production

```env
# Production settings
DEBUG=false
HOST=0.0.0.0
PORT=3001

# Security
JWT_SECRET_KEY=your_very_secure_secret_key_here

# Database (recommended: PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/codegenapp

# Redis (recommended: external Redis)
REDIS_URL=redis://localhost:6379/0

# SSL (if using HTTPS)
SSL_KEYFILE=/path/to/keyfile.pem
SSL_CERTFILE=/path/to/certfile.pem
```

### Using Process Managers

#### With PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'codegenapp',
    script: 'backend/main.py',
    interpreter: 'venv/bin/python',
    cwd: '/path/to/codegenapp',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### With Systemd
```bash
# Create service file
sudo tee /etc/systemd/system/codegenapp.service > /dev/null << 'EOF'
[Unit]
Description=CodegenApp Backend
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/codegenapp
Environment=PATH=/path/to/codegenapp/venv/bin
ExecStart=/path/to/codegenapp/venv/bin/python backend/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable codegenapp
sudo systemctl start codegenapp
sudo systemctl status codegenapp
```

### Reverse Proxy with Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 🐳 Docker Deployment

### Using Docker Compose
```yaml
version: '3.8'

services:
  codegenapp:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/codegenapp
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./.env:/app/.env

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: codegenapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 🔍 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3001
sudo lsof -ti:3001

# Kill the process
sudo lsof -ti:3001 | xargs kill -9
```

#### Permission Errors
```bash
# Fix script permissions
chmod +x deploy.sh start.sh

# Fix directory permissions
chmod 755 logs data uploads
```

#### Python Import Errors
```bash
# Reinstall dependencies
source venv/bin/activate
pip install -e . --force-reinstall
```

#### Frontend Build Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Logs and Debugging

#### Application Logs
```bash
# View logs
tail -f logs/app.log

# Debug mode
DEBUG=true bash start.sh
```

#### System Logs (with systemd)
```bash
# View service logs
sudo journalctl -u codegenapp -f

# View recent logs
sudo journalctl -u codegenapp --since "1 hour ago"
```

## 📊 Monitoring

### Health Checks
- **Health endpoint**: `GET /health`
- **Metrics endpoint**: `GET /metrics` (if enabled)

### Performance Monitoring
```bash
# Monitor system resources
htop

# Monitor application
pm2 monit  # if using PM2
```

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use strong `JWT_SECRET_KEY`
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Use secure database connections
- [ ] Enable CORS only for trusted origins

### Environment Variables Security
```bash
# Set proper file permissions for .env
chmod 600 .env

# Never commit .env to version control
echo ".env" >> .gitignore
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

## 🆘 Support

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review application logs
3. Verify environment configuration
4. Check system requirements
5. Create an issue on GitHub with detailed error information

---

**Happy Deploying! 🚀**

