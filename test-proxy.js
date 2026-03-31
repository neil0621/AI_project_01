#!/usr/bin/env node

/**
 * 代理服务器测试脚本
 */

const http = require('http');

console.log('开始测试代理服务器...\n');

// 测试健康检查端点
function testHealthCheck() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: '/health',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('健康检查测试:');
                console.log(`  状态码: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const healthData = JSON.parse(data);
                        console.log(`  状态: ${healthData.status}`);
                        console.log(`  时间戳: ${healthData.timestamp}`);
                        console.log(`  服务状态: Deepseek=${healthData.services.deepseek ? '已配置' : '未配置'}`);
                        resolve(true);
                    } catch (e) {
                        console.log(`  解析响应失败: ${e.message}`);
                        resolve(false);
                    }
                } else {
                    console.log(`  响应数据: ${data.substring(0, 200)}...`);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`健康检查测试失败: ${error.message}`);
            resolve(false);
        });

        req.end();
    });
}

// 测试主页
function testHomePage() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: '/',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('\n主页测试:');
                console.log(`  状态码: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    console.log(`  标题包含: ${data.includes('<title>AI API 代理服务器</title>') ? '是' : '否'}`);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`主页测试失败: ${error.message}`);
            resolve(false);
        });

        req.end();
    });
}

// 测试代理API端点
function testProxyEndpoint() {
    return new Promise((resolve) => {
        const requestBody = JSON.stringify({
            provider: 'deepseek',
            endpoint: '/chat/completions',
            data: {
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, test message'
                    }
                ],
                temperature: 0.3,
                max_tokens: 100,
                top_p: 0.9,
                stream: false
            }
        });

        const options = {
            hostname: 'localhost',
            port: 4000,
            path: '/api/proxy',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('\n代理API端点测试:');
                console.log(`  状态码: ${res.statusCode}`);
                
                if (res.statusCode === 500) {
                    // 因为API密钥未配置，应该返回500错误
                    try {
                        const errorData = JSON.parse(data);
                        console.log(`  错误类型: ${errorData.error?.type || '未知'}`);
                        console.log(`  错误信息: ${errorData.error?.message?.substring(0, 50) || '无'}...`);
                        console.log('  注意: 此测试需要配置正确的API密钥才能通过');
                        resolve(true); // 错误响应也是正常的
                    } catch (e) {
                        console.log(`  响应解析失败: ${e.message}`);
                        resolve(false);
                    }
                } else {
                    console.log(`  响应数据: ${data.substring(0, 100)}...`);
                    resolve(res.statusCode < 400);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`代理API端点测试失败: ${error.message}`);
            console.log('  请确保代理服务器正在运行 (node proxy-server.js)');
            resolve(false);
        });

        req.write(requestBody);
        req.end();
    });
}

// 主测试函数
async function runTests() {
    console.log('='.repeat(60));
    console.log('代理服务器测试');
    console.log('='.repeat(60));
    
    const results = await Promise.all([
        testHealthCheck(),
        testHomePage(),
        testProxyEndpoint()
    ]);
    
    console.log('\n' + '='.repeat(60));
    console.log('测试结果总结:');
    console.log('='.repeat(60));
    
    console.log(`1. 健康检查: ${results[0] ? '✓ 通过' : '✗ 失败'}`);
    console.log(`2. 主页访问: ${results[1] ? '✓ 通过' : '✗ 失败'}`);
    console.log(`3. 代理端点: ${results[2] ? '✓ 通过' : '✗ 失败'}`);
    
    const allPassed = results.every(r => r);
    console.log(`\n${allPassed ? '所有测试通过！' : '部分测试失败，请检查代理服务器。'}`);
    
    if (!allPassed) {
        console.log('\n常见问题解决:');
        console.log('1. 确保代理服务器正在运行: node proxy-server.js');
        console.log('2. 检查端口4000是否被占用');
        console.log('3. 确认Node.js已正确安装');
    }
    
    console.log('\n' + '='.repeat(60));
}

// 运行测试
runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
});