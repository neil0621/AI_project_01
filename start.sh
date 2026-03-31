#!/bin/bash

echo "========================================"
echo "AI客户智能评分系统 - 启动程序"
echo "========================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到Node.js"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

echo "检测到Node.js版本: "
node --version
echo ""

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "警告: npm未安装，但Node.js已就绪"
    echo ""
fi

# 安装依赖（如果尚未安装）
if [ -d "node_modules" ]; then
    echo "依赖已安装，跳过安装..."
else
    echo "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        exit 1
    fi
    echo "依赖安装成功!"
fi

echo ""
echo "========================================"
echo "启动开发服务器..."
echo "========================================"
echo ""

# 启动服务器
node server.js

if [ $? -ne 0 ]; then
    echo ""
    echo "服务器启动失败，请检查端口是否被占用"
    echo "您可以尝试修改server.js中的端口号"
    exit 1
fi