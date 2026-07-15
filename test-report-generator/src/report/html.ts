/**
 * HTML 报告生成器
 * 生成自包含 HTML 文档，使用内联 CSS（无外部依赖）
 * 结构：报告头 → 摘要表 → 失败用例折叠面板 → 用例明细表格 → 覆盖率表 → 附录
 */

import { TestResult, TestCaseResult } from '../types';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(1);
  return `${min}m ${sec}s`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderStatusBadge(status: string): string {
  switch (status) {
    case 'passed': return '<span class="badge badge-passed">✅ 通过</span>';
    case 'failed': return '<span class="badge badge-failed">❌ 失败</span>';
    case 'skipped': return '<span class="badge badge-skipped">⏭️ 跳过</span>';
    case 'pending': return '<span class="badge badge-pending">🕐 待定</span>';
    default: return `<span class="badge">${escapeHtml(status)}</span>`;
  }
}

export function generateHtmlReport(result: TestResult): string {
  const passedRate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${escapeHtml(result.projectName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .meta { font-size: 14px; opacity: 0.9; }
    .header .meta span { margin-right: 20px; }
    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #667eea;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { background: #f8f9fa; font-weight: 600; color: #555; font-size: 14px; }
    td { font-size: 14px; }
    tr:hover { background: #f8f9ff; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-passed { background: #d4edda; color: #155724; }
    .badge-failed { background: #f8d7da; color: #721c24; }
    .badge-skipped { background: #fff3cd; color: #856404; }
    .badge-pending { background: #e2e3e5; color: #383d41; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .summary-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
    }
    .summary-card .label {
      font-size: 13px;
      color: #888;
      margin-top: 4px;
    }
    .summary-card.card-success .value { color: #28a745; }
    .summary-card.card-danger .value { color: #dc3545; }
    .summary-card.card-warning .value { color: #ffc107; }
    .conclusion {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .conclusion-pass { background: #d4edda; color: #155724; }
    .conclusion-fail { background: #f8d7da; color: #721c24; }
    .conclusion-warn { background: #fff3cd; color: #856404; }
    details {
      margin-bottom: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    details summary {
      padding: 12px 16px;
      cursor: pointer;
      font-weight: 600;
      background: #f8f9fa;
      border-radius: 8px;
      user-select: none;
    }
    details summary:hover { background: #e9ecef; }
    details[open] summary { border-radius: 8px 8px 0 0; }
    details .detail-content {
      padding: 16px;
      background: #fafafa;
      border-radius: 0 0 8px 8px;
    }
    .failure-msg {
      background: #fff5f5;
      border-left: 3px solid #dc3545;
      padding: 10px 14px;
      margin: 8px 0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .stack-trace {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      margin-top: 8px;
      max-height: 300px;
      overflow-y: auto;
    }
    .coverage-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      margin-top: 4px;
      overflow: hidden;
    }
    .coverage-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .coverage-bar-fill.high { background: #28a745; }
    .coverage-bar-fill.medium { background: #ffc107; }
    .coverage-bar-fill.low { background: #dc3545; }
    .appendix {
      font-size: 13px;
      color: #888;
    }
    .appendix p { margin-bottom: 6px; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #aaa;
      font-size: 12px;
    }
    @media print {
      body { background: white; }
      .section { box-shadow: none; border: 1px solid #eee; }
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- 1. 报告头 -->
    <div class="header">
      <h1>📋 测试报告 - ${escapeHtml(result.projectName)}</h1>
      <div class="meta">
        <span>🔧 框架: ${escapeHtml(result.framework)}${result.frameworkVersion ? ' v' + escapeHtml(result.frameworkVersion) : ''}</span>
        <span>📅 时间: ${escapeHtml(result.timestamp)}</span>
        <span>⏱️ 总耗时: ${formatDuration(result.duration)}</span>
      </div>
    </div>

    <!-- 2. 结果摘要 -->
    <div class="section">
      <h2>📊 结果摘要</h2>
      <div class="conclusion ${result.success ? 'conclusion-pass' : 'conclusion-fail'}">
        ${result.success ? '✅ 测试全部通过' : '❌ 存在测试失败'}
      </div>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${result.total}</div>
          <div class="label">总计</div>
        </div>
        <div class="summary-card card-success">
          <div class="value">${result.passed}</div>
          <div class="label">✅ 通过</div>
        </div>
        <div class="summary-card card-danger">
          <div class="value">${result.failed}</div>
          <div class="label">❌ 失败</div>
        </div>
        <div class="summary-card card-warning">
          <div class="value">${result.skipped}</div>
          <div class="label">⏭️ 跳过</div>
        </div>
        <div class="summary-card">
          <div class="value">${result.pending}</div>
          <div class="label">🕐 待定</div>
        </div>
        <div class="summary-card">
          <div class="value">${passedRate}%</div>
          <div class="label">通过率</div>
        </div>
      </div>
      <table>
        <tr><th>指标</th><th>数值</th></tr>
        <tr><td>整体结论</td><td>${result.success ? '✅ 通过' : '❌ 失败'}</td></tr>
        <tr><td>总用例数</td><td>${result.total}</td></tr>
        <tr><td>✅ 通过</td><td>${result.passed}</td></tr>
        <tr><td>❌ 失败</td><td>${result.failed}</td></tr>
        <tr><td>⏭️ 跳过</td><td>${result.skipped}</td></tr>
        <tr><td>🕐 待定</td><td>${result.pending}</td></tr>
        <tr><td>通过率</td><td>${passedRate}%</td></tr>
        <tr><td>总耗时</td><td>${formatDuration(result.duration)}</td></tr>
      </table>
    </div>

    <!-- 3. 失败用例 -->
    ${renderFailedCases(result)}

    <!-- 4. 用例明细 -->
    <div class="section">
      <h2>📋 用例明细</h2>
      ${renderTestCaseTable(result)}
    </div>

    <!-- 5. 覆盖率 -->
    <div class="section">
      <h2>📈 覆盖率</h2>
      ${renderCoverageSection(result)}
    </div>

    <!-- 6. 附录 -->
    <div class="section appendix">
      <h2>📎 附录</h2>
      <p><strong>项目名称:</strong> ${escapeHtml(result.projectName)}</p>
      <p><strong>测试框架:</strong> ${escapeHtml(result.framework)}${result.frameworkVersion ? ' v' + escapeHtml(result.frameworkVersion) : ''}</p>
      <p><strong>执行命令:</strong> <code>${escapeHtml(result.command)}</code></p>
      <p><strong>报告生成时间:</strong> ${escapeHtml(result.timestamp)}</p>
      ${result.resultFile ? `<p><strong>结果文件:</strong> ${escapeHtml(result.resultFile)}</p>` : ''}
      ${result.error ? `<p><strong>错误信息:</strong> ${escapeHtml(result.error)}</p>` : ''}
    </div>

    <div class="footer">
      <p>由 test-report-generator 自动生成</p>
    </div>

  </div>
</body>
</html>`;
}

function renderFailedCases(result: TestResult): string {
  const failedCases = result.suites.flatMap(s => s.testCases.filter(tc => tc.status === 'failed'));

  if (failedCases.length === 0) {
    return '';
  }

  let html = '<div class="section"><h2>❌ 失败用例</h2>';
  for (const tc of failedCases) {
    html += `
    <details>
      <summary>❌ ${escapeHtml(tc.suite)} / ${escapeHtml(tc.name)} (${formatDuration(tc.duration)})</summary>
      <div class="detail-content">`;
    for (const msg of tc.failureMessages) {
      html += `<div class="failure-msg">${escapeHtml(msg)}</div>`;
    }
    if (tc.stackTrace) {
      html += `<div class="stack-trace">${escapeHtml(tc.stackTrace)}</div>`;
    }
    html += `</div></details>`;
  }
  html += '</div>';
  return html;
}

function renderTestCaseTable(result: TestResult): string {
  const allCases = result.suites.flatMap(s => s.testCases);
  const displayCases = allCases.length > 200 ? allCases.slice(0, 200) : allCases;

  let html = '';
  if (allCases.length > 200) {
    html += `<p style="color:#dc3545;margin-bottom:12px;">⚠️ 用例超过 200 条，已截断显示。完整列表请查看原始结果文件。</p>`;
  }

  html += `<table>
    <tr><th>#</th><th>套件</th><th>用例名称</th><th>状态</th><th>耗时</th><th>文件</th></tr>`;
  let idx = 1;
  for (const tc of displayCases) {
    html += `
    <tr>
      <td>${idx}</td>
      <td>${escapeHtml(tc.suite)}</td>
      <td>${escapeHtml(tc.name)}</td>
      <td>${renderStatusBadge(tc.status)}</td>
      <td>${formatDuration(tc.duration)}</td>
      <td style="font-size:12px;color:#888;">${escapeHtml(tc.file)}</td>
    </tr>`;
    idx++;
  }
  html += '</table>';
  return html;
}

function renderCoverageSection(result: TestResult): string {
  if (!result.coverage) {
    return '<p>未获取覆盖率数据</p>';
  }

  const cov = result.coverage;
  const items: { label: string; value: number | undefined }[] = [
    { label: '行覆盖率 (Lines)', value: cov.lines },
    { label: '语句覆盖率 (Statements)', value: cov.statements },
    { label: '分支覆盖率 (Branches)', value: cov.branches },
    { label: '函数覆盖率 (Functions)', value: cov.functions },
  ];

  let html = '<table><tr><th>指标</th><th>覆盖率</th><th>进度</th></tr>';
  for (const item of items) {
    if (item.value !== undefined) {
      const level = item.value >= 80 ? 'high' : item.value >= 50 ? 'medium' : 'low';
      html += `
      <tr>
        <td>${item.label}</td>
        <td><strong>${item.value.toFixed(1)}%</strong></td>
        <td>
          <div class="coverage-bar">
            <div class="coverage-bar-fill ${level}" style="width:${Math.min(item.value, 100)}%"></div>
          </div>
        </td>
      </tr>`;
    } else {
      html += `<tr><td>${item.label}</td><td colspan="2">未获取</td></tr>`;
    }
  }
  html += '</table>';

  if (cov.uncoveredFiles && cov.uncoveredFiles.length > 0) {
    html += '<h3 style="margin-top:16px;margin-bottom:8px;">未覆盖文件</h3><ul>';
    for (const f of cov.uncoveredFiles) {
      html += `<li>${escapeHtml(f)}</li>`;
    }
    html += '</ul>';
  }

  return html;
}