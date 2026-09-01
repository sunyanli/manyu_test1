// ============ 配置 ============
const BASE_URL = 'http://localhost:8000';

// 当前用户信息
let currentUser = {
    id: 'u001',
    name: '张三',
    dept: '技术部',
    level: 'P6',
    type: '正式员工'
};

let currentTab = 'helloworld';
let currentDimension = 'dept';
let currentChartType = 'line';

// ============ 用户模拟 ============
function getUserHeaders() {
    return {
        'X-User-Id': currentUser.id,
        'X-User-Name': currentUser.name,
        'X-User-Dept': currentUser.dept,
        'X-User-Level': currentUser.level,
        'X-User-Type': currentUser.type
    };
}

function updateUserInputs() {
    document.getElementById('userId').value = currentUser.id;
    document.getElementById('userName').value = currentUser.name;
    document.getElementById('userDept').value = currentUser.dept;
    document.getElementById('userLevel').value = currentUser.level;
    document.getElementById('userType').value = currentUser.type;
}

function syncUserFromInputs() {
    currentUser.id = document.getElementById('userId').value;
    currentUser.name = document.getElementById('userName').value;
    currentUser.dept = document.getElementById('userDept').value;
    currentUser.level = document.getElementById('userLevel').value;
    currentUser.type = document.getElementById('userType').value;
}

document.querySelectorAll('.preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentUser = JSON.parse(btn.getAttribute('data-user'));
        updateUserInputs();
    });
});

document.querySelectorAll('#userId, #userName, #userDept, #userLevel, #userType').forEach(function(input) {
    input.addEventListener('change', syncUserFromInputs);
});

// ============ Tab 切换 ============
document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        currentTab = btn.getAttribute('data-tab');

        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        document.getElementById('tab-' + currentTab).classList.add('active');

        updateExportButton();
    });
});

function updateExportButton() {
    var labels = { helloworld: 'helloworld', hash: '哈希', 'bubble-sort': '排序' };
    var btn = document.getElementById('exportBtn');
    btn.textContent = '导出 ' + labels[currentTab] + ' 记录';
}

// ============ API 调用 ============
async function apiCall(method, path, body) {
    var opts = {
        method: method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, getUserHeaders())
    };
    if (body) opts.body = JSON.stringify(body);

    var resp = await fetch(BASE_URL + path, opts);
    if (!resp.ok) {
        var err = await resp.json();
        throw new Error(err.detail || '请求失败 (' + resp.status + ')');
    }
    return resp.json();
}

function showResult(tab, data, isError) {
    var pre = document.getElementById('result-' + tab);
    pre.textContent = isError ? data : JSON.stringify(data, null, 2);
    pre.className = isError ? 'error' : '';
}

// helloworld
document.getElementById('btn-helloworld').addEventListener('click', async function() {
    try {
        var data = await apiCall('POST', '/api/helloworld');
        showResult('helloworld', data);
        loadAnalytics();
    } catch (e) {
        showResult('helloworld', e.message, true);
    }
});

// hash
document.getElementById('btn-hash').addEventListener('click', async function() {
    var text = document.getElementById('input-hash').value.trim();
    if (!text) { showResult('hash', '请输入要哈希的文本', true); return; }
    try {
        var data = await apiCall('POST', '/api/hash', { text: text });
        showResult('hash', data);
        loadAnalytics();
    } catch (e) {
        showResult('hash', e.message, true);
    }
});

// bubble-sort
document.getElementById('btn-bubble').addEventListener('click', async function() {
    var raw = document.getElementById('input-bubble').value.trim();
    if (!raw) { showResult('bubble-sort', '请输入数字，逗号分隔', true); return; }
    var numbers = raw.split(',').map(function(s) {
        var n = parseFloat(s.trim());
        if (isNaN(n)) throw new Error('包含非数字: ' + s);
        return n;
    });
    try {
        var data = await apiCall('POST', '/api/bubble-sort', { numbers: numbers });
        showResult('bubble-sort', data);
        loadAnalytics();
    } catch (e) {
        showResult('bubble-sort', e.message, true);
    }
});

// ============ 导出 ============
document.getElementById('exportBtn').addEventListener('click', function() {
    var url = BASE_URL + '/api/export/' + currentTab;
    var a = document.createElement('a');
    a.href = url;
    a.download = currentTab + '_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// ============ 报表 ============
async function loadAnalytics() {
    try {
        var resp = await fetch(
            BASE_URL + '/api/analytics?dimension=' + currentDimension,
            { headers: Object.assign({}, getUserHeaders()) }
        );
        if (!resp.ok) throw new Error('获取报表失败');
        var data = await resp.json();
        renderChart(data.data, currentDimension, currentChartType);
    } catch (e) {
        console.error('Analytics error:', e);
    }
}

document.querySelectorAll('.dim-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        currentDimension = btn.getAttribute('data-dim');
        document.querySelectorAll('.dim-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadAnalytics();
    });
});

document.querySelectorAll('.chart-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        currentChartType = btn.getAttribute('data-chart');
        document.querySelectorAll('.chart-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadAnalytics();
    });
});

// 初始化
updateUserInputs();
updateExportButton();
loadAnalytics();