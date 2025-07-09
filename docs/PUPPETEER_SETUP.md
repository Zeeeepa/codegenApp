# Puppeteer System Dependencies Setup

This document explains how to install the required system dependencies for Puppeteer to work properly with the backend automation service.

## Why are these dependencies needed?

The backend automation service uses Puppeteer to control a headless Chrome browser for web automation tasks. On Linux systems, Chrome requires specific system libraries to run properly.

## Quick Setup

### Automated Installation (Recommended)

Run the provided script to automatically install all required dependencies:

```bash
./scripts/install-puppeteer-deps.sh
```

### Manual Installation

#### Debian/Ubuntu

```bash
sudo apt-get update && sudo apt-get install -y \
  libnspr4 \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2 \
  libcups2 \
  libgtk-3-0 \
  libgconf-2-4
```

#### RHEL/CentOS/Fedora

```bash
sudo yum install -y \
  nspr \
  nss \
  at-spi2-atk \
  libdrm \
  libxkbcommon \
  libXcomposite \
  libXdamage \
  libXrandr \
  mesa-libgbm \
  libXScrnSaver \
  alsa-lib \
  cups-libs \
  gtk3 \
  GConf2
```

#### Arch Linux

```bash
sudo pacman -S --noconfirm \
  nspr \
  nss \
  at-spi2-atk \
  libdrm \
  libxkbcommon \
  libxcomposite \
  libxdamage \
  libxrandr \
  mesa \
  libxss \
  alsa-lib \
  cups \
  gtk3 \
  gconf
```

## Platform Support

- **✅ Linux**: Requires system dependencies (see above)
- **✅ macOS**: Works out of the box, no additional dependencies needed
- **✅ Windows**: Works out of the box, no additional dependencies needed

## Verification

After installing the dependencies, verify that the backend service works:

1. Start the backend service:
   ```bash
   cd backend && npm start
   ```

2. Check the health endpoint:
   ```bash
   curl http://localhost:3500/health
   ```

3. Look for `"status": "healthy"` in the response. If you see `"status": "unhealthy"`, check the error message for any missing dependencies.

## Troubleshooting

### Common Error Messages

**Error**: `libnspr4.so: cannot open shared object file`
**Solution**: Install `libnspr4` package

**Error**: `libcups.so.2: cannot open shared object file`
**Solution**: Install `libcups2` (Debian/Ubuntu) or `cups-libs` (RHEL/CentOS)

**Error**: `libgtk-3.so.0: cannot open shared object file`
**Solution**: Install `libgtk-3-0` (Debian/Ubuntu) or `gtk3` (RHEL/CentOS)

### Docker/Container Environments

If running in a Docker container, add these packages to your Dockerfile:

```dockerfile
# Debian/Ubuntu base
RUN apt-get update && apt-get install -y \
    libnspr4 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 \
    libasound2 libcups2 libgtk-3-0 libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*
```

### CI/CD Environments

For GitHub Actions, GitLab CI, or other CI/CD platforms, you may need to install these dependencies in your workflow:

```yaml
# GitHub Actions example
- name: Install Puppeteer dependencies
  run: |
    sudo apt-get update
    sudo apt-get install -y libnspr4 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2 libcups2 libgtk-3-0 libgconf-2-4
```

## References

- [Puppeteer Troubleshooting Guide](https://pptr.dev/troubleshooting)
- [Chrome Headless Dependencies](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)

