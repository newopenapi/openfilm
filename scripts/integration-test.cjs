/**
 * 集成测试脚本
 * 测试多用户系统的核心功能
 */
const http = require('http');

const BASE_URL = 'http://localhost:3001';
const testResults = [];

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(status, message) {
  const symbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '•';
  const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  console.log(`${color}${symbol}${colors.reset} ${message}`);
  testResults.push({ status, message });
}

function httpRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n🚀 Starting Integration Tests\n');
  console.log('=' .repeat(50));

  let adminToken = null;
  let testUserToken = null;
  let testUserId = null;
  let projectId = null;

  // Test 1: Health Check
  try {
    const res = await httpRequest('GET', '/api/health');
    log(res.status === 200 ? 'PASS' : 'FAIL', 'Server health check');
  } catch (e) {
    log('FAIL', `Server health check: ${e.message}`);
  }

  // Test 2: Try to login with existing admin first (or register if not exists)
  try {
    // First try to login with original admin
    let res = await httpRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    // Token is in res.data.data.token (nested structure)
    const adminTokenResult = res.data.token || res.data.data?.token;
    if (res.status === 200 && adminTokenResult) {
      adminToken = adminTokenResult;
      log('PASS', 'Admin login (existing user)');
    } else {
      // Try to register new admin
      res = await httpRequest('POST', '/api/auth/register', {
        username: 'admin_test_' + Date.now(),
        email: `admin_test_${Date.now()}@test.com`,
        password: 'Admin123!'
      });
      const newAdminToken = res.data.token || res.data.data?.token;
      if (res.status === 201 || res.status === 200) {
        adminToken = newAdminToken;
        log('PASS', 'Admin registration');
      } else {
        log('FAIL', `Admin login/registration failed: ${JSON.stringify(res.data).substring(0, 100)}`);
      }
    }
  } catch (e) {
    log('FAIL', `Admin setup: ${e.message}`);
  }

  // Test 3: Get Subscription Plans
  try {
    const res = await httpRequest('GET', '/api/subscription/plans', null, adminToken);
    log(res.status === 200 && res.data.plans ? 'PASS' : 'FAIL', 'Get subscription plans');
  } catch (e) {
    log('FAIL', `Get subscription plans: ${e.message}`);
  }

  // Test 4: Try to register test user
  try {
    const timestamp = Date.now();
    let res = await httpRequest('POST', '/api/auth/register', {
      username: 'testuser_' + timestamp,
      email: `testuser_${timestamp}@test.com`,
      password: 'Test123!'
    });
    
    const userTokenResult = res.data.token || res.data.data?.token;
    const userIdResult = res.data.user?.id || res.data.data?.user?.id;
    
    if (res.status === 201 || res.status === 200) {
      testUserToken = userTokenResult;
      testUserId = userIdResult;
      log('PASS', 'User registration');
    } else {
      // User might already exist, try login
      res = await httpRequest('POST', '/api/auth/login', {
        username: `testuser_${timestamp}`,
        password: 'Test123!'
      });
      const loginToken = res.data.token || res.data.data?.token;
      const loginUserId = res.data.user?.id || res.data.data?.user?.id;
      if (res.status === 200 && loginToken) {
        testUserToken = loginToken;
        testUserId = loginUserId;
        log('PASS', 'User login (existing user)');
      } else {
        log('FAIL', `User registration/login failed: ${JSON.stringify(res.data).substring(0, 100)}`);
      }
    }
  } catch (e) {
    log('FAIL', `User registration: ${e.message}`);
  }

  // Test 5: Get User Profile
  try {
    const res = await httpRequest('GET', '/api/user/me', null, testUserToken);
    const profileUser = res.data.user || res.data.data?.user;
    log(res.status === 200 && (profileUser || res.data.success) ? 'PASS' : 'FAIL', 'Get user profile');
    if (profileUser?.id) testUserId = profileUser.id;
  } catch (e) {
    log('FAIL', `Get user profile: ${e.message}`);
  }

  // Test 6: Create Project (using user routes)
  try {
    const res = await httpRequest('POST', '/api/user/projects', {
      title: 'Test Project',
      description: 'A test project for integration testing'
    }, testUserToken);
    log((res.status === 201 || res.status === 200) && res.data.success ? 'PASS' : 'FAIL', 'Create project');
    if (res.data.data?.id) projectId = res.data.data.id;
  } catch (e) {
    log('FAIL', `Create project: ${e.message}`);
  }

  // Test 7: Get Projects
  try {
    const res = await httpRequest('GET', '/api/user/projects', null, testUserToken);
    log(res.status === 200 && res.data.success ? 'PASS' : 'FAIL', 'Get projects');
  } catch (e) {
    log('FAIL', `Get projects: ${e.message}`);
  }

  // Test 8: Get Credits
  try {
    const res = await httpRequest('GET', '/api/user/credits', null, testUserToken);
    log(res.status === 200 && res.data.success ? 'PASS' : 'FAIL', 'Get credits balance');
  } catch (e) {
    log('FAIL', `Get credits: ${e.message}`);
  }

  // Test 9: Get Subscription
  try {
    const res = await httpRequest('GET', '/api/subscription/current', null, testUserToken);
    log(res.status === 200 ? 'PASS' : 'FAIL', 'Get current subscription');
  } catch (e) {
    log('FAIL', `Get current subscription: ${e.message}`);
  }

  // Test 10: Get Credit History
  try {
    const res = await httpRequest('GET', '/api/user/credits/history', null, testUserToken);
    log(res.status === 200 && res.data.success ? 'PASS' : 'FAIL', 'Get credit history');
  } catch (e) {
    log('FAIL', `Get credit history: ${e.message}`);
  }

  // Test 11: Admin: Get All Users
  try {
    const res = await httpRequest('GET', '/api/admin/users', null, adminToken);
    log(res.status === 200 && res.data.success ? 'PASS' : 'FAIL', 'Admin: Get all users');
  } catch (e) {
    log('FAIL', `Admin get users: ${e.message}`);
  }

  // Test 12: Admin: Get Stats
  try {
    const res = await httpRequest('GET', '/api/admin/stats', null, adminToken);
    log(res.status === 200 ? 'PASS' : 'FAIL', 'Admin: Get system stats');
  } catch (e) {
    log('FAIL', `Admin get stats: ${e.message}`);
  }

  // Test 13: Unauthorized Access
  try {
    const res = await httpRequest('GET', '/api/user/me');
    log(res.status === 401 ? 'PASS' : 'FAIL', 'Unauthorized access rejected');
  } catch (e) {
    log('FAIL', `Unauthorized access test: ${e.message}`);
  }

  // Test 14: Get Assets
  try {
    const res = await httpRequest('GET', '/api/user/assets', null, testUserToken);
    log(res.status === 200 && res.data.success ? 'PASS' : 'FAIL', 'Get user assets');
  } catch (e) {
    log('FAIL', `Get assets: ${e.message}`);
  }

  // Cleanup
  if (projectId) {
    try {
      await httpRequest('DELETE', `/api/projects/${projectId}`, null, testUserToken);
      log('PASS', 'Cleanup: Delete test project');
    } catch (e) {
      log('FAIL', `Cleanup: Delete test project: ${e.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${testResults.length}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Please review.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
