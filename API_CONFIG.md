# AI API 配置指南

## 支持的AI服务商

### 1. Deepseek API （推荐）
**特点**：价格便宜，支持中文，响应速度快
**获取方式**：
1. 访问 https://platform.deepseek.com/
2. 注册账号并登录
3. 进入 API Keys 页面
4. 点击 "Create API Key"
5. 复制生成的密钥

**费用**：约 $0.14/百万 tokens

**配置**：
```javascript
// config.js 中修改
AI_PROVIDER: 'deepseek',
API_KEY: 'sk-你的密钥',
```

### 2. OpenAI API
**特点**：稳定性好，生态系统成熟
**获取方式**：
1. 访问 https://platform.openai.com/
2. 注册账号
3. 进入 API Keys 页面创建密钥

**费用**：gpt-3.5-turbo 约 $0.50/百万 tokens

**配置**：
```javascript
AI_PROVIDER: 'openai',
API_KEY: 'sk-你的openai密钥',
```

### 3. Azure OpenAI
**特点**：企业级服务，合规性好
**获取方式**：需要 Azure 订阅，申请 OpenAI 服务

**配置**：
```javascript
AI_PROVIDER: 'azure',
API_KEY: '你的azure密钥',
API_BASE_URL: 'https://你的资源.openai.azure.com/openai/deployments/你的部署id'
```

### 4. 本地模型（Ollama）
**特点**：完全本地运行，无需网络
**安装方式**：
1. 下载 Ollama：https://ollama.com/
2. 安装并启动
3. 拉取模型：
```bash
ollama pull qwen2.5:7b
# 或
ollama pull llama2:7b
```

**配置**：
```javascript
AI_PROVIDER: 'local',
```

## API密钥替换步骤

### 方法一：直接修改 config.js
1. 打开 `config.js` 文件
2. 找到 `API_KEY` 配置
3. 替换为你的密钥：
```javascript
API_KEY: 'sk-你的实际密钥',
```

### 方法二：使用环境变量（高级）
1. 创建 `.env` 文件（复制 `.env.example`）
2. 填写你的API密钥
3. 启动时自动加载

## 免费替代方案

### 1. 使用模拟数据模式
修改 `config.js`：
```javascript
AI_PROVIDER: 'mock', // 添加模拟模式
```

然后修改 `deepseek-analyzer.js` 中的 `callDeepseekAPI` 方法：
```javascript
// 在方法开头添加
if (DEEPSEEK_CONFIG.AI_PROVIDER === 'mock') {
    return Promise.resolve({
        id: 'mock-' + Date.now(),
        model: 'mock-model',
        choices: [{
            message: {
                content: JSON.stringify({
                    valueScore: Math.floor(Math.random() * 30) + 70,
                    followupAdvice: '这是模拟的跟进建议，用于测试UI和功能。建议深度交流，了解客户具体需求，提供定制化解决方案。'
                })
            }
        }]
    });
}
```

### 2. 使用免费的本地模型
1. 安装 Ollama
2. 运行：`ollama run qwen2.5:7b`
3. 修改配置为 `local` 模式

## API调用优化

### 批量处理
系统自动批量处理客户，减少API调用次数。

### 错误处理
- API失败时自动降级为本地分析
- 网络超时自动重试
- 余额不足时提示更换密钥

### 速率限制
- 自动控制请求频率
- 避免触发API限制

## 测试API连通性

### 使用 curl 测试
```bash
# 测试 Deepseek API
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-你的密钥" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'

# 测试本地 Ollama
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "prompt": "Hello",
    "stream": false
  }'
```

## 常见API错误

### 1. 401 Unauthorized
- API密钥错误
- 密钥已过期
- 权限不足

**解决**：检查并更换API密钥

### 2. 402 Payment Required
- 账户余额不足
- 未设置付款方式

**解决**：充值或更换API服务商

### 3. 429 Too Many Requests
- 请求频率过高
- 达到API限额

**解决**：降低请求频率，等待限制解除

### 4. 503 Service Unavailable
- API服务暂时不可用
- 服务器维护

**解决**：等待服务恢复

## 节省API费用技巧

1. **使用更便宜的模型**：Deepseek 比 OpenAI 便宜
2. **减少 token 使用**：优化提示词，减少不必要的内容
3. **本地缓存**：相同客户分析结果可以缓存
4. **批量处理**：尽量一次性分析多个客户

## 安全注意事项

1. **不要提交API密钥到Git**：确保 `.env` 在 `.gitignore` 中
2. **定期更换密钥**：定期轮换API密钥
3. **限制使用范围**：创建仅限特定功能的API密钥
4. **监控使用量**：定期检查API使用情况