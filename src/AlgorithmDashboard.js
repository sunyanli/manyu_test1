import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';

const API_BASE = 'http://localhost:8080';

// ==================== Tab 组件 ====================

function HelloWorldTab() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/algorithm/helloworld`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ code: 'ERROR', msg: '请求失败' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleCall} disabled={loading} style={btnStyle}>
        {loading ? '执行中...' : '调用 HelloWorld'}
      </button>
      {result && (
        <pre style={resultStyle}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

function HashTab() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/algorithm/hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ code: 'ERROR', msg: '请求失败' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入待哈希的字符串"
        style={inputStyle}
      />
      <button onClick={handleCall} disabled={loading} style={btnStyle}>
        {loading ? '计算中...' : '计算 SHA-256'}
      </button>
      {result && (
        <pre style={resultStyle}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

function BubbleSortTab() {
  const [input, setInput] = useState('');
  const [order, setOrder] = useState('asc');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true);
    try {
      const arr = input.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      const res = await fetch(`${API_BASE}/api/algorithm/bubble-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ array: arr, order }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ code: 'ERROR', msg: '请求失败' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入数组，如: 5,3,8,4,2"
        style={inputStyle}
      />
      <select value={order} onChange={(e) => setOrder(e.target.value)} style={selectStyle}>
        <option value="asc">升序</option>
        <option value="desc">降序</option>
      </select>
      <button onClick={handleCall} disabled={loading} style={btnStyle}>
        {loading ? '排序中...' : '冒泡排序'}
      </button>
      {result && (
        <pre style={resultStyle}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

// ==================== 报表面板 ====================

function ReportPanel() {
  const [dimension, setDimension] = useState('user_type');
  const [chartType, setChartType] = useState('line');
  const [lineData, setLineData] = useState(null);
  const [dimData, setDimData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    try {
      if (chartType === 'line') {
        const res = await fetch(`${API_BASE}/api/report/call-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: startDate,
            endTime: endDate,
            granularity: 'day',
            dimension,
          }),
        });
        const data = await res.json();
        setLineData(data);
        setDimData(null);
      } else {
        const res = await fetch(`${API_BASE}/api/report/dimension-stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: startDate,
            endTime: endDate,
            dimension,
            chartType: chartType === 'bar' ? 'bar' : 'pie',
          }),
        });
        const data = await res.json();
        setDimData(data);
        setLineData(null);
      }
    } catch (e) {
      console.error('报表查询失败', e);
    }
    setLoading(false);
  }, [dimension, chartType]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const getLineOption = () => {
    if (!lineData || !lineData.data) return {};
    const series = lineData.data.series || [];
    return {
      title: { text: '调用次数趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: series.map((s) => s.time) },
      yAxis: { type: 'value', name: '调用次数' },
      series: [{ data: series.map((s) => s.count), type: 'line', smooth: true }],
    };
  };

  const getPieOption = () => {
    if (!dimData || !dimData.data) return {};
    const items = dimData.data.items || [];
    return {
      title: { text: '调用占比分布', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '55%',
        data: items.map((it) => ({ name: it.label, value: it.count })),
      }],
    };
  };

  const getBarOption = () => {
    if (!dimData || !dimData.data) return {};
    const items = dimData.data.items || [];
    return {
      title: { text: '调用对比分析', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: items.map((it) => it.label) },
      yAxis: { type: 'value', name: '调用次数' },
      series: [{ data: items.map((it) => it.count), type: 'bar' }],
    };
  };

  return (
    <div style={{ padding: 20, borderTop: '2px solid #e8e8e8' }}>
      <h3>📊 调用情况报表</h3>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select value={dimension} onChange={(e) => setDimension(e.target.value)} style={selectStyle}>
          <option value="user_type">人员类型</option>
          <option value="user_level">人员层级</option>
          <option value="user_department">人员部门</option>
        </select>
        <div>
          <button onClick={() => setChartType('line')} style={{ ...chartBtnStyle, background: chartType === 'line' ? '#1890ff' : '#fff', color: chartType === 'line' ? '#fff' : '#333' }}>折线图</button>
          <button onClick={() => setChartType('pie')} style={{ ...chartBtnStyle, background: chartType === 'pie' ? '#1890ff' : '#fff', color: chartType === 'pie' ? '#fff' : '#333' }}>饼图</button>
          <button onClick={() => setChartType('bar')} style={{ ...chartBtnStyle, background: chartType === 'bar' ? '#1890ff' : '#fff', color: chartType === 'bar' ? '#fff' : '#333' }}>柱状图</button>
        </div>
        <button onClick={fetchReport} disabled={loading} style={btnStyle}>
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
        {chartType === 'line' && lineData && (
          <ReactECharts option={getLineOption()} style={{ height: 400 }} />
        )}
        {chartType === 'pie' && dimData && (
          <ReactECharts option={getPieOption()} style={{ height: 400 }} />
        )}
        {chartType === 'bar' && dimData && (
          <ReactECharts option={getBarOption()} style={{ height: 400 }} />
        )}
      </div>
    </div>
  );
}

// ==================== 主页面 ====================

export default function AlgorithmDashboard() {
  const [activeTab, setActiveTab] = useState('helloworld');

  const handleExport = async () => {
    const exportTypeMap = { helloworld: 'helloworld', hash: 'hash', bubbleSort: 'bubble_sort' };
    const exportType = exportTypeMap[activeTab];
    try {
      const res = await fetch(`${API_BASE}/api/export/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportType }),
      });
      if (!res.ok) {
        alert('导出失败');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_export.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败: ' + e.message);
    }
  };

  const tabs = [
    { key: 'helloworld', label: 'Hello World' },
    { key: 'hash', label: '哈希算法' },
    { key: 'bubbleSort', label: '冒泡排序' },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', padding: '20px 0' }}>🔬 算法展示与监控</h1>

      {/* 顶部操作区 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <div>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...tabBtnStyle,
                background: activeTab === tab.key ? '#1890ff' : '#f0f0f0',
                color: activeTab === tab.key ? '#fff' : '#333',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport} style={{ ...btnStyle, background: '#52c41a' }}>
          📥 导出 Excel
        </button>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'helloworld' && <HelloWorldTab />}
      {activeTab === 'hash' && <HashTab />}
      {activeTab === 'bubbleSort' && <BubbleSortTab />}

      {/* 报表区域 */}
      <ReportPanel />
    </div>
  );
}

// ==================== 样式常量 ====================

const btnStyle = {
  padding: '8px 16px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  background: '#1890ff',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  marginLeft: 8,
};

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  width: 260,
  marginRight: 8,
};

const selectStyle = {
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  marginRight: 8,
};

const tabBtnStyle = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '4px 4px 0 0',
  cursor: 'pointer',
  fontSize: 14,
  marginRight: 4,
};

const chartBtnStyle = {
  padding: '6px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  marginRight: 4,
};

const resultStyle = {
  marginTop: 16,
  padding: 16,
  background: '#f5f5f5',
  borderRadius: 4,
  fontSize: 13,
  overflow: 'auto',
  maxHeight: 300,
};