# GitHub App Setup Guide for github.gg

## 📋 Overview
This guide explains how to properly configure your GitHub App for the github.gg project, including installation and environment setup.

## 🔑 GitHub App Credentials
You have the following credentials (replace with your actual values):
- **Client ID**: `Iv23li9PqHMExi84gaq1`
- **App ID**: `1484403`
- **Client Secret**: `[YOUR_CLIENT_SECRET]`
- **Private Key**: `zeeeepa.2025-06-30.private-key.pem`

## 🏗️ GitHub App Configuration

### Basic Information
- **GitHub App name**: `zeeeepa` (as shown in your installation screen)
- **Description**: "GitHub repository analyzer and webhook processor for github.gg"
- **Homepage URL**: `http://localhost:3000` (for development)

### Identifying and Authorizing Users
- **Callback URL**: `http://localhost:3000/api/auth/callback/github`
- ✅ **Expire user authorization tokens**: Checked
- ✅ **Request user authorization (OAuth) during installation**: Checked
- ✅ **Enable Device Flow**: Checked

### Webhook Configuration
- ✅ **Active**: Checked
- **Webhook URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev/api/webhooks/github`
- **Webhook Secret**: Generate a secure secret and add to your `.env.local`

### Required Permissions
Based on the github.gg project structure, you'll need these permissions:

**Repository permissions:**
- **Contents**: Read (to analyze repository files and structure)
- **Metadata**: Read (to access basic repository information)
- **Pull requests**: Read (to analyze PR data)
- **Issues**: Read (to analyze issue data)
- **Commit statuses**: Read (to check build/CI status)

**Account permissions:**
- **Email addresses**: Read (for user identification in NextAuth)

### Subscribe to Events
For webhook functionality:
- `repository`
- `push`
- `pull_request`
- `issues`
- `release`

## 📦 Installation Instructions

### 1. Install the GitHub App
**Yes, install it on your account (Zeeeepa)** as shown in the screenshot. This will:
- Give the app access to your repositories
- Enable OAuth authentication for the github.gg application
- Allow webhook processing for repository events

### 2. Environment Setup
The project uses these environment variables (already configured in `.env.local`):

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-a-secure-random-string

# GitHub OAuth App Configuration
GITHUB_CLIENT_ID=Iv23li9PqHMExi84gaq1
GITHUB_CLIENT_SECRET=[YOUR_CLIENT_SECRET]

# GitHub App Configuration
GITHUB_APP_ID=1484403
GITHUB_PRIVATE_KEY_PATH=./zeeeepa.2025-06-30.private-key.pem

# GitHub Personal Access Token
GITHUB_TOKEN=[YOUR_GITHUB_TOKEN]
```

### 3. Private Key Setup
1. Place your `zeeeepa.2025-06-30.private-key.pem` file in the project root directory
2. Ensure the file permissions are secure: `chmod 600 zeeeepa.2025-06-30.private-key.pem`
3. The path is already configured in `.env.local` as `GITHUB_PRIVATE_KEY_PATH=./zeeeepa.2025-06-30.private-key.pem`

### 4. Generate Required Secrets
Generate secure secrets for:
- `NEXTAUTH_SECRET`: Use `openssl rand -base64 32`
- `GITHUB_WEBHOOK_SECRET`: Use `openssl rand -base64 32`

## 🚀 Running the Application

1. Install dependencies:
   ```bash
   bun install
   # or
   npm run install:legacy
   ```

2. Start the development server:
   ```bash
   bun dev
   # or
   npm run dev
   ```

3. Open `http://localhost:3000` and test the GitHub OAuth flow

## 🔧 How the App Uses These Credentials

### NextAuth.js Integration
- Uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for OAuth authentication
- Users sign in with their GitHub accounts to access the repository analyzer

### GitHub API Access
- Uses `GITHUB_TOKEN` (Personal Access Token) for higher API rate limits
- Uses `GITHUB_APP_ID` and private key for GitHub App API access
- Enables repository analysis and statistics gathering

### Webhook Processing
- Cloudflare Worker receives webhooks at the configured URL
- Processes repository events (pushes, PRs, issues) for real-time updates
- Uses webhook secret for payload verification

## 🔒 Security Notes

1. **Never commit secrets to version control**
2. **Use environment variables for all sensitive data**
3. **Rotate secrets regularly**
4. **Limit GitHub App permissions to minimum required**
5. **Use webhook secrets to verify payload authenticity**

## 🐛 Troubleshooting

### Common Issues:
1. **OAuth callback mismatch**: Ensure callback URL matches exactly
2. **Private key errors**: Check file path and permissions
3. **Rate limiting**: Verify GitHub token is properly configured
4. **Webhook failures**: Check webhook URL accessibility and secret

### Testing:
1. Test OAuth flow by signing in
2. Verify API access by analyzing a repository
3. Test webhooks using GitHub's webhook delivery page

## 📚 Additional Resources

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [NextAuth.js GitHub Provider](https://next-auth.js.org/providers/github)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Webhook Events and Payloads](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)

## 🎯 Next Steps

After completing this setup:
1. Test the OAuth authentication flow
2. Verify repository analysis functionality
3. Test webhook processing
4. Deploy to production with proper environment variables
5. Monitor GitHub App usage and rate limits

---

**Need help?** Check the troubleshooting section or create an issue in the repository.

