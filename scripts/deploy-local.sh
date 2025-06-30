#!/bin/bash
# 🚀 Local Development Deployment Script for github.gg rewrite-github-app branch
# This script clones the repository, checks out the specific branch, and sets up local development

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/Zeeeepa/codegenApp.git"
BRANCH_NAME="main"
PROJECT_DIR="codegenApp"

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if command exists
command_exists() { command -v "$1" >/dev/null 2>&1; }

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if ! command_exists git; then
    log_error "Git is not installed. Please install Git first."
    exit 1
  fi
  
  if ! command_exists node; then
    log_warning "Node.js not found. Will attempt to install if needed."
  fi
  
  if ! command_exists python3; then
    log_warning "Python3 not found. Will attempt to use if needed."
  fi
  
  log_success "Prerequisites check completed"
}

# Clone repository and checkout branch
clone_and_checkout() {
  log_info "Cloning repository and checking out branch..."
  
  # Remove existing directory if it exists
  if [ -d "$PROJECT_DIR" ]; then
    log_warning "Directory $PROJECT_DIR already exists. Removing..."
    rm -rf "$PROJECT_DIR"
  fi
  
  # Clone the repository
  log_info "Cloning $REPO_URL..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  
  # Navigate to project directory
  cd "$PROJECT_DIR"
  
  # Fetch all branches
  log_info "Fetching all branches..."
  git fetch origin
  
  # Check if branch exists
  if git ls-remote --heads origin | grep -q "refs/heads/$BRANCH_NAME"; then
    log_info "Checking out branch: $BRANCH_NAME"
    git checkout "$BRANCH_NAME"
  else
    log_error "Branch '$BRANCH_NAME' not found in remote repository"
    log_info "Available branches:"
    git ls-remote --heads origin
    exit 1
  fi
  
  log_success "Repository cloned and branch checked out successfully"
}

# Detect project type and setup
detect_and_setup() {
  log_info "Detecting project type and setting up development environment..."
  
  # Check for Node.js project
  if [ -f "package.json" ]; then
    log_info "Node.js project detected"
    setup_nodejs
    return
  fi
  
  # Check for Python project
  if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
    log_info "Python project detected"
    setup_python
    return
  fi
  
  # Check for Go project
  if [ -f "go.mod" ]; then
    log_info "Go project detected"
    setup_go
    return
  fi
  
  # Check for Rust project
  if [ -f "Cargo.toml" ]; then
    log_info "Rust project detected"
    setup_rust
    return
  fi
  
  # Check for PHP project
  if [ -f "composer.json" ]; then
    log_info "PHP project detected"
    setup_php
    return
  fi
  
  # Check for Ruby project
  if [ -f "Gemfile" ]; then
    log_info "Ruby project detected"
    setup_ruby
    return
  fi
  
  # Generic setup
  log_warning "Could not detect specific project type. Attempting generic setup..."
  setup_generic
}

# Node.js setup
setup_nodejs() {
  log_info "Setting up Node.js development environment..."
  
  # Check for Bun first (recommended for this project)
  if command_exists bun; then
    log_info "Using Bun package manager (recommended)"
    bun install
    
    # Start development server
    log_success "Setup complete! Starting development server with Bun..."
    bun dev
    return
  fi
  
  # Check for package manager
  if [ -f "yarn.lock" ]; then
    log_info "Using Yarn package manager"
    if ! command_exists yarn; then
      log_info "Installing Yarn..."
      npm install -g yarn
    fi
    yarn install
    
    # Check for dev script
    if yarn run --help 2>/dev/null | grep -q "dev"; then
      log_success "Setup complete! Starting development server..."
      yarn dev
    elif yarn run --help 2>/dev/null | grep -q "start"; then
      log_success "Setup complete! Starting server..."
      yarn start
    else
      log_info "Available scripts:"
      yarn run --help 2>/dev/null || echo "No scripts found"
    fi
  elif [ -f "pnpm-lock.yaml" ]; then
    log_info "Using pnpm package manager"
    if ! command_exists pnpm; then
      log_info "Installing pnpm..."
      npm install -g pnpm
    fi
    pnpm install
    
    # Check for dev script
    if pnpm run dev --help 2>/dev/null; then
      log_success "Setup complete! Starting development server..."
      pnpm dev
    elif pnpm run start --help 2>/dev/null; then
      log_success "Setup complete! Starting server..."
      pnpm start
    else
      log_info "Available scripts:"
      pnpm run --help 2>/dev/null || echo "No scripts found"
    fi
  else
    log_info "Using npm package manager"
    # Use legacy peer deps for React 19 compatibility
    log_info "Installing with legacy peer deps for React 19 compatibility..."
    npm install --legacy-peer-deps
    
    # Check for dev script
    if npm run dev --help 2>/dev/null; then
      log_success "Setup complete! Starting development server..."
      npm run dev
    elif npm run start --help 2>/dev/null; then
      log_success "Setup complete! Starting server..."
      npm start
    else
      log_info "Available scripts:"
      npm run --help 2>/dev/null || echo "No scripts found"
    fi
  fi
}

# Python setup
setup_python() {
  log_info "Setting up Python development environment..."
  
  # Create virtual environment
  if ! [ -d "venv" ]; then
    log_info "Creating virtual environment..."
    python3 -m venv venv
  fi
  
  # Activate virtual environment
  log_info "Activating virtual environment..."
  source venv/bin/activate
  
  # Install dependencies
  if [ -f "requirements.txt" ]; then
    log_info "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
  elif [ -f "pyproject.toml" ]; then
    log_info "Installing dependencies from pyproject.toml..."
    pip install -e .
  fi
  
  # Try to start the application
  if [ -f "app.py" ]; then
    log_success "Setup complete! Starting application..."
    python app.py
  elif [ -f "main.py" ]; then
    log_success "Setup complete! Starting application..."
    python main.py
  elif [ -f "manage.py" ]; then
    log_success "Django project detected! Starting development server..."
    python manage.py runserver
  else
    log_info "Python environment setup complete. Please run your application manually."
    log_info "Virtual environment is activated. Use 'deactivate' to exit."
  fi
}

# Go setup
setup_go() {
  log_info "Setting up Go development environment..."
  
  if ! command_exists go; then
    log_error "Go is not installed. Please install Go first."
    exit 1
  fi
  
  # Download dependencies
  log_info "Downloading Go dependencies..."
  go mod download
  
  # Try to run the application
  if [ -f "main.go" ]; then
    log_success "Setup complete! Starting Go application..."
    go run main.go
  else
    log_info "Go dependencies downloaded. Use 'go run .' or 'go run main.go' to start."
  fi
}

# Rust setup
setup_rust() {
  log_info "Setting up Rust development environment..."
  
  if ! command_exists cargo; then
    log_error "Rust/Cargo is not installed. Please install Rust first."
    exit 1
  fi
  
  # Build the project
  log_info "Building Rust project..."
  cargo build
  
  # Try to run the application
  log_success "Setup complete! Starting Rust application..."
  cargo run
}

# PHP setup
setup_php() {
  log_info "Setting up PHP development environment..."
  
  if ! command_exists php; then
    log_error "PHP is not installed. Please install PHP first."
    exit 1
  fi
  
  # Install Composer dependencies
  if [ -f "composer.json" ]; then
    if command_exists composer; then
      log_info "Installing Composer dependencies..."
      composer install
    else
      log_warning "Composer not found. Please install Composer and run 'composer install'"
    fi
  fi
  
  # Try to start PHP development server
  if [ -f "index.php" ]; then
    log_success "Setup complete! Starting PHP development server..."
    php -S localhost:8000
  else
    log_info "PHP setup complete. Use 'php -S localhost:8000' to start development server."
  fi
}

# Ruby setup
setup_ruby() {
  log_info "Setting up Ruby development environment..."
  
  if ! command_exists ruby; then
    log_error "Ruby is not installed. Please install Ruby first."
    exit 1
  fi
  
  # Install Bundler if not present
  if ! command_exists bundle; then
    log_info "Installing Bundler..."
    gem install bundler
  fi
  
  # Install dependencies
  log_info "Installing Ruby dependencies..."
  bundle install
  
  # Try to start Rails server if it's a Rails app
  if [ -f "config/application.rb" ]; then
    log_success "Rails application detected! Starting development server..."
    bundle exec rails server
  else
    log_info "Ruby dependencies installed. Please start your application manually."
  fi
}

# Generic setup
setup_generic() {
  log_info "Performing generic setup..."
  
  # Check for Makefile
  if [ -f "Makefile" ]; then
    log_info "Makefile found. Available targets:"
    make help 2>/dev/null || make -n 2>/dev/null || echo "No help target found"
    
    # Try common make targets
    if make -n install >/dev/null 2>&1; then
      log_info "Running 'make install'..."
      make install
    fi
    
    if make -n dev >/dev/null 2>&1; then
      log_success "Starting with 'make dev'..."
      make dev
    elif make -n run >/dev/null 2>&1; then
      log_success "Starting with 'make run'..."
      make run
    fi
  else
    log_info "No specific project type detected. Please check the README for setup instructions."
    if [ -f "README.md" ]; then
      log_info "README.md contents:"
      head -20 README.md
    fi
  fi
}

# Create environment file if example exists
setup_environment() {
  if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    log_info "Creating .env file from .env.example..."
    cp .env.example .env
    log_warning "Please edit .env file with your configuration"
  fi
  
  if [ -f ".env.local.example" ] && [ ! -f ".env.local" ]; then
    log_info "Creating .env.local file from .env.local.example..."
    cp .env.local.example .env.local
    log_warning "Please edit .env.local file with your configuration"
  fi
  
  # Check for GitHub App private key
  if [ -f "zeeeepa.2025-06-30.private-key.pem" ]; then
    log_info "GitHub App private key found"
    # Set secure permissions for private key
    chmod 600 zeeeepa.2025-06-30.private-key.pem
    log_success "Private key permissions set to 600"
  else
    log_warning "GitHub App private key (zeeeepa.2025-06-30.private-key.pem) not found"
    log_warning "Please place the private key file in the project root directory"
  fi
  
  # Generate secrets if needed
  if [ -f ".env" ]; then
    if grep -q "your-secret-key-here" .env; then
      log_warning "Please generate secure secrets for NEXTAUTH_SECRET and GITHUB_WEBHOOK_SECRET"
      log_info "Use: openssl rand -base64 32"
    fi
  fi
  
  # Display setup instructions
  log_info "📋 Setup checklist:"
  log_info "1. Place zeeeepa.2025-06-30.private-key.pem in project root"
  log_info "2. Generate secure secrets with: openssl rand -base64 32"
  log_info "3. Install GitHub App on your account (Zeeeepa)"
  log_info "4. Configure webhook URL in GitHub App settings"
  log_info "5. See GITHUB_APP_SETUP.md for detailed instructions"
}

# Main execution
main() {
  log_info "🚀 Starting local development deployment for github.gg codegenApp"
  
  # Check prerequisites
  check_prerequisites
  
  # Clone and checkout
  clone_and_checkout
  
  # Setup environment files
  setup_environment
  
  # Detect project type and setup
  detect_and_setup
  
  log_success "🎉 Local development deployment completed!"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main
