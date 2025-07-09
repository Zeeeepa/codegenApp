#!/bin/bash

# Install Puppeteer System Dependencies
# This script installs the required system packages for Puppeteer to work properly

set -e

echo "🔧 Installing Puppeteer system dependencies..."

# Detect the operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        echo "📦 Detected Debian/Ubuntu system. Installing packages with apt-get..."
        
        sudo apt-get update
        
        # Core dependencies for Puppeteer Chrome
        sudo apt-get install -y \
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
            
        echo "✅ Successfully installed Puppeteer dependencies on Debian/Ubuntu!"
        
    elif command -v yum &> /dev/null; then
        # RHEL/CentOS/Fedora
        echo "📦 Detected RHEL/CentOS/Fedora system. Installing packages with yum..."
        
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
            
        echo "✅ Successfully installed Puppeteer dependencies on RHEL/CentOS/Fedora!"
        
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        echo "📦 Detected Arch Linux system. Installing packages with pacman..."
        
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
            
        echo "✅ Successfully installed Puppeteer dependencies on Arch Linux!"
        
    else
        echo "❌ Unsupported Linux distribution. Please install the following packages manually:"
        echo "   nspr, nss, atk, libdrm, libxkbcommon, libxcomposite, libxdamage,"
        echo "   libxrandr, mesa/gbm, libxss, alsa-lib, cups, gtk3, gconf"
        exit 1
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 Detected macOS. Puppeteer should work out of the box on macOS."
    echo "✅ No additional system dependencies required!"
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    echo "🪟 Detected Windows. Puppeteer should work out of the box on Windows."
    echo "✅ No additional system dependencies required!"
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please refer to Puppeteer troubleshooting guide: https://pptr.dev/troubleshooting"
    exit 1
fi

echo ""
echo "🎉 Puppeteer system dependencies installation complete!"
echo "You can now run 'npm run dev' and the backend automation service should work properly."

