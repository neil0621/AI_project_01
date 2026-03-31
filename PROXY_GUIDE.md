# AI客户评分系统 - 代理模式使用指南

## 概述

为了保护API密钥安全，避免前端代码直接暴露密钥，我们实现了代理模式。所有AI API调用都通过本地代理服务器进行转发，API密钥存储在安全的服务器端。

## 架构

```
前端 (浏览器)
    ↓
    HTTP请求
    ↓
代理服务器 (localhost:4000)
    ↓
    HTTPS请求 + API密钥
    ↓
AI API服务 (Deepseek/OpenAI/Azure)
    ↓
    AI分析结果
    ↓
代理服务器 (缓存)
    ↓
前端 (浏览器)
```

## 快速开始

### 方法一：一键启动（推荐）

#### Windows 用户
1. 双击运行 `start-proxy.bat`
2. 系统会自动启动代理服务器和前端服务器
3. 浏览器会自动打开 http://localhost:3000

#### Linux/Mac 用户
1. 给脚本执行权限：`chmod +x start-proxy.sh`
2. 运行脚本：`./start-proxy.sh`
3. 浏览器会自动打开 http://localhost:3000

### 方法二：手动启动

1. 启动代理服务器：
   ```bash
   node proxy-server.js
   ```

2. 启动前端服务器（新终端）：
   ```bash
   node server.js
   ```

3. 打开浏览器访问：
   - 客户评分系统：http://localhost:3000
   - 代理服务器：http://localhost:4000

## 配置API密钥

### 1. 获取API密钥

- **Deepseek API**：访问 https://platform.deepseek.com/
- **OpenAI API**：访问 https://platform.openai.com/
- **Azure OpenAI**：需要Azure订阅

### 2. 配置环境变量

1. 复制 `.env.example` 为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的API密钥：
   ```env
   # Deepseek API (推荐)
   DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
   
   # OpenAI API
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Azure OpenAI
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment
   AZURE_OPENAI_API_KEY=your-azure-api-key-here
   ```

### 3. 配置前端使用代理

在 `config.js` 中确保以下配置：
```javascript
const DEEPSEEK_CONFIG = {
    AI_PROVIDER: 'proxy',  // 使用代理模式
    USE_PROXY: true,       // 启用代理
    PROXY_URL: 'http://localhost:4000/api/proxy'
};
```

## 代理服务器功能

### 1. 健康检查
访问：http://localhost:4000/health

### 2. 统计信息
访问：http://localhost:4000/stats

### 3. API代理端点
- 地址：http://localhost:4000/api/proxy
- 方法：POST
- 内容类型：application/json

### 请求格式
```json
{
  "provider": "deepseek",
  "endpoint": "/chat/completions",
  "data": {
    "model": "deepseek-chat",
    "messages": [...],
    "temperature": 0.3,
    "max_tokens": 1000,
    "top_p": 0.9,
    "stream": false
  }
}
```

## 安全特性

### 1. API密钥保护
- API密钥不存储在客户端代码中
- 密钥只存在于服务器端环境变量
- 前端请求不包含授权头

### 2. CORS保护
- 只允许来自白名单域名的请求
- 默认允许 localhost:3000
- 可在 .env 中配置 `ALLOWED_ORIGINS`

### 3. 请求缓存
- 相同请求自动缓存24小时
- 减少API调用次数
- 提高响应速度

### 4. 错误隔离
- API错误不会暴露给客户端
- 代理服务器提供统一的错误格式
- 自动降级到模拟分析

## 故障排除

### 常见问题

#### 1. 代理服务器启动失败
- 检查端口4000是否被占用
- 检查Node.js版本（需要Node 12+）
- 检查依赖是否正确安装

#### 2. API调用失败
- 检查 .env 文件中的API密钥
- 检查代理服务器是否运行
- 检查网络连接

#### 3. 前端无法连接代理
- 检查代理服务器地址配置
- 检查CORS设置
- 检查防火墙设置

### 调试信息

#### 检查代理状态
```bash
curl http://localhost:4000/health
```

#### 检查代理统计
```bash
curl http://localhost:4000/stats
```

#### 测试API连通性
```bash
curl -X POST http://localhost:4000/api/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "endpoint": "/chat/completions",
    "data": {
      "model": "deepseek-chat",
      "messages": [
        {
          "role": "user",
          "content": "Hello"
        }
      ],
      "temperature": 0.3,
      "max_tokens": 100,
      "top_p": 0.9,
      "stream": false
    }
  }'
```

## 性能优化

### 1. 缓存设置
在 `proxy-server.js` 中调整：
```javascript
const CACHE_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000, // 缓存24小时
    maxSize: 100, // 最多缓存100个请求
};
```

### 2. 批量处理
- 前端自动批量分析客户
- 减少API调用次数
- 每批5个客户

### 3. 连接池
代理服务器自动管理HTTP连接池
- 重用连接减少开销
- 自动错误重试
- 超时控制

## 部署到生产环境

### 1. 安全配置
```env
# 生产环境配置
PROXY_PORT=443
ALLOWED_ORIGINS=https://your-domain.com
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### 2. 进程管理
建议使用进程管理器：
- **PM2** (推荐)：`pm2 start proxy-server.js`
- **Systemd**：创建systemd服务文件
- **Docker**：创建Docker容器

### 3. 监控和日志
- 启用代理服务器日志
- 监控API使用量
- 设置告警阈值

## 扩展功能

### 1. 多API提供商
代理支持同时配置多个API提供商：
- Deepseek (默认)
- OpenAI
- Azure OpenAI
- 自定义API端点

### 2. API密钥轮换
- 支持定期更换API密钥
- 无需重启服务器
- 动态配置更新

### 3. 使用量统计
- 记录每个API调用
- 统计token使用量
- 生成使用报告

## 技术支持

如有问题，请检查：
1. 查看控制台错误信息
2. 检查代理服务器日志
3. 验证网络连接
4. 确认API密钥有效性

或参考原始文档：
- [API配置指南](API_CONFIG.md)
- [环境设置](SETUP.md)
- [系统使用说明](README.md)