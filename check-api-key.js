#!/usr/bin/env node

/**
 * API密钥检查脚本
 * 帮助用户验证和配置API密钥
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

console.log(colors.cyan + '='.repeat(60));
console.log('AI客户评分系统 - API密钥检查工具');
console.log('='.repeat(60) + colors.reset);

// 检查环境变量文件
function checkEnvFile() {
    console.log('\n1. 检查环境变量文件...');
    
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    if (!fs.existsSync(envPath)) {
        console.log(colors.yellow + '  ⚠️  未找到 .env 文件' + colors.reset);
        console.log('  正在从 .env.example 创建 .env 文件...');
        
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log(colors.green + '  ✅ .env 文件已创建' + colors.reset);
            return false; // 新创建的文件，需要用户配置
        } else {
            console.log(colors.red + '  ❌ 未找到 .env.example 文件' + colors.reset);
            return false;
        }
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasDeepseekKey = envContent.includes('DEEPSEEK_API_KEY=') && 
                          !envContent.includes('DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here');
    
    if (hasDeepseekKey) {
        console.log(colors.green + '  ✅ .env 文件已存在且包含API密钥' + colors.reset);
        return true;
    } else {
        console.log(colors.yellow + '  ⚠️  .env 文件存在但未配置API密钥' + colors.reset);
        return false;
    }
}

// 提取API密钥
function extractApiKey() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) return null;
        
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/DEEPSEEK_API_KEY=(.+)/);
        if (match) {
            const key = match[1].trim();
            // 检查是否是示例密钥
            if (key.includes('your-deepseek-api-key-here') || key.length < 20) {
                return null;
            }
            return key;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 测试API密钥
function testApiKey(apiKey) {
    return new Promise((resolve) => {
        console.log('\n2. 测试API密钥有效性...');
        
        const requestBody = JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: 'Hello'
                }
            ],
            max_tokens: 10
        });
        
        const options = {
            hostname: 'api.deepseek.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(colors.green + '  ✅ API密钥有效' + colors.reset);
                    resolve({ valid: true, message: 'API密钥有效' });
                } else if (res.statusCode === 401) {
                    console.log(colors.red + '  ❌ API密钥无效' + colors.reset);
                    try {
                        const errorData = JSON.parse(data);
                        resolve({ 
                            valid: false, 
                            message: `API密钥无效: ${errorData.error?.message || '认证失败'}` 
                        });
                    } catch (e) {
                        resolve({ valid: false, message: 'API密钥无效' });
                    }
                } else if (res.statusCode === 429) {
                    console.log(colors.yellow + '  ⚠️  请求频率限制' + colors.reset);
                    resolve({ valid: true, message: 'API密钥有效（但达到频率限制）' });
                } else {
                    console.log(colors.yellow + `  ⚠️  API返回状态码: ${res.statusCode}` + colors.reset);
                    resolve({ valid: false, message: `API返回状态码: ${res.statusCode}` });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(colors.red + `  ❌ 网络错误: ${error.message}` + colors.reset);
            resolve({ valid: false, message: `网络错误: ${error.message}` });
        });
        
        req.on('timeout', () => {
            console.log(colors.red + '  ❌ 请求超时' + colors.reset);
            req.destroy();
            resolve({ valid: false, message: '请求超时' });
        });
        
        req.setTimeout(10000); // 10秒超时
        req.write(requestBody);
        req.end();
    });
}

// 显示配置指南
function showConfigurationGuide() {
    console.log(colors.cyan + '\n' + '='.repeat(60));
    console.log('配置指南');
    console.log('='.repeat(60) + colors.reset);
    
    console.log('\n获取Deepseek API密钥:');
    console.log('1. 访问 https://platform.deepseek.com/');
    console.log('2. 注册账号并登录');
    console.log('3. 进入 "API Keys" 页面');
    console.log('4. 点击 "Create API Key"');
    console.log('5. 复制生成的密钥（格式: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）');
    
    console.log('\n配置API密钥:');
    console.log('1. 打开 .env 文件');
    console.log('2. 找到 DEEPSEEK_API_KEY= 这一行');
    console.log('3. 替换为: DEEPSEEK_API_KEY=sk-你的实际密钥');
    console.log('4. 保存文件');
    
    console.log('\n备用方案（如果不想使用真实API）:');
    console.log('1. 打开 config.js 文件');
    console.log('2. 修改 AI_PROVIDER: "proxy" 为 AI_PROVIDER: "mock"');
    console.log('3. 修改 USE_PROXY: true 为 USE_PROXY: false');
    console.log('4. 系统将使用模拟分析模式');
}

// 更新配置建议
function suggestConfigurationFix() {
    console.log(colors.cyan + '\n' + '='.repeat(60));
    console.log('快速修复建议');
    console.log('='.repeat(60) + colors.reset);
    
    const configPath = path.join(__dirname, 'config.js');
    if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        // 检查当前配置
        if (configContent.includes("AI_PROVIDER: 'proxy'")) {
            console.log('\n当前使用代理模式，但API密钥无效。');
            console.log('可以选择以下方案:');
            console.log('\n方案A: 使用模拟模式（推荐用于测试）');
            console.log('  修改 config.js:');
            console.log('  AI_PROVIDER: "proxy" → AI_PROVIDER: "mock"');
            console.log('  USE_PROXY: true → USE_PROXY: false');
            
            console.log('\n方案B: 配置有效的API密钥');
            console.log('  1. 获取有效的Deepseek API密钥');
            console.log('  2. 更新 .env 文件中的 DEEPSEEK_API_KEY');
            console.log('  3. 重启代理服务器');
        }
    }
}

// 主函数
async function main() {
    console.log(colors.blue + '开始检查API配置...' + colors.reset);
    
    const envOk = checkEnvFile();
    const apiKey = extractApiKey();
    
    if (!apiKey) {
        console.log(colors.yellow + '\n⚠️  未找到有效的API密钥' + colors.reset);
        showConfigurationGuide();
        suggestConfigurationFix();
        rl.close();
        return;
    }
    
    console.log(colors.blue + `\n找到API密钥: ${apiKey.substring(0, 10)}...` + colors.reset);
    
    const testResult = await testApiKey(apiKey);
    
    if (testResult.valid) {
        console.log(colors.green + '\n✅ API配置正确，系统可以正常工作！' + colors.reset);
        console.log('\n启动系统:');
        console.log('  Windows: 双击 start-proxy.bat');
        console.log('  Linux/Mac: ./start-proxy.sh');
    } else {
        console.log(colors.red + `\n❌ API测试失败: ${testResult.message}` + colors.reset);
        showConfigurationGuide();
        suggestConfigurationFix();
    }
    
    rl.close();
}

// 运行主函数
main().catch(error => {
    console.error(colors.red + '检查过程中出错:' + colors.reset, error);
    rl.close();
});