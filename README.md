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
- **Linux users**: System dependencies for Puppeteer (see installation steps below)

## 🛠���� Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

### 2. Install system dependencies (Linux only)

**Linux users must install system dependencies for Puppeteer first:**

```bash
# Run the automated installation script
./scripts/install-puppeteer-deps.sh
```

Or install manually:
```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y \
  libnspr4 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 \
  libasound2 libcups2 libgtk-3-0 libgconf-2-4
```

**macOS and Windows users can skip this step** - Puppeteer works out of the box.

### 3. Install ALL dependencies (frontend + backend + automation)

```bash
npm install
```

This automatically installs dependencies for:
- ✅ Frontend React app
- ✅ Backend API server  
- ✅ Automation service (for Resume Agent Run functionality)

### 4. Environment Configuration

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

### 5. Start ALL services (frontend + backend + automation)

```bash
npm run dev
```

The application will be available at:
- **Frontend**: `http://localhost:8080`
- **Backend API**: `http://localhost:8001`
- **Automation Service**: `http://localhost:3001`

## 🔧 Development

### Available Scripts

- `npm run dev` - **Start ALL services** (frontend + backend + automation)
- `npm start` - Start only the React frontend
- `npm run build` - Build the React app for production
- `npm run backend:start` - Start only the automation service
- `npm run server:start` - Start only the backend API server
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

### Missing Environment Variables

If you see errors about missing environment variables:

1. Ensure your `.env` file is in the project root
2. Restart the development server after creating/modifying `.env`
3. Check the Settings page for validation status

### API Connection Issues

If API calls are failing:

1. Verify your API token is correct
2. Check that the API base URL is accessible (`https://api.codegen.com`)
3. Ensure your organization ID is valid
4. Check browser console for detailed error messages

### Development Server Issues

- Make sure port 3000 is available
- Try restarting the server: `npm start`
- Check the console for detailed error messages

### "Resume Agent Run" Connection Issues

If you get the error "Cannot connect to backend automation service":

1. **Check if backend service is running**:
   ```bash
   curl http://localhost:3500/health
   ```

2. **Linux users**: Install Puppeteer system dependencies:
   ```bash
   ./scripts/install-puppeteer-deps.sh
   ```

3. **Start the backend service manually**:
   ```bash
   cd backend && npm start
   ```

4. **Check service status**:
   - Backend should show `"status": "healthy"`
   - If status is `"unhealthy"`, check the error message for missing dependencies

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
