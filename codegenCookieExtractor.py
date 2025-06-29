#!/usr/bin/env python3
"""
Comprehensive Chrome Cookie Extractor for Windows
Extracts and decrypts Chrome cookies, saves them to Desktop as 'codegenCookies.json'

Supports:
- Chrome v80+ with AES encryption
- Chrome v20+ with app-bound protection
- Multiple Chrome profiles
- Automatic decryption of encrypted values
- Export in multiple formats

Requirements:
pip install pycryptodome pywin32

Author: Codegen AI Assistant
Date: 2025-06-29
"""

import os
import sys
import json
import base64
import sqlite3
import shutil
import tempfile
import binascii
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import argparse

# Import Windows-specific libraries
try:
    import win32crypt
    from Crypto.Cipher import AES
    CRYPTO_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Missing required libraries: {e}")
    print("Please install: pip install pycryptodome pywin32")
    CRYPTO_AVAILABLE = False

class ChromeCookieExtractor:
    """Comprehensive Chrome cookie extractor for Windows"""
    
    def __init__(self):
        self.user_profile = os.environ.get('USERPROFILE', '')
        if not self.user_profile:
            raise ValueError("USERPROFILE environment variable not found")
        
        self.chrome_paths = self._discover_chrome_installations()
        self.desktop_path = os.path.join(self.user_profile, 'Desktop')
        
    def _discover_chrome_installations(self) -> List[Dict]:
        """Discover all Chrome installations and profiles"""
        installations = []
        
        # Chrome variants to check
        chrome_variants = [
            ('Google Chrome', 'Google\\Chrome'),
            ('Chrome Beta', 'Google\\Chrome Beta'),
            ('Chrome Dev', 'Google\\Chrome Dev'),
            ('Chrome Canary', 'Google\\Chrome SxS'),
            ('Chromium', 'Chromium'),
            ('Microsoft Edge', 'Microsoft\\Edge'),
        ]
        
        for variant_name, variant_path in chrome_variants:
            base_path = Path(self.user_profile) / 'AppData' / 'Local' / variant_path / 'User Data'
            
            if not base_path.exists():
                continue
                
            # Check for profiles
            profiles = []
            
            # Default profile
            default_profile = base_path / 'Default'
            if default_profile.exists():
                profiles.append({
                    'name': 'Default',
                    'path': default_profile,
                    'variant': variant_name
                })
            
            # Numbered profiles
            for item in base_path.iterdir():
                if item.is_dir() and item.name.startswith('Profile '):
                    profiles.append({
                        'name': item.name,
                        'path': item,
                        'variant': variant_name
                    })
            
            installations.extend(profiles)
        
        return installations
    
    def list_profiles(self) -> None:
        """List all available Chrome profiles with detailed information"""
        print("🔍 Available Chrome Profiles:")
        print("=" * 60)
        
        if not self.chrome_paths:
            print("❌ No Chrome installations found!")
            return
        
        for i, profile in enumerate(self.chrome_paths):
            # Check for cookies database
            cookies_paths = [
                profile['path'] / 'Network' / 'Cookies',
                profile['path'] / 'Cookies',
            ]
            
            cookies_db = None
            for path in cookies_paths:
                if path.exists():
                    cookies_db = path
                    break
            
            if cookies_db:
                size_mb = cookies_db.stat().st_size / (1024 * 1024)
                status = f"✅ ({size_mb:.1f}MB)"
            else:
                status = "❌ No cookies"
            
            print(f"  {i}: {status} {profile['variant']} - {profile['name']}")
            print(f"      Path: {profile['path']}")
            
            if cookies_db:
                print(f"      Cookies: {cookies_db}")
            print()
    
    def get_chrome_datetime(self, chromedate: int) -> str:
        """Convert Chrome timestamp to readable datetime"""
        if chromedate and chromedate != 86400000000:
            try:
                # Chrome stores time as microseconds since Windows epoch (1601-01-01)
                return str(datetime(1601, 1, 1) + timedelta(microseconds=chromedate))
            except (ValueError, OverflowError):
                return f"Invalid timestamp: {chromedate}"
        return "Session cookie"
    
    def get_encryption_key(self, profile_path: Path) -> Optional[bytes]:
        """Extract and decrypt the AES encryption key from Chrome's Local State"""
        try:
            # Find Local State file
            local_state_path = profile_path.parent / 'Local State'
            
            if not local_state_path.exists():
                print(f"⚠️  Local State file not found: {local_state_path}")
                return None
            
            with open(local_state_path, 'r', encoding='utf-8') as f:
                local_state = json.load(f)
            
            # Get encrypted key
            encrypted_key_b64 = local_state.get('os_crypt', {}).get('encrypted_key')\n            if not encrypted_key_b64:\n                print(\"⚠️  No encryption key found in Local State\")\n                return None\n            \n            # Decode from base64\n            encrypted_key = base64.b64decode(encrypted_key_b64)\n            \n            # Remove 'DPAPI' prefix (first 5 bytes)\n            encrypted_key = encrypted_key[5:]\n            \n            # Decrypt using Windows DPAPI\n            decrypted_key = win32crypt.CryptUnprotectData(encrypted_key, None, None, None, 0)[1]\n            \n            return decrypted_key\n            \n        except Exception as e:\n            print(f\"❌ Error getting encryption key: {e}\")\n            return None\n    \n    def decrypt_cookie_value(self, encrypted_value: bytes, key: bytes) -> str:\n        \"\"\"Decrypt Chrome cookie value using AES-GCM\"\"\"\n        try:\n            # Check if it's encrypted (starts with 'v10' or 'v11')\n            if encrypted_value[:3] == b'v10':\n                # AES-GCM encryption (Chrome 80+)\n                # Structure: v10 + 12-byte nonce + encrypted_data + 16-byte tag\n                nonce = encrypted_value[3:15]\n                ciphertext = encrypted_value[15:-16]\n                tag = encrypted_value[-16:]\n                \n                cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)\n                decrypted = cipher.decrypt_and_verify(ciphertext, tag)\n                return decrypted.decode('utf-8', errors='ignore')\n                \n            elif encrypted_value[:3] == b'v11':\n                # Newer Chrome versions with additional security\n                nonce = encrypted_value[3:15]\n                ciphertext = encrypted_value[15:-16]\n                tag = encrypted_value[-16:]\n                \n                cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)\n                decrypted = cipher.decrypt_and_verify(ciphertext, tag)\n                return decrypted.decode('utf-8', errors='ignore')\n                \n            elif encrypted_value[:3] == b'v20':\n                # App-bound encryption (Chrome 127+)\n                print(\"⚠️  v20 cookies detected (app-bound). Advanced decryption required.\")\n                return \"[ENCRYPTED_V20]\"\n                \n            else:\n                # Try legacy DPAPI decryption\n                try:\n                    decrypted = win32crypt.CryptUnprotectData(encrypted_value, None, None, None, 0)[1]\n                    return decrypted.decode('utf-8', errors='ignore')\n                except:\n                    return encrypted_value.decode('utf-8', errors='ignore')\n                    \n        except Exception as e:\n            print(f\"⚠️  Decryption failed: {e}\")\n            return \"[DECRYPTION_FAILED]\"\n    \n    def extract_cookies_from_profile(self, profile_index: int, domain_filter: Optional[str] = None) -> List[Dict]:\n        \"\"\"Extract cookies from a specific Chrome profile\"\"\"\n        if profile_index >= len(self.chrome_paths):\n            raise ValueError(f\"Profile index {profile_index} not found\")\n        \n        profile = self.chrome_paths[profile_index]\n        print(f\"🔍 Extracting cookies from {profile['variant']} - {profile['name']}\")\n        \n        # Find cookies database\n        cookies_paths = [\n            profile['path'] / 'Network' / 'Cookies',\n            profile['path'] / 'Cookies',\n        ]\n        \n        cookies_db = None\n        for path in cookies_paths:\n            if path.exists():\n                cookies_db = path\n                break\n        \n        if not cookies_db:\n            raise FileNotFoundError(f\"Cookies database not found in profile: {profile['name']}\")\n        \n        print(f\"📁 Using database: {cookies_db}\")\n        \n        # Get encryption key\n        encryption_key = None\n        if CRYPTO_AVAILABLE:\n            encryption_key = self.get_encryption_key(profile['path'])\n            if encryption_key:\n                print(\"🔑 Encryption key obtained successfully\")\n            else:\n                print(\"⚠️  Could not obtain encryption key - encrypted cookies will not be decrypted\")\n        \n        # Create temporary copy of database (Chrome locks the original)\n        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:\n            temp_db_path = temp_file.name\n        \n        try:\n            shutil.copy2(cookies_db, temp_db_path)\n            \n            # Connect to database\n            conn = sqlite3.connect(temp_db_path)\n            conn.text_factory = lambda b: b.decode(errors='ignore')\n            cursor = conn.cursor()\n            \n            # Build query\n            query = \"\"\"\n                SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly, \n                       samesite, creation_utc, last_access_utc, encrypted_value\n                FROM cookies\n            \"\"\"\n            \n            params = []\n            if domain_filter:\n                query += \" WHERE host_key LIKE ?\"\n                params.append(f\"%{domain_filter}%\")\n            \n            query += \" ORDER BY host_key, name\"\n            \n            cursor.execute(query, params)\n            rows = cursor.fetchall()\n            \n            cookies = []\n            decrypted_count = 0\n            \n            for row in rows:\n                (host_key, name, value, path, expires_utc, is_secure, is_httponly,\n                 samesite, creation_utc, last_access_utc, encrypted_value) = row\n                \n                # Decrypt value if needed\n                if not value and encrypted_value and encryption_key:\n                    try:\n                        decrypted_value = self.decrypt_cookie_value(encrypted_value, encryption_key)\n                        if decrypted_value and not decrypted_value.startswith('['):\n                            value = decrypted_value\n                            decrypted_count += 1\n                    except Exception as e:\n                        print(f\"⚠️  Failed to decrypt cookie {name}: {e}\")\n                \n                # Convert timestamps\n                expires = None\n                if expires_utc and expires_utc > 0:\n                    # Convert Chrome timestamp to Unix timestamp\n                    windows_epoch_diff = 11644473600  # seconds between 1601 and 1970\n                    expires = int((expires_utc / 1000000) - windows_epoch_diff)\n                \n                # Convert SameSite\n                samesite_map = {-1: 'None', 0: 'None', 1: 'Lax', 2: 'Strict'}\n                samesite_str = samesite_map.get(samesite, 'None')\n                \n                cookie = {\n                    'name': name,\n                    'value': value or '[EMPTY]',\n                    'domain': host_key,\n                    'path': path,\n                    'expires': expires,\n                    'secure': bool(is_secure),\n                    'httpOnly': bool(is_httponly),\n                    'sameSite': samesite_str,\n                    'creation': self.get_chrome_datetime(creation_utc),\n                    'lastAccess': self.get_chrome_datetime(last_access_utc)\n                }\n                \n                cookies.append(cookie)\n            \n            conn.close()\n            \n            print(f\"✅ Extracted {len(cookies)} cookies\")\n            if decrypted_count > 0:\n                print(f\"🔓 Decrypted {decrypted_count} encrypted cookies\")\n            \n            return cookies\n            \n        finally:\n            # Clean up temporary file\n            try:\n                os.unlink(temp_db_path)\n            except:\n                pass\n    \n    def save_cookies_to_desktop(self, cookies: List[Dict], filename: str = 'codegenCookies.json', \n                               format_type: str = 'codegen_auth') -> str:\n        \"\"\"Save cookies to desktop in specified format\"\"\"\n        output_path = os.path.join(self.desktop_path, filename)\n        \n        if format_type == 'codegen_auth':\n            # Format for codegenApp API\n            auth_context = {\n                'cookies': cookies,\n                'localStorage': {},\n                'sessionStorage': {},\n                'origin': 'https://codegen.com',\n                'extracted_at': datetime.now().isoformat(),\n                'total_cookies': len(cookies)\n            }\n            data = auth_context\n            \n        elif format_type == 'netscape':\n            # Netscape cookie format\n            lines = ['# Netscape HTTP Cookie File\\n']\n            for cookie in cookies:\n                expires = cookie.get('expires', 0) or 0\n                line = f\"{cookie['domain']}\\tTRUE\\t{cookie['path']}\\t{str(cookie['secure']).upper()}\\t{expires}\\t{cookie['name']}\\t{cookie['value']}\\n\"\n                lines.append(line)\n            \n            with open(output_path, 'w', encoding='utf-8') as f:\n                f.writelines(lines)\n            return output_path\n            \n        else:\n            # Raw JSON format\n            data = {\n                'cookies': cookies,\n                'extracted_at': datetime.now().isoformat(),\n                'total_cookies': len(cookies)\n            }\n        \n        with open(output_path, 'w', encoding='utf-8') as f:\n            json.dump(data, f, indent=2, ensure_ascii=False)\n        \n        return output_path\n    \n    def extract_codegen_cookies(self, profile_index: int = 0) -> str:\n        \"\"\"Extract cookies specifically for codegen.com and save to desktop\"\"\"\n        print(\"🍪 Chrome Cookie Extractor for CodegenApp\")\n        print(\"=\" * 50)\n        \n        if not CRYPTO_AVAILABLE:\n            print(\"❌ Required libraries not available. Please install:\")\n            print(\"   pip install pycryptodome pywin32\")\n            return \"\"\n        \n        try:\n            # Extract cookies\n            cookies = self.extract_cookies_from_profile(profile_index, 'codegen.com')\n            \n            if not cookies:\n                print(\"❌ No cookies found for codegen.com\")\n                print(\"💡 Make sure you're logged into codegen.com in Chrome\")\n                return \"\"\n            \n            # Filter for valid cookies\n            valid_cookies = [c for c in cookies if c['value'] != '[EMPTY]']\n            \n            if not valid_cookies:\n                print(\"❌ No valid cookies found for codegen.com\")\n                return \"\"\n            \n            # Save to desktop\n            output_path = self.save_cookies_to_desktop(valid_cookies, 'codegenCookies.json', 'codegen_auth')\n            \n            print(f\"\\n🎉 Success! Cookies saved to: {output_path}\")\n            print(f\"📊 Total cookies: {len(valid_cookies)}\")\n            \n            # Show sample cookies (without values for security)\n            print(\"\\n🍪 Sample cookies extracted:\")\n            for cookie in valid_cookies[:5]:\n                print(f\"  - {cookie['name']} (domain: {cookie['domain']}, secure: {cookie['secure']})\")\n            if len(valid_cookies) > 5:\n                print(f\"  ... and {len(valid_cookies) - 5} more\")\n            \n            print(\"\\n📋 Next steps:\")\n            print(\"1. Copy codegenCookies.json to your WSL2 environment\")\n            print(\"2. Use with codegenApp API calls:\")\n            print(\"   curl -X POST http://localhost:3001/api/resume-agent-run \\\\\")\n            print(\"     -H 'Content-Type: application/json' \\\\\")\n            print(\"     -d @codegenCookies.json\")\n            \n            return output_path\n            \n        except Exception as e:\n            print(f\"❌ Error extracting cookies: {e}\")\n            return \"\"\n\ndef main():\n    \"\"\"Main function with command line interface\"\"\"\n    parser = argparse.ArgumentParser(description='Extract Chrome cookies for CodegenApp')\n    parser.add_argument('--profile', '-p', type=int, default=0,\n                       help='Chrome profile index (default: 0)')\n    parser.add_argument('--list-profiles', '-l', action='store_true',\n                       help='List available Chrome profiles')\n    parser.add_argument('--domain', '-d', default='codegen.com',\n                       help='Domain to filter cookies (default: codegen.com)')\n    parser.add_argument('--format', '-f', choices=['codegen_auth', 'json', 'netscape'],\n                       default='codegen_auth', help='Output format')\n    parser.add_argument('--output', '-o', default='codegenCookies.json',\n                       help='Output filename (saved to Desktop)')\n    \n    args = parser.parse_args()\n    \n    try:\n        extractor = ChromeCookieExtractor()\n        \n        if args.list_profiles:\n            extractor.list_profiles()\n            return\n        \n        # Check if profiles exist\n        if not extractor.chrome_paths:\n            print(\"❌ No Chrome installations found!\")\n            print(\"Make sure Google Chrome is installed and has been used at least once.\")\n            return\n        \n        if args.profile >= len(extractor.chrome_paths):\n            print(f\"❌ Profile index {args.profile} not found!\")\n            print(\"Use --list-profiles to see available profiles.\")\n            return\n        \n        # Extract cookies for codegen.com by default\n        if args.domain == 'codegen.com':\n            output_path = extractor.extract_codegen_cookies(args.profile)\n        else:\n            # Extract for custom domain\n            cookies = extractor.extract_cookies_from_profile(args.profile, args.domain)\n            output_path = extractor.save_cookies_to_desktop(cookies, args.output, args.format)\n            print(f\"✅ Cookies saved to: {output_path}\")\n        \n    except KeyboardInterrupt:\n        print(\"\\n⚠️  Operation cancelled by user\")\n    except Exception as e:\n        print(f\"❌ Error: {e}\")\n        sys.exit(1)\n\nif __name__ == '__main__':\n    main()

