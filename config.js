// AI API 配置 - 支持多种AI服务
const DEEPSEEK_CONFIG = {
    // 选择AI服务提供商：'deepseek', 'openai', 'azure', 'local', 'proxy'
    AI_PROVIDER: 'proxy',
    
    // 代理服务器配置（前端不直接存储API密钥）
    USE_PROXY: true,
    PROXY_URL: 'http://localhost:4000/api/proxy',
    
    // API端点配置（通过代理时使用代理端点）
    API_BASE_URL: {
        proxy: 'http://localhost:4000/api/proxy',
        deepseek: 'https://api.deepseek.com/v1',
        openai: 'https://api.openai.com/v1',
        azure: 'https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}',
        local: 'http://localhost:11434'  // 本地Ollama等
    },
    
    // 模型设置
    MODEL: {
        proxy: 'deepseek-chat', // 代理模式下默认使用Deepseek
        deepseek: 'deepseek-chat',
        openai: 'gpt-3.5-turbo',
        azure: 'gpt-35-turbo',
        local: 'qwen2.5:7b'
    },
    
    // 分析参数
    ANALYSIS_SETTINGS: {
        // 客户价值分析参数
        VALUE_ANALYSIS: {
            temperature: 0.3,
            max_tokens: 1000,
            top_p: 0.9
        },
        
        // 跟进建议参数
        FOLLOWUP_ANALYSIS: {
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.95
        },
        
        // 批量分析参数
        BATCH_ANALYSIS: {
            temperature: 0.4,
            max_tokens: 800,
            top_p: 0.9
        }
    },
    
    // 公司内部评价资料库（示例）
    COMPANY_EVALUATION_CRITERIA: {
        // 战略价值维度
        STRATEGIC_VALUE: [
            '行业地位和影响力',
            '技术协同潜力',
            '市场拓展价值',
            '品牌提升作用',
            '长期合作前景'
        ],
        
        // 财务价值维度
        FINANCIAL_VALUE: [
            '当前业务规模',
            '增长潜力和速度',
            '利润贡献能力',
            '支付能力和信用',
            '成本结构优化'
        ],
        
        // 关系价值维度
        RELATIONSHIP_VALUE: [
            '决策链关系强度',
            '合作历史和质量',
            '沟通效率和频率',
            '问题解决能力',
            '文化契合度'
        ],
        
        // 风险维度
        RISK_FACTORS: [
            '行业波动风险',
            '市场竞争压力',
            '技术替代风险',
            '管理团队稳定性',
            '政策合规风险'
        ]
    },
    
    // 行业特定权重
    INDUSTRY_WEIGHTS: {
        'tech': { strategic: 0.4, financial: 0.3, relationship: 0.2, risk: 0.1 },
        'finance': { strategic: 0.3, financial: 0.4, relationship: 0.2, risk: 0.1 },
        'healthcare': { strategic: 0.35, financial: 0.3, relationship: 0.25, risk: 0.1 },
        'manufacturing': { strategic: 0.25, financial: 0.4, relationship: 0.25, risk: 0.1 },
        'retail': { strategic: 0.2, financial: 0.45, relationship: 0.25, risk: 0.1 },
        'education': { strategic: 0.3, financial: 0.3, relationship: 0.3, risk: 0.1 },
        'realestate': { strategic: 0.25, financial: 0.45, relationship: 0.2, risk: 0.1 },
        'other': { strategic: 0.25, financial: 0.35, relationship: 0.3, risk: 0.1 }
    },
    
    // 评分标准
    SCORING_STANDARDS: {
        EXCELLENT: { min: 90, label: '卓越', color: '#10B981', priority: 'critical' },
        HIGH: { min: 80, label: '优秀', color: '#3B82F6', priority: 'high' },
        MEDIUM: { min: 70, label: '良好', color: '#F59E0B', priority: 'medium' },
        LOW: { min: 60, label: '一般', color: '#6B7280', priority: 'low' },
        POOR: { min: 0, label: '需改进', color: '#EF4444', priority: 'poor' }
    }
};

// 公司内部案例分析库（示例）
const COMPANY_CASE_STUDIES = [
    {
        industry: 'tech',
        companySize: 'enterprise',
        characteristics: ['技术领先', '市场垄断', '高研发投入', '国际化布局'],
        successFactors: ['技术创新能力', '生态系统构建', '人才吸引力', '资本运作'],
        risks: ['技术迭代风险', '监管压力', '国际政治风险', '人才流失']
    },
    {
        industry: 'finance',
        companySize: 'large',
        characteristics: ['监管严格', '资本密集', '风险管理', '数字化转型'],
        successFactors: ['合规经营', '风险控制能力', '客户信任度', '科技投入'],
        risks: ['系统性风险', '监管变化', '网络安全', '利率波动']
    },
    {
        industry: 'healthcare',
        companySize: 'medium',
        characteristics: ['研发周期长', '审批严格', '专业性强', '渠道关键'],
        successFactors: ['研发能力', '临床数据', '渠道资源', '政策支持'],
        risks: ['研发失败', '审批延迟', '专利过期', '价格压力']
    }
];

// 行业映射
const industryMap = {
    'tech': '科技/互联网',
    'finance': '金融/保险',
    'manufacturing': '制造业',
    'retail': '零售/电商',
    'healthcare': '医疗健康',
    'education': '教育/培训',
    'realestate': '房地产',
    'other': '其他'
};

// 规模映射
const sizeMap = {
    'micro': '微型企业',
    'small': '小型企业',
    'medium': '中型企业',
    'large': '大型企业',
    'enterprise': '超大型企业'
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEEPSEEK_CONFIG, COMPANY_CASE_STUDIES, industryMap, sizeMap };
}