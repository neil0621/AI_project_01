// AI API 分析器 - 支持多种AI服务
class DeepseekAnalyzer {
    constructor() {
        this.aiProvider = DEEPSEEK_CONFIG.AI_PROVIDER;
        this.useProxy = DEEPSEEK_CONFIG.USE_PROXY || false;
        this.proxyUrl = DEEPSEEK_CONFIG.PROXY_URL || 'http://localhost:4000/api/proxy';
        
        // 代理模式下不存储API密钥
        if (this.useProxy && this.aiProvider === 'proxy') {
            this.apiKey = null;
            this.baseUrl = this.proxyUrl;
            this.model = DEEPSEEK_CONFIG.MODEL.proxy || 'deepseek-chat';
        } else {
            this.apiKey = DEEPSEEK_CONFIG.API_KEY;
            this.baseUrl = DEEPSEEK_CONFIG.API_BASE_URL[this.aiProvider] || DEEPSEEK_CONFIG.API_BASE_URL.deepseek;
            this.model = DEEPSEEK_CONFIG.MODEL[this.aiProvider] || DEEPSEEK_CONFIG.MODEL.deepseek;
        }
        
        this.isAnalyzing = false;
    }

    /**
     * 分析单个客户
     * @param {Object} customer - 客户数据
     * @returns {Promise<Object>} - 分析结果
     */
    async analyzeCustomer(customer) {
        // 移除检查，因为批量分析中已经有检查
        // 单个分析方法可以在批量分析中被调用，不应该检查全局状态

        try {
            // 构建分析提示
            const prompt = this.buildAnalysisPrompt(customer);
            
            // 调用Deepseek API
            const analysisResult = await this.callDeepseekAPI(prompt, DEEPSEEK_CONFIG.ANALYSIS_SETTINGS.VALUE_ANALYSIS);
            
            // 解析分析结果
            const parsedAnalysis = this.parseAnalysisResult(analysisResult, customer);
            
            // 生成跟进建议
            const followupAdvice = await this.generateFollowupAdvice(customer, parsedAnalysis);
            
            // 综合评分
            const finalScore = this.calculateFinalScore(customer, parsedAnalysis);
            
            return {
                ...customer,
                aiScore: finalScore,
                priority: this.determinePriority(finalScore),
                deepseekAnalysis: parsedAnalysis,
                followupAdvice: followupAdvice,
                analysisTime: new Date().toISOString(),
                confidenceScore: this.calculateConfidenceScore(parsedAnalysis)
            };
            
        } catch (error) {
            console.error('Deepseek分析失败:', error);
            console.warn('使用基本分析作为备份方案');
            return this.getBasicAnalysis(customer);
        }
    }

    /**
     * 批量分析客户
     * @param {Array} customers - 客户列表
     * @returns {Promise<Array>} - 分析结果列表
     */
    async analyzeCustomersBatch(customers) {
        if (this.isAnalyzing) {
            throw new Error('正在处理分析请求，请稍后再试');
        }

        this.isAnalyzing = true;

        try {
            const results = [];
            
            // 分批处理，避免API限制
            const batchSize = 5; // 每批处理5个客户
            for (let i = 0; i < customers.length; i += batchSize) {
                const batch = customers.slice(i, i + batchSize);
                const batchPromises = batch.map(customer => this.analyzeCustomer(customer));
                
                const batchResults = await Promise.allSettled(batchPromises);
                
                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    } else {
                        // 分析失败的客户使用基本评分
                        const failedCustomer = batch[index];
                        results.push(this.getBasicAnalysis(failedCustomer));
                        console.warn(`客户${failedCustomer.name}分析失败:`, result.reason);
                    }
                });
                
                // 批次间延迟，避免API限制
                if (i + batchSize < customers.length) {
                    await this.delay(1000);
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('批量分析失败:', error);
            throw new Error(`批量分析失败: ${error.message}`);
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * 构建分析提示
     * @param {Object} customer - 客户数据
     * @returns {string} - 分析提示
     */
    buildAnalysisPrompt(customer) {
        const industryWeights = DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS[customer.industry] || DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS.other;
        const caseStudy = COMPANY_CASE_STUDIES.find(cs => cs.industry === customer.industry);
        
        // 安全地获取行业和规模映射
        const industryText = window.industryMap && window.industryMap[customer.industry] ? window.industryMap[customer.industry] : customer.industry;
        const sizeText = window.sizeMap && window.sizeMap[customer.companySize] ? window.sizeMap[customer.companySize] : customer.companySize;
        
        return `作为AI提效咨询公司的专业分析师，请对以下客户进行深度价值分析：

客户信息：
- 名称：${customer.name}
- 行业：${industryText}
- 规模：${sizeText}
- 年营业额：${customer.annualRevenue}万元
- 潜在价值评分：${customer.potentialValue}/10
- 互动程度：${customer.engagementLevel}/10
- 紧急程度：${customer.urgency}/10
- 备注：${customer.notes || '无'}

公司内部评价标准：
1. 战略价值维度：${DEEPSEEK_CONFIG.COMPANY_EVALUATION_CRITERIA.STRATEGIC_VALUE.join('、')}
2. 财务价值维度：${DEEPSEEK_CONFIG.COMPANY_EVALUATION_CRITERIA.FINANCIAL_VALUE.join('、')}
3. 关系价值维度：${DEEPSEEK_CONFIG.COMPANY_EVALUATION_CRITERIA.RELATIONSHIP_VALUE.join('、')}
4. 风险维度：${DEEPSEEK_CONFIG.COMPANY_EVALUATION_CRITERIA.RISK_FACTORS.join('、')}

行业权重设置：
- 战略价值权重：${industryWeights.strategic * 100}%
- 财务价值权重：${industryWeights.financial * 100}%
- 关系价值权重：${industryWeights.relationship * 100}%
- 风险权重：${industryWeights.risk * 100}%

相关案例分析：
${caseStudy ? `同行业成功案例特点：${caseStudy.characteristics.join('、')}\n成功因素：${caseStudy.successFactors.join('、')}\n风险因素：${caseStudy.risks.join('、')}` : '暂无同行业案例分析'}

请按以下格式提供分析结果：
1. 战略价值分析（0-100分）：[评分] - [详细分析]
2. 财务价值分析（0-100分）：[评分] - [详细分析]
3. 关系价值分析（0-100分）：[评分] - [详细分析]
4. 风险因素评估（0-100分）：[评分] - [详细分析]
5. 核心优势总结：[总结要点]
6. 主要风险预警：[风险要点]
7. 行业竞争力评估：[竞争力分析]

请确保分析基于公司内部评价标准，考虑行业特性和客户具体情况，提供专业、实用、可操作的分析意见。`;
    }

    /**
     * 调用Deepseek API
     * @param {string} prompt - 提示内容
     * @param {Object} settings - API参数
     * @returns {Promise<string>} - API响应
     */
    async callDeepseekAPI(prompt, settings) {
        try {
            console.log('调用Deepseek API，使用方式:', this.useProxy ? '代理模式' : '直接模式');
            console.log('提示长度:', prompt.length);
            
            // 代理模式调用
            if (this.useProxy && this.aiProvider === 'proxy') {
                return await this.callProxyAPI(prompt, settings);
            }
            
            // 直接API调用
            return await this.callDirectAPI(prompt, settings);
        } catch (error) {
            console.error('Deepseek API调用失败:', error);
            // 如果API调用失败，使用模拟分析作为备用方案
            console.warn('使用模拟分析作为备用方案');
            return this.generateMockAnalysis(prompt);
        }
    }

    /**
     * 通过代理调用API
     * @param {string} prompt - 提示内容
     * @param {Object} settings - API参数
     * @returns {Promise<string>} - API响应
     */
    async callProxyAPI(prompt, settings) {
        const requestBody = {
            provider: 'deepseek', // 通过代理指定使用哪个API提供商
            endpoint: '/chat/completions',
            data: {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业的客户价值分析师，擅长结合公司内部评价标准和行业特点进行深度分析。请提供专业、实用、可操作的分析意见。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: settings.temperature,
                max_tokens: settings.max_tokens,
                top_p: settings.top_p,
                stream: false
            }
        };

        console.log('通过代理调用API:', this.proxyUrl);

        const response = await fetch(this.proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('代理API响应错误:', response.status, errorText);
            
            // 对于401认证错误，直接返回模拟分析
            if (response.status === 401) {
                console.warn('API密钥无效或未配置，使用模拟分析');
                console.log('提示: 请检查.env文件中的DEEPSEEK_API_KEY配置');
                return this.generateMockAnalysis(prompt);
            }
            
            // 对于402余额不足错误，直接返回模拟分析
            if (response.status === 402) {
                console.warn('API余额不足，使用模拟分析');
                return this.generateMockAnalysis(prompt);
            }
            
            // 尝试解析错误信息
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`代理API调用失败: ${response.status} - ${errorData.error?.message || errorData.message || '未知错误'}`);
            } catch (e) {
                throw new Error(`代理API调用失败: ${response.status} - ${errorText.substring(0, 200)}`);
            }
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('代理API返回数据格式错误：没有choices字段');
        }

        if (!data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('代理API返回数据格式错误：没有有效的消息内容');
        }

        console.log('代理API调用成功，返回内容长度:', data.choices[0].message.content.length);
        return data.choices[0].message.content;
    }

    /**
     * 直接调用API
     * @param {string} prompt - 提示内容
     * @param {Object} settings - API参数
     * @returns {Promise<string>} - API响应
     */
    async callDirectAPI(prompt, settings) {
        try {
            // 检查API密钥
            if (!this.apiKey || this.apiKey === 'sk-bd58153315b0462ebb3746696112807c') {
                console.warn('使用默认API密钥，建议使用你自己的DeepSeek API密钥');
            }
            
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: '你是一位专业的客户价值分析师，擅长结合公司内部评价标准和行业特点进行深度分析。请提供专业、实用、可操作的分析意见。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: settings.temperature,
                    max_tokens: settings.max_tokens,
                    top_p: settings.top_p,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', response.status, errorText);
                
                // 对于401认证错误，直接返回模拟分析
                if (response.status === 401) {
                    console.warn('API密钥无效或未配置，使用模拟分析');
                    console.log('提示: 请检查config.js文件中的API_KEY配置');
                    return this.generateMockAnalysis(prompt);
                }
                
                // 对于402余额不足错误，直接返回模拟分析
                if (response.status === 402) {
                    console.warn('API余额不足，使用模拟分析');
                    return this.generateMockAnalysis(prompt);
                }
                
                // 尝试解析错误信息
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(`API调用失败: ${response.status} - ${errorData.error?.message || errorData.message || '未知错误'}`);
                } catch (e) {
                    throw new Error(`API调用失败: ${response.status} - ${errorText.substring(0, 200)}`);
                }
            }

            const data = await response.json();
            
            if (!data.choices || data.choices.length === 0) {
                throw new Error('API返回数据格式错误：没有choices字段');
            }

            if (!data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('API返回数据格式错误：没有有效的消息内容');
            }

            console.log('API调用成功，返回内容长度:', data.choices[0].message.content.length);
            return data.choices[0].message.content;
            
        } catch (error) {
            console.error('Deepseek API调用失败:', error);
            // 如果API调用失败，使用模拟分析作为备用方案
            console.warn('使用模拟分析作为备用方案');
            return this.generateMockAnalysis(prompt);
        }
    }

    /**
     * 生成模拟分析结果
     * @param {string} prompt - 提示内容
     * @returns {string} - 模拟分析结果
     */
    generateMockAnalysis(prompt) {
        // 从prompt中提取客户信息
        const nameMatch = prompt.match(/名称：([^\n]+)/);
        const industryMatch = prompt.match(/行业：([^\n]+)/);
        const revenueMatch = prompt.match(/年营业额：([^\n]+)/);
        const potentialMatch = prompt.match(/潜在价值评分：(\d+)/);
        const engagementMatch = prompt.match(/互动程度：(\d+)/);
        const urgencyMatch = prompt.match(/紧急程度：(\d+)/);
        const notesMatch = prompt.match(/备注：([^\n]+)/);
        
        const name = nameMatch ? nameMatch[1].trim() : '未知客户';
        const industry = industryMatch ? industryMatch[1].trim() : '其他';
        const revenue = revenueMatch ? parseInt(revenueMatch[1]) || 0 : 0;
        const potential = potentialMatch ? parseInt(potentialMatch[1]) || 5 : 5;
        const engagement = engagementMatch ? parseInt(engagementMatch[1]) || 5 : 5;
        const urgency = urgencyMatch ? parseInt(urgencyMatch[1]) || 5 : 5;
        const notes = notesMatch ? notesMatch[1].trim() : '无';
        
        // 根据客户数据和公司评价标准生成更精准的评分
        const industryWeights = DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS[this.getIndustryKey(industry)] || DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS.other;
        
        // 战略价值评分（基于行业权重、潜在价值、营业额）
        let strategicScore = potential * 9;
        strategicScore += revenue > 10000 ? 25 : revenue > 5000 ? 20 : revenue > 1000 ? 15 : 10;
        strategicScore += urgency >= 8 ? 15 : urgency >= 6 ? 10 : 5;
        strategicScore = Math.round(strategicScore * industryWeights.strategic);
        strategicScore = Math.min(Math.max(strategicScore, 10), 98);
        
        // 财务价值评分
        let financialScore = Math.min(revenue / 200, 50);
        financialScore += potential >= 8 ? 30 : potential >= 6 ? 20 : 10;
        financialScore += notes.includes('大') || notes.includes('重要') ? 15 : 0;
        financialScore = Math.round(financialScore * industryWeights.financial);
        financialScore = Math.min(Math.max(financialScore, 10), 96);
        
        // 关系价值评分
        let relationshipScore = engagement * 9;
        relationshipScore += urgency >= 7 ? 15 : urgency >= 5 ? 10 : 5;
        relationshipScore += notes.includes('合作') || notes.includes('互动') ? 10 : 0;
        relationshipScore = Math.round(relationshipScore * industryWeights.relationship);
        relationshipScore = Math.min(Math.max(relationshipScore, 15), 95);
        
        // 风险评分（风险越高，分数越高）
        let riskScore = 100 - urgency * 3;
        riskScore += revenue < 500 ? 20 : revenue < 2000 ? 10 : 0;
        riskScore += engagement < 5 ? 15 : 0;
        riskScore += notes.includes('风险') || notes.includes('问题') ? 10 : 0;
        riskScore = Math.round(riskScore * industryWeights.risk);
        riskScore = Math.min(Math.max(riskScore, 20), 90);
        
        // 基于公司评价标准生成详细分析
        const strategicAnalysis = this.generateStrategicAnalysis(name, industry, strategicScore, revenue, potential, industryWeights);
        const financialAnalysis = this.generateFinancialAnalysis(name, financialScore, revenue, notes);
        const relationshipAnalysis = this.generateRelationshipAnalysis(name, relationshipScore, engagement, urgency);
        const riskAnalysis = this.generateRiskAnalysis(name, riskScore, revenue, urgency, engagement);
        
        const coreStrengths = this.generateCoreStrengths(strategicScore, financialScore, relationshipScore, industry);
        const riskWarnings = this.generateRiskWarnings(riskScore, revenue, engagement);
        const competitiveness = this.generateCompetitiveness(name, industry, strategicScore, revenue);
        
        // 生成结构化的模拟分析结果
        return `1. 战略价值分析（0-100分）：${strategicScore}分 - ${strategicAnalysis}

2. 财务价值分析（0-100分）：${financialScore}分 - ${financialAnalysis}

3. 关系价值分析（0-100分）：${relationshipScore}分 - ${relationshipAnalysis}

4. 风险因素评估（0-100分）：${riskScore}分 - ${riskAnalysis}

5. 核心优势总结：${coreStrengths}

6. 主要风险预警：${riskWarnings}

7. 行业竞争力评估：${competitiveness}`;
    }
    
    /**
     * 从行业文本获取行业键
     */
    getIndustryKey(industryText) {
        const industryMap = window.industryMap || {};
        for (const [key, value] of Object.entries(industryMap)) {
            if (value === industryText) {
                return key;
            }
        }
        // 尝试从文本中匹配
        if (industryText.includes('科技') || industryText.includes('互联网')) return 'tech';
        if (industryText.includes('金融') || industryText.includes('保险')) return 'finance';
        if (industryText.includes('制造')) return 'manufacturing';
        if (industryText.includes('零售') || industryText.includes('电商')) return 'retail';
        if (industryText.includes('医疗') || industryText.includes('健康')) return 'healthcare';
        if (industryText.includes('教育') || industryText.includes('培训')) return 'education';
        if (industryText.includes('房地产')) return 'realestate';
        return 'other';
    }
    
    /**
     * 生成战略价值分析
     */
    generateStrategicAnalysis(name, industry, score, revenue, potential, industryWeights) {
        let analysis = `${name}在${industry}行业具有`;
        
        if (score >= 85) {
            analysis += '显著的行业领导地位和战略价值，';
            analysis += '对公司长期业务布局和技术协同有重要影响，';
            analysis += '建议作为核心战略伙伴进行深度合作';
        } else if (score >= 70) {
            analysis += '良好的市场地位和增长潜力，';
            analysis += '具备较强的技术协同和市场拓展价值，';
            analysis += '建议建立长期战略合作关系';
        } else if (score >= 55) {
            analysis += '一定的市场基础和合作潜力，';
            analysis += '可作为战略补充或区域性合作伙伴，';
            analysis += '建议保持适度合作并观察发展';
        } else {
            analysis += '基础合作价值，';
            analysis += '战略价值有限，更适合作为常规业务伙伴，';
            analysis += '建议保持基本联系关注变化';
        }
        
        analysis += `。基于行业权重（战略${Math.round(industryWeights.strategic * 100)}%），`;
        analysis += `年营业额${revenue}万元${revenue > 10000 ? '展现了强大的市场实力' : revenue > 1000 ? '体现了良好的业务基础' : '处于发展初期'}`;
        analysis += `，潜在价值评分${potential}/10${potential >= 8 ? '显示高增长预期' : potential >= 6 ? '显示稳健增长' : '需要进一步培育'}`;
        
        return analysis;
    }
    
    /**
     * 生成财务价值分析
     */
    generateFinancialAnalysis(name, score, revenue, notes) {
        let analysis = `${name}的财务价值`;
        
        if (score >= 80) {
            analysis += '非常突出，财务实力雄厚，利润贡献能力强，';
            analysis += '具备稳定和持续的业务增长基础';
        } else if (score >= 65) {
            analysis += '良好，财务状况稳健，有稳定的收入来源，';
            analysis += '具备良好的业务增长潜力';
        } else if (score >= 50) {
            analysis += '一般，财务基础有待加强，';
            analysis += '需要关注其财务可持续性和增长动力';
        } else {
            analysis += '有限，财务规模较小或存在不确定性，';
            analysis += '建议谨慎评估合作风险';
        }
        
        analysis += `。年营业额${revenue}万元，`;
        if (revenue > 10000) {
            analysis += '属于大型企业规模，财务抗风险能力强';
        } else if (revenue > 5000) {
            analysis += '处于中大型企业规模，财务状况良好';
        } else if (revenue > 1000) {
            analysis += '处于中小企业规模，有成长空间';
        } else {
            analysis += '规模较小，需要关注其财务稳定性';
        }
        
        if (notes && notes.length > 5) {
            analysis += '。备注信息表明' + (notes.includes('重要') ? '这是重要合作伙伴' : '需要进一步了解具体需求');
        }
        
        return analysis;
    }
    
    /**
     * 生成关系价值分析
     */
    generateRelationshipAnalysis(name, score, engagement, urgency) {
        let analysis = `与${name}的合作关系`;
        
        if (score >= 75) {
            analysis += '非常紧密，沟通顺畅高效，';
            analysis += '双方有良好的信任基础和合作默契';
        } else if (score >= 60) {
            analysis += '良好，互动频率适中，';
            analysis += '合作关系稳定且有进一步深化的空间';
        } else if (score >= 45) {
            analysis += '一般，需要加强沟通和互动，';
            analysis += '合作关系有待进一步建立和巩固';
        } else {
            analysis += '薄弱，沟通互动较少，';
            analysis += '需要投入更多资源建立基础关系';
        }
        
        analysis += `。当前互动程度${engagement}/10，`;
        if (engagement >= 8) {
            analysis += '表明双方保持高度活跃的沟通';
        } else if (engagement >= 6) {
            analysis += '表明有定期的有效沟通';
        } else {
            analysis += '建议增加沟通频率以加强关系';
        }
        
        analysis += `；紧急程度${urgency}/10，`;
        if (urgency >= 8) {
            analysis += '需求紧迫，需要优先响应';
        } else if (urgency >= 6) {
            analysis += '有一定紧迫性，建议及时跟进';
        } else {
            analysis += '需求相对平稳，可按计划推进';
        }
        
        return analysis;
    }
    
    /**
     * 生成风险分析
     */
    generateRiskAnalysis(name, score, revenue, urgency, engagement) {
        let analysis = `${name}的主要风险因素`;
        
        if (score >= 70) {
            analysis += '较为显著，需要重点关注和管理。';
            analysis += '风险主要体现在：';
            if (revenue < 1000) {
                analysis += '业务规模较小带来的经营稳定性风险；';
            }
            if (urgency >= 8) {
                analysis += '需求紧迫可能带来的服务质量压力；';
            }
            if (engagement < 5) {
                analysis += '互动不足可能导致信息不对称和决策延迟；';
            }
            analysis += '建议制定详细的风险应对预案';
        } else if (score >= 50) {
            analysis += '处于可控范围，但需要持续监控。';
            analysis += '潜在风险包括：';
            if (revenue < 5000) {
                analysis += '业务规模限制可能影响长期合作稳定性；';
            }
            if (urgency >= 7) {
                analysis += '时间压力可能影响服务深度；';
            }
            analysis += '建议建立常规风险管理机制';
        } else {
            analysis += '相对较低，总体风险可控。';
            analysis += '主要风险点：';
            analysis += '市场竞争变化和行业政策调整；';
            analysis += '建议保持常规风险关注和评估';
        }
        
        return analysis;
    }
    
    /**
     * 生成核心优势
     */
    generateCoreStrengths(strategicScore, financialScore, relationshipScore, industry) {
        const strengths = [];
        
        if (strategicScore >= 75) {
            strengths.push('显著的行业战略地位');
        } else if (strategicScore >= 60) {
            strengths.push('良好的市场基础');
        }
        
        if (financialScore >= 70) {
            strengths.push('稳健的财务状况');
        } else if (financialScore >= 50) {
            strengths.push('可持续的业务模式');
        }
        
        if (relationshipScore >= 65) {
            strengths.push('紧密的合作关系');
        } else if (relationshipScore >= 50) {
            strengths.push('稳定的沟通渠道');
        }
        
        // 基于行业添加特定优势
        if (industry.includes('科技')) {
            strengths.push('技术创新能力');
        }
        if (industry.includes('金融')) {
            strengths.push('合规经营基础');
        }
        if (industry.includes('制造')) {
            strengths.push('生产制造能力');
        }
        
        return strengths.length > 0 ? strengths.join('、') : '基础合作潜力';
    }
    
    /**
     * 生成风险预警
     */
    generateRiskWarnings(riskScore, revenue, engagement) {
        const warnings = [];
        
        if (riskScore >= 70) {
            warnings.push('高风险需要重点关注');
            if (revenue < 1000) {
                warnings.push('经营稳定性风险');
            }
            if (engagement < 5) {
                warnings.push('沟通不足风险');
            }
        } else if (riskScore >= 50) {
            warnings.push('中等风险需要监控');
            if (revenue < 5000) {
                warnings.push('规模限制风险');
            }
        } else {
            warnings.push('低风险总体可控');
        }
        
        warnings.push('行业政策变化风险');
        warnings.push('市场竞争加剧风险');
        
        return warnings.join('、');
    }
    
    /**
     * 生成竞争力评估
     */
    generateCompetitiveness(name, industry, strategicScore, revenue) {
        let analysis = `在${industry}行业中，${name}`;
        
        if (strategicScore >= 80) {
            analysis += '属于行业领导者或领先企业，';
            analysis += '具有较强的市场影响力和竞争优势，';
            analysis += '建议作为战略重点合作伙伴进行深度绑定';
        } else if (strategicScore >= 65) {
            analysis += '处于行业中等偏上水平，';
            analysis += '具备良好的市场地位和竞争实力，';
            analysis += '建议建立稳定的长期合作关系';
        } else if (strategicScore >= 50) {
            analysis += '处于行业中等水平，';
            analysis += '有一定的市场基础但竞争优势不明显，';
            analysis += '建议选择性合作并关注其发展';
        } else {
            analysis += '在行业中竞争力相对较弱，';
            analysis += '更适合作为补充性或区域性合作伙伴，';
            analysis += '建议保持联系观察变化';
        }
        
        analysis += `。基于${revenue > 10000 ? '大型企业' : revenue > 1000 ? '中型企业' : '小型企业'}规模和行业地位分析，`;
        analysis += '建议结合公司战略和资源投入进行合作决策。';
        
        return analysis;
    }

    /**
     * 解析分析结果
     * @param {string} analysisText - 分析文本
     * @param {Object} customer - 客户数据
     * @returns {Object} - 结构化分析结果
     */
    parseAnalysisResult(analysisText, customer) {
        const lines = analysisText.split('\n').filter(line => line.trim());
        const result = {
            strategicScore: 50,
            financialScore: 50,
            relationshipScore: 50,
            riskScore: 50,
            strategicAnalysis: '',
            financialAnalysis: '',
            relationshipAnalysis: '',
            riskAnalysis: '',
            coreStrengths: [],
            riskWarnings: [],
            industryCompetitiveness: '',
            analysisText: analysisText
        };

        // 解析评分和分析内容
        lines.forEach(line => {
            line = line.trim();
            
            // 解析战略价值
            if (line.startsWith('1.') || line.startsWith('战略价值分析')) {
                const match = line.match(/(\d{1,3})分/);
                if (match) {
                    result.strategicScore = Math.min(Math.max(parseInt(match[1]), 0), 100);
                }
                result.strategicAnalysis = line.replace(/^[^:]*:\s*/, '');
            }
            
            // 解析财务价值
            if (line.startsWith('2.') || line.startsWith('财务价值分析')) {
                const match = line.match(/(\d{1,3})分/);
                if (match) {
                    result.financialScore = Math.min(Math.max(parseInt(match[1]), 0), 100);
                }
                result.financialAnalysis = line.replace(/^[^:]*:\s*/, '');
            }
            
            // 解析关系价值
            if (line.startsWith('3.') || line.startsWith('关系价值分析')) {
                const match = line.match(/(\d{1,3})分/);
                if (match) {
                    result.relationshipScore = Math.min(Math.max(parseInt(match[1]), 0), 100);
                }
                result.relationshipAnalysis = line.replace(/^[^:]*:\s*/, '');
            }
            
            // 解析风险因素
            if (line.startsWith('4.') || line.startsWith('风险因素评估')) {
                const match = line.match(/(\d{1,3})分/);
                if (match) {
                    result.riskScore = Math.min(Math.max(parseInt(match[1]), 0), 100);
                }
                result.riskAnalysis = line.replace(/^[^:]*:\s*/, '');
            }
            
            // 解析核心优势
            if (line.startsWith('5.') || line.startsWith('核心优势总结')) {
                const content = line.replace(/^[^:]*:\s*/, '');
                result.coreStrengths = content.split(/[、,，]/).map(item => item.trim()).filter(item => item);
            }
            
            // 解析风险预警
            if (line.startsWith('6.') || line.startsWith('主要风险预警')) {
                const content = line.replace(/[^:]*:\s*/, '');
                result.riskWarnings = content.split(/[、,，]/).map(item => item.trim()).filter(item => item);
            }
            
            // 解析行业竞争力
            if (line.startsWith('7.') || line.startsWith('行业竞争力评估')) {
                result.industryCompetitiveness = line.replace(/[^:]*:\s*/, '');
            }
        });

        // 应用公司内部评价标准
        this.applyCompanyEvaluationCriteria(result, customer);
        
        return result;
    }

    /**
     * 应用公司内部评价标准
     * @param {Object} analysis - 分析结果
     * @param {Object} customer - 客户数据
     */
    applyCompanyEvaluationCriteria(analysis, customer) {
        const industryWeights = DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS[customer.industry] || DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS.other;
        
        // 根据行业权重调整评分
        analysis.strategicScore = this.adjustScoreByWeight(analysis.strategicScore, industryWeights.strategic);
        analysis.financialScore = this.adjustScoreByWeight(analysis.financialScore, industryWeights.financial);
        analysis.relationshipScore = this.adjustScoreByWeight(analysis.relationshipScore, industryWeights.relationship);
        analysis.riskScore = this.adjustScoreByWeight(analysis.riskScore, industryWeights.risk);
        
        // 添加公司特定的评价标准
        const criteria = DEEPSEEK_CONFIG.COMPANY_EVALUATION_CRITERIA;
        
        // 检查是否满足战略价值标准
        const strategicCriteriaCheck = criteria.STRATEGIC_VALUE.map(item => ({
            criterion: item,
            score: this.evaluateCriterion(item, customer, analysis)
        }));
        
        // 检查财务价值标准
        const financialCriteriaCheck = criteria.FINANCIAL_VALUE.map(item => ({
            criterion: item,
            score: this.evaluateCriterion(item, customer, analysis)
        }));
        
        analysis.companyCriteriaEvaluation = {
            strategic: strategicCriteriaCheck,
            financial: financialCriteriaCheck,
            relationship: criteria.RELATIONSHIP_VALUE.map(item => this.evaluateCriterion(item, customer, analysis)),
            risk: criteria.RISK_FACTORS.map(item => this.evaluateCriterion(item, customer, analysis))
        };
    }

    /**
     * 评估单个标准
     * @param {string} criterion - 评价标准
     * @param {Object} customer - 客户数据
     * @param {Object} analysis - 分析结果
     * @returns {number} - 评分（0-100）
     */
    evaluateCriterion(criterion, customer, analysis) {
        // 基于客户数据和现有分析的简单评估
        let score = 50;
        
        // 根据具体标准调整评分
        if (criterion.includes('行业地位')) {
            if (customer.potentialValue >= 8) score += 20;
            if (customer.annualRevenue > 10000) score += 15;
        }
        
        if (criterion.includes('增长潜力')) {
            if (customer.urgency >= 7) score += 10;
            if (customer.potentialValue >= 7) score += 15;
        }
        
        if (criterion.includes('合作基础')) {
            if (customer.engagementLevel >= 7) score += 20;
        }
        
        return Math.min(Math.max(score, 0), 100);
    }

    /**
     * 根据权重调整评分
     * @param {number} score - 原始评分
     * @param {number} weight - 权重（0-1）
     * @returns {number} - 调整后的评分
     */
    adjustScoreByWeight(score, weight) {
        // 权重越大，对最终评分的影响越大
        return Math.round(score * (0.5 + weight * 0.5));
    }

    /**
     * 生成跟进建议
     * @param {Object} customer - 客户数据
     * @param {Object} analysis - 分析结果
     * @returns {Promise<string>} - 跟进建议
     */
    async generateFollowupAdvice(customer, analysis) {
        try {
            // 安全地获取行业映射
            const industryText = window.industryMap && window.industryMap[customer.industry] ? window.industryMap[customer.industry] : customer.industry;
            
            const prompt = `基于以下客户分析和公司内部标准，提供具体、可操作的跟进建议：

客户基本信息：
- 名称：${customer.name}
- 行业：${industryText}
- 年营业额：${customer.annualRevenue}万元

分析结果：
- 战略价值评分：${analysis.strategicScore}/100
- 财务价值评分：${analysis.financialScore}/100  
- 关系价值评分：${analysis.relationshipScore}/100
- 风险因素评分：${analysis.riskScore}/100
- 核心优势：${analysis.coreStrengths.join('、') || '无'}
- 主要风险：${analysis.riskWarnings.join('、') || '无'}

请提供：
1. 跟进优先级：[高/中/低] + 理由
2. 具体行动建议：[至少3条可操作建议]
3. 时间规划：[建议的时间节点和频率]
4. 预期收益：[量化或定性描述]
5. 风险应对措施：[针对识别风险的具体对策]

请确保建议实用、专业，符合公司业务发展策略，便于销售团队执行。`;

            const advice = await this.callDeepseekAPI(prompt, DEEPSEEK_CONFIG.ANALYSIS_SETTINGS.FOLLOWUP_ANALYSIS);
            return this.formatFollowupAdvice(advice);
            
        } catch (error) {
            console.warn('跟进建议生成失败，使用默认建议:', error);
            return this.getDefaultFollowupAdvice(customer, analysis);
        }
    }

    /**
     * 格式化跟进建议
     * @param {string} advice - 原始建议
     * @returns {string} - 格式化后的建议
     */
    formatFollowupAdvice(advice) {
        // 简单格式化，确保建议清晰可读
        const lines = advice.split('\n').filter(line => line.trim());
        const formatted = lines.map(line => {
            // 确保每行都有适当的标点
            if (!line.endsWith('.') && !line.endsWith('。') && !line.endsWith('!') && !line.endsWith('！')) {
                return line + '。';
            }
            return line;
        });
        
        return formatted.join('\n');
    }

    /**
     * 获取默认跟进建议
     * @param {Object} customer - 客户数据
     * @param {Object} analysis - 分析结果
     * @returns {string} - 默认建议
     */
    getDefaultFollowupAdvice(customer, analysis) {
        const priority = this.determinePriority(this.calculateFinalScore(customer, analysis));
        
        switch (priority) {
            case 'critical':
                return `高价值战略客户，建议立即成立专项跟进小组，本周内安排高层会议，制定长期合作框架，预计潜在价值${customer.annualRevenue * 0.1}万元。`;
                
            case 'high':
                return `优先跟进客户，建议下周安排产品演示，重点沟通${analysis.coreStrengths[0] || '合作需求'}，建立月度沟通机制。`;
                
            case 'medium':
                return `中等价值客户，建议保持季度性跟进，发送行业资讯和案例分享，培养长期合作关系。`;
                
            case 'low':
                return `价值一般客户，建议保持基本联系，纳入长期培养名单，重点观察行业动态变化。`;
                
            default:
                return `建议保持常规跟进，根据客户反馈调整策略。`;
        }
    }

    /**
     * 计算综合评分
     * @param {Object} customer - 客户数据
     * @param {Object} analysis - 分析结果
     * @returns {number} - 综合评分（0-100）
     */
    calculateFinalScore(customer, analysis) {
        const industryWeights = DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS[customer.industry] || DEEPSEEK_CONFIG.INDUSTRY_WEIGHTS.other;
        
        // 加权计算
        let finalScore = 0;
        finalScore += analysis.strategicScore * industryWeights.strategic;
        finalScore += analysis.financialScore * industryWeights.financial;
        finalScore += analysis.relationshipScore * industryWeights.relationship;
        
        // 风险因素负向调整（风险越高，分数越低）
        const riskAdjustment = (100 - analysis.riskScore) / 100;
        finalScore *= riskAdjustment;
        
        // 考虑客户原始评分
        const rawScore = (customer.potentialValue * 10 + customer.engagementLevel * 10 + customer.urgency * 10) / 3;
        finalScore = Math.round(finalScore * 0.7 + rawScore * 0.3);
        
        return Math.min(Math.max(finalScore, 0), 100);
    }

    /**
     * 确定优先级
     * @param {number} score - 综合评分
     * @returns {string} - 优先级标签
     */
    determinePriority(score) {
        const standards = DEEPSEEK_CONFIG.SCORING_STANDARDS;
        
        if (score >= standards.EXCELLENT.min) return 'critical';
        if (score >= standards.HIGH.min) return 'high';
        if (score >= standards.MEDIUM.min) return 'medium';
        if (score >= standards.LOW.min) return 'low';
        return 'poor';
    }

    /**
     * 计算分析置信度
     * @param {Object} analysis - 分析结果
     * @returns {number} - 置信度评分（0-100）
     */
    calculateConfidenceScore(analysis) {
        // 基于分析完整性和一致性计算置信度
        let confidence = 60; // 基础置信度
        
        // 检查分析的完整性
        const hasScores = analysis.strategicScore && analysis.financialScore && 
                         analysis.relationshipScore && analysis.riskScore;
        if (hasScores) confidence += 10;
        
        // 检查分析的详细程度
        const hasAnalysis = analysis.strategicAnalysis && analysis.financialAnalysis &&
                           analysis.relationshipAnalysis && analysis.riskAnalysis;
        if (hasAnalysis) confidence += 10;
        
        // 检查公司标准应用
        if (analysis.companyCriteriaEvaluation) confidence += 10;
        
        // 评分一致性检查
        const scores = [analysis.strategicScore, analysis.financialScore, 
                       analysis.relationshipScore, analysis.riskScore];
        const scoreRange = Math.max(...scores) - Math.min(...scores);
        if (scoreRange < 40) confidence += 10; // 评分较为一致
        
        return Math.min(Math.max(confidence, 0), 100);
    }

    /**
     * 获取基本分析（API失败时的备用方案）
     * @param {Object} customer - 客户数据
     * @returns {Object} - 基本分析结果
     */
    getBasicAnalysis(customer) {
        // 使用简单算法计算评分
        const baseScore = (customer.potentialValue * 4 + 
                          Math.min(customer.annualRevenue / 1000, 10) * 3 +
                          customer.engagementLevel * 2 +
                          customer.urgency * 1) / 10;
        
        const finalScore = Math.min(Math.round(baseScore), 100);
        
        return {
            ...customer,
            aiScore: finalScore,
            priority: this.determinePriority(finalScore),
            deepseekAnalysis: {
                strategicScore: finalScore,
                financialScore: Math.min(Math.round(customer.annualRevenue / 1000), 100),
                relationshipScore: customer.engagementLevel * 10,
                riskScore: 100 - customer.urgency * 10,
                strategicAnalysis: '基本战略价值评估',
                financialAnalysis: `年营业额${customer.annualRevenue}万元`,
                relationshipAnalysis: `互动程度${customer.engagementLevel}/10`,
                riskAnalysis: `紧急程度${customer.urgency}/10`,
                coreStrengths: ['基础合作潜力'],
                riskWarnings: ['基础风险评估'],
                companyCriteriaEvaluation: {}
            },
            followupAdvice: this.getDefaultFollowupAdvice(customer, {
                strategicScore: finalScore,
                financialScore: Math.min(customer.annualRevenue / 1000, 100),
                relationshipScore: customer.engagementLevel * 10,
                riskScore: 100 - customer.urgency * 10
            }),
            analysisTime: new Date().toISOString(),
            confidenceScore: 50 // 基础置信度
        };
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} - 延迟Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 创建全局分析器实例
const deepseekAnalyzer = new DeepseekAnalyzer();

// 导出分析器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DeepseekAnalyzer, deepseekAnalyzer };
}