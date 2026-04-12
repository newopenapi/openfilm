<div align="center">
  <img src="public/OpenFilm-logo.png" alt="OpenFilm Logo" width="120" />
  <h1>OpenFilm</h1>
</div>

AI 驱动的图片和视频生成工具，支持 GPT Image、Gemini、Kling AI、Hailuo AI、Seedance 等多模型。采用 React + TypeScript + Vite 构建。

![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)
![Vite](https://img.shields.io/badge/Vite-6.4.1-purple)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

## 功能特性

- **可视化画布** - 拖拽式节点工作流
- **多模型图片生成** - GPT Image 1.5、Gemini Pro、Kling V1-V2.5
- **多模型视频生成** - Veo 3.1、Kling V1-V2.6、Hailuo 2.3/O2、Seedance 1.0-2.0
- **镜头角度控制** - 调整图片的摄像机旋转和倾斜角度
- **故事板** - 创建角色和布局一致的视频分镜
- **运动控制** - 将参考视频的动作迁移到角色图片
- **TikTok 导入** - 下载无水印 TikTok 视频作为运动参考
- **发布到 X/TikTok** - 一键分享生成的图片/视频到社交平台
- **图生图 / 图生视频** - 使用参考图片进行生成
- **关键帧动画** - 在起始帧和结束帧之间生成动画
- **AI 助手** - 内置聊天功能
- **素材库** - 保存和复用生成的素材
- **工作流管理** - 保存、加载和分享工作流
- **本地开源模型** - 支持在本地 GPU 上运行 Stable Diffusion 等模型
- **API 安全** - 后端代理保护密钥安全

## 快速开始

### 两种运行方式

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **Web 开发** | `npm run dev` | 日常开发、调试 |
| **桌面应用** | Electron 打包 | 分发给用户、无需安装 Node.js |

### 环境要求

- Node.js 18+
- npm 或 yarn
- 各 AI 平台的 API Key

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/newopenapi/openfilm.git
   cd openfilm
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**

   在项目根目录创建 `.env` 文件：

   ```env
   # Google Gemini
   GEMINI_API_KEY=your_gemini_api_key_here

   # Kling AI
   KLING_ACCESS_KEY=your_kling_access_key_here
   KLING_SECRET_KEY=your_kling_secret_key_here

   # Hailuo AI (MiniMax)
   HAILUO_API_KEY=your_hailuo_api_key_here

   # OpenAI (GPT Image)
   OPENAI_API_KEY=your_openai_api_key_here

   # Fal.ai (Kling V2.6 运动控制)
   FAL_API_KEY=your_fal_api_key_here

   # 火山引擎 (Seedance)
   VOLCANO_API_KEY=your_volcano_api_key_here
   VOLCANO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

   启动后访问：
   - 前端：`http://localhost:5173`
   - 后端：`http://localhost:3001`

## 部署教程

### Docker 部署（推荐）

```bash
docker compose up -d --build
```

### Zeabur 部署

1. Fork 本项目到你的 GitHub 仓库
2. 注册 [Zeabur](https://zeabur.com)
3. 点击 "New Project" → "Deploy from GitHub"
4. 选择你的仓库
5. 添加环境变量（在 Zeabur 控制台的 Variables 中）：
   - `GEMINI_API_KEY`
   - `KLING_ACCESS_KEY`
   - `KLING_SECRET_KEY`
   - `HAILUO_API_KEY`
   - `OPENAI_API_KEY`
   - `FAL_API_KEY`
   - `VOLCANO_API_KEY`
6. 部署完成，Zeabur 会自动分配域名

### Railway 部署

1. Fork 本项目到你的 GitHub 仓库
2. 注册 [Railway](https://railway.app)
3. 点击 "New Project" → "Deploy from GitHub"
4. 选择你的仓库
5. Railway 会自动检测 Nixpacks 并部署
6. 添加环境变量（在 Settings → Variables 中）
7. 如需持久化数据，可以添加一个 PostgreSQL 数据库

### VPS/服务器部署

1. **安装 Node.js 18+ 和 Docker**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # 安装 Docker
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   ```

2. **克隆并配置**
   ```bash
   git clone https://github.com/newopenapi/openfilm.git
   cd openfilm
   cp .env.example .env
   nano .env  # 编辑并填入你的 API Key
   ```

3. **使用 Docker 部署**
   ```bash
   docker compose up -d --build
   ```

4. **使用 Nginx 反向代理（可选）**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5173;
       }

       location /api {
           proxy_pass http://localhost:3001;
       }
   }
   ```

5. **配置 SSL（使用 Let's Encrypt）**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Cloudflare Tunnel（无需公网 IP）

如果你的服务器没有公网 IP，可以使用 Cloudflare Tunnel：

1. 安装 cloudflared
   ```bash
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
   chmod +x cloudflared
   sudo mv cloudflared /usr/local/bin/
   ```

2. 登录并创建隧道
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create openfilm
   ```

3. 配置 tunnel.yml
   ```yaml
   tunnel: <你的-tunnel-id>
   credentials-file: /root/.cloudflared/<tunnel-id>.json

   ingress:
     - hostname: openfilm.your-domain.com
       service: http://localhost:5173
     - hostname: api-openfilm.your-domain.com
       service: http://localhost:3001
     - service: http_status:404
   ```

4. 启动隧道
   ```bash
   cloudflared tunnel run openfilm
   ```

### 宝塔面板部署

1. 安装宝塔面板
2. 添加 Node.js 项目
3. 上传代码或使用 Git 克隆
4. 配置 .env 文件
5. 设置启动命令：`npm run dev` 或使用 PM2

## 桌面应用（Electron）

OpenFilm 支持打包成桌面应用，一键安装即可使用，无需配置 Node.js 环境。

### 安装 Electron 依赖

```bash
npm install
```

### 开发模式（Electron）

```bash
npm run electron:dev
```

### 打包桌面应用

```bash
# 打包所有平台
npm run electron:build

# 仅打包 macOS
npm run electron:build:mac

# 仅打包 Windows
npm run electron:build:win

# 仅打包 Linux
npm run electron:build:linux
```

打包后的安装包位于 `release/` 目录。

### 桌面版特性

- ✅ **一体化打包** - 服务端和客户端一起打包
- ✅ **内置设置界面** - APP 内直接配置 API Key
- ✅ **安全存储** - 使用 electron-store 加密存储密钥
- ✅ **导入 .env** - 支持导入已有的配置文件
- ✅ **一键安装** - 用户下载安装包，双击即可运行

### 桌面版配置 API Key

首次启动桌面版时，点击右上角的 ⚙️ 设置按钮：

1. **手动输入** - 直接在设置界面填入 API Key
2. **导入 .env** - 点击按钮导入已有的 `.env` 文件
3. **获取密钥** - 点击 "获取密钥" 链接跳转到对应平台

## 模型支持

### 图片生成

| 模型 | 提供商 | 图生图 | 多图参考 |
|------|--------|:------:|:--------:|
| GPT Image 1.5 | OpenAI | ✅ | ✅ |
| Gemini Pro | Google | ✅ | ✅ |
| Kling V1-V2.5 | Kling AI | ✅ | ✅ |

### 视频生成

| 模型 | 提供商 | 文生视频 | 图生视频 | 关键帧 |
|------|--------|:--------:|:--------:|:------:|
| Veo 3.1 | Google | ✅ | ✅ | ✅ |
| Kling V1-V2.6 | Kling AI | ✅ | ✅ | ✅ |
| Hailuo 2.3/O2 | MiniMax | ✅ | ✅ | ✅ |
| Seedance 1.0-2.0 | 火山引擎 | ✅ | ✅ | ✅ |
| Kling V2.6 Motion | Fal.ai | ❌ | ✅ | 运动控制 |

## 安全说明

API 密钥仅存储在服务端，不会暴露给浏览器：

```
浏览器 → 后端 :3001 → AI API
```

- ✅ 密钥存储在 `.env`（仅服务端）
- ✅ `.env` 文件已在 `.gitignore` 中
- ✅ 后端代理所有 API 调用

## 技术栈

- **前端**: React 18, TypeScript, Vite, Tailwind CSS
- **后端**: Express, LangGraph.js
- **AI**: Gemini API, OpenAI API, Kling AI, MiniMax, 火山引擎, Fal.ai

## 许可证

Apache License 2.0

商业使用请参阅 [NOTICE](NOTICE) 文件了解通知要求。

## 致谢

由 React + TypeScript + AI API（OpenAI、Google、Kling、MiniMax、火山引擎、字节Seedance、Fal.ai）驱动。
