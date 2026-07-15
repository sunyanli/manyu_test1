# Markdown 报告模板

## 模板结构

```markdown
# 测试报告

## 报告头

**项目**: {{projectName}}
**生成时间**: {{timestamp}}
**执行命令**: {{testCommand}}
**测试框架**: {{framework}}
**执行环境**: {{environment}}

---

## 📊 结果摘要

| 指标 | 数值 |
|------|------|
| 总用例 | {{total}} |
| ✅ 通过 | {{passed}} |
| ❌ 失败 | {{failed}} |
| ⏭️ 跳过 | {{skipped}} |
| 通过率 | {{passRate}}% |
| 耗时 | {{duration}} |

**整体结论**: {{overallStatus}}

---

## ❌ 失败用例分析

{{#if hasFailures}}
以下 {{failedCount}} 个用例失败：

{{#each failedTests}}
### {{@index}}. {{name}}
- **文件**: `{{file}}`
- **测试套件**: {{suite}}
- **耗时**: {{duration}}ms
- **位置**: 第 {{location.line}} 行

**错误信息**:
```
{{error}}
```

**堆栈追踪**:
```
{{stackTrace}}
```

{{/each}}
{{else}}
无失败用例 ✅
{{/if}}

---

## 📋 用例明细

{{#each testFiles}}
### {{fileName}}
- 状态: {{status}}
- 耗时: {{duration}}ms
- 用例数: {{testCount}}

| 用例名 | 状态 | 耗时 |
|--------|------|------|
{{#each tests}}
| {{name}} | {{status}} | {{duration}}ms |
{{/each}}

{{/each}}

{{#if testCountOver200}}
> ⚠️ 用例数量超过 200，已截断显示。完整列表见原始结果文件。
{{/if}}

---

## 📈 覆盖率

{{#if hasCoverage}}
| 类型 | 覆盖率 | 详情 |
|------|--------|------|
| 语句 | {{statements.pct}}% | {{statements.covered}}/{{statements.total}} |
| 分支 | {{branches.pct}}% | {{branches.covered}}/{{branches.total}} |
| 函数 | {{functions.pct}}% | {{functions.covered}}/{{functions.total}} |
| 行 | {{lines.pct}}% | {{lines.covered}}/{{lines.total}} |

{{#if lowCoverageFiles}}
### 📉 低覆盖率文件

以下文件覆盖率低于阈值：

| 文件 | 语句覆盖率 | 分支覆盖率 | 行覆盖率 |
|------|-----------|-----------|---------|
{{#each lowCoverageFiles}}
| {{file}} | {{statements.pct}}% | {{branches.pct}}% | {{lines.pct}}% |
{{/each}}
{{/if}}
{{else}}
**覆盖率数据**: 未获取
{{/if}}

---

## 📎 附录

- **原始结果文件**: `{{resultFile}}`
- **生成工具**: test-report-generator v{{version}}
- **生成时间**: {{timestamp}}

---

*本报告由 test-report-generator 自动生成*
```

## 模板变量说明

### 报告头变量
| 变量 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `projectName` | string | 项目名称 | my-project |
| `timestamp` | string | 生成时间 | 2026-07-15 14:30:22 |
| `testCommand` | string | 执行命令 | npx jest --json |
| `framework` | string | 测试框架 | Jest 29.6.0 |
| `environment` | string | 执行环境 | Node.js v18.17.0, macOS |

### 结果摘要变量
| 变量 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `total` | number | 总用例数 | 42 |
| `passed` | number | 通过数 | 40 |
| `failed` | number | 失败数 | 2 |
| `skipped` | number | 跳过数 | 0 |
| `passRate` | string | 通过率 | 95.2 |
| `duration` | string | 耗时 | 12.5s |
| `overallStatus` | string | 整体结论 | ✅ 或 ❌ |

### 失败用例变量
| 变量 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `name` | string | 用例全名 | should handle negative numbers |
| `file` | string | 文件路径 | src/utils/calculator.test.ts |
| `suite` | array | 测试套件路径 | [Calculator, subtract function] |
| `error` | string | 错误信息 | AssertionError: expected -5 to equal 5 |
| `stackTrace` | string | 堆栈追踪 | 截断后的堆栈 |
| `location.line` | number | 失败行号 | 42 |
| `duration` | number | 耗时(ms) | 12 |

### 覆盖率变量
| 变量 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `statements.pct` | string | 语句覆盖率 | 85.5 |
| `branches.pct` | string | 分支覆盖率 | 72.3 |
| `functions.pct` | string | 函数覆盖率 | 90.0 |
| `lines.pct` | string | 行覆盖率 | 88.2 |
| `lowCoverageFiles` | array | 低覆盖率文件列表 | 见下表 |

### 附录变量
| 变量 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `resultFile` | string | 原始结果文件路径 | .test-results/jest-results.json |
| `version` | string | 工具版本 | 1.0.0 |

## 生成逻辑

### 时间戳格式
```javascript
function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

function formatFilename() {
  const now = new Date();
  const yyyymmdd = now.toISOString().substring(0, 10).replace(/-/g, '');
  const hhmmss = now.toTimeString().substring(0, 8).replace(/:/g, '');
  return `test-report-${yyyymmdd}-${hhmmss}.md`;
}
```

### 整体结论判断
```javascript
function getOverallStatus(summary, failThreshold) {
  if (summary.failed > 0) {
    return '❌';
  }
  
  if (failThreshold && summary.passRate < failThreshold) {
    return `❌ (通过率低于 ${failThreshold}%)`;
  }
  
  return '✅';
}
```

### 堆栈追踪截断
```javascript
function truncateStackTrace(stack, maxLines = 15, maxLineLength = 120) {
  const lines = stack.split('\n');
  let truncated = lines.slice(0, maxLines).map(line => {
    if (line.length > maxLineLength) {
      return line.substring(0, maxLineLength) + '...';
    }
    return line;
  });
  
  if (lines.length > maxLines) {
    truncated.push(`... (${lines.length - maxLines} more lines)`);
  }
  
  return truncated.join('\n');
}
```

### 敏感信息过滤
```javascript
function sanitizeStackTrace(stack) {
  // 过滤环境变量中的敏感信息
  let sanitized = stack.replace(/TOKEN=\S+/gi, 'TOKEN=<REDACTED>');
  sanitized = sanitized.replace(/PASSWORD=\S+/gi, 'PASSWORD=<REDACTED>');
  sanitized = sanitized.replace(/SECRET=\S+/gi, 'SECRET=<REDACTED>');
  
  // 过滤常见的密钥格式
  sanitized = sanitized.replace(/[A-Za-z0-9]{32,}/g, '<REDACTED>');
  
  return sanitized;
}
```