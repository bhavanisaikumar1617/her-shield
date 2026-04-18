const http = require('http');

async function testAPI(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('=== SMOKE TESTS ===\n');
  
  // Use a valid JWT token structure (expire set far in future)
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzZlOWY0YzAwMDAwMDAwMDAwMDAwMDEiLCJyb2xlIjoidXNlciIsImlhdCI6MTczNTA3MjAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test';
  
  // Test 1: Create contact
  console.log('TEST 1: POST /api/contacts - Create contact');
  const createRes = await testAPI('POST', '/api/contacts', {
    name: 'Emergency Mom',
    number: '555-1234',
    relationship: 'Parent'
  }, token);
  console.log(`Status: ${createRes.status}`);
  console.log(`Message: ${createRes.body?.message || createRes.body?.error || 'OK'}`);
  const contactId = createRes.body?.contact?._id;
  console.log(`Contact ID: ${contactId}\n`);

  // Test 2: Get contacts
  console.log('TEST 2: GET /api/contacts - List contacts');
  const listRes = await testAPI('GET', '/api/contacts', null, token);
  console.log(`Status: ${listRes.status}`);
  console.log(`Contacts found: ${listRes.body?.contacts?.length || 0}\n`);

  // Test 3: Get safe zones
  console.log('TEST 3: GET /api/safe-zones - List safe zones');
  const zonesRes = await testAPI('GET', '/api/safe-zones', null, token);
  console.log(`Status: ${zonesRes.status}`);
  console.log(`Safe zones found: ${zonesRes.body?.safeZones?.length || 0}\n`);

  // Test 4: Update contact (if created)
  if (contactId) {
    console.log(`TEST 4: PATCH /api/contacts/${contactId} - Update contact`);
    const updateRes = await testAPI('PATCH', `/api/contacts/${contactId}`, {
      name: 'Mom Updated',
      number: '555-5678'
    }, token);
    console.log(`Status: ${updateRes.status}`);
    console.log(`Message: ${updateRes.body?.message || updateRes.body?.error || 'OK'}\n`);
  }

  // Test 5: Delete contact (if created)
  if (contactId) {
    console.log(`TEST 5: DELETE /api/contacts/${contactId} - Delete contact`);
    const deleteRes = await testAPI('DELETE', `/api/contacts/${contactId}`, null, token);
    console.log(`Status: ${deleteRes.status}`);
    console.log(`Message: ${deleteRes.body?.message || deleteRes.body?.error || 'OK'}\n`);
  }

  console.log('=== SMOKE TESTS COMPLETE ===');
  process.exit(0);
})();
