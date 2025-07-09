# 📋 GitHub App Setup Checklist for github.gg

Use this checklist to ensure your GitHub App is properly configured and your development environment is ready.

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] GitHub account with admin access to repositories
- [ ] Basic understanding of GitHub Apps and OAuth

## 🔧 GitHub App Configuration

### 1. Create GitHub App
- [ ] Go to GitHub Settings > Developer settings > GitHub Apps
- [ ] Click "New GitHub App"
- [ ] Fill in basic information:
  - [ ] **GitHub App name**: `zeeeepa`
  - [ ] **Description**: "GitHub repository analyzer and webhook processor for github.gg"
  - [ ] **Homepage URL**: `http://localhost:3000` (development) or your production URL

### 2. Configure OAuth Settings
- [ ] **Callback URL**: `http://localhost:3000/api/auth/callback/github`
- [ ] ✅ **Expire user authorization tokens**: Checked
- [ ] ✅ **Request user authorization (OAuth) during installation**: Checked
- [ ] ✅ **Enable Device Flow**: Checked

### 3. Set Permissions
**Repository permissions:**
- [ ] **Contents**: Read
- [ ] **Metadata**: Read
- [ ] **Pull requests**: Read
- [ ] **Issues**: Read
- [ ] **Commit statuses**: Read

**Account permissions:**
- [ ] **Email addresses**: Read

### 4. Configure Webhooks
- [ ] ✅ **Active**: Checked
- [ ] **Webhook URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev/api/webhooks/github`
- [ ] **Webhook secret**: Generate and save securely
- [ ] **SSL verification**: Enable

**Subscribe to events:**
- [ ] `repository`
- [ ] `push`
- [ ] `pull_request`
- [ ] `issues`
- [ ] `release`
- [ ] `star`
- [ ] `fork`

### 5. Generate Credentials
- [ ] Note down **App ID**: `1484403`
- [ ] Note down **Client ID**: `Iv23li9PqHMExi84gaq1`
- [ ] Generate and download **Client Secret**
- [ ] Generate and download **Private Key** (`zeeeepa.2025-06-30.private-key.pem`)

## 🚀 Local Development Setup

### 1. Clone and Setup Repository
```bash
# Option 1: Use automated script
curl -sSL https://raw.githubusercontent.com/Zeeeepa/github.gg/main/deploy-local.sh | bash

# Option 2: Manual setup
git clone https://github.com/Zeeeepa/github.gg.git
cd github.gg
```

### 2. Install Dependencies
- [ ] Run installation command:
```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install --legacy-peer-deps
```

### 3. Environment Configuration
- [ ] Copy environment template:
```bash
cp .env.local.example .env.local
```

- [ ] Edit `.env.local` with your values:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[GENERATE_SECURE_SECRET]
GITHUB_CLIENT_ID=Iv23li9PqHMExi84gaq1
GITHUB_CLIENT_SECRET=[YOUR_CLIENT_SECRET]
GITHUB_APP_ID=1484403
GITHUB_PRIVATE_KEY_PATH=./zeeeepa.2025-06-30.private-key.pem
GITHUB_TOKEN=[YOUR_PERSONAL_ACCESS_TOKEN]
GITHUB_WEBHOOK_SECRET=[GENERATE_SECURE_SECRET]
```

### 4. Generate Secure Secrets
- [ ] Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

- [ ] Generate `GITHUB_WEBHOOK_SECRET`:
```bash
openssl rand -base64 32
```

### 5. Private Key Setup
- [ ] Place `zeeeepa.2025-06-30.private-key.pem` in project root
- [ ] Set secure permissions:
```bash
chmod 600 zeeeepa.2025-06-30.private-key.pem
```

## 📱 GitHub App Installation

### 1. Install on Your Account
- [ ] Go to your GitHub App settings
- [ ] Click "Install App"
- [ ] Select your account (Zeeeepa)
- [ ] Choose repositories:
  - [ ] All repositories (recommended for testing)
  - [ ] Or select specific repositories

### 2. Verify Installation
- [ ] Check that the app appears in your account's "Installed GitHub Apps"
- [ ] Verify repository access permissions

## 🧪 Testing Setup

### 1. Start Development Server
- [ ] Run the development server:
```bash
bun dev
# or
npm run dev
```

### 2. Test OAuth Flow
- [ ] Open `http://localhost:3000`
- [ ] Click "Sign in with GitHub"
- [ ] Verify successful authentication
- [ ] Check that user data is displayed correctly

### 3. Test Webhook Processing
- [ ] Run webhook test script:
```bash
npm run webhook:test
```

- [ ] Check webhook delivery in GitHub App settings
- [ ] Verify webhook processing in application logs

### 4. Test Repository Analysis
- [ ] Try analyzing a repository through the UI
- [ ] Verify API calls are working
- [ ] Check rate limiting functionality

## 🔒 Security Verification

### 1. Environment Security
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Confirm no secrets are committed to version control
- [ ] Check private key file permissions (600)

### 2. Webhook Security
- [ ] Verify webhook signature verification is working
- [ ] Test with invalid signatures (should fail)
- [ ] Check webhook secret is properly configured

### 3. OAuth Security
- [ ] Verify callback URL matches exactly
- [ ] Test OAuth flow with different users
- [ ] Check token expiration handling

## 🚀 Production Deployment

### 1. Environment Setup
- [ ] Update production environment variables
- [ ] Set production callback URLs in GitHub App
- [ ] Configure production webhook URL
- [ ] Set up SSL certificates

### 2. Deployment Verification
- [ ] Test OAuth flow in production
- [ ] Verify webhook processing
- [ ] Check rate limiting
- [ ] Monitor error logs

## 📊 Monitoring and Maintenance

### 1. Setup Monitoring
- [ ] Configure application logging
- [ ] Set up error tracking
- [ ] Monitor API rate limits
- [ ] Track webhook delivery success

### 2. Regular Maintenance
- [ ] Rotate secrets regularly
- [ ] Update dependencies
- [ ] Monitor GitHub App permissions
- [ ] Review webhook logs

## 🆘 Troubleshooting

### Common Issues Checklist
- [ ] **OAuth fails**: Check callback URL and client credentials
- [ ] **Webhook fails**: Verify signature and webhook URL
- [ ] **Private key errors**: Check file path and permissions
- [ ] **Rate limiting**: Verify GitHub token configuration
- [ ] **Installation issues**: Check app permissions and installation

### Debug Steps
1. [ ] Check application logs
2. [ ] Verify environment variables
3. [ ] Test webhook delivery in GitHub
4. [ ] Check GitHub App installation status
5. [ ] Verify API rate limit status

## 📚 Resources

- [ ] [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [ ] [NextAuth.js Documentation](https://next-auth.js.org/)
- [ ] [Octokit Documentation](https://octokit.github.io/rest.js/)
- [ ] [Webhook Events Reference](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)

---

**✅ Setup Complete!** 

Once all items are checked, your GitHub App should be fully functional. If you encounter issues, refer to the troubleshooting section or check the detailed setup guide in `GITHUB_APP_SETUP.md`.

