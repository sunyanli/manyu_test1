// 后端 API 基础地址
const API_BASE = 'http://localhost:5000';

// 获取用户信息
function getUserInfo() {
    return {
        caller: document.getElementById('callerName').value || 'anonymous',
        user_type: document.getElementById('userType').value,
        user_level: document.getElementById('userLevel').value,
        department: document.getElementById('department').value
    };
}

// Tab 切换
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');
        });
    });
    // 初始加载图表
    setTimeout(initCharts, 500);
});

// ==================== HelloWorld ====================
async function callHello() {
    const userInfo = getUserInfo();
    const params = new URLSearchParams(userInfo);
    const resultDiv = document.getElementById('result-hello');
    resultDiv.textContent = '调用中...';
    try {
        const resp = await fetch(`${API_BASE}/api/hello?${params}`);
        const json = await resp.json();
        // 解析 {code, msg, data} 包裹格式
        if (json.code === 'OK') {
            resultDiv.textContent = JSON.stringify(json.data, null, 2);
        } else {
            resultDiv.textContent = '错误：' + json.msg;
        }
        refreshCharts();
    } catch (err) {
        resultDiv.textContent = '错误：' + err.message;
    }
}

// ==================== 哈希算法 ====================
async function callHash() {
    const userInfo = getUserInfo();
    const input = document.getElementById('hashInput').value;
    const algorithm = document.getElementById('hashAlgorithm').value;
    const resultDiv = document.getElementById('result-hash');
    resultDiv.textContent = '调用中...';
    try {
        const resp = await fetch(`${API_BASE}/api/hash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, algorithm, ...userInfo })
        });
        const json = await resp.json();
        if (json.code === 'OK') {
            resultDiv.textContent = JSON.stringify(json.data, null, 2);
        } else {
            resultDiv.textContent = '错误：' + json.msg;
        }
        refreshCharts();
    } catch (err) {
        resultDiv.textContent = '错误：' + err.message;
    }
}

// ==================== 冒泡排序 ====================
async function callSort() {
    const userInfo = getUserInfo();
    const inputStr = document.getElementById('sortInput').value;
    const resultDiv = document.getElementById('result-sort');
    resultDiv.textContent = '调用中...';
    try {
        let dataArr;
        try {
            dataArr = JSON.parse(inputStr);
            if (!Array.isArray(dataArr)) throw new Error('不是数组');
        } catch (e) {
            resultDiv.textContent = '错误：请输入有效的 JSON 数组，如 [5,3,8,4,2]';
            return;
        }
        const resp = await fetch(`${API_BASE}/api/sort`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: dataArr, ...userInfo })
        });
        const json = await resp.json();
        if (json.code === 'OK') {
            resultDiv.textContent = JSON.stringify(json.data, null, 2);
        } else {
            resultDiv.textContent = '错误：' + json.msg;
        }
        refreshCharts();
    } catch (err) {
        resultDiv.textContent = '错误：' + err.message;
    }
}

// ==================== 导出 ====================
function exportData() {
    const tab = document.getElementById('exportTab').value;
    const url = tab === 'all'
        ? `${API_BASE}/api/export`
        : `${API_BASE}/api/export?tab=${tab}`;
    window.open(url, '_blank');
}

// ==================== 前端导出 API 调用结果 ====================
function exportResultData() {
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return;
    const tabName = activeTab.dataset.tab;
    const resultDiv = document.getElementById('result-' + tabName);
    if (!resultDiv || !resultDiv.textContent ||
        resultDiv.textContent === '点击按钮查看结果' ||
        resultDiv.textContent === '输入文本并选择算法后点击按钮' ||
        resultDiv.textContent === '输入数组后点击按钮' ||
        resultDiv.textContent === '调用中...') {
        alert('当前 Tab 暂无 API 调用结果，请先调用接口');
        return;
    }

    const content = resultDiv.textContent;
    const csvContent = '\uFEFFTab,内容\n' + `${tabName},"${content.replace(/"/g, '""')}"\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `result_${tabName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==================== 图表 ====================
let lineChart = null, pieChart = null, barChart = null;

function initCharts() {
    lineChart = echarts.init(document.getElementById('chart-line'));
    pieChart = echarts.init(document.getElementById('chart-pie'));
    barChart = echarts.init(document.getElementById('chart-bar'));
    refreshCharts();
}

async function refreshCharts() {
    const dimension = document.getElementById('chartDimension').value;
    try {
        // 三个图表并行请求，每个使用不同的 chart_type
        const [lineResp, pieResp, barResp] = await Promise.all([
            fetch(`${API_BASE}/api/stats/chart?dimension=${dimension}&chart_type=line`),
            fetch(`${API_BASE}/api/stats/chart?dimension=${dimension}&chart_type=pie`),
            fetch(`${API_BASE}/api/stats/chart?dimension=${dimension}&chart_type=bar`)
        ]);

        const lineJson = await lineResp.json();
        const pieJson = await pieResp.json();
        const barJson = await barResp.json();

        const lineData = lineJson.code === 'OK' ? lineJson.data : { labels: [], values: [] };
        const pieData = pieJson.code === 'OK' ? pieJson.data : { labels: [], values: [] };
        const barData = barJson.code === 'OK' ? barJson.data : { labels: [], values: [] };

        // 折线图
        if (lineChart) {
            lineChart.setOption({
                title: { text: '调用趋势', textStyle: { fontSize: 13 } },
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: lineData.labels || [] },
                yAxis: { type: 'value' },
                series: [{ type: 'line', data: lineData.values || [], smooth: true, lineStyle: { width: 3 }, itemStyle: { color: '#1890ff' } }]
            });
        }

        // 饼图
        if (pieChart) {
            pieChart.setOption({
                title: { text: '分布情况', textStyle: { fontSize: 13 }, left: 'center' },
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                series: [{
                    type: 'pie', radius: ['30%', '60%'], center: ['50%', '55%'],
                    data: (pieData.labels || []).map((label, i) => ({ name: label, value: (pieData.values || [])[i] })),
                    label: { formatter: '{b}\n{d}%' }
                }]
            });
        }

        // 柱状图
        if (barChart) {
            barChart.setOption({
                title: { text: '对比统计', textStyle: { fontSize: 13 } },
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: barData.labels || [] },
                yAxis: { type: 'value' },
                series: [{ type: 'bar', data: barData.values || [], itemStyle: { color: '#52c41a' } }]
            });
        }
    } catch (err) {
        console.error('图表刷新失败：', err);
    }
}

