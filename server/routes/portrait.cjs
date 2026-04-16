const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth.cjs');
const { PortraitAssetGroup, PortraitAsset } = require('../models/index.cjs');
const { callArkOpenapi } = require('../services/arkOpenapi.cjs');
async function saveBuffer(args) {
  const mod = await import('../services/storage.js');
  return await mod.saveBuffer(args);
}

const router = express.Router();

function getProjectName() {
  return process.env.VOLC_ARK_PROJECT_NAME || 'default';
}

function getPublicBaseUrl(req) {
  const base = process.env.PUBLIC_FILE_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (base) return base.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host')).toString().split(',')[0].trim();
  return `${proto}://${host}`;
}

function pickField(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return null;
}

router.get('/group', authenticateToken, async (req, res) => {
  try {
    const row = await PortraitAssetGroup.findOne({ where: { user_id: req.user.id } });
    res.json({ success: true, group: row ? { groupId: row.group_id, projectName: row.project_name } : null });
  } catch (e) {
    res.status(500).json({ success: false, message: 'failed' });
  }
});

router.post('/session', authenticateToken, async (req, res) => {
  try {
    const callbackUrl = String(req.body?.callbackUrl || '');
    if (!callbackUrl) return res.status(400).json({ success: false, message: 'callbackUrl is required' });

    const json = await callArkOpenapi({
      action: 'CreateVisualValidateSession',
      body: {
        CallbackURL: callbackUrl,
        ProjectName: getProjectName()
      }
    });

    const bytedToken = pickField(json, ['BytedToken']) || pickField(json.Result, ['BytedToken']);
    const h5Link = pickField(json, ['H5Link']) || pickField(json.Result, ['H5Link']);
    if (!bytedToken || !h5Link) {
      return res.status(500).json({ success: false, message: 'CreateVisualValidateSession response invalid' });
    }

    res.json({ success: true, bytedToken, h5Link });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'failed' });
  }
});

router.post('/resolve', authenticateToken, async (req, res) => {
  try {
    const bytedToken = String(req.body?.bytedToken || '');
    const resultCode = String(req.body?.resultCode || '');
    if (!bytedToken) return res.status(400).json({ success: false, message: 'bytedToken is required' });
    if (resultCode && resultCode !== '10000') {
      return res.status(400).json({ success: false, message: `resultCode=${resultCode}` });
    }

    const json = await callArkOpenapi({
      action: 'GetVisualValidateResult',
      body: {
        BytedToken: bytedToken,
        ProjectName: getProjectName()
      }
    });

    const groupId = pickField(json, ['GroupId']) || pickField(json.Result, ['GroupId']);
    if (!groupId) return res.status(500).json({ success: false, message: 'GroupId not found' });

    const [row] = await PortraitAssetGroup.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id, group_id: groupId, project_name: getProjectName() }
    });
    if (row.group_id !== groupId || row.project_name !== getProjectName()) {
      await row.update({ group_id: groupId, project_name: getProjectName() });
    }

    res.json({ success: true, groupId });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'failed' });
  }
});

router.get('/assets', authenticateToken, async (req, res) => {
  try {
    const group = await PortraitAssetGroup.findOne({ where: { user_id: req.user.id } });
    if (!group) return res.json({ success: true, items: [] });
    const items = await PortraitAsset.findAll({ where: { user_id: req.user.id, group_id: group.group_id }, order: [['updated_at', 'DESC']] });
    res.json({
      success: true,
      items: items.map(a => ({
        assetId: a.asset_id,
        name: a.name,
        status: a.status,
        sourceUrl: a.source_url,
        assetUri: `asset://${a.asset_id}`,
        updatedAt: a.updated_at
      }))
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'failed' });
  }
});

router.post('/assets/upload', authenticateToken, async (req, res) => {
  try {
    const group = await PortraitAssetGroup.findOne({ where: { user_id: req.user.id } });
    if (!group) return res.status(400).json({ success: false, message: '请先完成真人认证' });

    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single('file');
    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });

      const ext = path.extname(req.file.originalname || '').toLowerCase().replace('.', '') || 'png';
      const dir = path.join(process.cwd(), 'library', 'uploads');
      const saved = await saveBuffer({
        buffer: req.file.buffer,
        dir,
        prefix: 'portrait',
        extension: ext
      });

      const publicUrl = saved.url.startsWith('http') ? saved.url : `${getPublicBaseUrl(req)}${saved.url}`;

      const name = String(req.body?.name || req.file.originalname || '');
      const json = await callArkOpenapi({
        action: 'CreateAsset',
        body: {
          GroupId: group.group_id,
          URL: publicUrl,
          AssetType: 'Image',
          Name: name || undefined,
          ProjectName: group.project_name
        }
      });

      const assetId = pickField(json, ['AssetId', 'Id']) || pickField(json.Result, ['AssetId', 'Id']);
      if (!assetId) return res.status(500).json({ success: false, message: 'CreateAsset response invalid' });

      await PortraitAsset.upsert({
        user_id: req.user.id,
        group_id: group.group_id,
        asset_id: assetId,
        asset_type: 'Image',
        name: name || null,
        source_url: publicUrl,
        status: 'Processing',
        raw: json
      });

      res.json({ success: true, assetId, assetUri: `asset://${assetId}` });
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'failed' });
  }
});

router.post('/assets/refresh', authenticateToken, async (req, res) => {
  try {
    const group = await PortraitAssetGroup.findOne({ where: { user_id: req.user.id } });
    if (!group) return res.status(400).json({ success: false, message: 'no group' });

    const json = await callArkOpenapi({
      action: 'ListAssets',
      body: {
        Filter: { GroupId: group.group_id },
        PageNumber: 1,
        PageSize: 100
      }
    });

    const items = json.Result?.Items || json.Items || json.Result?.Result?.Items || [];
    for (const it of items) {
      const assetId = it.Id || it.AssetId;
      if (!assetId) continue;
      await PortraitAsset.upsert({
        user_id: req.user.id,
        group_id: group.group_id,
        asset_id: assetId,
        asset_type: it.AssetType || 'Image',
        name: it.Name || null,
        source_url: null,
        status: it.Status || null,
        raw: it
      });
    }

    res.json({ success: true, count: items.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'failed' });
  }
});

router.get('/assets/:assetId', authenticateToken, async (req, res) => {
  try {
    const group = await PortraitAssetGroup.findOne({ where: { user_id: req.user.id } });
    if (!group) return res.status(400).json({ success: false, message: 'no group' });
    const assetId = req.params.assetId;

    const json = await callArkOpenapi({
      action: 'GetAsset',
      body: {
        AssetId: assetId,
        ProjectName: group.project_name
      }
    });

    const result = json.Result || json;
    const status = result.Status || null;
    await PortraitAsset.update(
      { status, raw: result },
      { where: { user_id: req.user.id, asset_id: assetId } }
    );

    res.json({
      success: true,
      asset: {
        assetId,
        status,
        assetUri: `asset://${assetId}`
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'failed' });
  }
});

router.delete('/assets/:assetId', authenticateToken, async (req, res) => {
  try {
    const group = await PortraitAssetGroup.findOne({ where: { user_id: req.user.id } });
    if (!group) return res.status(400).json({ success: false, message: 'no group' });
    const assetId = req.params.assetId;

    await callArkOpenapi({
      action: 'DeleteAsset',
      body: {
        AssetId: assetId,
        ProjectName: group.project_name
      }
    });

    await PortraitAsset.destroy({ where: { user_id: req.user.id, asset_id: assetId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'failed' });
  }
});

module.exports = router;
