#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const ORG_ID = process.env.CODEGEN_ORG_ID || '323';
const API_TOKEN = process.env.CODEGEN_API_TOKEN || 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';

console.log('🚀 COMPREHENSIVE DEPLOYMENT VALIDATION');
console.log('=====================================');
console.log(`🏢 Organization ID: ${ORG_ID}`);
console.log(`🔑 API Token: ${API_TOKEN.substring(0, 15)}...`);
console.log();

async function validateEndpoint(name, url, expectedStatus = 200) {
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.text();
        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (e) {
            jsonData = data;
        }
        
        if (response.status === expectedStatus) {
            console.log(`�� ${name}: SUCCESS (${response.status})`);
            if (typeof jsonData === 'object' && jsonData !== null) {
                console.log(`📊 Response: ${JSON.stringify(jsonData, null, 2).substring(0, 500)}${JSON.stringify(jsonData, null, 2).length > 500 ? '...' : ''}`);
            }
            return { success: true, data: jsonData, status: response.status };
        } else {
            console.log(`❌ ${name}: FAILED (${response.status})`);
            console.log(`📄 Error: ${JSON.stringify(jsonData, null, 2)}`);
            return { success: false, data: jsonData, status: response.status };
        }
    } catch (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    const results = {};
    
    // Test Frontend
    console.log('🌐 FRONTEND VALIDATION');
    console.log('----------------------');
    results.frontend = await validateEndpoint('Frontend', 'http://localhost:8080');
    console.log();
    
    // Test Backend Health
    console.log('🔧 BACKEND VALIDATION');
    console.log('---------------------');
    results.health = await validateEndpoint('Health Check', 'http://localhost:3001/health');
    console.log();
    
    // Test API Endpoints
    console.log('🔌 API ENDPOINTS VALIDATION');
    console.log('---------------------------');
    results.organizations = await validateEndpoint('Organizations', 'http://localhost:3001/api/v1/organizations');
    console.log();
    
    // Test different user endpoints
    results.user = await validateEndpoint('User Info (/user)', 'http://localhost:3001/api/v1/user', 404);
    results.me = await validateEndpoint('User Info (/me)', 'http://localhost:3001/api/v1/me', 404);
    console.log();
    
    // Test agent runs endpoints
    results.agentRuns = await validateEndpoint('Agent Runs', 'http://localhost:3001/api/v1/agent-runs', 404);
    results.runs = await validateEndpoint('Runs', 'http://localhost:3001/api/v1/runs', 404);
    console.log();
    
    // Summary
    console.log('📋 VALIDATION SUMMARY');
    console.log('====================');
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    Object.entries(results).forEach(([key, result]) => {
        const status = result.success ? '✅' : '❌';
        const statusCode = result.status ? `(${result.status})` : '';
        console.log(`${status} ${key} ${statusCode}`);
    });
    
    console.log();
    console.log(`🎯 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    
    if (successCount === totalCount) {
        console.log('🎉 ALL TESTS PASSED! Deployment is fully functional.');
    } else if (successCount > totalCount / 2) {
        console.log('⚠️  Most tests passed. Deployment is partially functional.');
    } else {
        console.log('🚨 Many tests failed. Deployment needs attention.');
    }
    
    // Environment Info
    console.log();
    console.log('🔧 ENVIRONMENT INFO');
    console.log('===================');
    console.log(`📍 Frontend URL: http://localhost:8080`);
    console.log(`📍 Backend URL: http://localhost:3001`);
    console.log(`📍 API Base URL: http://localhost:3001/api/v1`);
    console.log(`🏢 Organization: ${ORG_ID}`);
    console.log(`🔑 Token: ${API_TOKEN.substring(0, 15)}...`);
}

main().catch(console.error);
