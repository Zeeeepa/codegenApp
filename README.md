# Codegen App - Agent Run Manager

A React-based web application for managing and resuming Codegen agent runs with integrated API server.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Codegen API token
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   This will start:
   - API server on http://localhost:3001
   - React frontend on http://localhost:8080

## 📁 Project Structure

```
codegenApp/
├── src/                    # React frontend source
├── api/                    # Integrated API server
│   ├── server.js          # Main server file
│   ├── automation-service.js
│   ├── health-monitor.js
│   └── ...
├── public/                # Static assets
├── package.json           # Dependencies and scripts
└── .env.example          # Environment configuration template
```

## 🛠 Available Scripts

- `npm run dev` - Start both API server and frontend in development mode
- `npm run api:start` - Start API server only (production)
- `npm run api:dev` - Start API server with nodemon (development)
- `npm start` - Start React frontend only
- `npm run build` - Build React app for production
- `npm run health-check` - Check if API server is running

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required: Your Codegen API token
REACT_APP_API_TOKEN=your_api_token_here

# API server configuration
PORT=3001
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=http://localhost:8080
```

### API Endpoints

The integrated API server provides:

- `GET /health` - Health check endpoint
- `POST /api/resume-agent-run` - Resume agent run functionality
- `POST /api/test-automation` - Test automation features
- `GET /api/auth-script` - Authentication script
- `ALL /api/v1/*` - Codegen API proxy (avoids CORS issues)

## 🔍 Features

- **Agent Run Management**: Resume and monitor Codegen agent runs
- **Real-time Status**: Live updates on agent run progress
- **Authentication**: Secure token-based authentication
- **CORS-free API Access**: Integrated proxy server eliminates CORS issues
- **Health Monitoring**: Built-in health checks and metrics
- **Responsive UI**: Modern React interface with Tailwind CSS

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to backend automation service"**
   - Ensure API server is running: `npm run api:start`
   - Check health endpoint: `curl http://localhost:3001/health`

2. **CORS errors**
   - Use the integrated API server (default setup)
   - Ensure `REACT_APP_API_BASE_URL=http://localhost:3001/api`

3. **Chrome/Puppeteer issues**
   - Chrome is automatically installed during `npm install`
   - If issues persist, try: `npx puppeteer browsers install chrome`

### Development Tips

- Use `npm run dev:safe` to check health before starting
- Check logs in the terminal for detailed error information
- API server logs include request/response details for debugging

## 📦 Dependencies

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- React Hot Toast for notifications

### Backend
- Express.js server
- Puppeteer for browser automation
- Winston for logging
- CORS and security middleware

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

