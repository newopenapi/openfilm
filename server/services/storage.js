import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initCOS } from './cos.cjs';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getLibraryDir() {
  return process.env.LIBRARY_DIR || path.join(process.cwd(), 'library');
}

export function isCosEnabled() {
  const provider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
  const sid = process.env.TENCENT_COS_SECRET_ID || process.env.TENCENT_SECRET_ID;
  const sk = process.env.TENCENT_COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY;
  const bucket = process.env.TENCENT_COS_BUCKET || process.env.TENCENT_BUCKET;
  const configured = !!(sid && sk && bucket);
  if (provider === 'cos') return configured;
  if (process.env.USE_TENCENT_COS === '1') return configured;
  return false; // 当未明确启用 COS 时，默认返回 false，使用本地存储
}

function guessContentType(ext) {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  if (e === 'png') return 'image/png';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'mp4') return 'video/mp4';
  if (e === 'webm') return 'video/webm';
  if (e === 'json') return 'application/json';
  return 'application/octet-stream';
}

export async function saveBuffer({ buffer, dir, prefix, extension, customId, contentType }) {
  const id = customId || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const filename = `${id}.${extension}`;
  const dirName = path.basename(dir);

  if (!isCosEnabled()) {
    ensureDir(dir);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    const url = `/library/${dirName}/${filename}`;
    return { id, filename, url, path: filePath, storageType: 'local', key: null };
  }

  const cos = initCOS();
  const key = `library/${dirName}/${filename}`;
  const ct = contentType || guessContentType(extension);
  const r = await cos.uploadBuffer(buffer, key, ct);
  return { id, filename, url: r.url, path: null, storageType: 'cos', key };
}

export async function saveDataUrl({ dataUrl, kind, prefix, imagesDir, videosDir, customId }) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  if (mimeType.startsWith('video/')) {
    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    const dir = videosDir;
    return await saveBuffer({ buffer, dir, prefix, extension: ext, customId, contentType: mimeType });
  }

  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : mimeType === 'image/gif' ? 'gif' : 'png';
  const dir = imagesDir;
  return await saveBuffer({ buffer, dir, prefix, extension: ext, customId, contentType: mimeType });
}

export async function readUrlToBuffer(url) {
  if (!url) return null;
  const u = String(url);
  if (!u.startsWith('http://') && !u.startsWith('https://')) return null;
  const resp = await fetch(u);
  if (!resp.ok) return null;
  return Buffer.from(await resp.arrayBuffer());
}

export async function toDataUrlFromUrl(url) {
  const buf = await readUrlToBuffer(url);
  if (!buf) return null;
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase().replace('.', '');
  const mime = guessContentType(ext);
  return `data:${mime};base64,${buf.toString('base64')}`;
}
