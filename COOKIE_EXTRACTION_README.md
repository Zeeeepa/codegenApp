# Chrome Cookie Extractor for Windows → WSL2

This tool extracts authentication cookies from Google Chrome on Windows and formats them for use with codegenApp in WSL2.

## 🎯 Purpose

When running codegenApp in WSL2, you need to transfer your Chrome authentication cookies from Windows to authenticate with codegen.com. This tool automates that process.

## 📋 Prerequisites

- **Windows 10/11** with Google Chrome installed
- **Python 3.6+** installed on Windows
- **WSL2** with codegenApp running
- **Active login** to codegen.com in Chrome

## 🚀 Quick Start

### Option 1: Easy Batch Script (Recommended)

1. **Download files** to your Windows machine:
   - `extract_chrome_cookies.py`
   - `extract_cookies.bat`

2. **Run the batch script**:
   ```cmd
   extract_cookies.bat
   ```

3. **Follow the prompts** to select your Chrome profile and domain

4. **Copy the output file** to WSL2 and use with codegenApp

### Option 2: Python Command Line

1. **List available Chrome profiles**:
   ```cmd
   python extract_chrome_cookies.py --list-profiles
   ```

2. **Extract cookies for codegen.com**:
   ```cmd
   python extract_chrome_cookies.py --domain codegen.com --output codegen_auth.json
   ```

3. **Copy to WSL2** and use with API calls

## 📖 Detailed Usage

### Command Line Options

```bash
python extract_chrome_cookies.py [OPTIONS]

Options:
  -d, --domain DOMAIN       Domain to filter cookies (default: codegen.com)
  -p, --profile INDEX       Chrome profile index (default: 0)
  -o, --output FILE         Output file (default: chrome_cookies.json)
  -f, --format FORMAT       Output format: json|codegen_auth|curl (default: codegen_auth)
  -l, --list-profiles       List available Chrome profiles
  -a, --all-domains         Extract cookies for all domains
```

### Output Formats

1. **`codegen_auth`** (Recommended): Ready-to-use auth context for codegenApp
2. **`json`**: Raw cookie data in JSON format
3. **`curl`**: Cookie string for curl commands

### Examples

**Extract cookies for specific profile:**
```cmd
python extract_chrome_cookies.py --profile 1 --domain codegen.com
```

**Extract all cookies:**
```cmd
python extract_chrome_cookies.py --all-domains --format json
```

**Generate curl-compatible format:**
```cmd
python extract_chrome_cookies.py --format curl --output cookies.txt
```

## 🔄 Transfer to WSL2

### Method 1: Direct File Copy

1. **Save to Windows shared location**:
   ```cmd
   python extract_chrome_cookies.py --output /mnt/c/temp/codegen_auth.json
   ```

2. **Access from WSL2**:
   ```bash
   cp /mnt/c/temp/codegen_auth.json ~/codegen_auth.json
   ```

### Method 2: Copy via Windows Explorer

1. **Extract to Windows folder**:
   ```cmd
   python extract_chrome_cookies.py --output codegen_auth.json
   ```

2. **Copy file** to your WSL2 home directory via Windows Explorer

3. **Use in WSL2**:
   ```bash
   # File should be accessible at ~/codegen_auth.json
   ```

## 🛠️ Using with codegenApp

### API Call Example

```bash
# In WSL2, use the extracted cookies with codegenApp
curl -X POST http://localhost:3001/api/resume-agent-run \
  -H "Content-Type: application/json" \
  -d @codegen_auth.json
```

### Modify for Specific Agent Run

```bash
# Edit the auth file to add your specific agent run details
jq '.agentRunId = "12345" | .organizationId = "456" | .prompt = "Continue the task"' \
  codegen_auth.json > agent_request.json

# Use the modified file
curl -X POST http://localhost:3001/api/resume-agent-run \
  -H "Content-Type: application/json" \
  -d @agent_request.json
```

## 🔒 Security Notes

- **Cookies contain sensitive authentication data** - handle with care
- **Don't share cookie files** with others
- **Delete cookie files** after use if not needed
- **Cookies expire** - re-extract if authentication fails

## 🐛 Troubleshooting

### "No Chrome profiles found"
- Make sure Google Chrome is installed
- Run Chrome at least once to create profiles
- Check if Chrome is installed in a non-standard location

### "No cookies found for domain"
- Make sure you're logged into codegen.com in Chrome
- Try using `--all-domains` to see what cookies exist
- Check if you're using the correct Chrome profile

### "Database is locked"
- Close Google Chrome completely before extracting
- Wait a few seconds after closing Chrome
- Try using a different Chrome profile

### "Permission denied"
- Run command prompt as Administrator
- Make sure the output directory is writable
- Check if antivirus is blocking file access

### Authentication still fails in WSL2
- Check if cookies have expired
- Verify the JSON format is correct
- Try extracting fresh cookies
- Make sure you're using the same domain (codegen.com)

## 📁 File Structure

```
├── extract_chrome_cookies.py    # Main Python script
├── extract_cookies.bat          # Windows batch script
├── COOKIE_EXTRACTION_README.md  # This documentation
└── codegen_auth.json           # Output file (created after extraction)
```

## 🔧 Advanced Usage

### Custom Chrome Installation Path

If Chrome is installed in a non-standard location, modify the `chrome_paths` in the Python script:

```python
# Add custom paths to _get_chrome_paths method
custom_paths = [
    Path("C:/Program Files/Google/Chrome/User Data"),
    Path("D:/Chrome/User Data"),
]
```

### Automated Extraction Script

Create a PowerShell script for automated extraction:

```powershell
# auto_extract.ps1
$profile = 0
$domain = "codegen.com"
$output = "codegen_auth_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

python extract_chrome_cookies.py --profile $profile --domain $domain --output $output
Copy-Item $output "\\wsl$\Ubuntu\home\username\"
```

## 📞 Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Verify Chrome and Python versions**
3. **Try with different Chrome profiles**
4. **Check Windows and WSL2 file permissions**

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Script finds your Chrome profiles
- ✅ Extracts cookies without errors  
- ✅ Creates valid JSON output file
- ✅ codegenApp accepts the authentication
- ✅ Agent resume operations succeed

