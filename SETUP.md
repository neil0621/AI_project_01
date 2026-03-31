# AI客户智能评分系统 - 环境配置指南

## 快速启动（Windows用户）

### 方法一：双击启动（推荐）
1. 确保已安装 Node.js（版本 14 或以上）
2. 双击 `start.bat` 文件
3. 系统会自动检测环境并启动服务器

### 方法二：命令行启动
```bash
# 安装依赖
npm install

# 启动服务器
npm start
# 或者
node server.js
```

## 环境要求

### 必需软件
1. **Node.js** (版本 14 或以上)
   - 下载地址：https://nodejs.org/
   - 安装时勾选 "Add to PATH" 选项

2. **现代浏览器**
   - Chrome 60+
   - Firefox 55+
   - Edge 79+
   - Safari 11+

### 可选软件
1. **Visual Studio Code**（推荐代码编辑器）
   - 下载地址：https://code.visualstudio.com/

2. **Git**（版本控制）
   - 下载地址：https://git-scm.com/

## 安装验证

### 检查Node.js安装
打开命令提示符（Cmd）或 PowerShell：
```bash
node --version
npm --version
```

应该显示类似：
```
v18.17.0
9.8.1
```

### 检查端口占用
服务器默认使用 **3000** 端口，如需修改请编辑 `server.js`：
```javascript
const PORT = 3000; // 修改为其他端口号
```

检查端口占用：
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

## 启动成功提示

启动成功后，控制台会显示：
```
============================================================
AI客户智能评分系统 - 服务器已启动
============================================================
本地访问:  http://localhost:3000
网络访问:  http://192.168.1.100:3000
============================================================
按 Ctrl+C 停止服务器
============================================================
```

## 访问方式

### 本地访问
打开浏览器，访问：`http://localhost:3000`

### 网络访问
如果要在其他设备访问：
- 确保设备在同一局域网
- 访问：`http://[你的IP地址]:3000`
- IP地址在启动时显示（如：`192.168.1.100`）

## 开发模式

### 自动重启（开发）
```bash
npm run dev
```

需要先安装 nodemon：
```bash
npm install -g nodemon
```

### 静态文件服务（备用）
```bash
npm run serve
```

需要先安装 serve：
```bash
npm install -g serve
```

## 常见问题

### 1. 无法启动服务器
**问题**：端口被占用
**解决**：
1. 修改 `server.js` 中的端口号
2. 或关闭占用端口的程序

### 2. 依赖安装失败
**问题**：网络问题或权限不足
**解决**：
```bash
# 清除npm缓存
npm cache clean --force

# 以管理员身份运行命令行
# 重新安装
npm install
```

### 3. 无法访问页面
**问题**：防火墙阻止
**解决**：
1. Windows防火墙添加允许规则
2. 或临时关闭防火墙测试

### 4. API调用失败
**问题**：Deepseek API密钥无效
**解决**：
1. 在 `config.js` 中替换为有效API密钥
2. 或切换为其他AI服务商

## 项目结构

```
AI_project_01/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 业务逻辑
├── config.js           # API配置
├── deepseek-analyzer.js # AI分析器
├── sample_customers.csv # 示例数据
├── server.js           # Node.js服务器
├── package.json        # 项目配置
├── start.bat           # Windows启动脚本
├── start.sh            # Linux/Mac启动脚本
├── SETUP.md            # 本文件
└── README.md           # 项目说明
```

## 端口转发设置（可选）

### 路由器端口转发
如果需要从外网访问：
1. 登录路由器管理界面
2. 找到端口转发设置
3. 添加规则：
   - 外部端口：3000（或自定义）
   - 内部端口：3000
   - 协议：TCP
   - 内部IP：你的电脑IP地址

### 动态DNS（DDNS）
如果路由器IP会变化：
1. 申请DDNS服务（如花生壳）
2. 在路由器设置DDNS
3. 通过域名访问：`http://your-domain.ddns.net:3000`

## 安全建议

1. **仅在内网使用**：此服务器仅适合内网使用
2. **修改API密钥**：不要在公开环境使用默认API密钥
3. **定期备份数据**：客户数据保存在浏览器本地
4. **及时更新**：定期更新依赖项

## 技术支持

如有问题，请：
1. 查看控制台错误信息
2. 检查网络连接
3. 确认端口未被占用
4. 检查Node.js版本

或参考：
- Node.js官方文档：https://nodejs.org/docs/
- npm官方文档：https://docs.npmjs.com/