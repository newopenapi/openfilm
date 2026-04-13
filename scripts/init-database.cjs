/**
 * 数据库初始化脚本
 * 使用方法: node scripts/init-database.js
 */
require('dotenv').config();
const { sequelize, User, SubscriptionPlan, SystemConfig, AIModel, ModelPricing } = require('../server/models/index.cjs');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  console.log('🔄 开始初始化数据库...\n');

  try {
    // 1. 同步数据库结构
    console.log('📦 同步数据库结构...');
    await sequelize.sync({ force: process.argv.includes('--force') });
    console.log('✅ 数据库结构同步完成\n');

    // 2. 创建订阅套餐
    console.log('💳 创建订阅套餐...');
    const planData = [
      {
        name: '免费版',
        code: 'free',
        price: 0,
        billing_cycle: 'lifetime',
        features: {
          daily_generations: 5,
          video_duration: 5,
          storage: 100,
          collaboration: false,
          priority: false
        },
        daily_generation_limit: 5,
        video_duration_limit: 5,
        storage_limit: 100,
        monthly_credits: 50,
        status: 'active',
        sort_order: 0
      },
      {
        name: '基础版',
        code: 'basic',
        price: 99,
        billing_cycle: 'monthly',
        features: {
          daily_generations: 50,
          video_duration: 30,
          storage: 1000,
          collaboration: true,
          priority: false
        },
        daily_generation_limit: 50,
        video_duration_limit: 30,
        storage_limit: 1000,
        monthly_credits: 200,
        status: 'active',
        sort_order: 1
      },
      {
        name: '专业版',
        code: 'pro',
        price: 299,
        billing_cycle: 'monthly',
        features: {
          daily_generations: 200,
          video_duration: 60,
          storage: 5000,
          collaboration: true,
          priority: true
        },
        daily_generation_limit: 200,
        video_duration_limit: 60,
        storage_limit: 5000,
        monthly_credits: 500,
        status: 'active',
        sort_order: 2
      },
      {
        name: '企业版',
        code: 'enterprise',
        price: 999,
        billing_cycle: 'monthly',
        features: {
          daily_generations: 999999,
          video_duration: 300,
          storage: 20000,
          collaboration: true,
          priority: true,
          api_access: true
        },
        daily_generation_limit: 0, // 无限制
        video_duration_limit: 300,
        storage_limit: 20000,
        monthly_credits: 2000,
        status: 'active',
        sort_order: 3
      }
    ];
    
    let plansCreated = 0;
    for (const plan of planData) {
      const [p, created] = await SubscriptionPlan.findOrCreate({
        where: { code: plan.code },
        defaults: plan
      });
      if (created) plansCreated++;
    }
    console.log(`✅ 订阅套餐已准备就绪 (新增 ${plansCreated} 个)\n`);

    // 3. 创建系统配置
    console.log('⚙️ 创建系统配置...');
    const configData = [
      {
        config_key: 'credit_costs',
        config_value: {
          image: {
            'gemini-2.5-flash-image': 2,
            'gemini-3-pro-image-preview': 5,
            'gemini-3.1-flash-image-preview': 3,
            'dalle-3': 5,
            'sdxl': 3
          },
          video: {
            'seedance-2.0': 20,
            'seedance-2.0-fast': 15,
            'seedance-1.5-pro': 25,
            'seedance-1.0-pro': 30,
            'seedance-1.0-lite': 10,
            'kling-1.5': 30,
            'kling-1.0': 25,
            'hailuo-video-01': 15,
            'fal-video-01': 40
          }
        },
        description: '各模型的积分消耗配置'
      },
      {
        config_key: 'model_configs',
        config_value: {
          providers: ['google', 'openai', 'kling', 'hailuo', 'volcano', 'nanobanana', 'fal']
        },
        description: '启用的模型提供商'
      },
      {
        config_key: 'site_settings',
        config_value: {
          site_name: 'OpenFilm',
          allow_registration: true,
          require_email_verification: false,
          default_subscription: 'free'
        },
        description: '网站基本设置'
      }
    ];

    let configsCreated = 0;
    for (const config of configData) {
      const [c, created] = await SystemConfig.findOrCreate({
        where: { config_key: config.config_key },
        defaults: config
      });
      if (created) configsCreated++;
    }
    console.log(`✅ 系统配置已准备就绪 (新增 ${configsCreated} 个)\n`);

    // 4. 创建管理员账号
    console.log('👤 创建管理员账号...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    
    const [admin, created] = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        email: 'admin@openfilm.com',
        password_hash: adminHash,
        role: 'admin',
        status: 'active',
        subscription_type: 'enterprise',
        balance: 10000,
        subscription_expires_at: new Date('2099-12-31')
      }
    });

    if (created) {
      console.log(`✅ 管理员账号创建成功！`);
      console.log(`   用户名: admin`);
      console.log(`   密码: ${adminPassword}`);
      console.log(`   ⚠️ 请立即修改默认密码！\n`);
    } else {
      console.log('ℹ️ 管理员账号已存在\n');
    }

    // 5. 创建 AI 模型配置
    console.log('🤖 创建 AI 模型配置...');
    const models = [
      // ===== 豆包 Seedream 图片生成模型 =====
      { model_id: 'seedream-5.0', name: 'Seedream 5.0', provider: 'doubao', category: 'image', is_default: false, sort_order: 1, description: '豆包 Seedream 5.0 最新图片生成模型，支持高清画质和复杂场景' },
      { model_id: 'seedream-4.6', name: 'Seedream 4.6', provider: 'doubao', category: 'image', is_default: false, sort_order: 2, description: '豆包 Seedream 4.6 高质量图片生成' },
      { model_id: 'seedream-4.5', name: 'Seedream 4.5', provider: 'doubao', category: 'image', is_default: false, sort_order: 3, description: '豆包 Seedream 4.5 多图生成支持' },
      // ===== Google Gemini 图片模型 =====
      { model_id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 闪图', provider: 'google', category: 'image', is_default: true, sort_order: 10 },
      { model_id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro 图片预览', provider: 'google', category: 'image', is_default: false, sort_order: 11 },
      { model_id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 闪图预览', provider: 'google', category: 'image', is_default: false, sort_order: 12 },
      // ===== OpenAI DALL-E =====
      { model_id: 'dalle-3', name: 'DALL-E 3', provider: 'openai', category: 'image', is_default: false, sort_order: 20 },
      // ===== 豆包 2.0 聊天大模型 =====
      { model_id: 'doubao-2.0-pro', name: '豆包 2.0 Pro', provider: 'doubao', category: 'chat', is_default: true, sort_order: 30, description: '豆包 2.0 Pro 大模型，32K上下文' },
      { model_id: 'doubao-2.0-pro-128k', name: '豆包 2.0 Pro 128K', provider: 'doubao', category: 'chat', is_default: false, sort_order: 31, description: '豆包 2.0 Pro 大模型，128K上下文' },
      { model_id: 'doubao-2.0-lite', name: '豆包 2.0 Lite', provider: 'doubao', category: 'chat', is_default: false, sort_order: 32, description: '豆包 2.0 Lite 大模型，高性价比' },
      { model_id: 'doubao-seed-2.0-code', name: '豆包 Seed 2.0 Code', provider: 'doubao', category: 'chat', is_default: false, sort_order: 33, description: '豆包 Seed 2.0 Code 编程辅助模型' },
      // ===== 视频生成模型 =====
      { model_id: 'seedance-2.0', name: 'Seedance 2.0', provider: 'volcano', category: 'video', is_default: true, sort_order: 100 },
      { model_id: 'seedance-2.0-fast', name: 'Seedance 2.0 快速', provider: 'volcano', category: 'video', is_default: false, sort_order: 101 },
      { model_id: 'kling-1.5', name: 'Kling 1.5', provider: 'kling', category: 'video', is_default: false, sort_order: 102 },
      { model_id: 'kling-1.0', name: 'Kling 1.0', provider: 'kling', category: 'video', is_default: false, sort_order: 103 },
      { model_id: 'hailuo-video-01', name: '海螺 Video 01', provider: 'minimax', category: 'video', is_default: false, sort_order: 104 },
    ];

    for (const model of models) {
      const existing = await AIModel.findOne({ where: { model_id: model.model_id } });
      if (!existing) {
        await AIModel.create(model);
      }
    }
    console.log(`✅ AI 模型配置完成\n`);

    // 6. 创建模型定价
    console.log('💰 创建模型定价配置...');
    const pricings = [
      // ===== 豆包 Seedream 图片生成定价 =====
      { model_id: 'seedream-5.0', billing_type: 'per_call', price: 4, unit: '张', min_charge: 1, description: 'Seedream 5.0 最新模型' },
      { model_id: 'seedream-4.6', billing_type: 'per_call', price: 3, unit: '张', min_charge: 1, description: 'Seedream 4.6 高质量' },
      { model_id: 'seedream-4.5', billing_type: 'per_call', price: 3, unit: '张', min_charge: 1, description: 'Seedream 4.5 多图支持' },
      // ===== Google Gemini 图片定价 =====
      { model_id: 'gemini-2.5-flash-image', billing_type: 'per_call', price: 2, unit: '张', min_charge: 1, description: 'Gemini 2.5 Flash 图片生成' },
      { model_id: 'gemini-3-pro-image-preview', billing_type: 'per_call', price: 5, unit: '张', min_charge: 1, description: 'Gemini 3 Pro 图片预览' },
      { model_id: 'gemini-3.1-flash-image-preview', billing_type: 'per_call', price: 3, unit: '张', min_charge: 1, description: 'Gemini 3.1 Flash 图片预览' },
      // ===== OpenAI DALL-E =====
      { model_id: 'dalle-3', billing_type: 'per_call', price: 5, unit: '张', min_charge: 1, description: 'DALL-E 3 图片生成' },
      // ===== 豆包 2.0 聊天大模型定价（按 Token 计费） =====
      { model_id: 'doubao-2.0-pro', billing_type: 'per_token', price: 0.001, unit: 'K tokens', min_charge: 1, description: '豆包 2.0 Pro 32K', input_price: 0.001, output_price: 0.002 },
      { model_id: 'doubao-2.0-pro-128k', billing_type: 'per_token', price: 0.002, unit: 'K tokens', min_charge: 1, description: '豆包 2.0 Pro 128K', input_price: 0.002, output_price: 0.004 },
      { model_id: 'doubao-2.0-lite', billing_type: 'per_token', price: 0.0005, unit: 'K tokens', min_charge: 1, description: '豆包 2.0 Lite', input_price: 0.0005, output_price: 0.001 },
      { model_id: 'doubao-seed-2.0-code', billing_type: 'per_token', price: 0.0015, unit: 'K tokens', min_charge: 1, description: '豆包 Seed Code', input_price: 0.0015, output_price: 0.003 },
      // ===== 视频生成定价 =====
      { model_id: 'seedance-2.0', billing_type: 'per_call', price: 20, unit: '次', min_charge: 1, description: 'Seedance 2.0 视频生成' },
      { model_id: 'seedance-2.0-fast', billing_type: 'per_call', price: 15, unit: '次', min_charge: 1, description: 'Seedance 2.0 快速模式' },
      { model_id: 'kling-1.5', billing_type: 'per_call', price: 30, unit: '次', min_charge: 1, description: 'Kling 1.5 视频生成' },
      { model_id: 'kling-1.0', billing_type: 'per_call', price: 25, unit: '次', min_charge: 1, description: 'Kling 1.0 视频生成' },
      { model_id: 'hailuo-video-01', billing_type: 'per_call', price: 15, unit: '次', min_charge: 1, description: '海螺 Video 01' },
    ];

    for (const pricing of pricings) {
      const existing = await ModelPricing.findOne({ where: { model_id: pricing.model_id } });
      if (!existing) {
        await ModelPricing.create({ ...pricing, is_active: true });
      }
    }
    console.log(`✅ 模型定价配置完成\n`);

    console.log('🎉 数据库初始化完成！\n');
    console.log('📋 订阅套餐:');
    planData.forEach(p => {
      console.log(`   - ${p.name} (${p.code}): ¥${p.price}/${p.billing_cycle}`);
    });

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

initDatabase();
