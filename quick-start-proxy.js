#!/usr/bin/env node

/**
 * 快速启动代理模式示例脚本
 * 展示如何配置和使用代理模式
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('AI客户评分系统 - 代理模式快速启动');
console.log('='.repeat(60));
console.log('');

// 检查必要文件
function checkRequiredFiles() {
    const requiredFiles = [
        'proxy-server.js',
        '.env.example',
        'server.js',
        'config.js',
        'deepseek-analyzer.js'
    ];
    
    console.log('检查必要文件:');
    let allExists = true;
    
    requiredFiles.forEach(file => {
        const exists = fs.existsSync(file);
        console.log(`  ${file}: ${exists ? '✓' : '✗'}`);
        if (!exists) allExists = false;
    });
    
    return allExists;
}

// 检查环境变量配置
function checkEnvConfig() {
    console.log('\n检查环境变量配置:');
    
    if (!fs.existsSync('.env')) {
        console.log('  .env文件: ✗ 不存在');
        console.log('  请复制 .env.example 为 .env 并填写API密钥');
        return false;
    }
    
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasApiKey = envContent.includes('DEEPSEEK_API_KEY=') && 
                      !envContent.includes('DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here');
    
    console.log(`  .env文件: ✓ 存在`);
    console.log(`  API密钥配置: ${hasApiKey ? '✓ 已配置' : '✗ 未配置'}`);
    
    return hasApiKey;
}

// 显示配置信息
function showConfigInfo() {
    console.log('\n当前配置信息:');
    
    try {
        const config = require('./config.js');
        const deepseekConfig = config.DEEPSEEK_CONFIG;
        
        console.log(`  AI提供商: ${deepseekConfig.AI_PROVIDER}`);
        console.log(`  使用代理: ${deepseekConfig.USE_PROXY ? '是' : '否'}`);
        console.log(`  代理URL: ${deepseekConfig.PROXY_URL || '未设置'}`);
        
        return deepseekConfig.AI_PROVIDER === 'proxy' && deepseekConfig.USE_PROXY;
    } catch (error) {
        console.log(`  读取配置失败: ${error.message}`);
        return false;
    }
}

// 显示启动说明
function showStartupInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('启动说明');
    console.log('='.repeat(60));
    
    console.log('\n方法一: 使用启动脚本 (推荐)');
    console.log('  Windows: 双击 start-proxy.bat');
    console.log('  Linux/Mac: ./start-proxy.sh');
    
    console.log('\n方法二: 手动启动');
    console.log('  1. 启动代理服务器: node proxy-server.js');
    console.log('  2. 启动前端服务器: node server.js');
    console.log('  3. 访问: http://localhost:3000');
    
    console.log('\n方法三: 使用开发模式');
    console.log('  npm run dev (需要修改server.js支持代理)');
    
    console.log('\n' + '='.repeat(60));
    console.log('访问地址');
    console.log('='.repeat(60));
    console.log('  客户评分系统: http://localhost:3000');
    console.log('  代理服务器: http://localhost:4000');
    console.log('  健康检查: http://localhost:4000/health');
    console.log('  统计信息: http://localhost:4000/stats');
    
    console.log('\n' + '='.repeat(60));
    console.log('API密钥配置说明');
    console.log('='.repeat(60));
    console.log('  1. 获取Deepseek API密钥: https://platform.deepseek.com/');
    console.log('  2. 编辑 .env 文件');
    console.log('  3. 设置 DEEPSEEK_API_KEY=你的密钥');
    console.log('  4. 保存文件，重启代理服务器');
    
    console.log('\n' + '='.repeat(60));
    console.log('测试代理连接');
    console.log('='.repeat(60));
    console.log('  运行: node test-proxy.js');
}

// 主函数
async function main() {
    console.log('系统环境检查:');
    
    // 检查Node.js版本
    const nodeVersion = process.version;
    console.log(`  Node.js版本: ${nodeVersion}`);
    
    // 检查文件
    const filesOk = checkRequiredFiles();
    if (!filesOk) {
        console.log('\n错误: 缺少必要文件，请确保项目完整');
        return;
    }
    
    // 检查配置
    const envOk = checkEnvConfig();
    const configOk = showConfigInfo();
    
    console.log('\n' + '='.repeat(60));
    console.log('检查结果');
    console.log('='.repeat(60));
    
    if (!envOk) {
        console.log('\n⚠️  警告: 未配置API密钥，系统将使用模拟分析模式');
        console.log('  如需使用真实AI分析，请配置API密钥');
    }
    
    if (!configOk) {
        console.log('\n⚠️  警告: 前端未配置为代理模式');
        console.log('  请确认 config.js 中 AI_PROVIDER 为 "proxy"');
    }
    
    if (envOk && configOk) {
        console.log('\n✅ 所有检查通过，可以启动代理模式');
    } else {
        console.log('\n⚠️  存在配置问题，部分功能可能受限');
    }
    
    showStartupInstructions();
}

// 运行主函数
main().catch(error => {
    console.error('启动检查失败:', error);
});