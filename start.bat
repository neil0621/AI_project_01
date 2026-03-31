@echo off
echo ========================================
echo AI客户智能评分系统 - 启动程序
echo ========================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到Node.js
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo 检测到Node.js版本: 
node --version
echo.

REM 检查npm是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告: npm未安装，但Node.js已就绪
    echo.
)

REM 安装依赖（如果尚未安装）
if exist "node_modules" (
    echo 依赖已安装，跳过安装...
) else (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
    echo 依赖安装成功!
)

echo.
echo ========================================
echo 启动开发服务器...
echo ========================================
echo.

REM 启动服务器
node server.js

if %errorlevel% neq 0 (
    echo.
    echo 服务器启动失败，请检查端口是否被占用
    echo 您可以尝试修改server.js中的端口号
    pause
    exit /b 1
)