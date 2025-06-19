# 🚀 CodegenApp Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env
```

### 3. Get Your Codegen API Token
1. Visit [https://app.codegen.com/settings](https://app.codegen.com/settings)
2. Generate or copy your API token
3. Update `.env` file:
```bash
REACT_APP_API_TOKEN=your_actual_api_token_here
```

### 4. Start the Application
```bash
# Start both frontend and backend servers
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:8000
- **Backend**: http://localhost:8001
- **Health Check**: http://localhost:8001/health

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `REACT_APP_API_TOKEN` | ✅ **Yes** | Your Codegen API token | - |
| `REACT_APP_API_BASE_URL` | No | API base URL | `http://localhost:8001/api` |
| `REACT_APP_DEFAULT_ORGANIZATION` | No | Default organization ID | - |
| `REACT_APP_USER_ID` | No | Your user ID | - |
| `REACT_APP_DEMO_MODE` | No | Enable demo mode | `false` |

### Backend Configuration (server/.env)

The backend server also needs configuration:
```bash
PORT=8001
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=http://localhost:8000
```

## 🐛 Troubleshooting

### "Failed to fetch" Error

If you see `TypeError: Failed to fetch` errors:

1. **Check if backend server is running**:
   ```bash
   curl http://localhost:8001/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Verify your API token**:
   - Make sure `REACT_APP_API_TOKEN` is set in `.env`
   - Verify the token is valid at [https://app.codegen.com/settings](https://app.codegen.com/settings)

3. **Check API base URL**:
   - Development: `http://localhost:8001/api`
   - Production: `https://api.codegen.com`

4. **Restart the servers**:
   ```bash
   # Kill existing processes
   pkill -f node
   
   # Start fresh
   npm run dev
   ```

### TypeScript Errors

If you encounter TypeScript compilation errors:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run type checking
npm run type-check
```

### Port Conflicts

If ports 8000 or 8001 are in use:
1. Kill existing processes: `pkill -f node`
2. Or change ports in configuration files

## 📁 Project Structure

```
codegenApp/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── utils/             # Utility functions
│   ├── api/               # API types and constants
│   └── storage/           # Local storage utilities
├── server/                # Backend proxy server
│   ├── index.js           # Express server
│   ├── package.json       # Backend dependencies
│   └── .env               # Backend configuration
├── .env                   # Frontend environment variables
├── .env.example           # Environment template
└── package.json           # Frontend dependencies
```

## 🔄 Development Workflow

1. **Start development servers**:
   ```bash
   npm run dev
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Type checking**:
   ```bash
   npm run type-check
   ```

## 🌐 API Integration

The app uses a proxy server to avoid CORS issues:
- **Frontend** (port 8000) → **Backend Proxy** (port 8001) → **Codegen API**

This setup allows secure API communication without exposing your API token to the browser.

## 🎯 Next Steps

1. Configure your API token in `.env`
2. Start the development servers with `npm run dev`
3. Open http://localhost:8000 in your browser
4. The app should load your Codegen data automatically!

## 🆘 Need Help?

- Check the browser console for detailed error messages
- Verify all environment variables are set correctly
- Ensure both frontend and backend servers are running
- Test the backend health endpoint: http://localhost:8001/health
