# JUnit XML 解析器

## 输入格式

### JUnit XML 结构
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="jest tests" tests="42" failures="2" errors="0" skipped="0" time="12.5">
    <testsuite name="Calculator" tests="10" failures="1" skipped="0" time="3.2">
      <testcase name="should sum two numbers" classname="Calculator" time="0.005">
        <system-out>Log output here</system-out>
      </testcase>
      <testcase name="should handle negative numbers" classname="Calculator" time="0.012">
        <failure message="AssertionError: expected -5 to equal 5">
          AssertionError: expected -5 to equal 5
    at Calculator.subtract (src/utils/calculator.ts:15)
    at Object.&lt;anonymous&gt; (src/utils/calculator.test.ts:42)
        </failure>
      </testcase>
    </testsuite>
    <testsuite name="Auth" tests="8" failures="1" skipped="0" time="2.1">
      <testcase name="should reject invalid token" classname="Auth" time="0.015">
        <failure message="TypeError: Cannot read property 'id' of undefined">
          TypeError: Cannot read property 'id' of undefined
    at AuthService.login (src/services/auth.ts:25)
        </failure>
      </testcase>
    </testsuite>
  </testsuite>
</testsuites>
```

## 解析逻辑

### 1. 解析 XML 文档
```javascript
function parseJUnitXML(xmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  // 检查解析错误
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML 解析失败: ${parseError.textContent}`);
  }
  
  return doc;
}
```

### 2. 提取摘要数据
```javascript
function parseSummary(doc) {
  const testsuites = doc.querySelector('testsuites');
  
  return {
    total: parseInt(testsuites.getAttribute('tests') || '0'),
    passed: parseInt(testsuites.getAttribute('tests') || '0') - 
            parseInt(testsuites.getAttribute('failures') || '0') - 
            parseInt(testsuites.getAttribute('errors') || '0') - 
            parseInt(testsuites.getAttribute('skipped') || '0'),
    failed: parseInt(testsuites.getAttribute('failures') || '0') + 
            parseInt(testsuites.getAttribute('errors') || '0'),
    skipped: parseInt(testsuites.getAttribute('skipped') || '0'),
    duration: testsuites.getAttribute('time') || '0',
    success: parseInt(testsuites.getAttribute('failures') || '0') === 0 &&
             parseInt(testsuites.getAttribute('errors') || '0') === 0
  };
}
```

### 3. 提取失败用例
```javascript
function parseFailedTests(doc) {
  const failedTests = [];
  const testcases = doc.querySelectorAll('testcase');
  
  for (const testcase of testcases) {
    const failure = testcase.querySelector('failure');
    const error = testcase.querySelector('error');
    
    if (failure || error) {
      const element = failure || error;
      const testsuite = testcase.closest('testsuite');
      
      failedTests.push({
        name: testcase.getAttribute('name'),
        classname: testcase.getAttribute('classname'),
        file: testsuite.getAttribute('name'),
        error: element.getAttribute('message'),
        stackTrace: element.textContent.trim(),
        duration: parseFloat(testcase.getAttribute('time') || '0')
      });
    }
  }
  
  return failedTests;
}
```

### 4. 提取用例明细
```javascript
function parseTestDetails(doc) {
  const details = {};
  const testsuites = doc.querySelectorAll('testsuite');
  
  for (const testsuite of testsuites) {
    const testcases = testsuite.querySelectorAll('testcase');
    const suiteName = testsuite.getAttribute('name');
    
    details[suiteName] = {
      tests: Array.from(testcases).map(tc => ({
        name: tc.getAttribute('name'),
        classname: tc.getAttribute('classname'),
        status: tc.querySelector('failure') || tc.querySelector('error') ? 'failed' : 
                tc.querySelector('skipped') ? 'skipped' : 'passed',
        duration: parseFloat(tc.getAttribute('time') || '0')
      })),
      duration: parseFloat(testsuite.getAttribute('time') || '0'),
      total: parseInt(testsuite.getAttribute('tests') || '0'),
      failures: parseInt(testsuite.getAttribute('failures') || '0')
    };
  }
  
  return details;
}
```

### 5. 堆栈追踪截断
```javascript
function truncateStackTrace(stackTrace, maxLines = 10) {
  const lines = stackTrace.split('\n');
  if (lines.length <= maxLines) {
    return stackTrace;
  }
  
  return lines.slice(0, maxLines).join('\n') + 
         `\n... (${lines.length - maxLines} more lines)`;
}
```

## 数据结构映射

| XML 元素/属性 | 报告字段 | 说明 |
|---------------|----------|------|
| `testsuites[@tests]` | 总用例数 | - |
| `testsuites[@failures]` + `[@errors]` | 失败数 | 合并计算 |
| `testsuites[@skipped]` | 跳过数 | - |
| `testsuites[@time]` | 总耗时 | - |
| `testcase[@name]` | 用例名 | - |
| `testcase[@classname]` | 类名 | - |
| `testsuite[@name]` | 文件/suite 名 | - |
| `failure[@message]` | 错误信息 | - |
| `failure` 子文本 | 堆栈追踪 | 截断至可读长度 |

## 错误处理

### XML 解析失败
```javascript
try {
  const doc = parseJUnitXML(content);
} catch (e) {
  return {
    error: 'JUnit XML 解析失败',
    message: e.message
  };
}
```

### 缺少必需属性
使用默认值并记录警告：
```javascript
const total = parseInt(testsuites.getAttribute('tests') || '0');
if (total === 0 && testsuites.children.length > 0) {
  console.warn('警告: tests 属性缺失或为 0，使用子元素计数');
  total = testsuites.querySelectorAll('testcase').length;
}
```

## 覆盖率数据

JUnit XML 本身不包含覆盖率数据。覆盖率需从其他来源获取：
- Jest/Vitest: 从 `coverage/` 目录或 JSON 输出
- pytest: 从 `coverage.xml` 或 `.coverage` 文件

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
      name: 'should handle negative numbers',
      classname: 'Calculator',
      file: 'Calculator',
      error: 'AssertionError: expected -5 to equal 5',
      stackTrace: 'AssertionError: expected -5 to equal 5\n    at Calculator.subtract...',
      duration: 0.012
    }
  ],
  details: {
    'Calculator': {
      tests: [...],
      duration: 3.2,
      total: 10,
      failures: 1
    }
  },
  coverage: null
}
```

## 兼容性说明

### 支持的 JUnit XML 变体
- **标准 JUnit XML**: 由 Maven Surefire、Ant JUnit 等生成
- **Jest JUnit**: Jest 的 junit-reporter 输出
- **pytest JUnit**: pytest 的 `--junitxml` 输出

### 主要差异
| 来源 | 根元素 | classname 含义 |
|------|--------|----------------|
| Jest | `testsuites` | 测试文件路径 |
| pytest | `testsuite` | Python 类名 |
| Maven | `testsuite` | Java 类名 |