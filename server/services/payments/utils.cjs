const crypto = require('crypto');

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function randomString(len = 32) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

function generateOrderId(prefix = 'ORD') {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomString(10).toUpperCase();
  return `${prefix}${ts}${rnd}`.slice(0, 64);
}

function toPem(key) {
  if (!key) return null;
  if (key.includes('BEGIN')) return key;
  const cleaned = key.replace(/\\n/g, '\n');
  if (cleaned.includes('BEGIN')) return cleaned;
  return `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----\n`;
}

function toPublicPem(key) {
  if (!key) return null;
  if (key.includes('BEGIN')) return key;
  const cleaned = key.replace(/\\n/g, '\n');
  if (cleaned.includes('BEGIN')) return cleaned;
  return `-----BEGIN PUBLIC KEY-----\n${cleaned}\n-----END PUBLIC KEY-----\n`;
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = {
  nowSeconds,
  randomString,
  generateOrderId,
  toPem,
  toPublicPem,
  safeJsonParse
};

