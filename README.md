# github.gg - GitHub Repository Analyzer

A powerful GitHub App that analyzes repositories, processes webhooks, and provides insights into your GitHub projects.

## 🚀 Features

- **GitHub OAuth Authentication** - Secure login with GitHub accounts
- **Repository Analysis** - Deep analysis of repository structure, languages, and statistics
- **Real-time Webhooks** - Process GitHub events in real-time
- **Rate Limiting** - Built-in rate limiting for API calls
- **TypeScript Support** - Fully typed codebase
- **Next.js Framework** - Modern React framework with API routes

## 📋 Prerequisites

- Node.js 18+ or Bun
- GitHub App credentials
- GitHub Personal Access Token (optional, for higher rate limits)

## 🔧 Installation

### Quick Setup with Script

```bash
# Download and run the setup script
curl -sSL https://raw.githubusercontent.com/Zeeeepa/github.gg/main/deploy-local.sh | bash
```

### Manual Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Zeeeepa/github.gg.git
   cd github.gg
   ```

2. **Install dependencies:**
   ```bash
   # Using Bun (recommended)
   bun install
   
   # Or using npm with legacy peer deps
   npm install --legacy-peer-deps
   
   # Or using the provided script
   npm run install:legacy
   ```

3. **Environment setup:**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Configure environment variables** (see [Environment Configuration](#environment-configuration))

5. **Place your GitHub App private key** in the project root as `zeeeepa.2025-06-30.private-key.pem`

6. **Start the development server:**
   ```bash
   bun dev
   # or
   npm run dev
   ```

## 🔑 Environment Configuration

Create a `.env.local` file with the following variables:

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

# GitHub Personal Access Token (optional)
GITHUB_TOKEN=[YOUR_GITHUB_TOKEN]

# Webhook Configuration
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here-generate-a-secure-random-string
```

### Generate Secure Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate GITHUB_WEBHOOK_SECRET
openssl rand -base64 32
```

## 🏗️ GitHub App Setup

See [GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md) for detailed GitHub App configuration instructions.

### Quick Setup Checklist

1. ✅ Create GitHub App with proper permissions
2. ✅ Configure OAuth callback URL: `http://localhost:3000/api/auth/callback/github`
3. ✅ Set webhook URL: `https://webhook-gateway.pixeliumperfecto.workers.dev/api/webhooks/github`
4. ✅ Install app on your GitHub account
5. ✅ Place private key file in project root
6. ✅ Configure environment variables

## 📁 Project Structure

```
github.gg/
├── lib/
│   └── github-app.ts          # GitHub App integration
├── pages/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth].ts # NextAuth configuration
│   │   └── webhooks/
│   │       └── github.ts       # Webhook handler
├── types/
│   └── next-auth.d.ts         # TypeScript definitions
├── .env.local.example         # Environment template
├── github-app-config.json     # GitHub App configuration
├── deploy-local.sh           # Setup script
└── GITHUB_APP_SETUP.md       # Detailed setup guide
```

## 🔌 API Endpoints

### Authentication
- `GET /api/auth/signin` - Sign in page
- `GET /api/auth/callback/github` - GitHub OAuth callback
- `GET /api/auth/signout` - Sign out

### Webhooks
- `POST /api/webhooks/github` - GitHub webhook endpoint

## 🎯 Usage Examples

### Analyzing a Repository

```typescript
import { createGitHubService } from '../lib/github-app';

// Using OAuth token
const service = createGitHubService(accessToken);
const analysis = await service.analyzeRepository('owner', 'repo');

// Using installation
const service = await createGitHubService(undefined, installationId);
const stats = await service.getRepositoryStats('owner', 'repo');
```

### Processing Webhooks

The webhook handler automatically processes various GitHub events:

- Repository events (created, deleted, archived)
- Push events
- Pull request events
- Issue events
- Release events
- Star/fork events
- Installation events

## 🔒 Security Features

- **Webhook signature verification** - All webhooks are verified using HMAC-SHA256
- **Rate limiting** - Built-in rate limiting for API calls
- **Secure token handling** - OAuth tokens are handled securely
- **Private key protection** - GitHub App private key is read from secure file

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Using Bun (Recommended)
```bash
bun dev      # Development
bun build    # Build
bun start    # Production
```

## 🐛 Troubleshooting

### Common Issues

1. **Private key not found**
   - Ensure `zeeeepa.2025-06-30.private-key.pem` is in the project root
   - Check file permissions: `chmod 600 zeeeepa.2025-06-30.private-key.pem`

2. **OAuth callback mismatch**
   - Verify callback URL in GitHub App settings matches exactly
   - Check NEXTAUTH_URL environment variable

3. **Webhook signature verification fails**
   - Ensure GITHUB_WEBHOOK_SECRET matches the secret in GitHub App settings
   - Check webhook URL is accessible

4. **Rate limiting issues**
   - Add GITHUB_TOKEN for higher rate limits
   - Implement proper rate limiting in your application

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 📚 Documentation

- [GitHub App Setup Guide](./GITHUB_APP_SETUP.md)
- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Octokit Documentation](https://octokit.github.io/rest.js/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Octokit](https://octokit.github.io/) - GitHub API client
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Next.js](https://nextjs.org/) - React framework
- [GitHub](https://github.com/) - Platform and APIs

---

**Need help?** Check the [troubleshooting section](#troubleshooting) or create an issue in the repository.

