# AI Film - Multi-User Edition

A collaborative AI video and image generation platform with multi-user support.

## Features

- 🤖 AI Image Generation (Multiple providers: Kling, Hailuo, OpenAI, Volcano, etc.)
- 🎬 AI Video Generation
- 📝 Storyboard Generation
- 👥 Multi-user System with Roles
- 💳 Subscription & Credits System
- 🔄 Real-time Collaboration (Socket.io)
- 📁 Project & Asset Management
- ☁️ Cloud Storage (Tencent COS)

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- Redis 6.0+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with database credentials and API keys

5. Start the servers:
   ```bash
   # Terminal 1: Start backend
   node server/index.js
   
   # Terminal 2: Start frontend (in another terminal)
   npm run dev
   ```

6. Access the app at http://localhost:5173

## Docker Deployment

### Development

```bash
docker-compose up
```

### Production

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Default Credentials

- **Admin Panel**: http://localhost:5173/admin
- **Username**: admin
- **Password**: admin123

## API Documentation

### Authentication

```
POST /api/auth/register - Register new user
POST /api/auth/login    - Login user
GET  /api/auth/me       - Get current user
```

### Projects

```
GET    /api/projects        - List user's projects
POST   /api/projects        - Create new project
GET    /api/projects/:id    - Get project details
PUT    /api/projects/:id    - Update project
DELETE /api/projects/:id    - Delete project
```

### Subscriptions

```
GET  /api/subscription/plans    - List available plans
GET  /api/subscription/current  - Get current subscription
POST /api/subscription/update   - Update subscription
GET  /api/subscription/credits  - Get credits balance
POST /api/subscription/purchase - Purchase credits
GET  /api/subscription/history  - Transaction history
```

### Assets

```
GET  /api/assets        - List user assets
GET  /api/assets/:id    - Get asset details
PUT  /api/assets/:id    - Update asset
DELETE /api/assets/:id  - Delete asset
POST /api/assets/:id/favorite - Toggle favorite
```

## Subscription Plans

| Plan | Price | Credits/Month | Features |
|------|-------|--------------|----------|
| Free | ¥0 | 100 | Basic features |
| Basic | ¥29 | 500 | HD images, 720p video |
| Pro | ¥99 | 2000 | 4K, 1080p, Collaboration |
| Enterprise | ¥299 | 10000 | Unlimited, API access |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | MySQL connection string | Yes |
| REDIS_URL | Redis connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| GEMINI_API_KEY | Google Gemini API key | Yes |
| KLING_ACCESS_KEY | Kling AI access key | No |
| KLING_SECRET_KEY | Kling AI secret key | No |
| TENCENT_SECRET_ID | Tencent COS secret ID | No |
| TENCENT_SECRET_KEY | Tencent COS secret key | No |

## License

MIT
