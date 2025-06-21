# Codegen Agent Run Manager

A web application for managing Codegen agent runs, converted from a Raycast extension. This application provides a user-friendly interface to create, monitor, and manage Codegen AI agent runs.

## 🚀 Features

- **Agent Run Management**: Create and monitor AI agent runs
- **Organization Support**: Work with multiple organizations
- **Real-time Updates**: Live status updates for running agents
- **Credential Management**: Secure API token handling
- **Environment Variable Validation**: Visual status indicators for configuration
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

This application is a React-based frontend that connects directly to the Codegen API using environment variables for configuration. The application supports both development and production deployments.

## 📋 Prerequisites

- Node.js 16+ and npm
- A Codegen API token (get one from [Codegen Dashboard](https://app.codegen.com/settings))

## 🚀 Quick Start

### One-Command Launch (Recommended)
```bash
./start.sh
```
This will automatically:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Install dependencies if needed
- ✅ Set up environment files
- ✅ Start backend server (port 8001)
- ✅ Start frontend server (port 8000)
- ✅ Open browser automatically
- ✅ Handle graceful shutdown with Ctrl+C

### Alternative Launch Methods
```bash
# Using npm scripts
npm run launch              # Same as ./start.sh
npm run launch:dev          # Development mode with hot reload
npm run launch:clean        # Clean install and start

# Development mode (hot reload)
./start.sh --dev

# Clean install
./start.sh --clean

# Start without opening browser
./start.sh --no-browser
```

### Health Check
```bash
./health-check.sh
# or
npm run health
```

### Access Points
- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:8001
- **Health Check**: http://localhost:8001/health

## 🛠�� Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root with your Codegen API credentials:

```bash
# Required: Your Codegen API token
# Get it from https://app.codegen.com/settings
REACT_APP_API_TOKEN=your_api_token_here

# Optional: Your default organization ID
REACT_APP_DEFAULT_ORGANIZATION=your_org_id_here

# Optional: API Base URL (defaults to https://api.codegen.com)
REACT_APP_API_BASE_URL=https://api.codegen.com

# Optional: Your user ID for personalized features
REACT_APP_USER_ID=your_user_id_here
```

### 4. Start the development server

```bash
npm start
```

The application will be available at `http://localhost:3000` (or the next available port).

## 🔧 Development

### Available Scripts

#### Startup Scripts
- `./start.sh` - Full application startup with UI
- `./start.sh --dev` - Development mode with hot reload
- `./start.sh --clean` - Clean install and start
- `./start.sh --no-browser` - Start without opening browser
- `./start.sh --help` - Show help

#### NPM Scripts
- `npm run launch` - Launch application (same as ./start.sh)
- `npm run launch:dev` - Launch in development mode
- `npm run launch:clean` - Clean install and launch
- `npm run health` - Check if services are running
- `npm run setup` - Install all dependencies
- `npm run clean` - Clean install everything
- `npm start` - Start the React development server only
- `npm run build` - Build the React app for production
- `npm test` - Run the test suite
- `npm run eject` - Eject from Create React App (not recommended)

### Project Structure

```
codegenApp/
├── public/                 # Static assets
│   ├── manifest.json      # PWA manifest
│   ├── favicon.ico        # App icon
│   └── logo*.png          # App logos
├── src/                   # React source code
│   ├── api/              # API client and types
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── storage/          # Local storage utilities
│   └── *.tsx             # React components
├── .env                  # Environment variables
└── README.md            # This file
```

## ⚙️ Configuration

The application supports multiple configuration methods:

1. **Environment Variables** (recommended): Set `REACT_APP_*` variables in `.env` file
2. **Settings Page**: Configure credentials through the web interface
3. **LocalStorage**: Automatically saves settings for future sessions

### Environment Variable Validation

The Settings page will show the status of your environment variables:

- ✅ **Green**: All required variables are set
- ⚠️ **Yellow**: Optional variables missing (warnings)
- ❌ **Red**: Required variables missing (will prevent API calls)

## 🚀 Deployment

### Frontend Deployment

The React app can be deployed to any static hosting service:

#### Vercel
```bash
npm run build
# Deploy the 'build' folder to Vercel
```

#### Netlify
```bash
npm run build
# Deploy the 'build' folder to Netlify
```

#### GitHub Pages
```bash
npm run build
# Deploy the 'build' folder to GitHub Pages
```

### Environment Variables for Production

Set these environment variables in your hosting platform:

```env
REACT_APP_API_TOKEN=your_production_api_token
REACT_APP_DEFAULT_ORGANIZATION=your_org_id
REACT_APP_API_BASE_URL=https://api.codegen.com
REACT_APP_USER_ID=your_user_id
```

## 🔐 Authentication

1. Get your API token from the [Codegen Dashboard](https://app.codegen.com/settings)
2. Add it to your `.env` file or enter it in the application's Settings page
3. The application will validate your credentials and load your organizations

## 🧪 Testing

Run the test suite to ensure everything is working correctly:

```bash
npm test
```

The test suite includes:
- Environment variable validation tests
- Component rendering tests
- API configuration tests

## 🐛 Troubleshooting

### Startup Issues

#### Port Conflicts
The startup script automatically handles port conflicts by killing existing processes on ports 8000 and 8001.

#### Dependencies Issues
```bash
./start.sh --clean  # Clean install and start
npm run clean       # Alternative clean install
```

#### Check Service Status
```bash
./health-check.sh   # Check if services are running
npm run health      # Alternative health check
```

#### View Logs
```bash
tail -f logs/frontend.log   # Frontend logs
tail -f logs/backend.log    # Backend logs
```

### Missing Environment Variables

If you see errors about missing environment variables:

1. Ensure your `.env` file is in the project root
2. The startup script will copy from `.env.example` if `.env` doesn't exist
3. Edit `.env` with your actual API credentials
4. Restart the application: `./start.sh`

### API Connection Issues

If API calls are failing:

1. Verify your API token is correct
2. Check that the backend proxy is running on port 8001
3. Ensure your organization ID is valid
4. Check browser console and backend logs for detailed error messages

### Development Server Issues

- The startup script handles port management automatically
- If manual startup fails, try: `./start.sh --clean`
- Check logs in the `logs/` directory for detailed error messages

## 📝 API Token Setup

1. Visit [Codegen Dashboard](https://app.codegen.com/settings)
2. Navigate to API settings
3. Generate a new API token
4. Copy the token and add it to your `.env` file or Settings page

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Look for existing issues in the GitHub repository
3. Create a new issue with detailed information about the problem

## 🔄 Updates

To update the application:

```bash
git pull origin main
npm install  # Updates dependencies
npm start    # Restart the development server
```
