#!/bin/bash
set -euxo pipefail

PYODIDE_VERSION=0.27.7

# Clean up previous builds.
echo "Cleaning up previous builds..."
rm -rf ./src/vendor
rm -rf .venv-pyodide

# Install pyodide CLI.
uv tool install --with pyodide-build --with pip pyodide-cli --python 3.12

# Create the xbuild environment.
pyodide xbuildenv install $PYODIDE_VERSION

# Create virtual environment.
pyodide venv .venv-pyodide

# Install requirements.
echo "Installing dependencies..."
uv export --python .venv-pyodide --index https://pyodide.astral.sh/$PYODIDE_VERSION | uv pip sync \
    --no-installer-metadata \
    --no-compile-bytecode \
    --only-binary :all: \
    --target src/vendor \
    --python .venv-pyodide \
    --index https://pyodide.astral.sh/$PYODIDE_VERSION \
    -

echo "Build completed successfully!"
echo "Next steps:"
echo "1. Set secrets: wrangler secret put GITHUB_WEBHOOK_SECRET"
echo "2. Set secrets: wrangler secret put CODEGENAPP_BASE_URL"
echo "3. Deploy: npx wrangler deploy"
