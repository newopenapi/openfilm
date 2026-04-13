# OpenFilm 多用户架构升级规划 v2.0

## 需求分析

### 核心需求
1. **多用户体系** - 支持用户注册、登录、权限管理
2. **MySQL 数据库** - 替代现有的文件系统 JSON 存储
3. **实时协作** - 多用户同时编辑同一项目
4. **云存储** - 资源文件使用腾讯云 COS
5. **付费订阅 + 积分系统** - 订阅制 + 后台手动充值

### 用户角色
- **Admin (管理员)** - 管理所有用户、系统配置、查看运营数据、手动充值
- **User (普通用户)** - 使用视频生成功能、查看用量

### 确认的技术方案
- **云存储**: 腾讯云 COS
- **支付**: 后台手动充值（暂不集成支付接口）

---

## 技术架构

### 后端
- **Node.js + Express** - 现有框架扩展
- **MySQL 8.0+** - 主数据库
- **Sequelize ORM** - 数据库 ORM
- **Socket.io** - 实时协作
- **JWT** - 用户认证
- **bcrypt** - 密码加密
- **Redis** - Socket.io 适配器、缓存

### 云服务
- **腾讯云 COS** - 对象存储（图片/视频/音频）

### 前端
- **React 19** - 现有框架
- **Socket.io Client** - 实时协作
- **JWT Token** - 状态管理

---

## 数据库设计

### 核心表结构

```
users ─────────────┐
  │               │
  ├── subscriptions ──┐
  ├── credit_transactions ──┐
  ├── system_config ───────┤
  ├── projects ────────────┤
  │   ├── collaborators ───┤
  │   │
  ├── assets ──────────────┤
  │   │
  ├── history ─────────────┤
  │   │
  └── generation_tasks ────┘
```

### 关键表说明

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| users | 用户表 | role, balance, subscription_type |
| subscription_plans | 订阅套餐 | price, features, limits |
| credit_transactions | 积分流水 | type, credits, balance_after |
| projects | 项目表 | data(JSON), version, is_collaborative |
| collaborators | 协作者 | project_id, user_id, role |
| assets | 资产表 | cos_key, cos_url, size |
| generation_tasks | 生成任务 | status, credits_cost, output_asset_id |

### 积分充值
- Admin 后台手动给用户充值积分
- 记录每次充值到 credit_transactions 表

---

## 实时协作架构

### WebSocket 事件

#### 协作操作
- `join-project` - 加入项目编辑
- `leave-project` - 离开项目编辑
- `cursor-move` - 光标移动同步
- `node-update` - 节点更新
- `node-add` / `node-delete` - 节点增删
- `edge-update` - 边更新
- `project-sync` - 项目状态同步
- `conflict-detected` - 冲突检测

### 冲突解决策略
1. **乐观锁** - 使用版本号检测冲突
2. **操作转换 (OT)** - 实时转换冲突操作
3. **最后写入胜出 (LWW)** - 简单场景使用

---

## 积分消耗规则

### 视频生成
| 模型 | 积分/次 | 时长限制 |
|------|---------|----------|
| seedance-2.0 | 10-50 | 按套餐 |
| kling-1.5 | 15-60 | 按套餐 |
| hailuo-video-01 | 10-40 | 按套餐 |

### 图片生成
| 模型 | 积分/张 |
|------|---------|
| Gemini 图片 | 2-5 |
| SDXL | 3-8 |

### 订阅套餐
| 套餐 | 价格 | 每日次数 | 积分/月 |
|------|------|----------|---------|
| Free | ¥0 | 5 | 50 |
| Basic | ¥99/月 | 50 | 200 |
| Pro | ¥299/月 | 200 | 500 |
| Enterprise | ¥999/月 | 无限制 | 2000 |

---

## 实施步骤

### Phase 1: 数据库和后端基础 (4-5 小时)
1. [ ] MySQL 数据库初始化 (11 张表)
2. [ ] Sequelize ORM 配置
3. [ ] JWT 认证中间件
4. [ ] 注册/登录 API
5. [ ] Redis 配置

### Phase 2: 用户管理和权限 (2-3 小时)
1. [ ] 用户 CRUD API
2. [ ] 管理员权限控制
3. [ ] 系统配置 API
4. [ ] 数据迁移脚本

### Phase 3: 云存储集成 (2-3 小时)
1. [ ] OSS/S3 SDK 配置
2. [ ] 文件上传 API
3. [ ] 签名 URL 生成
4. [ ] CDN 配置

### Phase 4: 订阅和积分系统 (4-5 小时)
1. [ ] 订阅套餐管理
2. [ ] 积分套餐管理
3. [ ] 支付接口 (预留)
4. [ ] 积分消耗逻辑
5. [ ] 用量统计

### Phase 5: 实时协作 (5-6 小时)
1. [ ] Socket.io 配置
2. [ ] 项目房间管理
3. [ ] 光标同步
4. [ ] 操作同步
5. [ ] 冲突检测
6. [ ] 聊天功能

### Phase 6: 项目和资产管理 (3-4 小时)
1. [ ] 项目 API
2. [ ] 资产 API
3. [ ] 协作者 API
4. [ ] 历史记录 API

### Phase 7: 前端界面 (6-8 小时)
1. [ ] 登录/注册页面
2. [ ] JWT 状态管理
3. [ ] Admin 管理面板
4. [ ] 订阅/积分页面
5. [ ] 实时协作 UI
6. [ ] 用量统计展示

### Phase 8: 集成和测试 (3-4 小时)
1. [ ] 前后端集成
2. [ ] 权限测试
3. [ ] 实时协作测试
4. [ ] 支付流程测试

### Phase 9: 文档和部署 (2-3 小时)
1. [ ] README 更新
2. [ ] Docker 配置
3. [ ] 云服务配置指南

---

## 时间估算

| 阶段 | 预计时间 | 累计 |
|------|----------|------|
| Phase 1 | 4-5 小时 | 4-5 小时 |
| Phase 2 | 2-3 小时 | 6-8 小时 |
| Phase 3 | 2-3 小时 | 8-11 小时 |
| Phase 4 | 4-5 小时 | 12-16 小时 |
| Phase 5 | 5-6 小时 | 17-22 小时 |
| Phase 6 | 3-4 小时 | 20-26 小时 |
| Phase 7 | 6-8 小时 | 26-34 小时 |
| Phase 8 | 3-4 小时 | 29-38 小时 |
| Phase 9 | 2-3 小时 | 31-41 小时 |

**📊 总计: 31-41 小时**

---

## 云存储配置

### 支持的云服务商
1. **阿里云 OSS** - 首选国内
2. **AWS S3** - 国际
3. **MinIO** - 自建 S3 兼容存储
4. **腾讯云 COS** - 国内备选

### 配置示例 (.env)
```env
# 云存储配置
OSS_PROVIDER=aliyun
OSS_REGION=cn-beijing
OSS_BUCKET=openfilm-assets
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_CDN_DOMAIN=https://cdn.openfilm.com
```

---

## 支付集成 (预留)

### 支付方式
1. **微信支付** - 国内首选
2. **支付宝** - 国内备选
3. **Stripe** - 海外

---

## 注意事项

1. **向后兼容** - 需要支持从现有 JSON 数据平滑迁移
2. **JWT 安全** - Access Token 短期有效，Refresh Token 长期有效
3. **积分安全** - 积分消耗需要事务保证一致性
4. **支付安全** - 支付回调需要签名验证
5. **实时协作延迟** - 需要考虑网络延迟和冲突处理

---

## Git 分支规划

```
main                    → Web 单用户版本
single-user-electron    → Electron 单用户桌面应用
multi-user-mysql        → 多用户 MySQL 版本 (待创建)
multi-user-realtime     → 实时协作版本 (待创建)
multi-user-pro          → 完整版 (订阅+积分+协作+云存储)
```
