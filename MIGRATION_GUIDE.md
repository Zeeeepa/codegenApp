# Migration Guide: setup.py to pyproject.toml

This document explains the migration from the deprecated `setup.py` packaging approach to the modern `pyproject.toml` standard.

## What Changed

### ✅ New Files Added
- `pyproject.toml` - Modern packaging configuration
- `build_frontend.py` - Standalone frontend build script
- `setup.py.backup` - Backup of the old setup.py file
- `MIGRATION_GUIDE.md` - This migration guide

### 🔄 Files Modified
- `install.py` - Updated to use pyproject.toml and handle installation
- `README.md` - Updated installation instructions

### ❌ Files Deprecated
- `setup.py` - Backed up as `setup.py.backup`, no longer used

## Why This Migration Was Necessary

The original `setup.py` approach was causing installation failures due to:

1. **Deprecated setuptools functionality** - The `AttributeError: config_vars` error
2. **Custom command compatibility issues** - Modern setuptools versions don't support the old custom command API
3. **Industry standard shift** - Python packaging has moved to `pyproject.toml` as the standard

## Installation Methods

### Method 1: Automated Installation (Recommended)
```bash
python3 install.py --break-system-packages  # For system Python
# OR
python3 install.py  # For virtual environment
```

### Method 2: Manual Installation
```bash
# Build frontend (optional but recommended)
python3 build_frontend.py

# Install package
pip install -e . --break-system-packages  # For system Python
# OR
pip install -e .  # For virtual environment
```

## Key Benefits

1. **✅ Fixed Installation Issues** - No more `AttributeError: config_vars`
2. **🚀 Modern Standards** - Using industry-standard `pyproject.toml`
3. **🔧 Better Tooling Support** - Compatible with modern Python packaging tools
4. **📦 Cleaner Dependencies** - Explicit dependency management
5. **🛠️ Future-Proof** - Won't break with setuptools updates

## Troubleshooting

### If you encounter issues:

1. **Clear pip cache:**
   ```bash
   pip cache purge
   ```

2. **Uninstall old version:**
   ```bash
   pip uninstall codegenapp
   ```

3. **Reinstall with new method:**
   ```bash
   python3 install.py --break-system-packages
   ```

### Common Issues:

- **"No module named 'codegenapp'"** - Run the installation script again
- **Frontend build fails** - Install Node.js or use `--skip-frontend` flag
- **Permission errors** - Use `--break-system-packages` for system Python or use a virtual environment

## Verification

After installation, verify everything works:

```bash
codegen --help
codegen --version
codegen --verify
```

## Rollback (If Needed)

If you need to rollback to the old setup.py approach:

```bash
# Restore old setup.py
cp setup.py.backup setup.py

# Remove new files
rm pyproject.toml build_frontend.py

# Install with old method (may still fail)
pip install -e . --break-system-packages
```

**Note:** Rollback is not recommended as it will restore the original installation issues.

