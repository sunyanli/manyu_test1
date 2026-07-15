# Jest/Vitest JSON 解析器

## 输入格式

### Jest JSON 结构
```json
{
  "success": false,
  "numTotalTests": 42,
  "numPassedTests": 40,
  "numFailedTests": 2,
  "numPendingTests": 0,
  "numTodoTests": 0,
  "numSkippedTests": 0,
  "testResults": [
    {
      "assertionResults": [
        {
          "ancestorTitles": ["Calculator", "add function"],
          "fullName": "Calculator add function should sum two numbers",
          "status": "passed",
          "title": "should sum two numbers",
          "duration": 5,
          "failureMessages": []
        },
        {
          "ancestorTitles": ["Calculator", "subtract function"],
          "fullName": "Calculator subtract function should handle negative numbers",
          "status": "failed",
          "title": "should handle negative numbers",
          "duration": 12,
          "failureMessages": [
            "AssertionError: expected -5 to equal 5"
          ],
          "location": {
            "line": 42,
            "column": 5
          }
        }
      ],
      "name": "/src/utils/calculator.test.ts",
      "status": "failed",
      "duration": 150,
      "message": "",
      "startTime": 1689345678123
    }
  ],
  "startTime": 1689345678000,
  "success": false,
  "coverageMap": {}
}
```

### Vitest JSON 结构
Vitest 的 JSON 输出格式与 Jest 类似，但有一些差异：
```json
{
  "testResults": [
    {
      "name": "/src/utils/calculator.test.ts",
      "assertionResults": [...],
      "status": "failed",
      "duration": 150
    }
  ]
}
```

## 解析逻辑

### 1. 提取摘要数据
```javascript
function parseSummary(json) {
  return {
    total: json.numTotalTests,
    passed: json.numPassedTests,
    failed: json.numFailedTests,
    skipped: json.numPendingTests + json.numTodoTests + json.numSkippedTests,
    duration: calculateTotalDuration(json.testResults),
    success: json.success,
    passRate: (json.numPassedTests / json.numTotalTests * 100).toFixed(1)
  };
}
```

### 2. 提取失败用例
```javascript
function parseFailedTests(json) {
  const failedTests = [];
  
  for (const testFile of json.testResults) {
    for (const assertion of testFile.assertionResults) {
      if (assertion.status === 'failed') {
        failedTests.push({
          name: assertion.fullName,
          file: testFile.name,
          suite: assertion.ancestorTitles,
          error: assertion.failureMessages.join('\n'),
          duration: assertion.duration,
          location: assertion.location
        });
      }
    }
  }
  
  return failedTests;
}
```

### 3. 提取用例明细
```javascript
function parseTestDetails(json) {
  const details = {};
  
  for (const testFile of json.testResults) {
    details[testFile.name] = {
      status: testFile.status,
      duration: testFile.duration,
      tests: testFile.assertionResults.map(a => ({
        name: a.fullName,
        status: a.status,
        duration: a.duration
      }))
    };
  }
  
  return details;
}
```

### 4. 提取覆盖率（若存在）
```javascript
function parseCoverage(json) {
  if (!json.coverageMap || Object.keys(json.coverageMap).length === 0) {
    return null;
  }
  
  const coverage = {
    lines: { total: 0, covered: 0 },
    statements: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 }
  };
  
  // 汇总覆盖率数据
  for (const file of Object.values(json.coverageMap)) {
    coverage.lines.total += file.l.total;
    coverage.lines.covered += file.l.covered;
    // ... 其他指标
  }
  
  coverage.lines.percentage = (coverage.lines.covered / coverage.lines.total * 100).toFixed(1);
  // ... 计算其他百分比
  
  return coverage;
}
```

## 数据结构映射

| JSON 字段 | 报告字段 | 说明 |
|-----------|----------|------|
| `numTotalTests` | 总用例数 | - |
| `numPassedTests` | 通过数 | - |
| `numFailedTests` | 失败数 | - |
| `numPendingTests` + `numSkippedTests` | 跳过数 | 合并计算 |
| `success` | 整体结论 | true → ✅, false → ❌ |
| `testResults[].name` | 文件路径 | - |
| `assertionResults[].fullName` | 用例全名 | 包含 suite 前缀 |
| `assertionResults[].failureMessages` | 错误信息 | 失败时提取 |

## 错误处理

### JSON 格式异常
```javascript
try {
  const json = JSON.parse(content);
  // 验证必需字段
  if (!json.testResults) {
    throw new Error('缺少 testResults 字段');
  }
} catch (e) {
  return {
    error: 'JSON 解析失败',
    message: e.message
  };
}
```

### 字段缺失处理
使用默认值：
```javascript
const total = json.numTotalTests ?? 0;
const passed = json.numPassedTests ?? 0;
const failed = json.numFailedTests ?? 0;
```

## 示例输出

```javascript
{
  summary: {
    total: 42,
    passed: 40,
    failed: 2,
    skipped: 0,
    duration: '12.5s',
    success: false,
    passRate: '95.2%'
  },
  failedTests: [
    {
      name: 'Calculator subtract function should handle negative numbers',
      file: '/src/utils/calculator.test.ts',
      suite: ['Calculator', 'subtract function'],
      error: 'AssertionError: expected -5 to equal 5',
      duration: 12,
      location: { line: 42, column: 5 }
    }
  ],
  details: {
    '/src/utils/calculator.test.ts': {
      status: 'failed',
      duration: 150,
      tests: [...]
    }
  },
  coverage: null
}
```