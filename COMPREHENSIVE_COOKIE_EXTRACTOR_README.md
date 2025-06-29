# 🍪 Comprehensive Chrome Cookie Extractor for CodegenApp

A modern, full-featured Python script that extracts and decrypts Chrome cookies on Windows, specifically designed for CodegenApp authentication in WSL2 environments.

## 🎯 Features

### ✅ **Complete Chrome Support**
- **All Chrome variants**: Chrome, Chrome Beta, Chrome Dev, Chrome Canary, Chromium, Microsoft Edge
- **All profiles**: Default, Profile 1, Profile 2, etc.
- **Modern encryption**: Supports Chrome v80+ AES-GCM encryption
- **Legacy support**: Handles older DPAPI encryption
- **App-bound detection**: Identifies Chrome v127+ app-bound cookies

### 🔐 **Advanced Decryption**
- **Automatic key extraction** from Chrome's Local State
- **AES-GCM decryption** for encrypted cookie values
- **Windows DPAPI integration** for key decryption
- **Fallback mechanisms** for different encryption types
- **Error handling** for corrupted or inaccessible cookies

### 📁 **Multiple Output Formats**
- **CodegenApp format**: Ready-to-use auth context
- **Raw JSON**: Complete cookie data with metadata
- **Netscape format**: Compatible with curl and other tools

### 🛡️ **Safety & Security**
- **Temporary database copies** to avoid Chrome conflicts
- **Automatic cleanup** of temporary files
- **Safe error handling** with detailed diagnostics
- **No permanent Chrome modifications**

## 📋 Requirements

### System Requirements
- **Windows 10/11**
- **Python 3.6+**
- **Google Chrome** (or compatible browser)
- **Active login** to codegen.com

### Python Dependencies
```bash
pip install pycryptodome pywin32
```

## 🚀 Quick Start

### Option 1: Easy Batch Script (Recommended)

1. **Download files** to your Windows machine:
   - `codegenCookieExtractor.py`
   - `extractCodegenCookies.bat`

2. **Run the batch script**:
   ```cmd
   extractCodegenCookies.bat
   ```

3. **Follow the prompts** to select your Chrome profile

4. **Find your cookies** on the Desktop as `codegenCookies.json`

### Option 2: Python Command Line

1. **List available profiles**:
   ```cmd
   python codegenCookieExtractor.py --list-profiles
   ```

2. **Extract cookies**:
   ```cmd
   python codegenCookieExtractor.py --profile 0
   ```

3. **Check Desktop** for `codegenCookies.json`

## 📖 Detailed Usage

### Command Line Options

```bash
python codegenCookieExtractor.py [OPTIONS]

Options:
  -p, --profile INDEX       Chrome profile index (default: 0)
  -l, --list-profiles       List available Chrome profiles
  -d, --domain DOMAIN       Domain to filter cookies (default: codegen.com)
  -f, --format FORMAT       Output format: codegen_auth|json|netscape (default: codegen_auth)
  -o, --output FILE         Output filename (saved to Desktop)
```

### Examples

**List all Chrome profiles:**
```cmd
python codegenCookieExtractor.py --list-profiles
```

**Extract from specific profile:**
```cmd
python codegenCookieExtractor.py --profile 2
```

**Extract all domains:**
```cmd
python codegenCookieExtractor.py --domain \"\" --format json
```

**Custom output format:**
```cmd
python codegenCookieExtractor.py --format netscape --output cookies.txt
```

## 🔄 Transfer to WSL2

### Method 1: Direct Copy
```bash
# In WSL2, access the Windows Desktop
cp /mnt/c/Users/YourUsername/Desktop/codegenCookies.json ~/
```

### Method 2: Windows File Explorer
1. Navigate to your Desktop
2. Copy `codegenCookies.json`
3. Paste into your WSL2 home directory

## 🛠️ Using with CodegenApp

### Basic API Call
```bash
# In WSL2
curl -X POST http://localhost:3001/api/resume-agent-run \
  -H \"Content-Type: application/json\" \
  -d @codegenCookies.json
```

### Custom Agent Run
```bash
# Modify the JSON for specific agent run
jq '.agentRunId = \"12345\" | .organizationId = \"456\" | .prompt = \"Continue task\"' \
  codegenCookies.json > agent_request.json

curl -X POST http://localhost:3001/api/resume-agent-run \
  -H \"Content-Type: application/json\" \
  -d @agent_request.json
```

## 🔍 Output Format Details

### CodegenApp Format (`codegen_auth`)
```json
{
  \"cookies\": [
    {
      \"name\": \"session_token\",
      \"value\": \"abc123...\",
      \"domain\": \".codegen.com\",
      \"path\": \"/\",
      \"expires\": 1735689600,
      \"secure\": true,
      \"httpOnly\": true,
      \"sameSite\": \"Lax\"
    }
  ],
  \"localStorage\": {},
  \"sessionStorage\": {},
  \"origin\": \"https://codegen.com\",
  \"extracted_at\": \"2025-06-29T18:30:00\",
  \"total_cookies\": 15
}
```

### Raw JSON Format
```json
{
  \"cookies\": [...],
  \"extracted_at\": \"2025-06-29T18:30:00\",
  \"total_cookies\": 15
}
```

### Netscape Format
```
# Netscape HTTP Cookie File
.codegen.com	TRUE	/	TRUE	1735689600	session_token	abc123...
```

## 🐛 Troubleshooting

### \"No Chrome installations found\"
- **Solution**: Install Google Chrome and run it at least once
- **Check**: Make sure Chrome is in the standard installation location

### \"No cookies found for codegen.com\"
- **Solution**: 
  1. Open Chrome and visit codegen.com
  2. Log in to your account
  3. Close Chrome completely
  4. Run the extractor again

### \"Required libraries not available\"
- **Solution**: Install dependencies
  ```cmd
  pip install pycryptodome pywin32
  ```

### \"Database is locked\"
- **Solution**: Close Chrome completely
- **Wait**: 10 seconds after closing Chrome
- **Check**: Task Manager for remaining Chrome processes

### \"Decryption failed\"
- **Cause**: Chrome v127+ app-bound encryption
- **Solution**: Use the latest version of the script
- **Workaround**: Try different Chrome profiles

### \"Permission denied\"
- **Solution**: Run as Administrator
- **Check**: Antivirus blocking file access
- **Verify**: Desktop write permissions

## 🔧 Advanced Features

### Multiple Browser Support
The script automatically detects:
- Google Chrome (stable)
- Chrome Beta
- Chrome Dev (Developer)
- Chrome Canary
- Chromium
- Microsoft Edge

### Encryption Handling
- **v10 cookies**: AES-GCM decryption (Chrome 80+)
- **v11 cookies**: Enhanced AES-GCM (Chrome 90+)
- **v20 cookies**: App-bound encryption detection (Chrome 127+)
- **Legacy**: DPAPI decryption for older versions

### Profile Detection
Automatically finds all Chrome profiles:
- Default profile
- Numbered profiles (Profile 1, Profile 2, etc.)
- Work/personal profile separation
- Multiple Chrome installations

## 📊 Sample Output

```
🍪 Chrome Cookie Extractor for CodegenApp
==================================================
🔍 Extracting cookies from Google Chrome - Default
📁 Using database: C:\Users\L\AppData\Local\Google\Chrome\User Data\Default\Network\Cookies
🔑 Encryption key obtained successfully
✅ Extracted 23 cookies
🔓 Decrypted 18 encrypted cookies

🎉 Success! Cookies saved to: C:\Users\L\Desktop\codegenCookies.json
📊 Total cookies: 23

🍪 Sample cookies extracted:
  - session_token (domain: .codegen.com, secure: true)
  - csrf_token (domain: codegen.com, secure: true)
  - user_preferences (domain: .codegen.com, secure: false)
  - analytics_id (domain: .codegen.com, secure: true)
  - auth_session (domain: codegen.com, secure: true)
  ... and 18 more

📋 Next steps:
1. Copy codegenCookies.json to your WSL2 environment
2. Use with codegenApp API calls
```

## 🔒 Security Notes

- **Cookies contain sensitive authentication data** - handle with care
- **Don't share cookie files** with others
- **Delete cookie files** after use if not needed
- **Cookies expire** - re-extract if authentication fails
- **Use secure transfer methods** when moving to WSL2

## 🆚 Comparison with Basic Extractor

| Feature | Basic Extractor | Comprehensive Extractor |
|---------|----------------|------------------------|
| Chrome variants | Chrome only | All Chrome variants + Edge |
| Encryption support | None | Full AES-GCM + DPAPI |
| Profile detection | Basic | Advanced with diagnostics |
| Output formats | JSON only | 3 formats |
| Error handling | Basic | Comprehensive |
| Diagnostics | Limited | Full system analysis |
| Modern Chrome | Limited | Full v127+ support |

## 📞 Support

If you encounter issues:

1. **Run with verbose output** to see detailed error messages
2. **Check the troubleshooting section** above
3. **Verify Chrome and Python versions**
4. **Try different Chrome profiles**
5. **Check Windows and WSL2 file permissions**

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Script detects your Chrome profiles
- ✅ Finds and decrypts cookies successfully
- ✅ Creates valid JSON output on Desktop
- ✅ CodegenApp accepts the authentication
- ✅ Agent resume operations succeed

## 📝 File Structure

```
├── codegenCookieExtractor.py          # Main comprehensive extractor
├── extractCodegenCookies.bat          # Easy Windows batch script
├── COMPREHENSIVE_COOKIE_EXTRACTOR_README.md  # This documentation
└── codegenCookies.json               # Output file (created on Desktop)
```

## 🔄 Updates and Maintenance

This extractor is designed to handle:
- **Chrome updates** with new encryption methods
- **Windows security changes**
- **New Chrome profile structures**
- **Enhanced security features**

The script automatically adapts to different Chrome versions and provides detailed diagnostics when issues occur.

