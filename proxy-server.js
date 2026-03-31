#!/usr/bin/env node

/**
 * AI API 代理服务器
 * 用于保护API密钥，避免前端直接暴露密钥
 */

const http = require('http');
const https = require('https');
const url = require('url');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PROXY_PORT || 4000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

// API提供商配置
const API_CONFIG = {
    deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY
    },
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY
    },
    azure: {
        baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY
    }
};

// 缓存配置
const CACHE_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000, // 24小时缓存
    maxSize: 100, // 最多缓存100个请求
    cacheDir: path.join(__dirname, '.cache')
};

// 创建缓存目录
if (!fs.existsSync(CACHE_CONFIG.cacheDir)) {
    fs.mkdirSync(CACHE_CONFIG.cacheDir, { recursive: true });
}

// 缓存存储
const cache = new Map();

/**
 * 生成缓存键
 */
function generateCacheKey(provider, endpoint, body) {
    const hash = require('crypto').createHash('md5')
        .update(`${provider}:${endpoint}:${JSON.stringify(body)}`)
        .digest('hex');
    return hash;
}

/**
 * 检查缓存
 */
function checkCache(cacheKey) {
    const cached = cache.get(cacheKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_CONFIG.maxAge) {
        cache.delete(cacheKey);
        return null;
    }
    
    return cached.data;
}

/**
 * 设置缓存
 */
function setCache(cacheKey, data) {
    if (cache.size >= CACHE_CONFIG.maxSize) {
        // 删除最旧的缓存项
        const oldestKey = Array.from(cache.keys())[0];
        cache.delete(oldestKey);
    }
    
    cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
    });
}

/**
 * 验证请求来源
 */
function validateOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return false;
    
    return ALLOWED_ORIGINS.includes(origin) || 
           ALLOWED_ORIGINS.includes('*') || 
           origin.includes('localhost');
}

/**
 * 获取API配置
 */
function getApiConfig(provider) {
    if (!API_CONFIG[provider]) {
        throw new Error(`不支持的API提供商: ${provider}`);
    }
    
    const config = API_CONFIG[provider];
    if (!config.apiKey) {
        throw new Error(`${provider} API密钥未配置`);
    }
    
    return config;
}

/**
 * 转发请求到实际API
 */
function forwardRequest(provider, endpoint, body, headers) {
    return new Promise((resolve, reject) => {
        const config = getApiConfig(provider);
        
        const apiUrl = new URL(endpoint, config.baseUrl);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'Accept': 'application/json',
                ...headers
            }
        };
        
        const req = https.request(apiUrl, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const result = {
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                };
                
                // 如果API返回401未授权错误，提供更友好的错误信息
                if (res.statusCode === 401) {
                    console.warn(`API密钥认证失败 (${provider}): ${data.substring(0, 100)}...`);
                    try {
                        const errorData = JSON.parse(data);
                        if (errorData.error && errorData.error.message.includes('invalid')) {
                            result.body = JSON.stringify({
                                error: {
                                    message: 'API密钥无效或已过期，请检查.env文件中的配置',
                                    type: 'invalid_api_key',
                                    suggestion: '请获取有效的Deepseek API密钥并更新.env文件'
                                }
                            });
                        }
                    } catch (e) {
                        // 如果解析失败，保持原样
                    }
                }
                
                resolve(result);
            });
        });
        
        req.on('error', (error) => {
            console.error(`API请求失败: ${error.message}`);
            reject(error);
        });
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

/**
 * 处理API代理请求
 */
async function handleApiRequest(req, res, body) {
    try {
        const parsedBody = JSON.parse(body);
        const { provider = 'deepseek', endpoint = '/chat/completions', data } = parsedBody;
        
        // 生成缓存键
        const cacheKey = generateCacheKey(provider, endpoint, data);
        
        // 检查缓存
        const cachedResult = checkCache(cacheKey);
        if (cachedResult) {
            console.log(`使用缓存响应: ${cacheKey.substring(0, 8)}...`);
            res.writeHead(cachedResult.statusCode, cachedResult.headers);
            res.end(cachedResult.body);
            return;
        }
        
        // 转发请求
        const result = await forwardRequest(provider, endpoint, data, {
            'User-Agent': 'AI-Customer-Scoring-Proxy/1.0',
            'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
        
        // 缓存成功响应
        if (result.statusCode >= 200 && result.statusCode < 300) {
            try {
                const parsedData = JSON.parse(result.body);
                if (!parsedData.error) {
                    setCache(cacheKey, result);
                }
            } catch (e) {
                // 解析失败，不缓存
            }
        }
        
        // 返回结果
        res.writeHead(result.statusCode, result.headers);
        res.end(result.body);
        
    } catch (error) {
        console.error('代理请求处理失败:', error);
        
        const errorResponse = {
            error: {
                message: error.message,
                type: 'proxy_error'
            }
        };
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
    }
}

/**
 * 处理健康检查
 */
function handleHealthCheck(req, res) {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            deepseek: !!API_CONFIG.deepseek.apiKey,
            openai: !!API_CONFIG.openai.apiKey,
            azure: !!API_CONFIG.azure.apiKey
        },
        cache: {
            size: cache.size,
            maxSize: CACHE_CONFIG.maxSize
        }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus));
}

/**
 * 处理统计信息
 */
function handleStats(req, res) {
    const stats = {
        cache: {
            size: cache.size,
            keys: Array.from(cache.keys()).map(key => key.substring(0, 8) + '...')
        },
        config: {
            allowedOrigins: ALLOWED_ORIGINS,
            providers: Object.keys(API_CONFIG).map(key => ({
                name: key,
                configured: !!API_CONFIG[key].apiKey
            }))
        }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
}

/**
 * 创建服务器
 */
const server = http.createServer((req, res) => {
    // 设置CORS头
    const origin = req.headers.origin;
    if (validateOrigin(req)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'null');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // 解析URL
    const parsedUrl = url.parse(req.url, true);
    
    // 根据路径路由请求
    if (req.method === 'GET') {
        if (parsedUrl.pathname === '/health') {
            handleHealthCheck(req, res);
            return;
        } else if (parsedUrl.pathname === '/stats') {
            handleStats(req, res);
            return;
        } else if (parsedUrl.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>AI API 代理服务器</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                        h1 { color: #333; }
                        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
                        .healthy { background: #d4edda; color: #155724; }
                        .warning { background: #fff3cd; color: #856404; }
                        .error { background: #f8d7da; color: #721c24; }
                    </style>
                </head>
                <body>
                    <h1>AI API 代理服务器</h1>
                    <p>服务器运行中，代理端点在: <code>/api/proxy</code></p>
                    <p><a href="/health">健康检查</a> | <a href="/stats">统计信息</a></p>
                </body>
                </html>
            `);
            return;
        }
    } else if (req.method === 'POST' && parsedUrl.pathname === '/api/proxy') {
        // 收集请求体
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            handleApiRequest(req, res, body);
        });
        
        return;
    }
    
    // 未匹配的路由
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        error: {
            message: '未找到请求的资源',
            path: parsedUrl.pathname
        }
    }));
});

// 启动服务器
server.listen(PORT, 'localhost', () => {
    console.log('='.repeat(60));
    console.log('AI API 代理服务器已启动');
    console.log('='.repeat(60));
    console.log(`代理地址: http://localhost:${PORT}`);
    console.log(`代理端点: POST http://localhost:${PORT}/api/proxy`);
    console.log(`健康检查: GET http://localhost:${PORT}/health`);
    console.log(`统计信息: GET http://localhost:${PORT}/stats`);
    console.log('');
    console.log('API提供商状态:');
    console.log('- Deepseek:', API_CONFIG.deepseek.apiKey ? '已配置' : '未配置');
    console.log('- OpenAI:', API_CONFIG.openai.apiKey ? '已配置' : '未配置');
    console.log('- Azure:', API_CONFIG.azure.apiKey ? '已配置' : '未配置');
    console.log('');
    console.log('允许的来源:');
    ALLOWED_ORIGINS.forEach(origin => console.log(`- ${origin}`));
    console.log('='.repeat(60));
    console.log('按 Ctrl+C 停止服务器');
    console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭代理服务器...');
    server.close(() => {
        console.log('代理服务器已停止');
        process.exit(0);
    });
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});