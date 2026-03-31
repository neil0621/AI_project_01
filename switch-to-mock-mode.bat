@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo AI客户评分系统 - 切换到模拟模式
echo ========================================
echo.

echo 正在切换到模拟模式...
echo.

REM 检查配置文件
if not exist "config.js" (
    echo 错误: 未找到 config.js 文件
    pause
    exit /b 1
)

REM 备份原始配置文件
if not exist "config.js.backup" (
    copy config.js config.js.backup >nul
    echo 已创建配置文件备份: config.js.backup
)

REM 切换到模拟模式
echo 修改 config.js 配置...
powershell -Command "(Get-Content config.js) -replace 'AI_PROVIDER: \\'proxy\\'', 'AI_PROVIDER: \\'mock\\''' | Set-Content config.js"
powershell -Command "(Get-Content config.js) -replace 'USE_PROXY: true', 'USE_PROXY: false' | Set-Content config.js"

echo.
echo ========================================
echo 切换完成！
echo ========================================
echo.
echo 系统已切换到模拟模式，将使用本地模拟分析。
echo 不再需要API密钥，也不会调用外部API。
echo.
echo 启动系统:
echo 1. 双击 start.bat (不使用代理)
echo 2. 或运行: node server.js
echo 3. 访问: http://localhost:3000
echo.
echo 如需切换回代理模式，请运行 restore-proxy-mode.bat
echo.
echo 按任意键退出...
pause >nul