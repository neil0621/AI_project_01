# AI客户评分系统 - 代理模式实现总结

## 实现目标
为保护API密钥安全，避免前端代码直接暴露密钥，我们实现了一个完整的本地代理服务器架构。

## 新增文件

### 1. 代理服务器核心文件
- **proxy-server.js** - 核心代理服务器，负责API请求转发、缓存、安全验证
- **.env.example** - 环境变量配置文件模板
- **.env** - 实际的环境变量配置文件（由用户创建）

### 2. 启动和管理脚本
- **start-proxy.bat** - Windows一键启动脚本
- **start-proxy.sh** - Linux/Mac一键启动脚本
- **install-proxy-deps.bat** - 代理依赖安装脚本

### 3. 文档说明
- **PROXY_GUIDE.md** - 完整代理模式使用指南
- **PROXY_IMPLEMENTATION_SUMMARY.md** - 实现总结文档

## 架构设计

### 1. 代理模式流程
```
客户端 (浏览器)
    ↓ (HTTP请求到代理)
代理服务器 (localhost:4000)
    ↓ (HTTPS请求 + API密钥)
AI API服务
    ↓ (分析结果)
代理服务器 (缓存处理)
    ↓ (返回结果)
客户端 (浏览器)
```

### 2. 安全特性
- **API密钥隔离**：密钥只存在于服务器端环境变量
- **CORS保护**：只允许指定来源的请求
- **请求验证**：验证请求格式和内容
- **错误隔离**：API错误不会直接暴露给客户端

### 3. 缓存机制
- **24小时缓存**：相同请求自动缓存
- **100项上限**：防止内存过度占用
- **内存+磁盘**：同时使用内存和文件缓存

## 代码修改

### 1. config.js 修改
```javascript
// 原配置
AI_PROVIDER: 'deepseek',
API_KEY: 'sk-bd58153315b0462ebb3746696112807c',

// 新配置
AI_PROVIDER: 'proxy',
USE_PROXY: true,
PROXY_URL: 'http://localhost:4000/api/proxy',
```

### 2. deepseek-analyzer.js 修改
- **构造函数**：支持代理模式初始化
- **callDeepseekAPI方法**：拆分为代理调用和直接调用两种模式
- **新增方法**：callProxyAPI() - 专门处理代理请求

### 3. server.js 保持不变
前端服务器继续在3000端口运行，通过代理服务器调用API

## 使用方式

### 方法一：快速启动
```bash
# Windows
双击 start-proxy.bat

# Linux/Mac
chmod +x start-proxy.sh
./start-proxy.sh
```

### 方法二：手动配置
1. 复制 `.env.example` 为 `.env`
2. 编辑 `.env` 文件，填入API密钥
3. 启动代理服务器：`node proxy-server.js`
4. 启动前端服务器：`node server.js`

## 配置文件示例

### .env 文件内容
```env
# Deepseek API (推荐)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment
AZURE_OPENAI_API_KEY=your-azure-api-key-here

# 代理服务器配置
PROXY_PORT=4000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 监控和调试

### 健康检查
访问：http://localhost:4000/health

### 统计信息
访问：http://localhost:4000/stats

### 手动测试代理
```bash
curl -X POST http://localhost:4000/api/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "endpoint": "/chat/completions",
    "data": {
      "model": "deepseek-chat",
      "messages": [
        {"role": "user", "content": "Hello"}
      ],
      "temperature": 0.3,
      "max_tokens": 100,
      "top_p": 0.9,
      "stream": false
    }
  }'
```

## 性能优化

### 1. 批处理
- 前端每批处理5个客户
- 减少API调用次数

### 2. 缓存策略
- MD5哈希生成缓存键
- 24小时有效期
- 自动清理过期缓存

### 3. 错误降级
- API失败自动使用模拟分析
- 网络超时自动重试
- 余额不足提示更换密钥

## 扩展性

### 1. 多API提供商支持
- Deepseek (默认)
- OpenAI
- Azure OpenAI
- 自定义端点

### 2. 动态配置
- 无需重启更新API密钥
- 实时调整缓存策略
- 灵活配置CORS规则

## 安全最佳实践

1. **密钥管理**：使用环境变量存储API密钥
2. **访问控制**：限制代理服务器的可访问来源
3. **请求验证**：验证所有传入的请求格式
4. **错误处理**：统一的错误响应格式，避免信息泄露
5. **日志记录**：记录所有API调用，便于审计

## 故障排除

### 常见问题
1. **代理服务器启动失败**：检查端口冲突、Node.js版本
2. **API调用失败**：检查 .env 配置、网络连接
3. **前端无法连接代理**：检查CORS设置、防火墙

### 调试步骤
1. 检查代理服务器是否运行
2. 验证 .env 文件配置
3. 测试网络连接
4. 查看控制台错误信息

## 总结

通过实现代理模式，我们成功实现了：
- ✅ API密钥的安全保护
- ✅ 请求的缓存优化
- ✅ 错误隔离和降级
- ✅ 多提供商支持
- ✅ 完整的监控和调试功能

系统现在既保持了前端轻量化的优势，又确保了API调用的安全性和可靠性。