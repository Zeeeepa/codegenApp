#!/usr/bin/env node
/**
 * Chrome Cookie Extractor
 * Extract cookies from Chrome browser for automated logins.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

class ChromeCookieExtractor {
  constructor() {
    this.platform = os.platform();
  }

  /**
   * Get Chrome profile directories based on the current platform
   */
  getChromeProfileDirs() {
    const profiles = [];
    let basePath;

    switch (this.platform) {
      case 'win32':
        basePath = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
        break;
      case 'darwin':
        basePath = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
        break;
      default: // Linux and others
        basePath = path.join(os.homedir(), '.config', 'google-chrome');
        break;
    }

    if (!fs.existsSync(basePath)) {
      return profiles;
    }

    // Add default profile
    const defaultProfile = path.join(basePath, 'Default');
    if (fs.existsSync(defaultProfile)) {
      profiles.push({ name: 'Default', path: defaultProfile });
    }

    // Add numbered profiles
    const items = fs.readdirSync(basePath);
    for (const item of items) {
      if (item.startsWith('Profile ')) {
        const profilePath = path.join(basePath, item);
        if (fs.existsSync(profilePath) && fs.statSync(profilePath).isDirectory()) {
          profiles.push({ name: item, path: profilePath });
        }
      }
    }

    return profiles;
  }

  /**
   * Create a temporary copy of the cookies database to avoid lock issues
   */
  copyCookieDb(profilePath) {
    const cookiesDb = path.join(profilePath, 'Cookies');
    
    if (!fs.existsSync(cookiesDb)) {
      return null;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-cookies-'));
    const tempDb = path.join(tempDir, 'Cookies');

    try {
      fs.copyFileSync(cookiesDb, tempDb);
      return tempDb;
    } catch (error) {
      console.error('Error copying cookies database:', error.message);
      return null;
    }
  }

  /**
   * Extract cookies from Chrome SQLite database
   */
  async extractCookies(dbPath, domainFilter = null) {
    return new Promise((resolve, reject) => {
      const cookies = [];
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

      let query = `
        SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly, samesite
        FROM cookies
      `;

      const params = [];
      if (domainFilter) {
        query += ' WHERE host_key LIKE ?';
        params.push(`%${domainFilter}%`);
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        for (const row of rows) {
          const {
            host_key: host,
            name,
            value,
            path,
            expires_utc: expiresUtc,
            is_secure: isSecure,
            is_httponly: isHttpOnly,
            samesite: sameSite
          } = row;

          // Convert Chrome's microseconds since Windows epoch to JavaScript Date
          let expiryDate = null;
          if (expiresUtc && expiresUtc > 0) {
            // Chrome stores time as microseconds since Windows epoch (1601-01-01)
            // Convert to milliseconds since Unix epoch (1970-01-01)
            const windowsEpochDiff = 11644473600000; // milliseconds between 1601 and 1970
            const jsTimestamp = (expiresUtc / 1000) - windowsEpochDiff;
            expiryDate = new Date(jsTimestamp);
          }

          const cookie = {
            domain: host,
            name,
            value,
            path,
            expires: expiryDate ? Math.floor(expiryDate.getTime() / 1000) : undefined,
            secure: Boolean(isSecure),
            httpOnly: Boolean(isHttpOnly),
            sameSite: this.convertSameSite(sameSite)
          };

          cookies.push(cookie);
        }

        db.close();
        resolve(cookies);
      });
    });
  }

  /**
   * Convert Chrome's sameSite integer to string
   */
  convertSameSite(sameSiteValue) {
    switch (sameSiteValue) {
      case 0: return 'no_restriction';
      case 1: return 'lax';
      case 2: return 'strict';
      default: return 'unspecified';
    }
  }

  /**
   * Get cookies for a specific domain from the default Chrome profile
   */
  async getCookiesForDomain(domain) {
    const profiles = this.getChromeProfileDirs();
    
    if (profiles.length === 0) {
      throw new Error('No Chrome profiles found');
    }

    // Use the first profile (usually Default)
    const profile = profiles[0];
    const tempDb = this.copyCookieDb(profile.path);

    if (!tempDb) {
      throw new Error('Could not access Chrome cookies database');
    }

    try {
      const cookies = await this.extractCookies(tempDb, domain);
      return cookies;
    } finally {
      // Clean up temp file
      const tempDir = path.dirname(tempDb);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Convert cookies to Puppeteer format
   */
  toPuppeteerFormat(cookies) {
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite === 'no_restriction' ? 'None' : 
                cookie.sameSite === 'lax' ? 'Lax' : 
                cookie.sameSite === 'strict' ? 'Strict' : 'None'
    }));
  }
}

module.exports = ChromeCookieExtractor;

// CLI usage
if (require.main === module) {
  const extractor = new ChromeCookieExtractor();
  
  const domain = process.argv[2] || 'codegen.com';
  
  extractor.getCookiesForDomain(domain)
    .then(cookies => {
      console.log(`Found ${cookies.length} cookies for ${domain}:`);
      console.log(JSON.stringify(cookies, null, 2));
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

