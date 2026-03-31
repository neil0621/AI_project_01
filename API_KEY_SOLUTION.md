# API密钥问题解决方案

## 问题描述
系统报告401未授权错误，提示API密钥无效：
```
POST http://localhost:4000/api/proxy 401 (Unauthorized)
{"error":{"message":"Authentication Fails, Your api key: ****here is invalid"}}
```

## 原因分析
当前配置的Deepseek API密钥无效或已过期：
- 配置文件：`.env` 中的 `DEEPSEEK_API_KEY=sk-bd58153315b0462ebb3746696112807c`
- 这是一个示例密钥，不能用于实际API调用

## 解决方案

### 方案一：使用模拟模式（推荐用于测试）
这是最简单的解决方案，无需API密钥：

**方法A：使用脚本自动切换**
1. 双击运行 `switch-to-mock-mode.bat`
2. 系统将自动切换到模拟模式
3. 双击运行 `start.bat` 启动系统
4. 访问 http://localhost:3000

**方法B：手动修改配置**
1. 打开 `config.js` 文件
2. 修改以下配置：
   ```javascript
   AI_PROVIDER: 'mock',  // 改为 mock
   USE_PROXY: false,     // 改为 false
   ```
3. 保存文件
4. 启动系统：`node server.js`
5. 访问 http://localhost:3000

### 方案二：配置有效的API密钥（推荐用于生产）
如果需要使用真实的AI分析功能：

**步骤1：获取Deepseek API密钥**
1. 访问 https://platform.deepseek.com/
2. 注册账号并登录
3. 进入 "API Keys" 页面
4. 点击 "Create API Key"
5. 复制生成的密钥（格式：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

**步骤2：配置API密钥**
1. 打开 `.env` 文件
2. 修改以下配置：
   ```env
   DEEPSEEK_API_KEY=sk-你的实际密钥
   ```
3. 保存文件

**步骤3：验证配置**
1. 运行检查脚本：`node check-api-key.js`
2. 如果显示"API密钥有效"，说明配置成功
3. 如果显示"API密钥无效"，请检查密钥是否正确

**步骤4：启动系统**
1. 确保系统在代理模式（`config.js` 中 `AI_PROVIDER: 'proxy'`）
2. 双击运行 `start-proxy.bat`
3. 访问 http://localhost:3000

### 方案三：使用检查工具
系统提供了自动检查工具：

1. 运行检查脚本：
   ```bash
   node check-api-key.js
   ```

2. 脚本将：
   - 检查环境变量配置
   - 测试API密钥有效性
   - 提供详细的配置指导
   - 建议最佳解决方案

## 故障排除

### 1. 如果切换到模拟模式后仍有问题
- 检查浏览器缓存：按 Ctrl+F5 强制刷新页面
- 检查控制台错误：按 F12 打开开发者工具
- 重启服务器：停止并重新启动 `node server.js`

### 2. 如果API密钥测试失败
- 确保密钥格式正确：以 `sk-` 开头
- 确保密钥没有多余的空格或换行
- 检查网络连接：确保可以访问 https://api.deepseek.com
- 检查账户余额：登录 Deepseek 平台查看余额

### 3. 如果代理服务器无法启动
- 检查端口占用：端口4000可能被其他程序占用
- 检查依赖安装：运行 `npm install dotenv`
- 检查Node.js版本：需要 Node.js 12+

## 系统模式说明

### 1. 模拟模式 (Mock Mode)
- **特点**：使用本地算法生成分析结果
- **优点**：无需API密钥，完全免费，响应速度快
- **缺点**：分析结果基于固定算法，不如AI智能
- **适用场景**：测试、演示、离线使用

### 2. 代理模式 (Proxy Mode)
- **特点**：通过代理服务器调用真实的AI API
- **优点**：使用真实的AI分析，结果更智能
- **缺点**：需要有效的API密钥，可能有使用成本
- **适用场景**：生产环境、需要高质量分析

### 3. 直接模式 (Direct Mode)
- **特点**：前端直接调用AI API（不安全）
- **优点**：配置简单
- **缺点**：API密钥暴露在前端代码中
- **适用场景**：开发测试（不推荐生产使用）

## 快速命令参考

```bash
# 检查API密钥配置
node check-api-key.js

# 切换到模拟模式
switch-to-mock-mode.bat

# 恢复代理模式
restore-proxy-mode.bat

# 启动模拟模式
start.bat

# 启动代理模式
start-proxy.bat

# 测试代理服务器
node test-proxy.js
```

## 技术支持
如果以上方案都无法解决问题：

1. **查看详细日志**：
   - 浏览器控制台：按 F12 → Console
   - 服务器日志：查看命令行输出
   - 代理服务器日志：端口4000的控制台输出

2. **检查文件完整性**：
   - 确保所有文件都在项目目录中
   - 确保没有文件被意外修改
   - 可以从原始项目重新下载缺失文件

3. **获取帮助**：
   - 提供具体的错误信息
   - 说明已尝试的解决方案
   - 提供系统环境信息（操作系统、Node.js版本等）

## 常见问题

### Q: 模拟模式的分析质量如何？
A: 模拟模式使用基于规则的算法，会考虑客户数据、行业权重等因素，生成合理的分析结果。虽然不如AI智能，但对于测试和演示完全够用。

### Q: Deepseek API的费用是多少？
A: Deepseek API价格便宜，约 $0.14/百万 tokens。普通使用每月成本很低。

### Q: 可以同时支持多个AI服务商吗？
A: 是的，系统支持 Deepseek、OpenAI、Azure OpenAI 和本地 Ollama。可以在 `.env` 文件中配置多个API密钥。

### Q: 如何知道系统当前使用什么模式？
A: 查看 `config.js` 文件中的 `AI_PROVIDER` 和 `USE_PROXY` 设置。

### Q: 切换模式后需要重启服务器吗？
A: 是的，修改配置后需要重启服务器才能生效。