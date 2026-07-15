# Test Report Generator - 使用示例

## 快速开始

### 执行模式（运行测试并生成报告）

```typescript
import { TestReportGenerator } from './index';

const generator = new TestReportGenerator({
  outputFormat: 'markdown',
  outputPath: 'reports/'
});

const result = await generator.runAndGenerate();
console.log(`报告已生成: ${result.reportPath}`);
console.log(`通过率: ${result.summary.passRate}%`);
```

### 解析模式（解析已有结果）

```typescript
import { parseAndGenerateReport } from './index';

const result = await parseAndGenerateReport(
  'test-results/jest-results.json',
  { outputPath: 'reports/' }
);

console.log(`报告路径: ${result.reportPath}`);
if (result.topFailures.length > 0) {
  console.log('关键失败:');
  result.topFailures.forEach(f => {
    console.log(`  - ${f.name}: ${f.message}`);
  });
}
```

## 配置选项

```typescript
interface ReportConfig {
  testCommand?: string;      // 自定义测试命令
  resultFile?: string;       // 解析模式的结果文件路径
  outputFormat: 'markdown' | 'html' | 'json';  // 输出格式
  outputPath: string;        // 输出目录
  coverage: 'auto' | 'on' | 'off';  // 覆盖率收集
  failThreshold?: number;    // 通过率阈值（百分比）
}
```

## 命令行使用

```bash
# 在项目中使用
npx ts-node index.ts

# 或者编译后使用
npx tsc
node dist/index.js
```

## 示例输出

```markdown
# 测试报告 - my-project

**生成时间**: 2026-07-15 14:30:00
**执行命令**: `npm test -- --json`
**测试框架**: Jest 29.5.0

---

## 📊 结果摘要

| 指标 | 数值 |
|------|------|
| 用例总数 | 120 |
| ✅ 通过 | 115 |
| ❌ 失败 | 3 |
| ⏭️ 跳过 | 2 |
| 通过率 | 95.8% |
| 总耗时 | 12.5s |

**整体结论**: ⚠️ 部分失败

---

## ❌ 失败用例分析

### 1. should authenticate user
- **文件**: `src/auth.test.ts`
- **错误**: `Expected true, received false`
- **堆栈**:
```
at Object.<anonymous> (src/auth.test.ts:45:12)
```
```

## 集成到 CI/CD

### GitHub Actions

```yaml
- name: Run Tests & Generate Report
  run: |
    npm test -- --json --outputFile=test-results/jest-results.json
    npx ts-node scripts/generate-report.ts
    
- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: test-report
    path: reports/test-report-*.md
```

### GitLab CI

```yaml
test_and_report:
  script:
    - npm test -- --json --outputFile=test-results/jest-results.json
    - npx ts-node scripts/generate-report.ts
  artifacts:
    paths:
      - reports/
    expire_in: 30 days
```

## API 参考

### TestReportGenerator

#### constructor(config?: Partial\<ReportConfig\>)

创建报告生成器实例。

#### runAndGenerate(projectRoot?: string): Promise\<ReportOutput\>

执行测试并生成报告。

#### parseAndGenerate(resultFilePath: string): Promise\<ReportOutput\>

解析已有结果文件并生成报告。

### 快捷函数

#### generateReport(config?: Partial\<ReportConfig\>): Promise\<ReportOutput\>

便捷函数，自动检测框架并执行测试。

#### parseAndGenerateReport(resultFilePath: string, config?: Partial\<ReportConfig\>): Promise\<ReportOutput\>

便捷函数，解析指定结果文件。

## 支持的测试框架

| 框架 | 结果格式 | 支持状态 |
|------|----------|----------|
| Jest | JSON | ✅ P0 |
| Vitest | JSON | ✅ P0 |
| pytest | JUnit XML | 🔄 P1 |
| 通用 JUnit | XML | ✅ P0 |

## 注意事项

1. 确保 `npm test` 命令在项目中正确配置
2. Jest/Vitest 需要使用 JSON reporter 输出
3. 结果文件路径默认为 `test-results/` 目录
4. 报告文件名格式: `test-report-YYYYMMDD-HHmmss.md`