@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo AI客户智能评分系统 - 安全代理模式启动
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
echo 检查依赖包...
if not exist "node_modules" (
    echo 未找到node_modules，正在安装依赖...
    call npm install
) else (
    echo 依赖包已存在
)

echo.
echo ========================================
echo 步骤1: 检查环境变量配置
echo ========================================
echo.

if not exist ".env" (
    echo 警告: 未找到 .env 文件
    echo 正在创建 .env 文件模板...
    copy .env.example .env >nul
    echo.
    echo 请在 .env 文件中配置你的API密钥:
    echo 1. 打开 .env 文件
    echo 2. 填写你的API密钥
    echo 3. 保存文件
    echo.
    echo 按任意键继续（将使用模拟模式）...
    pause >nul
)

echo.
echo ========================================
echo 步骤2: 启动代理服务器
echo ========================================
echo.

echo 启动代理服务器 (端口: 4000)...
start "AI API 代理服务器" cmd /c "node proxy-server.js"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo 步骤3: 启动前端服务器
echo ========================================
echo.

echo 启动前端服务器 (端口: 3000)...
start "AI客户评分系统" cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo 系统启动完成！
echo ========================================
echo.
echo 访问地址:
echo 1. AI客户评分系统: http://localhost:3000
echo 2. API代理服务器: http://localhost:4000
echo 3. 代理健康检查: http://localhost:4000/health
echo.
echo 按任意键打开浏览器访问系统...
pause >nul

start http://localhost:3000

echo.
echo 按任意键查看代理服务器状态...
pause >nul

start http://localhost:4000

echo.
echo 按任意键停止所有服务器...
pause >nul

echo.
echo 正在停止服务器...
taskkill /f /im node.exe >nul 2>nul

echo.
echo 所有服务器已停止
echo 按任意键退出...
pause >nul