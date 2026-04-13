/**
 * 资产管理路由
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Asset, User, Project, Collaborator } = require('../models/index.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

// 确保资产目录存在
const ASSETS_DIR = path.join(process.cwd(), 'library', 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

/**
 * GET /api/assets
 * 获取用户所有资产（分页）
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type; // 'image' | 'video' | null
        const offset = (page - 1) * limit;

        const where = { userId };
        if (type) {
            where.type = type;
        }

        const { count, rows } = await Asset.findAndCountAll({
            where,
            include: [{
                model: Project,
                as: 'project',
                attributes: ['id', 'title']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            success: true,
            assets: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('[Assets] Failed to get assets:', error);
        res.status(500).json({ error: 'Failed to get assets' });
    }
});

/**
 * GET /api/assets/:id
 * 获取单个资产详情
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const asset = await Asset.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Project,
                    as: 'project',
                    attributes: ['id', 'title']
                }
            ]
        });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // 检查权限
        const isOwner = asset.userId === userId;
        const isCollaborator = await Collaborator.findOne({
            where: { projectId: asset.projectId, userId }
        });

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ success: true, asset });
    } catch (error) {
        console.error('[Assets] Failed to get asset:', error);
        res.status(500).json({ error: 'Failed to get asset' });
    }
});

/**
 * PUT /api/assets/:id
 * 更新资产信息
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { name, description, tags, metadata } = req.body;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (asset.userId !== userId) {
            return res.status(403).json({ error: 'Only owner can update asset' });
        }

        await asset.update({
            name: name || asset.name,
            description: description !== undefined ? description : asset.description,
            tags: tags || asset.tags,
            metadata: metadata || asset.metadata
        });

        res.json({ success: true, asset });
    } catch (error) {
        console.error('[Assets] Failed to update asset:', error);
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

/**
 * DELETE /api/assets/:id
 * 删除资产
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        if (asset.userId !== userId) {
            return res.status(403).json({ error: 'Only owner can delete asset' });
        }

        // 删除物理文件
        if (asset.url && asset.url.startsWith('/library/')) {
            const filePath = path.join(process.cwd(), asset.url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await asset.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error('[Assets] Failed to delete asset:', error);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

/**
 * POST /api/assets/:id/favorite
 * 收藏/取消收藏资产
 */
router.post('/:id/favorite', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const asset = await Asset.findByPk(id);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        await asset.update({
            isFavorite: !asset.isFavorite
        });

        res.json({ success: true, isFavorite: asset.isFavorite });
    } catch (error) {
        console.error('[Assets] Failed to toggle favorite:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

/**
 * GET /api/assets/favorites
 * 获取收藏的资产
 */
router.get('/favorites', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await Asset.findAndCountAll({
            where: { userId, isFavorite: true },
            include: [{
                model: Project,
                as: 'project',
                attributes: ['id', 'title']
            }],
            order: [['updatedAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            success: true,
            assets: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('[Assets] Failed to get favorites:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
});

/**
 * GET /api/assets/search
 * 搜索资产
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { q, type, tags } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { Op } = require('sequelize');

        const where = { userId };

        if (q) {
            where[Op.or] = [
                { name: { [Op.like]: `%${q}%` } },
                { description: { [Op.like]: `%${q}%` } }
            ];
        }

        if (type) {
            where.type = type;
        }

        if (tags) {
            where.tags = { [Op.contains]: tags.split(',') };
        }

        const { count, rows } = await Asset.findAndCountAll({
            where,
            include: [{
                model: Project,
                as: 'project',
                attributes: ['id', 'title']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            success: true,
            assets: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('[Assets] Failed to search assets:', error);
        res.status(500).json({ error: 'Failed to search assets' });
    }
});

module.exports = router;
