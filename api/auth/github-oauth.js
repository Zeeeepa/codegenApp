/**
 * GitHub OAuth Authentication using Passport.js
 * Handles GitHub OAuth flow for user authentication
 */

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const logger = require('../logger');
const gitHubAppClient = require('../github-app');

/**
 * Configure Passport GitHub OAuth strategy
 */
function configureGitHubOAuth() {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackURL = process.env.GITHUB_CALLBACK_URL;

  if (!clientID || !clientSecret || !callbackURL) {
    logger.error('Missing GitHub OAuth configuration', {
      hasClientID: !!clientID,
      hasClientSecret: !!clientSecret,
      hasCallbackURL: !!callbackURL
    });
    return false;
  }

  // Configure GitHub OAuth strategy
  passport.use(new GitHubStrategy({
    clientID: clientID,
    clientSecret: clientSecret,
    callbackURL: callbackURL,
    scope: ['user:email', 'repo', 'read:org']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      logger.info('GitHub OAuth callback received', {
        userId: profile.id,
        username: profile.username,
        email: profile.emails?.[0]?.value
      });

      // Create user object with GitHub profile and tokens
      const user = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatarUrl: profile.photos?.[0]?.value,
        profileUrl: profile.profileUrl,
        accessToken: accessToken,
        refreshToken: refreshToken,
        provider: 'github'
      };

      // Get user's GitHub App installations
      try {
        const installations = await gitHubAppClient.getUserInstallations(accessToken);
        user.installations = installations;
        logger.info('User GitHub installations retrieved', {
          userId: profile.id,
          installationCount: installations.length
        });
      } catch (error) {
        logger.warn('Failed to get user installations', {
          userId: profile.id,
          error: error.message
        });
        user.installations = [];
      }

      return done(null, user);
    } catch (error) {
      logger.error('GitHub OAuth strategy error', {
        error: error.message,
        stack: error.stack
      });
      return done(error, null);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      // In a real app, you'd fetch user from database
      // For now, we'll store user data in session
      done(null, { id });
    } catch (error) {
      done(error, null);
    }
  });

  logger.info('GitHub OAuth strategy configured successfully');
  return true;
}

/**
 * Configure session middleware
 */
function configureSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    logger.error('Session secret not configured');
    return null;
  }

  return session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  });
}

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    error: 'Authentication required',
    loginUrl: '/auth/github'
  });
}

/**
 * Get user profile with GitHub installations
 */
async function getUserProfile(req, res) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: 'Not authenticated',
        loginUrl: '/auth/github'
      });
    }

    const user = req.user;
    
    // Refresh installations if needed
    if (user.accessToken) {
      try {
        const installations = await gitHubAppClient.getUserInstallations(user.accessToken);
        user.installations = installations;
      } catch (error) {
        logger.warn('Failed to refresh user installations', {
          userId: user.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        installations: user.installations || []
      }
    });

  } catch (error) {
    logger.error('Get user profile error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Logout user
 */
function logout(req, res) {
  req.logout((err) => {
    if (err) {
      logger.error('Logout error', { error: err.message });
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

/**
 * GitHub OAuth routes
 */
function setupGitHubOAuthRoutes(app) {
  // Start OAuth flow
  app.get('/auth/github', 
    passport.authenticate('github', { scope: ['user:email', 'repo', 'read:org'] })
  );

  // OAuth callback
  app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/auth/failure' }),
    (req, res) => {
      // Successful authentication
      logger.info('GitHub OAuth successful', {
        userId: req.user.id,
        username: req.user.username
      });
      
      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}?auth=success`);
    }
  );

  // Authentication failure
  app.get('/auth/failure', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    res.redirect(`${frontendUrl}?auth=failure`);
  });

  // Get current user
  app.get('/auth/user', getUserProfile);

  // Logout
  app.post('/auth/logout', logout);

  // Check authentication status
  app.get('/auth/status', (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? {
        id: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName
      } : null
    });
  });
}

module.exports = {
  configureGitHubOAuth,
  configureSession,
  requireAuth,
  setupGitHubOAuthRoutes,
  getUserProfile,
  logout
};
