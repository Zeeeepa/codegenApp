# Agent Run Manager

A web application for managing AI agent runs, converted from a Raycast extension. This application provides a user-friendly interface to create, monitor, and manage Codegen AI agent runs.

## 🚀 Features

- **Agent Run Management**: Create and monitor AI agent runs
- **Organization Support**: Work with multiple organizations
- **Real-time Updates**: Live status updates for running agents
- **Credential Management**: Secure API token handling
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

This application consists of two main components:

1. **Frontend**: React application built with Create React App
2. **Backend**: Express.js proxy server to handle CORS and API communication

The backend proxy is necessary because the Codegen API doesn't allow direct browser access due to CORS policies.

## 📋 Prerequisites

- Node.js 16+ and npm
- A Codegen API token (get one from [Codegen Dashboard](https://codegen.com))

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

### 2. Install dependencies

```bash
# Install frontend and backend dependencies
npm install
```

This will automatically install both frontend and backend dependencies.

### 3. Configure environment variables

```bash
# Copy environment files
cp .env.example .env.local
cp server/.env.example server/.env
```

Edit the environment files with your configuration:

**`.env.local`** (Frontend):
```env
REACT_APP_API_BASE_URL=http://localhost:3001/api
```

**`server/.env`** (Backend):
```env
PORT=3001
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=http://localhost:3000
```

### 4. Start the development servers

```bash
# Start both frontend and backend simultaneously
npm run dev
```

This will start:
- Backend proxy server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

## 🔧 Development

### Available Scripts

#### Frontend + Backend
- `npm run dev` - Start both frontend and backend in development mode
- `npm install` - Install all dependencies (frontend + backend)

#### Frontend Only
- `npm start` - Start only the React development server
- `npm run build` - Build the React app for production
- `npm test` - Run the test suite

#### Backend Only
- `npm run server:start` - Start the backend server in production mode
- `npm run server:dev` - Start the backend server in development mode
- `npm run server:install` - Install backend dependencies only

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
├── server/               # Backend proxy server
│   ├── index.js         # Express server
│   └── package.json     # Backend dependencies
├── .env.local           # Frontend environment variables
└── README.md            # This file
```

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

### Backend Deployment

The backend proxy server can be deployed to any Node.js hosting service:

#### Railway
```bash
cd server
# Deploy to Railway with the server folder as root
```

#### Heroku
```bash
cd server
# Create Heroku app and deploy
```

#### Render
```bash
# Deploy the server folder to Render
```

### Environment Variables for Production

**Frontend** (set in your hosting platform):
```env
REACT_APP_API_BASE_URL=https://your-backend-domain.com/api
```

**Backend** (set in your hosting platform):
```env
PORT=3001
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=https://your-frontend-domain.com
```

## 🔐 Authentication

1. Get your API token from the [Codegen Dashboard](https://codegen.com)
2. Enter the token in the application's settings/preferences
3. The application will validate your credentials and load your organizations

## 🐛 Troubleshooting

### CORS Errors
If you see CORS errors, ensure:
- The backend proxy server is running on port 3001
- The frontend is configured to use `http://localhost:3001/api`
- Both servers are running simultaneously with `npm run dev`

### API Connection Issues
- Verify your API token is valid
- Check that the backend server can reach `https://api.codegen.com`
- Ensure your network allows outbound HTTPS connections

### Development Server Issues
- Make sure ports 3000 and 3001 are available
- Try restarting both servers: `npm run dev`
- Check the console for detailed error messages

## 📝 API Token Setup

1. Visit [Codegen Dashboard](https://codegen.com)
2. Navigate to API settings
3. Generate a new API token
4. Copy the token and paste it in the application

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
npm install  # Updates both frontend and backend dependencies
npm run dev  # Restart the development servers
```

