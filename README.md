# AI Film（多用户版）

一个支持多用户、实时协作的 AI 图片/视频生成平台（含项目管理、素材库、订阅与积分系统）。

## 主要功能

- AI 图片生成（多提供方：Kling / Hailuo / OpenAI / Volcano 等）
- AI 视频生成
- 分镜脚本生成（Storyboard）
- 多用户系统与角色权限
- 订阅套餐与积分体系
- 实时协作（Socket.IO）
- 项目与素材管理
- 云存储（腾讯 COS）

## 本地开发（Quick Start）

### 环境要求

- Node.js 18+
- MySQL 8.0+
- Redis 6.0+（按需）
- npm

### 安装与启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

按需填写 `.env` 中的数据库与各类 AI/存储/支付密钥。

3. 启动开发环境

```bash
npm run dev
```

默认前端地址：http://localhost:5173

### 默认账号

- 管理后台：http://localhost:5173/admin
- 用户名：admin
- 密码：admin123

## 线上部署（Deployment）

项目默认是“单体部署”：后端 Node 进程同时提供 API 与前端静态页面（生产环境会托管 `dist/`）。

### 方案 A：单体部署（推荐）

1. 准备 `.env`

参考 [.env.example](file:///Users/sky/aifilm/.env.example)，生产环境至少建议配置：

- `NODE_ENV=production`
- `JWT_SECRET=...`（必配）
- `DATABASE_URL=...`（或 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME）
- `CORS_ORIGIN=https://你的域名`
- `VITE_API_BASE_URL=/api`（前端请求基址）
- `VITE_API_URL=https://你的域名`（Socket 连接基址）

支付（可选，启用微信/支付宝）：

- `PAYMENTS_MODE=mock|live`
- `PUBLIC_API_BASE_URL=https://你的域名`（支付回调必须公网可达）
- 支付宝：`ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY`
- 微信：`WECHATPAY_MCH_ID / WECHATPAY_APP_ID / WECHATPAY_CERT_SERIAL / WECHATPAY_PRIVATE_KEY / WECHATPAY_API_V3_KEY / WECHATPAY_PLATFORM_PUBLIC_KEY`

2. 初始化数据库（首次一次性）

```bash
npm ci
npm run db:init
```

3. 构建前端并启动服务

```bash
npm run build
node server/index.js
```

后端默认监听 `3001` 端口。

4. 反向代理与 HTTPS（Nginx/Caddy/SLB）

- 将 `https://你的域名` 反代到 `http://127.0.0.1:3001`
- 必须支持 WebSocket Upgrade（Socket.IO，路径通常是 `/socket.io/`）
- 建议转发 `Host`、`X-Forwarded-Proto`、`X-Forwarded-Host`

健康检查：

- `GET https://你的域名/api/health`

### 方案 B：Docker Compose

仓库提供本地/线上一套 compose（app + mysql + redis）：[docker-compose.yml](file:///Users/sky/aifilm/docker-compose.yml)

1. 启动

```bash
docker-compose up -d --build
```

2. 首次初始化数据库（只需一次）

```bash
docker exec -it openfilm-app sh -lc "npm run db:init"
```

3. 数据持久化

容器会将 `./library` 挂载到 `/app/library` 用于持久化生成内容与项目文件。

### 支付回调（线上必须配置）

如启用微信/支付宝支付，必须保证回调地址公网可访问，并正确配置 `PUBLIC_API_BASE_URL`：

- 支付宝回调：`POST /api/payments/notify/alipay`
- 微信回调：`POST /api/payments/notify/wechat`

## API（常用接口）

### 认证

```
POST /api/auth/register  注册
POST /api/auth/login     登录
GET  /api/auth/me        获取当前用户
```

### 项目

```
GET    /api/projects         获取项目列表
POST   /api/projects         创建项目
GET    /api/projects/:id     获取项目详情
PUT    /api/projects/:id     更新项目
DELETE /api/projects/:id     删除项目
```

### 订阅与积分

```
GET  /api/subscription/plans     套餐列表
GET  /api/subscription/current   当前订阅
GET  /api/subscription/credits   当前积分
GET  /api/subscription/history   积分流水

POST /api/payments/create        创建支付订单（订阅/充值）
GET  /api/payments/:orderId      查询支付状态
```

### 素材

```
GET    /api/assets               素材列表
GET    /api/assets/:id           素材详情
PUT    /api/assets/:id           更新素材
DELETE /api/assets/:id           删除素材
POST   /api/assets/:id/favorite  收藏/取消收藏
```

## 订阅套餐（示例）

| 套餐 | 价格 | 每月积分 | 说明 |
|------|------|----------|------|
| Free | ¥0 | 100 | 基础功能 |
| Basic | ¥29 | 500 | 高清图片、720p 视频 |
| Pro | ¥99 | 2000 | 4K、1080p、协作 |
| Enterprise | ¥299 | 10000 | 更高额度、API 访问 |

## License

MIT
