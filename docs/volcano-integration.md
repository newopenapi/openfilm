# 火山引擎/Seedance 视频生成模型集成说明

## 📋 概述

本项目已成功集成 **火山引擎（Volcano Engine）Seedance 系列视频生成模型**。

## ✅ 已完成的工作

### 1. 服务端集成
- ✅ `server/services/volcano.js` - 火山引擎API服务实现
  - 支持 OpenAI 兼容的 API 格式
  - 支持 Bearer token 认证
  - 支持任务轮询和状态检查
  - 支持自定义 API 端点（中转站）

- ✅ `server/routes/generation.js` - 视频生成路由
  - 集成火山引擎视频生成接口
  - 支持 text-to-video、image-to-video、frame-to-frame 模式

- ✅ `server/index.js` - 环境变量配置
  - `VOLCANO_API_KEY` - API 密钥
  - `VOLCANO_BASE_URL` - 自定义 API 端点（支持中转站）

### 2. 前端集成
- ✅ `src/components/icons/BrandIcons.tsx` - VolcanoIcon 图标组件
- ✅ `src/components/canvas/NodeControls.tsx` - 模型选择器 UI
  - 添加了 5 个 Seedance 模型选项
  - 火山引擎模型图标显示

- ✅ `src/i18n.ts` - 国际化支持
  - 中英文模型名称翻译
  - 提供商名称翻译

### 3. 文档更新
- ✅ `README.md` - 更新功能列表、环境变量说明、视频模型表格、致谢部分

## 🎬 支持的模型

| 模型 ID | 名称 | 支持时长 | 分辨率 | 支持宽高比 |
|---------|------|---------|--------|-----------|
| seedance-2.0 | Seedance 2.0 | 5s, 10s, 15s | 720p, 1080p | 16:9, 9:16, 4:3, 3:4, 1:1, 21:9 |
| seedance-2.0-fast | Seedance 2.0 Fast | 5s, 10s | 720p, 1080p | 16:9, 9:16 |
| seedance-1.5-pro | Seedance 1.5 Pro | 5s, 10s | 720p, 1080p | 16:9, 9:16 |
| seedance-1.0-pro | Seedance 1.0 Pro | 5s, 10s | 720p, 1080p | 16:9, 9:16 |
| seedance-1.0-lite | Seedance 1.0 Lite | 5s | 480p, 720p | 16:9, 9:16 |

## 🔧 配置说明

### 方式一：使用火山引擎官方 API

1. 访问 [火山引擎控制台](https://console.volcengine.com/ark)
2. 获取 API Key
3. 在 `.env` 文件中添加：
   ```env
   VOLCANO_API_KEY=your_api_key_here
   VOLCANO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   ```

### 方式二：使用中转站/代理服务

如果使用第三方中转站（如 API 中转平台），可以自定义 API 端点：

```env
VOLCANO_API_KEY=your_proxy_api_key_here
VOLCANO_BASE_URL=https://your-proxy-endpoint.com/api/v3
```

## 🌐 API 端点说明

火山引擎使用 OpenAI 兼容的 API 格式：

- **官方端点（中国区）**: `https://ark.cn-beijing.volces.com/api/v3`
- **官方端点（国际区）**: `https://ark.cn-shanghai.volces.com/api/v3`
- **视频生成接口**: `POST /video/generations`
- **任务查询接口**: `GET /video/generations/{task_id}`

## 🔄 技术实现细节

### API 请求格式
```javascript
{
  "model": "seedance-2.0",
  "input": {
    "prompt": "video description",
    "duration": 5,
    "resolution": "720p",
    "aspect_ratio": "16:9",
    "references": [
      {
        "type": "image",
        "url": "data:image/jpeg;base64,...",
        "weight": 1.0
      }
    ]
  }
}
```

### 认证方式
- Bearer Token 认证：`Authorization: Bearer {API_KEY}`

## 📝 注意事项

1. **API Key 安全**: 所有 API keys 仅存储在服务端，不会暴露给浏览器
2. **生成时间**: 视频生成可能需要 1-5 分钟，取决于模型和队列
3. **费用**: 使用火山引擎 API 会产生费用，请参考官方定价
4. **中转站**: 使用中转站时，请确保其支持火山引擎 API 格式

## 🐛 故障排除

### 常见问题

1. **API Key 无效**
   - 检查 `VOLCANO_API_KEY` 是否正确配置
   - 确认 API Key 有视频生成权限

2. **连接超时**
   - 检查 `VOLCANO_BASE_URL` 是否可访问
   - 考虑使用更稳定的中转站

3. **生成失败**
   - 查看服务端日志获取详细错误信息
   - 确认提示词符合模型要求

## 📚 相关资源

- [火山引擎官方文档](https://www.volcengine.com/docs/82379/2291680)
- [火山引擎控制台](https://console.volcengine.com/ark)
- [Seedance 模型介绍](https://www.volcengine.com/product/seedance)

---

*最后更新: 2026-04-12*
