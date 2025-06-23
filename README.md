# Codegen App with Integrated Automation Service

A React web application for managing Codegen agent runs with an integrated backend automation service for resuming agent runs.

## 🚀 Features

- **Agent Run Management**: View, filter, and manage your Codegen agent runs
- **Integrated Automation**: Resume agent runs automatically using headless browser automation
- **Real-time Status Updates**: Live polling of agent run statuses
- **Secure Authentication**: Transfers user authentication context for automation
- **Robust Error Handling**: Comprehensive logging and debug capabilities

## 🏗️ Architecture

### Frontend (React)
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Hot toast notifications
- Lucide React icons

### Backend (Express + Puppeteer)
- Express.js server with CORS support
- Puppeteer for headless browser automation
- Winston logging system
- Rate limiting for security
- API proxy for Codegen API calls

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome/Chromium (for Puppeteer)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd codegenApp
   ```

2. **Install dependencies:**
   ```bash
   # Install frontend and backend dependencies
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Copy and configure environment variables
   cp .env.example .env
   ```

   Update `.env` with your Codegen API credentials:
   ```env
   REACT_APP_API_TOKEN=your_codegen_api_token
   REACT_APP_DEFAULT_ORGANIZATION=your_org_id
   ```

## 🚀 Running the Application

### Development Mode

Start both frontend and backend simultaneously:

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001

### Individual Services

**Frontend only:**
```bash
npm start
```

**Backend only:**
```bash
npm run server:dev
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env):**
- `REACT_APP_API_TOKEN`: Your Codegen API token
- `REACT_APP_DEFAULT_ORGANIZATION`: Default organization ID
- `REACT_APP_API_BASE_URL`: Backend API URL (default: http://localhost:3001/api)
- `REACT_APP_BACKEND_URL`: Backend automation service URL (default: http://localhost:3001)

**Backend (server/.env):**
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `FRONTEND_URL`: Frontend URL for CORS
- `LOG_LEVEL`: Logging level (default: info)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window

## 🤖 Automation Service

The integrated automation service provides:

### Resume Agent Runs
- **Endpoint**: `POST /api/resume-agent-run`
- **Function**: Automatically resumes stopped/failed agent runs
- **Method**: Headless browser automation using Puppeteer
- **Authentication**: Transfers user session from frontend

### Features
- **Truly Headless**: Invisible browser automation
- **Cross-Origin Safe**: Server-side automation bypasses browser restrictions
- **Robust Element Detection**: Multiple fallback strategies for UI elements
- **Debug Support**: Automatic screenshots and detailed logging
- **Rate Limited**: Protection against abuse

### Request Format
```json
{
  "agentRunId": 12345,
  "organizationId": 323,
  "prompt": "Continue with the previous task",
  "authContext": {
    "cookies": [...],
    "localStorage": {...},
    "sessionStorage": {...}
  }
}
```

## 🐛 Debugging

### Logs
Backend logs are available in:
- `server/logs/combined.log`: All log levels
- `server/logs/error.log`: Error level only
- Console output in development mode

### Debug Screenshots
When automation fails, screenshots are saved:
- `debug-no-input.png`: Chat input not found
- `debug-no-button.png`: Send button not found
- `debug-error-{agentRunId}.png`: General errors

### Health Check
Check backend status: http://localhost:3001/health

## 📁 Project Structure

```
codegenApp/
├── src/                    # Frontend React application
│   ├── api/               # API client and types
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── storage/           # Local storage management
│   └── utils/             # Utility functions
├── server/                # Backend Express server
│   ├── index.js          # Main server file
│   ├── automation-service.js  # Puppeteer automation
│   ├── selectors.js      # UI element selectors
│   ├── auth-handler.js   # Authentication management
│   ├── logger.js         # Winston logging
│   └── logs/             # Log files
├── public/               # Static assets
└── package.json          # Project configuration
```

## 🔒 Security

- **Rate Limiting**: Prevents automation abuse
- **CORS Configuration**: Restricts cross-origin requests
- **Input Validation**: Validates all API inputs
- **Authentication Transfer**: Secure session context transfer
- **No Persistent Storage**: Authentication data not stored

## 🚀 Deployment

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm run server:start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001 8080
CMD ["npm", "run", "dev"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the logs in `server/logs/`
2. Verify environment configuration
3. Test the health endpoint
4. Review debug screenshots
5. Open an issue with detailed information

## 🔄 Migration from Separate Backend

This version integrates the automation service directly into the main server. If you were using a separate backend service:

1. Remove the separate backend directory
2. Update environment variables to point to port 3001
3. Use `npm run dev` to start both services
4. The automation endpoints are now available at the same server

The integration provides:
- ✅ Simplified deployment
- ✅ Single server to manage
- ✅ Automatic startup/shutdown
- ✅ Shared configuration
- ✅ Better resource management

