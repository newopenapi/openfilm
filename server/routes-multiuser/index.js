/**
 * 多用户 API 路由适配层
 * 将 CommonJS 路由转换为 ES Module 兼容
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export function setupAuthRoutes(app) {
    const authRouter = require('../routes/auth.cjs');
    app.use('/api/auth', authRouter);
    console.log('[API] Auth routes mounted: /api/auth/*');
}

export function setupAdminRoutes(app) {
    const adminRouter = require('../routes/admin.cjs');
    app.use('/api/admin', adminRouter);
    console.log('[API] Admin routes mounted: /api/admin/*');
}

export function setupUserRoutes(app) {
    const userRouter = require('../routes/user.cjs');
    app.use('/api/user', userRouter);
    console.log('[API] User routes mounted: /api/user/*');
}

export function setupUploadRoutes(app) {
    const uploadRouter = require('../routes/upload.cjs');
    app.use('/api/upload', uploadRouter);
    console.log('[API] Upload routes mounted: /api/upload/*');
}

export function setupModelsRoutes(app) {
    const modelsRouter = require('../routes/models.cjs');
    app.use('/api/models', modelsRouter);
    console.log('[API] Models routes mounted: /api/models/*');
}
