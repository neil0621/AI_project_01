#!/bin/bash

echo ""
echo "========================================"
echo "AI客户智能评分系统 - 安全代理模式启动"
echo "========================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    echo "安装命令: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo "检查Node.js版本..."
NODE_VERSION=$(node --version)
echo "Node.js版本: $NODE_VERSION"

echo ""
echo "检查依赖包..."
if [ ! -d "node_modules" ]; then
    echo "未找到node_modules，正在安装依赖..."
    npm install
else
    echo "依赖包已存在"
fi

echo ""
echo "========================================"
echo "步骤1: 检查环境变量配置"
echo "========================================"
echo ""

if [ ! -f ".env" ]; then
    echo "警告: 未找到 .env 文件"
    echo "正在创建 .env 文件模板..."
    cp .env.example .env
    echo ""
    echo "请在 .env 文件中配置你的API密钥:"
    echo "1. 打开 .env 文件"
    echo "2. 填写你的API密钥"
    echo "3. 保存文件"
    echo ""
    echo "按任意键继续（将使用模拟模式）..."
    read -n 1 -s
fi

echo ""
echo "========================================"
echo "步骤2: 启动代理服务器"
echo "========================================"
echo ""

echo "启动代理服务器 (端口: 4000)..."
node proxy-server.js &
PROXY_PID=$!
sleep 2

echo ""
echo "========================================"
echo "步骤3: 启动前端服务器"
echo "========================================"
echo ""

echo "启动前端服务器 (端口: 3000)..."
node server.js &
FRONTEND_PID=$!
sleep 2

echo ""
echo "========================================"
echo "系统启动完成！"
echo "========================================"
echo ""
echo "访问地址:"
echo "1. AI客户评分系统: http://localhost:3000"
echo "2. API代理服务器: http://localhost:4000"
echo "3. 代理健康检查: http://localhost:4000/health"
echo ""

if command -v xdg-open &> /dev/null; then
    echo "正在打开浏览器..."
    xdg-open http://localhost:3000 &
elif command -v open &> /dev/null; then
    echo "正在打开浏览器..."
    open http://localhost:3000 &
else
    echo "请手动打开浏览器访问: http://localhost:3000"
fi

echo ""
echo "服务器正在后台运行..."
echo "代理服务器PID: $PROXY_PID"
echo "前端服务器PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务器..."
echo ""

# 捕获退出信号
trap 'echo ""; echo "正在停止服务器..."; kill $PROXY_PID $FRONTEND_PID 2>/dev/null; wait $PROXY_PID $FRONTEND_PID 2>/dev/null; echo "所有服务器已停止"; exit' INT

# 保持脚本运行
while true; do
    sleep 60
done