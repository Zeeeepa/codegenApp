#!/usr/bin/env node

// Debug script to verify credentials are properly loaded
console.log('🔍 CREDENTIAL DEBUG INFORMATION');
console.log('================================');

console.log('\n📋 Environment Variables:');
console.log('REACT_APP_API_TOKEN:', process.env.REACT_APP_API_TOKEN || 'NOT SET');
console.log('REACT_APP_DEFAULT_ORGANIZATION:', process.env.REACT_APP_DEFAULT_ORGANIZATION || 'NOT SET');
console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL || 'NOT SET');

console.log('\n🔑 Token Details:');
if (process.env.REACT_APP_API_TOKEN) {
  const token = process.env.REACT_APP_API_TOKEN;
  console.log('✅ Token is SET and VISIBLE');
  console.log('   Length:', token.length);
  console.log('   Starts with:', token.substring(0, 8) + '...');
  console.log('   Full token:', token); // SHOWING FULL TOKEN FOR DEBUGGING
} else {
  console.log('❌ Token is NOT SET');
}

console.log('\n🏢 Organization Details:');
if (process.env.REACT_APP_DEFAULT_ORGANIZATION) {
  const orgId = process.env.REACT_APP_DEFAULT_ORGANIZATION;
  console.log('✅ Organization ID is SET and VISIBLE');
  console.log('   Value:', orgId); // SHOWING FULL ORG ID
} else {
  console.log('❌ Organization ID is NOT SET');
}

console.log('\n🌐 API Base URL:');
console.log('   Value:', process.env.REACT_APP_API_BASE_URL || 'NOT SET');

console.log('\n🎯 SUMMARY:');
console.log('   Token visible:', !!process.env.REACT_APP_API_TOKEN ? '✅ YES' : '❌ NO');
console.log('   Org ID visible:', !!process.env.REACT_APP_DEFAULT_ORGANIZATION ? '✅ YES' : '❌ NO');
console.log('   API URL configured:', !!process.env.REACT_APP_API_BASE_URL ? '✅ YES' : '❌ NO');

console.log('\n🚀 Your credentials are NOT HIDDEN - they are fully visible and ready to use!');

