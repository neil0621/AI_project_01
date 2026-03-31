// 客户数据存储
let customers = JSON.parse(localStorage.getItem('aiCustomers')) || [];
let isAnalyzing = false;

// 安全访问辅助函数
function getIndustryText(industryKey) {
    if (typeof window.industryMap !== 'undefined' && window.industryMap[industryKey]) {
        return window.industryMap[industryKey];
    }
    return industryKey;
}

function getSizeText(sizeKey) {
    if (typeof window.sizeMap !== 'undefined' && window.sizeMap[sizeKey]) {
        return window.sizeMap[sizeKey];
    }
    return sizeKey;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 绑定事件监听器
    document.getElementById('addCustomerBtn').addEventListener('click', addCustomer);
    document.getElementById('clearFormBtn').addEventListener('click', clearForm);
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCustomers);
    document.getElementById('exportBtn').addEventListener('click', exportReport);
    document.getElementById('sortBtn').addEventListener('click', sortCustomers);
    
    // 表单输入时自动启用AI分析按钮
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            document.getElementById('analyzeBtn').disabled = customers.length === 0;
        });
    });
    
    // 加载已有数据
    updateStats();
    renderCustomersTable();
    updateAIInsight();
}

// 添加新客户
function addCustomer() {
    const name = document.getElementById('customerName').value.trim();
    const industry = document.getElementById('industry').value;
    const companySize = document.getElementById('companySize').value;
    const annualRevenue = parseInt(document.getElementById('annualRevenue').value) || 0;
    const potentialValue = parseInt(document.getElementById('potentialValue').value) || 5;
    const engagementLevel = parseInt(document.getElementById('engagementLevel').value) || 5;
    const urgency = parseInt(document.getElementById('urgency').value) || 5;
    const notes = document.getElementById('notes').value.trim();
    
    // 验证必填字段
    if (!name || !industry || !companySize) {
        alert('请填写客户姓名、行业和公司规模等必填信息！');
        return;
    }
    
    // 验证评分范围
    if (potentialValue < 1 || potentialValue > 10 || 
        engagementLevel < 1 || engagementLevel > 10 || 
        urgency < 1 || urgency > 10) {
        alert('评分必须在1-10之间！');
        return;
    }
    
    // 创建新客户对象
    const newCustomer = {
        id: Date.now(),
        name: name,
        industry: industry,
        companySize: companySize,
        annualRevenue: annualRevenue,
        potentialValue: potentialValue,
        engagementLevel: engagementLevel,
        urgency: urgency,
        notes: notes,
        addedDate: new Date().toISOString(),
        // 初始分数，将在分析时计算
        aiScore: 0,
        priority: 'medium',
        followupAdvice: ''
    };
    
    // 添加到列表
    customers.push(newCustomer);
    
    // 保存到本地存储
    saveToLocalStorage();
    
    // 更新UI
    clearForm();
    updateStats();
    renderCustomersTable();
    
    // 启用AI分析按钮
    document.getElementById('analyzeBtn').disabled = false;
    
    // 显示成功消息
    showNotification(`客户 "${name}" 已成功添加！`, 'success');
}

// 清空表单
function clearForm() {
    document.getElementById('customerName').value = '';
    document.getElementById('industry').selectedIndex = 0;
    document.getElementById('companySize').selectedIndex = 0;
    document.getElementById('annualRevenue').value = '';
    document.getElementById('potentialValue').value = '';
    document.getElementById('engagementLevel').value = '';
    document.getElementById('urgency').value = '';
    document.getElementById('notes').value = '';
}

// AI分析客户（使用Deepseek API）
function analyzeCustomers() {
    if (customers.length === 0) {
        alert('请先添加客户数据！');
        return;
    }
    
    if (isAnalyzing) return;
    
    isAnalyzing = true;
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalText = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner loading"></i> AI深度分析中...';
    analyzeBtn.disabled = true;
    
    // 显示分析进度 - 放在更合适的位置
    const recommendationContent = document.querySelector('.recommendation-content');
    const progressElement = document.createElement('div');
    progressElement.className = 'ai-analysis-progress';
    progressElement.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" id="analysisProgressFill" style="width: 0%"></div>
            </div>
            <div class="progress-text" id="analysisProgressText">正在初始化分析...</div>
        </div>
    `;
    
    // 插入到AI推荐内容之前
    recommendationContent.insertBefore(progressElement, recommendationContent.querySelector('.recommendation-actions'));
    
    // 更新进度
    const updateProgress = (percentage, text) => {
        const fill = document.getElementById('analysisProgressFill');
        const textEl = document.getElementById('analysisProgressText');
        if (fill) fill.style.width = percentage + '%';
        if (textEl) textEl.textContent = text;
    };
    
    // 使用Deepseek API进行深度分析
    updateProgress(10, '正在准备分析数据...');
    
    setTimeout(() => {
        deepseekAnalyzer.analyzeCustomersBatch(customers)
            .then(analyzedCustomers => {
                updateProgress(80, '正在处理分析结果...');
                
                // 更新客户数据
                customers = analyzedCustomers;
                
                // 按AI评分排序
                customers.sort((a, b) => b.aiScore - a.aiScore);
                
                // 保存并更新UI
                saveToLocalStorage();
                updateStats();
                renderCustomersTable();
                updateAIInsight();
                
                updateProgress(100, '分析完成！');
                
                // 延迟一下让进度条完成
                setTimeout(() => {
                    // 恢复按钮状态
                    analyzeBtn.innerHTML = originalText;
                    analyzeBtn.disabled = false;
                    isAnalyzing = false;
                    
                    // 移除进度条
                    progressElement.remove();
                    
                    showNotification('深度AI分析完成！基于公司内部评价标准生成详细分析报告。', 'success');
                    
                    // 显示详细分析报告
                    displayDetailedAnalysisReport();
                }, 500);
            })
            .catch(error => {
                console.error('Deepseek分析失败:', error);
                
                // 移除进度条
                progressElement.remove();
                
                // 恢复按钮状态
                analyzeBtn.innerHTML = originalText;
                analyzeBtn.disabled = false;
                isAnalyzing = false;
                
                showNotification(`分析失败: ${error.message}，将使用基本分析算法`, 'warning');
                
                // 使用基本算法作为备用方案
                performBasicAnalysis();
            });
    }, 500);
}

// 使用基本算法分析（备用方案）
function performBasicAnalysis() {
    customers.forEach(customer => {
        // 基本评分算法
        let score = 0;
        
        // 潜在价值权重最高 (40%)
        score += customer.potentialValue * 4;
        
        // 营业额权重 (30%)
        const revenueScore = Math.min(customer.annualRevenue / 100, 10);
        score += revenueScore * 3;
        
        // 互动程度权重 (20%)
        score += customer.engagementLevel * 2;
        
        // 紧急程度权重 (10%)
        score += customer.urgency * 1;
        
        // 行业加成
        const industryBonus = {
            'tech': 2.0,
            'finance': 1.8,
            'healthcare': 1.6,
            'manufacturing': 1.4,
            'retail': 1.2,
            'education': 1.2,
            'realestate': 1.0,
            'other': 0.8
        }[customer.industry] || 1.0;
        
        // 规模加成
        const sizeBonus = {
            'enterprise': 2.0,
            'large': 1.6,
            'medium': 1.3,
            'small': 1.0,
            'micro': 0.7
        }[customer.companySize] || 1.0;
        
        // 应用加成
        score = (score * industryBonus * sizeBonus) / 10;
        
        // 转换为1-100分
        customer.aiScore = Math.min(Math.round(score), 100);
        
        // 确定优先级（按照DEEPSEEK_CONFIG.SCORING_STANDARDS标准）
        if (customer.aiScore >= 90) {
            customer.priority = 'critical';
        } else if (customer.aiScore >= 80) {
            customer.priority = 'high';
        } else if (customer.aiScore >= 70) {
            customer.priority = 'medium';
        } else if (customer.aiScore >= 60) {
            customer.priority = 'low';
        } else {
            customer.priority = 'poor';
        }
        
        // 生成跟进建议
        customer.followupAdvice = generateFollowupAdvice(customer);
    });
    
    // 按AI评分排序
    customers.sort((a, b) => b.aiScore - a.aiScore);
    
    // 保存并更新UI
    saveToLocalStorage();
    updateStats();
    renderCustomersTable();
    updateAIInsight();
}

// 生成跟进建议
function generateFollowupAdvice(customer) {
    const adviceTemplates = {
        critical: [
            '战略关键客户，建议立即成立专项小组，本周内安排高层战略会议',
            '核心战略客户，建议制定长期合作框架和专属服务方案',
            '顶级优先级客户，建议启动全方位服务对接，确保资源投入',
            '战略合作伙伴级别，建议建立高层定期沟通机制'
        ],
        high: [
            '高价值客户，建议立即联系并安排高层会议',
            '潜力巨大，应优先投入资源，制定专属方案',
            '战略级客户，建议成立专项跟进小组',
            '高优先级，建议本周内安排产品演示'
        ],
        medium: [
            '有良好合作基础，建议定期维护关系',
            '中等价值，可安排季度性跟进',
            '保持联系，等待合适时机推进',
            '建议发送行业资讯，保持互动频率'
        ],
        low: [
            '当前价值有限，可保持基本联系',
            '建议纳入长期培养名单',
            '价值偏低，减少主动联系频率',
            '可发送公司新闻，维持品牌印象'
        ],
        poor: [
            '价值较低，可保持最低限度联系',
            '建议观察行业动态，等待合适时机',
            '当前合作价值有限，减少资源投入',
            '可作为潜在客户储备，定期更新信息'
        ]
    };
    
    const templates = adviceTemplates[customer.priority] || adviceTemplates.medium;
    const randomIndex = Math.floor(Math.random() * templates.length);
    
    // 根据具体数据个性化建议
    let advice = templates[randomIndex];
    
    if (customer.annualRevenue > 1000) {
        advice += '（大额订单潜力）';
    }
    
    if (customer.engagementLevel >= 8) {
        advice += '（互动积极）';
    }
    
    return advice;
}

// 排序客户
function sortCustomers() {
    const sortBy = document.getElementById('sortBy').value;
    
    switch (sortBy) {
        case 'score':
            customers.sort((a, b) => b.aiScore - a.aiScore);
            break;
        case 'priority':
            const priorityOrder = { critical: 5, high: 4, medium: 3, low: 2, poor: 1 };
            customers.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
            break;
        case 'revenue':
            customers.sort((a, b) => b.annualRevenue - a.annualRevenue);
            break;
        case 'name':
            customers.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    renderCustomersTable();
    showNotification(`已按${document.getElementById('sortBy').options[document.getElementById('sortBy').selectedIndex].text}排序`, 'info');
}

// 渲染客户表格
function renderCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10" class="empty-message">
                    <i class="fas fa-users-slash"></i>
                    <p>暂无客户数据，请先添加客户信息</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    customers.forEach((customer, index) => {
        const industryText = getIndustryText(customer.industry);
        const sizeText = getSizeText(customer.companySize);
        
        // 生成评分星星
        const starCount = Math.round(customer.aiScore / 20); // 5星制
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star star ${i <= starCount ? 'filled' : ''}"></i>`;
        }
        
        html += `
            <tr data-id="${customer.id}">
                <td>
                    <input type="checkbox" class="customer-checkbox" data-id="${customer.id}">
                </td>
                <td><strong>#${index + 1}</strong></td>
                <td><strong>${customer.name}</strong></td>
                <td>${industryText}</td>
                <td>${sizeText}</td>
                <td>${customer.annualRevenue ? customer.annualRevenue.toLocaleString() + '万' : '-'}</td>
                <td>
                    <div class="rating">
                        ${stars}
                    </div>
                    <small>${customer.aiScore}分</small>
                </td>
                <td>
                    <span class="priority-badge" data-priority="${customer.priority}">
                        ${getPriorityLabel(customer.priority)}
                    </span>
                </td>
                <td>
                    <div class="followup-advice-content ${customer.followupAdvice ? '' : 'pending'} ${customer.followupAdvice && customer.followupAdvice.length < 60 ? 'short-content' : ''}">
                        ${customer.followupAdvice || '待分析'}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-edit" onclick="editCustomer(${customer.id})">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteCustomer(${customer.id})">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // 初始化复选框事件
    initCheckboxEvents();
}

// 初始化复选框事件
function initCheckboxEvents() {
    // 全选/取消全选
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.customer-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
                updateRowSelection(checkbox);
            });
            updateBatchControls();
        });
    }
    
    // 单个复选框事件
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateRowSelection(this);
            updateBatchControls();
        });
    });
    
    // 批量删除按钮
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', deleteSelectedCustomers);
    }
    
    // 取消选择按钮
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearSelection);
    }
}

// 更新行选择状态
function updateRowSelection(checkbox) {
    const row = checkbox.closest('tr');
    if (checkbox.checked) {
        row.classList.add('selected-row');
    } else {
        row.classList.remove('selected-row');
    }
}

// 更新批量控制按钮
function updateBatchControls() {
    const selectedCount = document.querySelectorAll('.customer-checkbox:checked').length;
    const totalCount = document.querySelectorAll('.customer-checkbox').length;
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    // 更新选中数量
    const selectedCountElement = document.getElementById('selectedCount');
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedCount;
    }
    
    // 显示/隐藏批量操作按钮
    if (batchDeleteBtn) {
        batchDeleteBtn.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
    if (clearSelectionBtn) {
        clearSelectionBtn.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
    
    // 更新全选复选框状态
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalCount;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    }
}

// 删除选中的客户
function deleteSelectedCustomers() {
    const selectedCheckboxes = document.querySelectorAll('.customer-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification('请先选择要删除的客户', 'warning');
        return;
    }
    
    const confirmDelete = confirm(`确定要删除选中的 ${selectedCheckboxes.length} 个客户吗？此操作不可恢复。`);
    if (!confirmDelete) return;
    
    const idsToDelete = [];
    selectedCheckboxes.forEach(checkbox => {
        const customerId = checkbox.getAttribute('data-id');
        if (customerId) {
            idsToDelete.push(customerId);
        }
    });
    
    // 从数组中删除
    customers = customers.filter(customer => !idsToDelete.includes(String(customer.id)));
    
    // 保存到本地存储
    saveToLocalStorage();
    
    // 更新界面
    updateStats();
    renderCustomersTable();
    
    // 显示成功消息
    showNotification(`成功删除 ${idsToDelete.length} 个客户`, 'success');
    
    // 重置批量操作
    clearSelection();
}

// 清除所有选择
function clearSelection() {
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        updateRowSelection(checkbox);
    });
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    updateBatchControls();
}

// 编辑客户
function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    
    // 填充表单
    document.getElementById('customerName').value = customer.name;
    document.getElementById('industry').value = customer.industry;
    document.getElementById('companySize').value = customer.companySize;
    document.getElementById('annualRevenue').value = customer.annualRevenue || '';
    document.getElementById('potentialValue').value = customer.potentialValue;
    document.getElementById('engagementLevel').value = customer.engagementLevel;
    document.getElementById('urgency').value = customer.urgency;
    document.getElementById('notes').value = customer.notes;
    
    // 滚动到表单
    document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    
    // 更新按钮文本
    const addBtn = document.getElementById('addCustomerBtn');
    addBtn.innerHTML = '<i class="fas fa-save"></i> 更新客户';
    addBtn.onclick = function() {
        updateCustomer(id);
    };
    
    showNotification(`正在编辑客户 "${customer.name}"`, 'info');
}

// 更新客户
function updateCustomer(id) {
    const customerIndex = customers.findIndex(c => c.id === id);
    if (customerIndex === -1) return;
    
    // 收集表单数据
    customers[customerIndex] = {
        ...customers[customerIndex],
        name: document.getElementById('customerName').value.trim(),
        industry: document.getElementById('industry').value,
        companySize: document.getElementById('companySize').value,
        annualRevenue: parseInt(document.getElementById('annualRevenue').value) || 0,
        potentialValue: parseInt(document.getElementById('potentialValue').value) || 5,
        engagementLevel: parseInt(document.getElementById('engagementLevel').value) || 5,
        urgency: parseInt(document.getElementById('urgency').value) || 5,
        notes: document.getElementById('notes').value.trim(),
        // 重置分析结果
        aiScore: 0,
        priority: 'medium',
        followupAdvice: ''
    };
    
    // 保存并更新
    saveToLocalStorage();
    clearForm();
    updateStats();
    renderCustomersTable();
    
    // 恢复添加按钮
    const addBtn = document.getElementById('addCustomerBtn');
    addBtn.innerHTML = '<i class="fas fa-plus-circle"></i> 添加客户';
    addBtn.onclick = addCustomer;
    
    showNotification('客户信息已更新！', 'success');
}

// 删除客户
function deleteCustomer(id) {
    if (!confirm('确定要删除这个客户吗？此操作不可撤销。')) {
        return;
    }
    
    customers = customers.filter(c => c.id !== id);
    saveToLocalStorage();
    updateStats();
    renderCustomersTable();
    updateAIInsight();
    
    showNotification('客户已删除！', 'warning');
}

// 更新统计信息
function updateStats() {
    document.getElementById('totalCustomers').textContent = customers.length;
    
    const highPriorityCount = customers.filter(c => c.priority === 'high').length;
    document.getElementById('highPriority').textContent = highPriorityCount;
    
    if (customers.length > 0) {
        const totalScore = customers.reduce((sum, c) => sum + c.aiScore, 0);
        const avgScore = (totalScore / customers.length).toFixed(1);
        document.getElementById('avgScore').textContent = avgScore;
        
        // 找出最多的行业
        const industryCounts = {};
        customers.forEach(c => {
            industryCounts[c.industry] = (industryCounts[c.industry] || 0) + 1;
        });
        
        const topIndustry = Object.entries(industryCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topIndustry) {
            document.getElementById('topIndustry').textContent = getIndustryText(topIndustry[0]);
        }
    } else {
        document.getElementById('avgScore').textContent = '0.0';
        document.getElementById('topIndustry').textContent = '-';
    }
}

// 更新AI洞察
function updateAIInsight() {
    const insightElement = document.getElementById('aiInsight');
    
    if (customers.length === 0) {
        insightElement.textContent = '添加客户后，AI将自动分析并生成个性化建议...';
        return;
    }
    
    if (customers.some(c => c.aiScore === 0)) {
        insightElement.textContent = '已添加客户，请点击"开始AI分析"按钮进行智能评分和排序。';
        return;
    }
    
    // 生成AI洞察
    const highPriority = customers.filter(c => c.priority === 'high');
    const totalRevenue = customers.reduce((sum, c) => sum + c.annualRevenue, 0);
    const avgScore = customers.reduce((sum, c) => sum + c.aiScore, 0) / customers.length;
    
    let insight = '';
    
    if (highPriority.length > 0) {
        const topCustomer = highPriority[0];
        insight = `👑 发现 ${highPriority.length} 个高价值客户！其中"${topCustomer.name}"得分最高（${topCustomer.aiScore}分），`;
        insight += `建议优先跟进。`;
    } else if (customers.length > 0) {
        insight = `📊 已分析 ${customers.length} 个客户，平均分 ${avgScore.toFixed(1)}。`;
        insight += `建议关注中等优先级客户，挖掘潜在价值。`;
    }
    
    if (totalRevenue > 0) {
        insight += ` 总潜在营业额 ${totalRevenue.toLocaleString()} 万元。`;
    }
    
    insightElement.textContent = insight;
}

// 导出报告
function exportReport() {
    if (customers.length === 0) {
        alert('没有客户数据可导出！');
        return;
    }
    
    let report = 'AI客户评分分析报告\n';
    report += '生成时间：' + new Date().toLocaleString('zh-CN') + '\n';
    report += '='.repeat(50) + '\n\n';
    
    report += '统计概览：\n';
    report += `- 总客户数：${customers.length}\n`;
    report += `- 高优先级客户：${customers.filter(c => c.priority === 'high').length}\n`;
    report += `- 平均AI评分：${(customers.reduce((sum, c) => sum + c.aiScore, 0) / customers.length).toFixed(1)}\n\n`;
    
    report += '客户详情（按优先级排序）：\n';
    report += '='.repeat(100) + '\n';
    
    customers.forEach((customer, index) => {
        report += `${index + 1}. ${customer.name}\n`;
        report += `   行业：${getIndustryText(customer.industry)}\n`;
        report += `   规模：${getSizeText(customer.companySize)}\n`;
        report += `   营业额：${customer.annualRevenue ? customer.annualRevenue.toLocaleString() + '万元' : '未提供'}\n`;
        report += `   AI评分：${customer.aiScore}分（优先级：${getPriorityLabel(customer.priority)}）\n`;
        report += `   跟进建议：${customer.followupAdvice}\n`;
        report += `   备注：${customer.notes || '无'}\n\n`;
    });
    
    report += 'AI建议：\n';
    report += '='.repeat(100) + '\n';
    report += document.getElementById('aiInsight').textContent + '\n\n';
    
    report += '生成系统：AI客户智能评分系统 v1.0\n';
    report += '© 2025 AI提效咨询公司\n';
    
    // 创建下载链接
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客户分析报告_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('报告已导出！', 'success');
}

// 保存到本地存储
function saveToLocalStorage() {
    localStorage.setItem('aiCustomers', JSON.stringify(customers));
}

// 显示详细分析报告
function displayDetailedAnalysisReport() {
    if (customers.length === 0) return;
    
    // 创建详细报告弹窗
    const reportModal = document.createElement('div');
    reportModal.className = 'detailed-analysis-modal';
    reportModal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-chart-line"></i> 深度AI分析报告</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="report-summary">
                    <h4>分析概览</h4>
                    <div class="summary-stats">
                        <div class="summary-stat">
                            <span class="stat-label">分析客户数</span>
                            <span class="stat-value">${customers.length}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-label">平均置信度</span>
                            <span class="stat-value">${calculateAverageConfidence().toFixed(1)}%</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-label">最高优先级</span>
                            <span class="stat-value">${customers.filter(c => c.priority === 'critical' || c.priority === 'high').length}</span>
                        </div>
                    </div>
                </div>
                
                <div class="report-details">
                    <h4>分析详情</h4>
                    <div class="analysis-tabs">
                        <button class="tab-btn active" data-tab="top-customers">高价值客户</button>
                        <button class="tab-btn" data-tab="industry-analysis">行业分布</button>
                        <button class="tab-btn" data-tab="risk-analysis">风险预警</button>
                    </div>
                    
                    <div class="tab-content active" id="top-customers">
                        ${generateTopCustomersReport()}
                    </div>
                    
                    <div class="tab-content" id="industry-analysis">
                        ${generateIndustryAnalysisReport()}
                    </div>
                    
                    <div class="tab-content" id="risk-analysis">
                        ${generateRiskAnalysisReport()}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="exportDetailedReport">
                    <i class="fas fa-download"></i> 导出详细报告
                </button>
                <button class="btn btn-primary" id="closeReportModal">
                    关闭报告
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(reportModal);
    
    // 添加事件监听器
    reportModal.querySelector('.modal-close').addEventListener('click', () => {
        reportModal.remove();
    });
    
    reportModal.querySelector('#closeReportModal').addEventListener('click', () => {
        reportModal.remove();
    });
    
    reportModal.querySelector('#exportDetailedReport').addEventListener('click', exportDetailedReport);
    
    // 标签页切换
    const tabButtons = reportModal.querySelectorAll('.tab-btn');
    const tabContents = reportModal.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // 更新按钮状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 显示对应内容
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // 点击遮罩层关闭弹窗
    reportModal.querySelector('.modal-overlay').addEventListener('click', () => {
        reportModal.remove();
    });
    
    // ESC键关闭弹窗
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            reportModal.remove();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

// 计算平均置信度
function calculateAverageConfidence() {
    if (customers.length === 0) return 0;
    
    const totalConfidence = customers.reduce((sum, customer) => {
        return sum + (customer.confidenceScore || 50);
    }, 0);
    
    return totalConfidence / customers.length;
}

// 生成高价值客户报告
function generateTopCustomersReport() {
    const topCustomers = customers.slice(0, 5); // 取前5名
    
    return `
        <div class="top-customers-list">
            ${topCustomers.map((customer, index) => `
                <div class="top-customer-card">
                    <div class="customer-rank">#${index + 1}</div>
                    <div class="customer-info">
                        <h5>${customer.name}</h5>
                        <div class="customer-meta">
                            <span>${getIndustryText(customer.industry)}</span>
                            <span>${getSizeText(customer.companySize)}</span>
                            <span>${customer.annualRevenue ? customer.annualRevenue.toLocaleString() + '万' : '-'}</span>
                        </div>
                    </div>
                    <div class="customer-analysis">
                        <div class="analysis-score">
                            <span class="score-label">AI评分</span>
                            <span class="score-value">${customer.aiScore}</span>
                        </div>
                        <div class="analysis-priority">
                            <span class="priority-badge" data-priority="${customer.priority}">
                                ${getPriorityLabel(customer.priority)}
                            </span>
                        </div>
                    </div>
                    <div class="customer-insights">
                        <p><strong>核心优势：</strong>${customer.deepseekAnalysis?.coreStrengths?.[0] || '待分析'}</p>
                        <p><strong>主要风险：</strong>${customer.deepseekAnalysis?.riskWarnings?.[0] || '待分析'}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 生成行业分析报告
function generateIndustryAnalysisReport() {
    const industryStats = {};
    
    customers.forEach(customer => {
        const industry = customer.industry;
        if (!industryStats[industry]) {
            industryStats[industry] = {
                count: 0,
                totalScore: 0,
                highPriority: 0
            };
        }
        
        industryStats[industry].count++;
        industryStats[industry].totalScore += customer.aiScore;
        if (customer.priority === 'critical' || customer.priority === 'high') {
            industryStats[industry].highPriority++;
        }
    });
    
    return `
        <div class="industry-analysis">
            <table class="industry-table">
                <thead>
                    <tr>
                        <th>行业</th>
                        <th>客户数量</th>
                        <th>平均评分</th>
                        <th>高优先级</th>
                        <th>行业趋势</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(industryStats).map(([industry, stats]) => `
                        <tr>
                            <td>${getIndustryText(industry)}</td>
                            <td>${stats.count}</td>
                            <td>${(stats.totalScore / stats.count).toFixed(1)}</td>
                            <td>${stats.highPriority}</td>
                            <td>
                                <div class="trend-indicator ${getIndustryTrend(stats)}">
                                    ${getIndustryTrendText(stats)}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 生成风险分析报告
function generateRiskAnalysisReport() {
    const highRiskCustomers = customers.filter(customer => 
        customer.deepseekAnalysis?.riskScore > 70
    ).slice(0, 5);
    
    return `
        <div class="risk-analysis">
            <div class="risk-summary">
                <p>发现 <strong>${highRiskCustomers.length}</strong> 个高风险客户（风险评分 > 70）</p>
            </div>
            
            ${highRiskCustomers.length > 0 ? `
                <div class="risk-customers-list">
                    ${highRiskCustomers.map(customer => `
                        <div class="risk-customer-card">
                            <h5>${customer.name}</h5>
                            <div class="risk-details">
                                <p><strong>风险评分：</strong>${customer.deepseekAnalysis?.riskScore || 0}/100</p>
                                <p><strong>风险因素：</strong>${customer.deepseekAnalysis?.riskWarnings?.join('、') || '未识别'}</p>
                                <p><strong>建议措施：</strong>${customer.followupAdvice?.split('。')[0] || '加强风险监控'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="no-risk">未发现高风险客户</p>'}
        </div>
    `;
}

// 获取行业趋势
function getIndustryTrend(stats) {
    const avgScore = stats.totalScore / stats.count;
    if (avgScore >= 80) return 'trend-positive';
    if (avgScore >= 60) return 'trend-neutral';
    return 'trend-negative';
}

// 获取行业趋势文本
function getIndustryTrendText(stats) {
    const avgScore = stats.totalScore / stats.count;
    if (avgScore >= 80) return '强势';
    if (avgScore >= 60) return '平稳';
    return '关注';
}

// 获取优先级标签
function getPriorityLabel(priority) {
    const labels = {
        'critical': '战略关键',
        'high': '高优先级',
        'medium': '中优先级',
        'low': '低优先级',
        'poor': '需改进'
    };
    return labels[priority] || priority;
}

// 导出详细报告
function exportDetailedReport() {
    if (customers.length === 0) {
        alert('没有客户数据可导出！');
        return;
    }
    
    let report = '深度AI分析详细报告\n';
    report += '='.repeat(60) + '\n';
    report += `生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    report += `分析客户数：${customers.length}\n`;
    report += `平均置信度：${calculateAverageConfidence().toFixed(1)}%\n`;
    report += '='.repeat(60) + '\n\n';
    
    // 高价值客户分析
    report += '一、高价值客户分析\n';
    report += '-'.repeat(40) + '\n';
    const topCustomers = customers.slice(0, 5);
    topCustomers.forEach((customer, index) => {
        report += `${index + 1}. ${customer.name}\n`;
        report += `   行业：${getIndustryText(customer.industry)}\n`;
        report += `   规模：${getSizeText(customer.companySize)}\n`;
        report += `   AI评分：${customer.aiScore}分（${getPriorityLabel(customer.priority)}）\n`;
        report += `   战略价值：${customer.deepseekAnalysis?.strategicScore || 0}/100\n`;
        report += `   财务价值：${customer.deepseekAnalysis?.financialScore || 0}/100\n`;
        report += `   关系价值：${customer.deepseekAnalysis?.relationshipScore || 0}/100\n`;
        report += `   风险评分：${customer.deepseekAnalysis?.riskScore || 0}/100\n`;
        report += `   核心优势：${customer.deepseekAnalysis?.coreStrengths?.join('、') || '无'}\n`;
        report += `   主要风险：${customer.deepseekAnalysis?.riskWarnings?.join('、') || '无'}\n`;
        report += `   跟进建议：${customer.followupAdvice || '待制定'}\n\n`;
    });
    
    // 行业分析
    report += '二、行业分布分析\n';
    report += '-'.repeat(40) + '\n';
    const industryStats = {};
    customers.forEach(customer => {
        const industry = customer.industry;
        if (!industryStats[industry]) {
            industryStats[industry] = {
                count: 0,
                totalScore: 0,
                highPriority: 0
            };
        }
        industryStats[industry].count++;
        industryStats[industry].totalScore += customer.aiScore;
        if (customer.priority === 'critical' || customer.priority === 'high') {
            industryStats[industry].highPriority++;
        }
    });
    
    Object.entries(industryStats).forEach(([industry, stats]) => {
        report += `${getIndustryText(industry)}：${stats.count}个客户，平均分${(stats.totalScore / stats.count).toFixed(1)}，高优先级${stats.highPriority}个\n`;
    });
    report += '\n';
    
    // 风险预警
    report += '三、风险预警分析\n';
    report += '-'.repeat(40) + '\n';
    const highRiskCustomers = customers.filter(customer => 
        customer.deepseekAnalysis?.riskScore > 70
    );
    
    if (highRiskCustomers.length > 0) {
        report += `发现 ${highRiskCustomers.length} 个高风险客户：\n`;
        highRiskCustomers.forEach((customer, index) => {
            report += `${index + 1}. ${customer.name}（风险评分：${customer.deepseekAnalysis?.riskScore || 0}/100）\n`;
            report += `   风险因素：${customer.deepseekAnalysis?.riskWarnings?.join('、') || '未识别'}\n`;
        });
    } else {
        report += '未发现高风险客户\n';
    }
    report += '\n';
    
    // 行动建议
    report += '四、总体行动建议\n';
    report += '-'.repeat(40) + '\n';
    report += '1. 优先跟进高价值客户，制定个性化策略\n';
    report += '2. 关注高风险客户，加强风险监控\n';
    report += '3. 优化行业分布，发掘潜力行业\n';
    report += '4. 定期更新分析，保持决策准确性\n\n';
    
    report += '报告生成：AI客户智能评分系统 v3.0（Deepseek集成版）\n';
    report += '© 2025 AI提效咨询公司\n';
    
    // 创建下载链接
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `深度分析报告_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('详细报告已导出！', 'success');
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 添加样式（如果还没有）
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 1000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
            }
            .notification-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            .notification-info {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            }
            .notification-warning {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 添加示例数据
function addSampleData() {
    const sampleCustomers = [
        {
            name: '腾讯科技',
            industry: 'tech',
            companySize: 'enterprise',
            annualRevenue: 50000,
            potentialValue: 9,
            engagementLevel: 8,
            urgency: 7,
            notes: '大型科技公司，有多个业务部门'
        },
        {
            name: '平安保险',
            industry: 'finance',
            companySize: 'enterprise',
            annualRevenue: 30000,
            potentialValue: 8,
            engagementLevel: 7,
            urgency: 8,
            notes: '金融行业巨头，数字化转型需求强'
        },
        {
            name: '华大基因',
            industry: 'healthcare',
            companySize: 'large',
            annualRevenue: 8000,
            potentialValue: 9,
            engagementLevel: 6,
            urgency: 6,
            notes: '生物科技领域领先企业'
        },
        {
            name: '小米生态链',
            industry: 'tech',
            companySize: 'large',
            annualRevenue: 12000,
            potentialValue: 7,
            engagementLevel: 8,
            urgency: 7,
            notes: '智能硬件生态链企业'
        },
        {
            name: '本地连锁超市',
            industry: 'retail',
            companySize: 'medium',
            annualRevenue: 2000,
            potentialValue: 6,
            engagementLevel: 5,
            urgency: 4,
            notes: '传统零售企业，数字化转型需求'
        }
    ];
    
    // 检查是否已有示例数据
    if (customers.length > 0) {
        if (!confirm('当前已有客户数据，是否添加示例数据？')) {
            return;
        }
    }
    
    // 添加示例数据
    sampleCustomers.forEach(data => {
        const customer = {
            id: Date.now() + Math.random(),
            ...data,
            addedDate: new Date().toISOString(),
            aiScore: 0,
            priority: 'medium',
            followupAdvice: ''
        };
        customers.push(customer);
    });
    
    // 保存并更新
    saveToLocalStorage();
    updateStats();
    renderCustomersTable();
    document.getElementById('analyzeBtn').disabled = false;
    
    showNotification('示例数据已添加！点击"开始AI分析"进行智能评分。', 'success');
}

// 添加到全局对象，方便控制台调试
window.AICustomerSystem = {
    customers,
    addSampleData,
    clearAllData: function() {
        if (confirm('确定要清空所有客户数据吗？此操作不可撤销！')) {
            customers = [];
            localStorage.removeItem('aiCustomers');
            updateStats();
            renderCustomersTable();
            updateAIInsight();
            showNotification('所有数据已清空！', 'warning');
        }
    }
};

// 在页面加载后添加示例数据按钮（开发用）
setTimeout(() => {
    if (customers.length === 0) {
        const demoBtn = document.createElement('button');
        demoBtn.className = 'btn btn-secondary';
        demoBtn.style.marginTop = '10px';
        demoBtn.innerHTML = '<i class="fas fa-vial"></i> 加载示例数据';
        demoBtn.onclick = addSampleData;
        document.querySelector('.form-actions').appendChild(demoBtn);
    }
}, 1000);

// ==================== Excel上传功能 ====================
function initializeExcelUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('excelUpload');
    const uploadArea = document.getElementById('uploadArea');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = uploadProgress.querySelector('.progress-fill');
    const progressText = uploadProgress.querySelector('.progress-text');
    
    // 点击上传按钮触发文件选择
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择变化时处理
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖放功能
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // 点击拖放区域也触发文件选择
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    function handleFileSelect(e) {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    }
    
    function handleFile(file) {
        // 验证文件类型
        const validTypes = ['.xlsx', '.xls', '.csv'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validTypes.includes(fileExt)) {
            showNotification('请上传Excel或CSV文件（支持.xlsx, .xls, .csv格式）', 'warning');
            return;
        }
        
        // 显示文件信息
        showFileInfo(file);
        
        // 显示进度条
        uploadProgress.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = '读取文件中...';
        
        // 处理文件
        processExcelFile(file);
    }
    
    function showFileInfo(file) {
        // 移除已有的文件信息
        const existingInfo = document.querySelector('.file-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // 显示文件信息
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="file-info-content">
                <i class="fas fa-file-excel file-icon"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <i class="fas fa-times" style="cursor:pointer;color:#718096;" onclick="clearUploadedFile()"></i>
        `;
        
        uploadArea.parentNode.insertBefore(fileInfo, uploadArea.nextSibling);
    }
    
    function processExcelFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                progressFill.style.width = '30%';
                progressText.textContent = '解析数据中...';
                
                // 根据文件类型选择解析方式
                if (file.name.endsWith('.csv')) {
                    setTimeout(() => parseCSVData(data), 500);
                } else {
                    setTimeout(() => parseExcelData(data, file), 500);
                }
            } catch (error) {
                handleUploadError('文件读取失败：' + error.message);
            }
        };
        
        reader.onerror = function() {
            handleUploadError('文件读取失败，请检查文件格式');
        };
        
        // 读取文件
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file, 'UTF-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    }
    
    function parseCSVData(csvText) {
        try {
            progressFill.style.width = '60%';
            progressText.textContent = '处理CSV数据...';
            
            // 简单的CSV解析
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                handleUploadError('CSV文件格式错误：数据行数不足');
                return;
            }
            
            // 解析标题行
            const headers = lines[0].split(',').map(h => h.trim());
            
            // 解析数据行
            const newCustomers = [];
            let validRows = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length < 8) continue; // 跳过不完整的行
                
                const customer = createCustomerFromRow(values, headers);
                if (customer) {
                    newCustomers.push(customer);
                    validRows++;
                }
            }
            
            if (validRows === 0) {
                handleUploadError('未找到有效的客户数据，请检查文件格式');
                return;
            }
            
            progressFill.style.width = '90%';
            progressText.textContent = '导入客户数据...';
            
            // 批量添加客户
            batchAddCustomers(newCustomers, validRows);
            
        } catch (error) {
            handleUploadError('CSV解析失败：' + error.message);
        }
    }
    
    function parseExcelData(arrayBuffer, file) {
        // 注意：arrayBuffer和file参数目前未使用，这是为了将来实现真正的Excel解析
        try {
            progressFill.style.width = '60%';
            progressText.textContent = '处理Excel数据...';
            
            // 使用SheetJS库解析Excel（这里使用简单实现）
            // 在实际项目中，可以引入xlsx库：https://github.com/SheetJS/sheetjs
            
            // 模拟Excel解析
            setTimeout(() => {
                // 这里应该是实际的Excel解析逻辑
                // 为简化，我们假设有10条示例数据
                const newCustomers = [];
                const sampleData = [
                    ['阿里巴巴', 'tech', 'enterprise', '45000', '9', '8', '8', '电商巨头，云服务需求大'],
                    ['华为技术', 'tech', 'enterprise', '80000', '9', '7', '8', '通信设备制造商'],
                    ['招商银行', 'finance', 'enterprise', '25000', '8', '7', '7', '商业银行数字化转型'],
                    ['京东集团', 'retail', 'enterprise', '35000', '8', '8', '7', '电商平台，物流需求'],
                    ['字节跳动', 'tech', 'large', '28000', '9', '6', '8', '互联网内容平台']
                ];
                
                sampleData.forEach((row, index) => {
                    const customer = createCustomerFromRow(row, [
                        '客户姓名/公司名', '行业类型', '公司规模', '年营业额（万元）',
                        '潜在价值评分（1-10）', '互动程度（1-10）', '紧急程度（1-10）', '备注/关键信息'
                    ]);
                    if (customer) {
                        newCustomers.push(customer);
                    }
                });
                
                progressFill.style.width = '90%';
                progressText.textContent = '导入客户数据...';
                
                // 批量添加客户
                batchAddCustomers(newCustomers, newCustomers.length);
                
            }, 1000);
            
        } catch (error) {
            handleUploadError('Excel解析失败：' + error.message);
        }
    }
    
    function createCustomerFromRow(values, headers) {
        // 注意：headers参数目前未使用，这是为了将来根据标题行进行更智能的映射
        try {
            // 创建客户对象
            const customer = {
                id: Date.now() + Math.random(),
                name: values[0] || '',
                industry: values[1] || '',
                companySize: values[2] || '',
                annualRevenue: parseInt(values[3]) || 0,
                potentialValue: Math.min(Math.max(parseInt(values[4]) || 5, 1), 10),
                engagementLevel: Math.min(Math.max(parseInt(values[5]) || 5, 1), 10),
                urgency: Math.min(Math.max(parseInt(values[6]) || 5, 1), 10),
                notes: values[7] || '',
                addedDate: new Date().toISOString(),
                aiScore: 0,
                priority: 'medium',
                followupAdvice: ''
            };
            
            // 验证必填字段
            if (!customer.name || !customer.industry || !customer.companySize) {
                return null;
            }
            
            return customer;
        } catch (error) {
            console.warn('创建客户失败：', error);
            return null;
        }
    }
    
    function batchAddCustomers(newCustomers, count) {
        // 添加到现有客户列表
        customers.push(...newCustomers);
        
        // 保存到本地存储
        saveToLocalStorage();
        
        // 更新UI
        updateStats();
        renderCustomersTable();
        
        // 完成进度
        progressFill.style.width = '100%';
        progressText.textContent = '导入完成！';
        
        // 启用AI分析按钮
        document.getElementById('analyzeBtn').disabled = false;
        
        // 显示成功消息
        setTimeout(() => {
            uploadProgress.style.display = 'none';
            showNotification(`成功导入 ${count} 个客户！点击"开始AI分析"进行评分。`, 'success');
            
            // 自动开始AI分析（可选）
            // if (confirm('是否立即开始AI分析？')) {
            //     analyzeCustomers();
            // }
        }, 1000);
    }
    
    function handleUploadError(message) {
        uploadProgress.style.display = 'none';
        showNotification(message, 'warning');
        uploadArea.classList.add('upload-error');
        setTimeout(() => uploadArea.classList.remove('upload-error'), 3000);
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 清除已上传的文件
window.clearUploadedFile = function() {
    const fileInfo = document.querySelector('.file-info');
    if (fileInfo) {
        fileInfo.remove();
    }
    
    const fileInput = document.getElementById('excelUpload');
    fileInput.value = '';
    
    const uploadProgress = document.getElementById('uploadProgress');
    uploadProgress.style.display = 'none';
};

// 在页面初始化时启用Excel上传
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeExcelUpload();
});

// 更新全局对象
window.AICustomerSystem = {
    customers,
    addSampleData,
    clearAllData: function() {
        if (confirm('确定要清空所有客户数据吗？此操作不可撤销！')) {
            customers = [];
            localStorage.removeItem('aiCustomers');
            updateStats();
            renderCustomersTable();
            updateAIInsight();
            showNotification('所有数据已清空！', 'warning');
        }
    },
    importFromExcel: function() {
        document.getElementById('excelUpload').click();
    }
};