@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ========================================
echo AI客户评分系统 - 恢复代理模式
echo ========================================
echo.

echo 正在恢复代理模式...
echo.

REM 检查备份文件
if not exist "config.js.backup" (
    echo 错误: 未找到配置文件备份
    echo 请手动修改 config.js:
    echo.
    echo 修改以下配置:
    echo   AI_PROVIDER: 'proxy'
    echo   USE_PROXY: true
    echo.
    pause
    exit /b 1
)

REM 恢复备份
copy config.js.backup config.js >nul

echo 已恢复代理模式配置。
echo.
echo ========================================
echo 恢复完成！
echo ========================================
echo.
echo 系统已恢复为代理模式。
echo.
echo 注意: 你需要在 .env 文件中配置有效的API密钥:
echo 1. 打开 .env 文件
echo 2. 设置 DEEPSEEK_API_KEY=你的有效密钥
echo 3. 保存文件
echo.
echo 启动系统:
echo 1. 双击 start-proxy.bat
echo 2. 访问: http://localhost:3000
echo.
echo 按任意键退出...
pause >nul