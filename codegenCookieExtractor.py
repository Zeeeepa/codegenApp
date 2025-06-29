#!/usr/bin/env python3
"""
Comprehensive Chrome Cookie Extractor for Windows
Extracts and decrypts Chrome cookies, saves them to Desktop as 'codegenCookies.json'

Supports:
- Chrome v80+ with AES encryption
- Chrome v127+ with app-bound protection detection
- Multiple Chrome profiles and variants
- Automatic decryption of encrypted values
- Export in multiple formats
- Full Windows compatibility

Requirements:
pip install pycryptodome pywin32

Author: Codegen AI Assistant
Date: 2025-06-29
Version: 2.0 - Enhanced Windows Support
"""

import os
import sys
import json
import base64
import sqlite3
import shutil
import tempfile
import binascii
import subprocess
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import argparse

# Windows-specific imports
try:
    import win32crypt
    import win32api
    import win32con
    from Crypto.Cipher import AES
    CRYPTO_AVAILABLE = True
    print("✅ Cryptographic libraries loaded successfully")
except ImportError as e:
    print(f"❌ Missing required libraries: {e}")
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pycryptodome", "pywin32"])
        import win32crypt
        import win32api
        import win32con
        from Crypto.Cipher import AES
        CRYPTO_AVAILABLE = True
        print("✅ Successfully installed and loaded cryptographic libraries")
    except Exception as install_error:
        print(f"❌ Failed to install dependencies: {install_error}")
        print("Please manually run: pip install pycryptodome pywin32")
        CRYPTO_AVAILABLE = False

# Check for optional process monitoring
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

class ChromeCookieExtractor:
    """Comprehensive Chrome cookie extractor for Windows"""
    
    def __init__(self):
        self.user_profile = os.environ.get('USERPROFILE', '')
        if not self.user_profile:
            raise ValueError("USERPROFILE environment variable not found")
        
        # Ensure Desktop path exists
        self.desktop_path = os.path.join(self.user_profile, 'Desktop')
        if not os.path.exists(self.desktop_path):
            print(f"⚠️  Desktop path not found: {self.desktop_path}")
            # Try alternative Desktop locations
            alt_desktop = os.path.join(self.user_profile, 'OneDrive', 'Desktop')
            if os.path.exists(alt_desktop):
                self.desktop_path = alt_desktop
                print(f"✅ Using OneDrive Desktop: {self.desktop_path}")
            else:
                # Create Desktop folder if it doesn't exist
                os.makedirs(self.desktop_path, exist_ok=True)
                print(f"✅ Created Desktop folder: {self.desktop_path}")
        
        print(f"🏠 User Profile: {self.user_profile}")
        print(f"🖥️  Desktop Path: {self.desktop_path}")
        
        self.chrome_paths = self._discover_chrome_installations()
        print(f"🔍 Found {len(self.chrome_paths)} Chrome profile(s)")
        
        # Check if Chrome is running
        self._check_chrome_processes()
        
    def _discover_chrome_installations(self) -> List[Dict]:
        """Discover all Chrome installations and profiles"""
        installations = []
        
        # Chrome variants to check (Windows paths)
        chrome_variants = [
            ('Google Chrome', 'Google\\Chrome'),
            ('Chrome Beta', 'Google\\Chrome Beta'),
            ('Chrome Dev', 'Google\\Chrome Dev'),
            ('Chrome Canary', 'Google\\Chrome SxS'),
            ('Chromium', 'Chromium'),
            ('Microsoft Edge', 'Microsoft\\Edge'),
            ('Brave Browser', 'BraveSoftware\\Brave-Browser'),
            ('Opera', 'Opera Software\\Opera Stable'),
            ('Vivaldi', 'Vivaldi'),
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
    
    def _check_chrome_processes(self) -> None:
        """Check if Chrome processes are running and warn user"""
        if not PSUTIL_AVAILABLE:
            print("ℹ️  Install 'psutil' for Chrome process detection: pip install psutil")
            return
        
        try:
            chrome_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'exe']):
                try:
                    proc_name = proc.info['name'].lower()
                    if any(browser in proc_name for browser in ['chrome', 'msedge', 'brave', 'opera', 'vivaldi']):
                        chrome_processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            if chrome_processes:
                print(f"⚠️  Found {len(chrome_processes)} browser process(es) running:")
                for proc in chrome_processes[:5]:  # Show first 5
                    print(f"   - {proc['name']} (PID: {proc['pid']})")
                if len(chrome_processes) > 5:
                    print(f"   ... and {len(chrome_processes) - 5} more")
                print("💡 For best results, close all browser windows before extracting cookies")
            else:
                print("✅ No browser processes detected - good for cookie extraction")
        except Exception as e:
            print(f"⚠️  Could not check browser processes: {e}")
    
    def _kill_chrome_processes(self) -> bool:
        """Attempt to gracefully close Chrome processes"""
        if not PSUTIL_AVAILABLE:
            return False
        
        try:
            chrome_processes = []
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    if 'chrome' in proc.info['name'].lower():
                        chrome_processes.append(proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            if not chrome_processes:
                return True
            
            print(f"🔄 Attempting to close {len(chrome_processes)} Chrome process(es)...")
            
            # Try graceful termination first
            for proc in chrome_processes:
                try:
                    proc.terminate()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            # Wait for processes to close
            time.sleep(3)
            
            # Check if any are still running
            still_running = []
            for proc in chrome_processes:
                try:
                    if proc.is_running():
                        still_running.append(proc)
                except psutil.NoSuchProcess:
                    continue
            
            if still_running:
                print(f"⚠️  {len(still_running)} process(es) still running - you may need to close Chrome manually")
                return False
            else:
                print("✅ Successfully closed Chrome processes")
                return True
                
        except Exception as e:
            print(f"❌ Error closing Chrome processes: {e}")
            return False
    
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
            
            print(f"📄 Reading Local State: {local_state_path}")
            
            # Read with multiple encoding attempts
            local_state_content = None
            for encoding in ['utf-8', 'utf-8-sig', 'latin1']:
                try:
                    with open(local_state_path, 'r', encoding=encoding) as f:
                        local_state_content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if not local_state_content:
                print("❌ Could not read Local State file with any encoding")
                return None
            
            local_state = json.loads(local_state_content)
            
            # Get encrypted key
            os_crypt = local_state.get('os_crypt', {})
            encrypted_key_b64 = os_crypt.get('encrypted_key')
            
            if not encrypted_key_b64:
                print("⚠️  No encryption key found in Local State")
                print(f"Available os_crypt keys: {list(os_crypt.keys())}")
                return None
            
            print("🔑 Found encrypted key in Local State")
            
            # Decode from base64
            encrypted_key = base64.b64decode(encrypted_key_b64)
            
            # Check for DPAPI prefix
            if encrypted_key[:5] != b'DPAPI':
                print("⚠️  Unexpected key format - no DPAPI prefix")
                return None
            
            # Remove 'DPAPI' prefix (first 5 bytes)
            encrypted_key = encrypted_key[5:]
            
            # Decrypt using Windows DPAPI
            try:
                decrypted_key = win32crypt.CryptUnprotectData(encrypted_key, None, None, None, 0)[1]
                print("✅ Successfully decrypted encryption key using DPAPI")
                return decrypted_key
            except Exception as dpapi_error:
                print(f"❌ DPAPI decryption failed: {dpapi_error}")
                
                # Check for app-bound encryption
                app_bound_key = os_crypt.get('app_bound_encrypted_key')
                if app_bound_key:
                    print("⚠️  App-bound encryption detected (Chrome 127+)")
                    print("This requires elevated privileges and additional decryption steps")
                    return None
                
                return None
            
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in Local State file: {e}")
            return None
        except Exception as e:
            print(f"❌ Error getting encryption key: {e}")
            return None
    
    def decrypt_cookie_value(self, encrypted_value: bytes, key: bytes) -> str:
        """Decrypt Chrome cookie value using AES-GCM"""
        try:
            # Check if it's encrypted (starts with 'v10' or 'v11')
            if encrypted_value[:3] == b'v10':
                # AES-GCM encryption (Chrome 80+)
                # Structure: v10 + 12-byte nonce + encrypted_data + 16-byte tag
                nonce = encrypted_value[3:15]
                ciphertext = encrypted_value[15:-16]
                tag = encrypted_value[-16:]
                
                cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
                decrypted = cipher.decrypt_and_verify(ciphertext, tag)
                return decrypted.decode('utf-8', errors='ignore')
                
            elif encrypted_value[:3] == b'v11':
                # Newer Chrome versions with additional security
                nonce = encrypted_value[3:15]
                ciphertext = encrypted_value[15:-16]
                tag = encrypted_value[-16:]
                
                cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
                decrypted = cipher.decrypt_and_verify(ciphertext, tag)
                return decrypted.decode('utf-8', errors='ignore')
                
            elif encrypted_value[:3] == b'v20':
                # App-bound encryption (Chrome 127+)
                print("⚠️  v20 cookies detected (app-bound). Advanced decryption required.")
                return "[ENCRYPTED_V20]"
                
            else:
                # Try legacy DPAPI decryption
                try:
                    decrypted = win32crypt.CryptUnprotectData(encrypted_value, None, None, None, 0)[1]
                    return decrypted.decode('utf-8', errors='ignore')
                except:
                    return encrypted_value.decode('utf-8', errors='ignore')
                    
        except Exception as e:
            print(f"⚠️  Decryption failed: {e}")
            return "[DECRYPTION_FAILED]"
    
    def extract_cookies_from_profile(self, profile_index: int, domain_filter: Optional[str] = None) -> List[Dict]:
        """Extract cookies from a specific Chrome profile"""
        if profile_index >= len(self.chrome_paths):
            raise ValueError(f"Profile index {profile_index} not found")
        
        profile = self.chrome_paths[profile_index]
        print(f"🔍 Extracting cookies from {profile['variant']} - {profile['name']}")
        
        # Find cookies database
        cookies_paths = [
            profile['path'] / 'Network' / 'Cookies',
            profile['path'] / 'Cookies',
        ]
        
        cookies_db = None
        for path in cookies_paths:
            if path.exists():
                cookies_db = path
                break
        
        if not cookies_db:
            raise FileNotFoundError(f"Cookies database not found in profile: {profile['name']}")
        
        print(f"📁 Using database: {cookies_db}")
        
        # Get encryption key
        encryption_key = None
        if CRYPTO_AVAILABLE:
            encryption_key = self.get_encryption_key(profile['path'])
            if encryption_key:
                print("🔑 Encryption key obtained successfully")
            else:
                print("⚠️  Could not obtain encryption key - encrypted cookies will not be decrypted")
        
        # Create temporary copy of database (Chrome locks the original)
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            temp_db_path = temp_file.name
        
        try:
            shutil.copy2(cookies_db, temp_db_path)
            
            # Connect to database
            conn = sqlite3.connect(temp_db_path)
            conn.text_factory = lambda b: b.decode(errors='ignore')
            cursor = conn.cursor()
            
            # Build query
            query = """
                SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly, 
                       samesite, creation_utc, last_access_utc, encrypted_value
                FROM cookies
            """
            
            params = []
            if domain_filter:
                query += " WHERE host_key LIKE ?"
                params.append(f"%{domain_filter}%")
            
            query += " ORDER BY host_key, name"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            cookies = []
            decrypted_count = 0
            
            for row in rows:
                (host_key, name, value, path, expires_utc, is_secure, is_httponly,
                 samesite, creation_utc, last_access_utc, encrypted_value) = row
                
                # Decrypt value if needed
                if not value and encrypted_value and encryption_key:
                    try:
                        decrypted_value = self.decrypt_cookie_value(encrypted_value, encryption_key)
                        if decrypted_value and not decrypted_value.startswith('['):
                            value = decrypted_value
                            decrypted_count += 1
                    except Exception as e:
                        print(f"⚠️  Failed to decrypt cookie {name}: {e}")
                
                # Convert timestamps
                expires = None
                if expires_utc and expires_utc > 0:
                    # Convert Chrome timestamp to Unix timestamp
                    windows_epoch_diff = 11644473600  # seconds between 1601 and 1970
                    expires = int((expires_utc / 1000000) - windows_epoch_diff)
                
                # Convert SameSite
                samesite_map = {-1: 'None', 0: 'None', 1: 'Lax', 2: 'Strict'}
                samesite_str = samesite_map.get(samesite, 'None')
                
                cookie = {
                    'name': name,
                    'value': value or '[EMPTY]',
                    'domain': host_key,
                    'path': path,
                    'expires': expires,
                    'secure': bool(is_secure),
                    'httpOnly': bool(is_httponly),
                    'sameSite': samesite_str,
                    'creation': self.get_chrome_datetime(creation_utc),
                    'lastAccess': self.get_chrome_datetime(last_access_utc)
                }
                
                cookies.append(cookie)
            
            conn.close()
            
            print(f"✅ Extracted {len(cookies)} cookies")
            if decrypted_count > 0:
                print(f"🔓 Decrypted {decrypted_count} encrypted cookies")
            
            return cookies
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_db_path)
            except:
                pass
    
    def save_cookies_to_desktop(self, cookies: List[Dict], filename: str = 'codegenCookies.json', 
                               format_type: str = 'codegen_auth') -> str:
        """Save cookies to desktop in specified format"""
        output_path = os.path.join(self.desktop_path, filename)
        
        if format_type == 'codegen_auth':
            # Format for codegenApp API
            auth_context = {
                'cookies': cookies,
                'localStorage': {},
                'sessionStorage': {},
                'origin': 'https://codegen.com',
                'extracted_at': datetime.now().isoformat(),
                'total_cookies': len(cookies)
            }
            data = auth_context
            
        elif format_type == 'netscape':
            # Netscape cookie format
            lines = ['# Netscape HTTP Cookie File\\n']
            for cookie in cookies:
                expires = cookie.get('expires', 0) or 0
                line = f"{cookie['domain']}\\tTRUE\\t{cookie['path']}\\t{str(cookie['secure']).upper()}\\t{expires}\\t{cookie['name']}\\t{cookie['value']}\\n"
                lines.append(line)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            return output_path
            
        else:
            # Raw JSON format
            data = {
                'cookies': cookies,
                'extracted_at': datetime.now().isoformat(),
                'total_cookies': len(cookies)
            }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return output_path
    
    def extract_codegen_cookies(self, profile_index: int = 0) -> str:
        """Extract cookies specifically for codegen.com and save to desktop"""
        print("🍪 Chrome Cookie Extractor for CodegenApp")
        print("=" * 50)
        
        if not CRYPTO_AVAILABLE:
            print("❌ Required libraries not available. Please install:")
            print("   pip install pycryptodome pywin32")
            return ""
        
        try:
            # Extract cookies
            cookies = self.extract_cookies_from_profile(profile_index, 'codegen.com')
            
            if not cookies:
                print("❌ No cookies found for codegen.com")
                print("💡 Make sure you're logged into codegen.com in Chrome")
                return ""
            
            # Filter for valid cookies
            valid_cookies = [c for c in cookies if c['value'] != '[EMPTY]']
            
            if not valid_cookies:
                print("❌ No valid cookies found for codegen.com")
                return ""
            
            # Save to desktop
            output_path = self.save_cookies_to_desktop(valid_cookies, 'codegenCookies.json', 'codegen_auth')
            
            print(f"\\n🎉 Success! Cookies saved to: {output_path}")
            print(f"📊 Total cookies: {len(valid_cookies)}")
            
            # Show sample cookies (without values for security)
            print("\\n🍪 Sample cookies extracted:")
            for cookie in valid_cookies[:5]:
                print(f"  - {cookie['name']} (domain: {cookie['domain']}, secure: {cookie['secure']})")
            if len(valid_cookies) > 5:
                print(f"  ... and {len(valid_cookies) - 5} more")
            
            print("\\n📋 Next steps:")
            print("1. Copy codegenCookies.json to your WSL2 environment")
            print("2. Use with codegenApp API calls:")
            print("   curl -X POST http://localhost:3001/api/resume-agent-run \\\\")
            print("     -H 'Content-Type: application/json' \\\\")
            print("     -d @codegenCookies.json")
            
            return output_path
            
        except Exception as e:
            print(f"❌ Error extracting cookies: {e}")
            return ""

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description='Extract Chrome cookies for CodegenApp')
    parser.add_argument('--profile', '-p', type=int, default=0,
                       help='Chrome profile index (default: 0)')
    parser.add_argument('--list-profiles', '-l', action='store_true',
                       help='List available Chrome profiles')
    parser.add_argument('--domain', '-d', default='codegen.com',
                       help='Domain to filter cookies (default: codegen.com)')
    parser.add_argument('--format', '-f', choices=['codegen_auth', 'json', 'netscape'],
                       default='codegen_auth', help='Output format')
    parser.add_argument('--output', '-o', default='codegenCookies.json',
                       help='Output filename (saved to Desktop)')
    parser.add_argument('--close-chrome', '-c', action='store_true',
                       help='Attempt to close Chrome processes before extraction')
    
    args = parser.parse_args()
    
    try:
        extractor = ChromeCookieExtractor()
        
        if args.close_chrome:
            print("🔄 Attempting to close Chrome processes...")
            extractor._kill_chrome_processes()
            time.sleep(2)  # Wait a bit after closing
        
        if args.list_profiles:
            extractor.list_profiles()
            return
        
        # Check if profiles exist
        if not extractor.chrome_paths:
            print("❌ No Chrome installations found!")
            print("Make sure Google Chrome is installed and has been used at least once.")
            return
        
        if args.profile >= len(extractor.chrome_paths):
            print(f"❌ Profile index {args.profile} not found!")
            print("Use --list-profiles to see available profiles.")
            return
        
        # Extract cookies for codegen.com by default
        if args.domain == 'codegen.com':
            output_path = extractor.extract_codegen_cookies(args.profile)
        else:
            # Extract for custom domain
            cookies = extractor.extract_cookies_from_profile(args.profile, args.domain)
            output_path = extractor.save_cookies_to_desktop(cookies, args.output, args.format)
            print(f"✅ Cookies saved to: {output_path}")
        
    except KeyboardInterrupt:
        print("\\n⚠️  Operation cancelled by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

