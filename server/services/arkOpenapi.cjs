const { Signer } = require('@volcengine/openapi');

function getArkCredentials() {
  const accessKeyId = process.env.VOLC_ACCESSKEY || process.env.VOLCANO_ACCESS_KEY || '';
  const secretKey = process.env.VOLC_SECRETKEY || process.env.VOLCANO_SECRET_KEY || '';
  const sessionToken = process.env.VOLC_SESSION_TOKEN || '';
  if (!accessKeyId || !secretKey) {
    throw new Error('Volcengine AK/SK not configured (VOLC_ACCESSKEY/VOLC_SECRETKEY)');
  }
  return { accessKeyId, secretKey, sessionToken };
}

function getOpenApiRegion() {
  return process.env.VOLC_OPENAPI_REGION || 'cn-north-1';
}

function getOpenApiHost() {
  return process.env.VOLC_OPENAPI_HOST || 'open.volcengineapi.com';
}

async function callArkOpenapi({ action, version = '2024-01-01', body = {}, method = 'POST', region }) {
  const host = getOpenApiHost();
  const requestObj = {
    region: region || getOpenApiRegion(),
    method,
    params: {
      Action: action,
      Version: version
    },
    headers: {
      Host: host,
      'Content-Type': 'application/json'
    },
    body: method === 'GET' ? '' : JSON.stringify(body || {})
  };

  const signer = new Signer(requestObj, 'ark');
  signer.addAuthorization(getArkCredentials());

  const url = `https://${host}/?${new URLSearchParams(requestObj.params).toString()}`;
  const resp = await fetch(url, {
    method,
    headers: requestObj.headers,
    body: method === 'GET' ? undefined : requestObj.body
  });

  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Ark OpenAPI invalid JSON (${resp.status}): ${text.slice(0, 200)}`);
  }
  if (!resp.ok) {
    const msg = json.Error?.Message || json.error?.message || json.message || text;
    throw new Error(`Ark OpenAPI error ${resp.status}: ${msg}`);
  }
  return json;
}

module.exports = {
  callArkOpenapi
};

