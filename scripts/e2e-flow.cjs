const http = require('http');

const BASE_URL = 'http://localhost:3001';

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
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) {
    const err = new Error(msg);
    err.isAssertionError = true;
    throw err;
  }
}

async function run() {
  const ts = Date.now();
  const username = `e2e_${ts}`;
  const email = `e2e_${ts}@test.com`;
  const password = 'Test123!';

  const reg = await httpRequest('POST', '/api/auth/register', { username, email, password });
  assert(reg.status === 201, `register status ${reg.status}`);
  const token = reg.data?.data?.token || reg.data?.token;
  assert(token, 'missing token after register');

  const credits0 = await httpRequest('GET', '/api/user/credits', null, token);
  assert(credits0.status === 200, `credits status ${credits0.status}`);
  const balance0 = credits0.data?.data?.balance;
  assert(typeof balance0 === 'number', 'missing initial balance');

  const nodeImage = `node-image-${ts}`;
  const img = await httpRequest('POST', '/api/generate-image', {
    nodeId: nodeImage,
    prompt: 'e2e image',
    imageModel: 'gemini-2.5-flash-image',
    aspectRatio: '16:9'
  }, token);
  assert(img.status === 200, `generate-image status ${img.status}: ${JSON.stringify(img.data).slice(0, 200)}`);
  assert(img.data?.resultUrl, 'missing resultUrl for image');

  const credits1 = await httpRequest('GET', '/api/user/credits', null, token);
  assert(credits1.status === 200, `credits after image status ${credits1.status}`);
  const balance1 = credits1.data?.data?.balance;
  assert(typeof balance1 === 'number', 'missing balance after image');
  assert(balance1 === balance0 - 2, `expected balance ${balance0 - 2}, got ${balance1}`);

  const history1 = await httpRequest('GET', '/api/user/credits/history?limit=10&page=1', null, token);
  assert(history1.status === 200, `credit history status ${history1.status}`);
  const txs1 = history1.data?.data?.transactions || [];
  assert(Array.isArray(txs1) && txs1.length > 0, 'missing credit transactions');
  assert(txs1[0].credits === -2, `expected latest credits -2, got ${txs1[0].credits}`);
  assert(txs1[0].reference_id === nodeImage, `expected reference_id ${nodeImage}, got ${txs1[0].reference_id}`);

  const nodeVideo = `node-video-${ts}`;
  const vid = await httpRequest('POST', '/api/generate-video', {
    nodeId: nodeVideo,
    prompt: 'e2e video',
    videoModel: 'seedance-2.0',
    duration: 1,
    aspectRatio: '16:9'
  }, token);
  assert(vid.status === 200, `generate-video status ${vid.status}: ${JSON.stringify(vid.data).slice(0, 200)}`);
  assert(vid.data?.resultUrl, 'missing resultUrl for video');

  const credits2 = await httpRequest('GET', '/api/user/credits', null, token);
  assert(credits2.status === 200, `credits after video status ${credits2.status}`);
  const balance2 = credits2.data?.data?.balance;
  assert(balance2 === balance1 - 20, `expected balance ${balance1 - 20}, got ${balance2}`);

  const history2 = await httpRequest('GET', '/api/user/credits/history?limit=10&page=1', null, token);
  assert(history2.status === 200, `credit history2 status ${history2.status}`);
  const txs2 = history2.data?.data?.transactions || [];
  const videoTx = txs2.find(t => t.reference_id === nodeVideo);
  assert(videoTx, 'missing video credit transaction');
  assert(videoTx.credits === -20, `expected video credits -20, got ${videoTx.credits}`);

  console.log('OK');
}

run().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
