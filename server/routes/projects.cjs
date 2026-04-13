/**
 * 项目管理路由
 */
const express = require('express');
const { Project, Asset, Collaborator, User, History } = require('../models/index.cjs');
const { consumeCredits } = require('../services/subscription.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

/**
 * GET /api/projects
 * 获取用户的所有项目
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 获取用户创建的项目
        const ownedProjects = await Project.findAll({
            where: { ownerId: userId },
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'username', 'email']
            }],
            order: [['updatedAt', 'DESC']]
        });

        // 获取用户参与协作的项目
        const collaborations = await Collaborator.findAll({
            where: { userId },
            include: [{
                model: Project,
                as: 'project',
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'email']
                }]
            }]
        });

        const collaboratedProjects = collaborations.map(c => ({
            ...c.project.toJSON(),
            role: c.role,
            isOwner: false
        }));

        // 标记所有者项目
        const ownedFormatted = ownedProjects.map(p => ({
            ...p.toJSON(),
            role: 'owner',
            isOwner: true
        }));

        const allProjects = [...ownedFormatted, ...collaboratedProjects];
        
        res.json({ success: true, projects: allProjects });
    } catch (error) {
        console.error('[Projects] Failed to get projects:', error);
        res.status(500).json({ error: 'Failed to get projects' });
    }
});

/**
 * GET /api/projects/:id
 * 获取单个项目详情
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const project = await Project.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'email']
                },
                {
                    model: Collaborator,
                    as: 'collaborators',
                    include: [{
                        model: User,
                        attributes: ['id', 'username', 'email']
                    }]
                }
            ]
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // 检查权限
        const isOwner = project.ownerId === userId;
        const isCollaborator = await Collaborator.findOne({
            where: { projectId: id, userId }
        });

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ success: true, project });
    } catch (error) {
        console.error('[Projects] Failed to get project:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
});

/**
 * POST /api/projects
 * 创建新项目
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        const userId = req.user.id;

        if (!title) {
            return res.status(400).json({ error: 'Project title is required' });
        }

        const project = await Project.create({
            title,
            description,
            ownerId: userId,
            settings: {
                isPublic: false,
                allowComments: true
            }
        });

        res.json({ success: true, project });
    } catch (error) {
        console.error('[Projects] Failed to create project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * PUT /api/projects/:id
 * 更新项目
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, description, settings, nodes } = req.body;

        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== userId) {
            return res.status(403).json({ error: 'Only owner can update project' });
        }

        await project.update({
            title: title || project.title,
            description: description !== undefined ? description : project.description,
            settings: settings || project.settings,
            nodes: nodes || project.nodes,
            updatedAt: new Date()
        });

        res.json({ success: true, project });
    } catch (error) {
        console.error('[Projects] Failed to update project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== userId) {
            return res.status(403).json({ error: 'Only owner can delete project' });
        }

        // 删除关联的协作者
        await Collaborator.destroy({ where: { projectId: id } });
        
        // 删除关联的资产
        await Asset.destroy({ where: { projectId: id } });

        // 删除项目
        await project.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error('[Projects] Failed to delete project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

/**
 * POST /api/projects/:id/collaborators
 * 添加协作者
 */
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;
        const userId = req.user.id;

        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== userId) {
            return res.status(403).json({ error: 'Only owner can add collaborators' });
        }

        const collaborator = await User.findOne({ where: { email } });
        if (!collaborator) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 检查是否已是协作者
        const existing = await Collaborator.findOne({
            where: { projectId: id, userId: collaborator.id }
        });

        if (existing) {
            return res.status(400).json({ error: 'User is already a collaborator' });
        }

        const newCollaborator = await Collaborator.create({
            projectId: id,
            userId: collaborator.id,
            role: role || 'editor'
        });

        res.json({ success: true, collaborator: newCollaborator });
    } catch (error) {
        console.error('[Projects] Failed to add collaborator:', error);
        res.status(500).json({ error: 'Failed to add collaborator' });
    }
});

/**
 * DELETE /api/projects/:id/collaborators/:userId
 * 移除协作者
 */
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
    try {
        const { id, userId } = req.params;
        const currentUserId = req.user.id;

        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // 只有项目所有者可以移除协作者
        if (project.ownerId !== currentUserId) {
            return res.status(403).json({ error: 'Only owner can remove collaborators' });
        }

        await Collaborator.destroy({
            where: { projectId: id, userId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Projects] Failed to remove collaborator:', error);
        res.status(500).json({ error: 'Failed to remove collaborator' });
    }
});

/**
 * GET /api/projects/:id/assets
 * 获取项目资产
 */
router.get('/:id/assets', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // 检查权限
        const isOwner = project.ownerId === userId;
        const isCollaborator = await Collaborator.findOne({
            where: { projectId: id, userId }
        });

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const assets = await Asset.findAll({
            where: { projectId: id },
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, assets });
    } catch (error) {
        console.error('[Projects] Failed to get assets:', error);
        res.status(500).json({ error: 'Failed to get assets' });
    }
});

/**
 * POST /api/projects/:id/assets
 * 上传资产到项目
 */
router.post('/:id/assets', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { url, type, name, metadata } = req.body;
        const userId = req.user.id;

        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // 检查权限
        const isOwner = project.ownerId === userId;
        const collaborator = await Collaborator.findOne({
            where: { projectId: id, userId }
        });

        if (!isOwner && !collaborator) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // 消耗积分（如果有配置）
        const creditsRequired = type === 'video' ? 10 : 1;
        await consumeCredits(userId, creditsRequired, `Project asset: ${name || type}`);

        const asset = await Asset.create({
            projectId: id,
            userId,
            url,
            type,
            name,
            metadata
        });

        res.json({ success: true, asset });
    } catch (error) {
        console.error('[Projects] Failed to create asset:', error);
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

module.exports = router;
