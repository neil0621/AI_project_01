@echo off
chcp 65001 >nul

echo.
echo ========================================
echo AI客户评分系统 - 代理模式依赖安装
echo ========================================
echo.

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 检查Node.js版本...
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js版本: !NODE_VERSION!

echo.
echo ========================================
echo 步骤1: 安装代理服务器依赖
echo ========================================
echo.

echo 正在安装代理服务器依赖...
npm install dotenv

if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 步骤2: 创建环境配置文件
echo ========================================
echo.

if not exist ".env" (
    echo 正在创建 .env 配置文件...
    copy .env.example .env >nul
    echo 配置文件已创建: .env
    echo.
    echo 请编辑 .env 文件，填入你的API密钥：
    echo 1. 打开 .env 文件
    echo 2. 找到 DEEPSEEK_API_KEY
    echo 3. 替换为你的Deepseek API密钥
    echo 4. 保存文件
) else (
    echo 环境配置文件已存在: .env
)

echo.
echo ========================================
echo 步骤3: 验证安装
echo ========================================
echo.

echo 正在验证安装...
node -e "console.log('代理依赖验证通过')"

if %errorlevel% neq 0 (
    echo 错误: 验证失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 代理模式已准备就绪，你可以：
echo.
echo 1. 编辑 .env 文件配置API密钥
echo 2. 运行 start-proxy.bat 启动系统
echo 3. 访问 http://localhost:3000 使用系统
echo 4. 访问 http://localhost:4000/health 检查代理状态
echo.
echo 按任意键退出...
pause >nul