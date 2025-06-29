#!/usr/bin/env python3
"""
Chrome Cookie Extractor for Windows -> WSL2 Transfer
Extracts cookies from Google Chrome on Windows and formats them for codegenApp usage.
"""

import os
import sqlite3
import json
import shutil
import tempfile
from pathlib import Path
from datetime import datetime
import argparse
import sys

class ChromeCookieExtractor:
    def __init__(self):
        self.chrome_paths = self._get_chrome_paths()
        
    def _get_chrome_paths(self):
        """Get possible Chrome profile paths on Windows"""
        user_data_paths = [
            Path.home() / "AppData" / "Local" / "Google" / "Chrome" / "User Data",
            Path.home() / "AppData" / "Local" / "Google" / "Chrome Beta" / "User Data",
            Path.home() / "AppData" / "Local" / "Google" / "Chrome Dev" / "User Data",
            Path.home() / "AppData" / "Local" / "Chromium" / "User Data",
        ]
        
        profiles = []
        for base_path in user_data_paths:
            if base_path.exists():
                # Add Default profile
                default_profile = base_path / "Default"
                if default_profile.exists():
                    profiles.append({
                        'name': 'Default',
                        'path': default_profile,
                        'browser': base_path.name.replace(' User Data', '')
                    })
                
                # Add numbered profiles
                for item in base_path.iterdir():
                    if item.is_dir() and item.name.startswith('Profile '):
                        profiles.append({
                            'name': item.name,
                            'path': item,
                            'browser': base_path.name.replace(' User Data', '')
                        })
        
        return profiles
    
    def list_profiles(self):
        """List all available Chrome profiles"""
        print("Available Chrome profiles:")
        for i, profile in enumerate(self.chrome_paths):
            cookies_db = profile['path'] / 'Cookies'
            status = "✅" if cookies_db.exists() else "❌"
            print(f"  {i}: {status} {profile['browser']} - {profile['name']} ({profile['path']})")
        return self.chrome_paths
    
    def extract_cookies(self, profile_index=0, domain_filter=None):
        """Extract cookies from specified Chrome profile"""
        if profile_index >= len(self.chrome_paths):
            raise ValueError(f"Profile index {profile_index} not found")
        
        profile = self.chrome_paths[profile_index]
        cookies_db = profile['path'] / 'Cookies'
        
        if not cookies_db.exists():
            raise FileNotFoundError(f"Cookies database not found: {cookies_db}")
        
        print(f"Extracting cookies from {profile['browser']} - {profile['name']}")
        
        # Create temporary copy of cookies database (Chrome locks the original)
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_file:
            temp_db_path = temp_file.name
            
        try:
            shutil.copy2(cookies_db, temp_db_path)
            
            # Connect to temporary database
            conn = sqlite3.connect(temp_db_path)
            cursor = conn.cursor()
            
            # Query cookies
            query = """
            SELECT 
                host_key,
                name,
                value,
                path,
                expires_utc,
                is_secure,
                is_httponly,
                samesite,
                creation_utc,
                last_access_utc
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
            for row in rows:
                (host_key, name, value, path, expires_utc, is_secure, 
                 is_httponly, samesite, creation_utc, last_access_utc) = row
                
                # Convert Chrome timestamps (microseconds since Windows epoch)
                # to Unix timestamps (seconds since Unix epoch)
                def chrome_time_to_unix(chrome_time):
                    if not chrome_time or chrome_time == 0:
                        return None
                    # Chrome uses microseconds since Windows epoch (1601-01-01)
                    # Unix uses seconds since Unix epoch (1970-01-01)
                    windows_epoch_diff = 11644473600  # seconds between 1601 and 1970
                    return int((chrome_time / 1000000) - windows_epoch_diff)
                
                expires = chrome_time_to_unix(expires_utc)
                created = chrome_time_to_unix(creation_utc)
                last_accessed = chrome_time_to_unix(last_access_utc)
                
                # Convert SameSite values
                samesite_map = {0: 'None', 1: 'Lax', 2: 'Strict'}
                samesite_str = samesite_map.get(samesite, 'None')
                
                cookie = {
                    'name': name,
                    'value': value,
                    'domain': host_key,
                    'path': path,
                    'expires': expires,
                    'secure': bool(is_secure),
                    'httpOnly': bool(is_httponly),
                    'sameSite': samesite_str,
                    'created': created,
                    'lastAccessed': last_accessed
                }
                
                cookies.append(cookie)
            
            conn.close()
            return cookies
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_db_path)
            except:
                pass
    
    def format_for_codegen(self, cookies):
        """Format cookies for codegenApp usage"""
        codegen_cookies = []
        
        for cookie in cookies:
            # Filter out expired cookies
            if cookie['expires'] and cookie['expires'] < datetime.now().timestamp():
                continue
            
            codegen_cookie = {
                'name': cookie['name'],
                'value': cookie['value'],
                'domain': cookie['domain'],
                'path': cookie['path'],
                'secure': cookie['secure'],
                'httpOnly': cookie['httpOnly'],
                'sameSite': cookie['sameSite']
            }
            
            # Add expires if not session cookie
            if cookie['expires']:
                codegen_cookie['expires'] = cookie['expires']
            
            codegen_cookies.append(codegen_cookie)
        
        return codegen_cookies
    
    def save_cookies(self, cookies, output_file, format_type='json'):
        """Save cookies to file in specified format"""
        if format_type == 'json':
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(cookies, f, indent=2, ensure_ascii=False)
        
        elif format_type == 'codegen_auth':
            # Format for direct use in codegenApp API calls
            auth_context = {
                'cookies': cookies,
                'localStorage': {},
                'sessionStorage': {},
                'origin': 'https://codegen.com'
            }
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(auth_context, f, indent=2, ensure_ascii=False)
        
        elif format_type == 'curl':
            # Format for curl commands
            cookie_strings = []
            for cookie in cookies:
                cookie_strings.append(f"{cookie['name']}={cookie['value']}")
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write('# Use with curl like this:\n')
                f.write('# curl -H "Cookie: ' + '; '.join(cookie_strings) + '" https://codegen.com\n\n')
                f.write('; '.join(cookie_strings))
        
        print(f"Saved {len(cookies)} cookies to {output_file} (format: {format_type})")

def main():
    parser = argparse.ArgumentParser(description='Extract Chrome cookies for WSL2 transfer')
    parser.add_argument('--domain', '-d', default='codegen.com', 
                       help='Domain to filter cookies (default: codegen.com)')
    parser.add_argument('--profile', '-p', type=int, default=0,
                       help='Chrome profile index (default: 0)')
    parser.add_argument('--output', '-o', default='chrome_cookies.json',
                       help='Output file (default: chrome_cookies.json)')
    parser.add_argument('--format', '-f', choices=['json', 'codegen_auth', 'curl'], 
                       default='codegen_auth',
                       help='Output format (default: codegen_auth)')
    parser.add_argument('--list-profiles', '-l', action='store_true',
                       help='List available Chrome profiles and exit')
    parser.add_argument('--all-domains', '-a', action='store_true',
                       help='Extract cookies for all domains (not just --domain)')
    
    args = parser.parse_args()
    
    try:
        extractor = ChromeCookieExtractor()
        
        if args.list_profiles:
            extractor.list_profiles()
            return
        
        # Check if profiles exist
        profiles = extractor.list_profiles()
        if not profiles:
            print("❌ No Chrome profiles found!")
            print("Make sure Google Chrome is installed and has been run at least once.")
            return
        
        if args.profile >= len(profiles):
            print(f"❌ Profile index {args.profile} not found!")
            print("Use --list-profiles to see available profiles.")
            return
        
        print(f"\n🔍 Extracting cookies...")
        
        # Extract cookies
        domain_filter = None if args.all_domains else args.domain
        cookies = extractor.extract_cookies(args.profile, domain_filter)
        
        if not cookies:
            print(f"❌ No cookies found for domain: {args.domain}")
            print("Make sure you're logged into codegen.com in Chrome.")
            return
        
        print(f"✅ Found {len(cookies)} cookies")
        
        # Format for codegenApp
        formatted_cookies = extractor.format_for_codegen(cookies)
        print(f"✅ Formatted {len(formatted_cookies)} valid cookies")
        
        # Save cookies
        extractor.save_cookies(formatted_cookies, args.output, args.format)
        
        print(f"\n🎉 Success! Cookies saved to: {args.output}")
        print(f"\n📋 Next steps:")
        print(f"1. Copy {args.output} to your WSL2 environment")
        print(f"2. Use the cookies in your codegenApp API calls")
        
        if args.format == 'codegen_auth':
            print(f"\n💡 Example usage in WSL2:")
            print(f"curl -X POST http://localhost:3001/api/resume-agent-run \\")
            print(f"  -H 'Content-Type: application/json' \\")
            print(f"  -d @{args.output}")
        
        # Show sample of extracted cookies (without values for security)
        print(f"\n🍪 Sample cookies extracted:")
        for cookie in formatted_cookies[:5]:
            print(f"  - {cookie['name']} (domain: {cookie['domain']}, secure: {cookie['secure']})")
        if len(formatted_cookies) > 5:
            print(f"  ... and {len(formatted_cookies) - 5} more")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

