---
name: test-report-generator
description: 自动解析测试结果并生成结构化 Markdown 测试报告，支持 Jest/Vitest/pytest/JUnit 等主流框架
version: 1.0.0
author: DTCoder
tags: [testing, report, jest, vitest, pytest, junit]
activation_kind: manual
---

# 测试报告生成器

## 功能

自动解析测试结果并生成结构化 Markdown 测试报告：

- **自动框架识别**：检测 Jest、Vitest、pytest 等测试框架
- **双模式运行**：执行模式（运行测试）和解析模式（仅解析已有结果）
- **结构化报告**：包含摘要、失败分析、覆盖率等标准章节
- **多格式解析**：支持 JSON、JUnit XML 等结果格式

## 使用方法

### 触发示例

```
生成测试报告
跑测试并出报告
把这个 junit.xml 转成测试报告
```

### 配置选项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式下的结果文件路径 |
| output_format | markdown | 输出格式 |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | 覆盖率报告 |
| fail_threshold | 无 | 通过率阈值 |

## 报告结构

1. **报告头**：项目名、生成时间、执行命令、框架版本
2. **结果摘要**：用例总数、通过/失败/跳过、通过率、耗时
3. **失败分析**：失败用例详情、错误信息、堆栈摘要
4. **用例明细**：按文件分组的用例列表
5. **覆盖率**：覆盖率数据和低覆盖文件
6. **附录**：原始文件路径、工具版本

## 支持的框架

### P0（首期）
- Jest (JSON)
- Vitest (JSON)
- pytest (JUnit XML)
- JUnit XML

## 入口点

```
src/test-report-generator/index.ts
```

## API

```typescript
import { generateTestReport } from './src/test-report-generator';

const { reportPath, summary } = await generateTestReport({
  mode: 'execute', // 或 'parse'
  outputPath: 'reports',
});
```