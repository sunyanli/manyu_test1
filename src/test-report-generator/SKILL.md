---
name: test-report-generator
description: 自动执行测试并生成结构化测试报告，支持 Jest/Vitest/pytest/JUnit XML
version: 1.0.0
author: AI Agent
triggers:
  - "生成测试报告"
  - "跑测试并生成报告"
  - "把 junit.xml 转成测试报告"
  - "test report"
config_schema:
  type: object
  properties:
    test_command:
      type: string
      description: 显式指定测试执行命令
    result_file:
      type: string
      description: 解析模式下的结果文件路径
    output_format:
      type: string
      enum: [markdown, html, json]
      default: markdown
    output_path:
      type: string
      default: reports/
    coverage:
      type: string
      enum: [auto, on, off]
      default: auto
    fail_threshold:
      type: number
      description: 通过率阈值，低于此值标记为不达标
    mode:
      type: string
      enum: [execute, parse]
      default: execute
---

# 测试报告生成器

## 功能概述

一条指令自动完成：执行测试 → 收集结果 → 生成结构化 Markdown 报告。

### 核心特性

- **FR1**: 自动检测测试框架（Jest/Vitest/pytest），支持执行/解析双模式
- **FR2**: 标准化报告结构（摘要、失败分析、用例明细、覆盖率、附录）
- **FR3**: 默认 Markdown 输出，报告自动落盘
- **FR4**: 失败用例包含文件路径、错误信息、堆栈摘要

## 使用方式

### 执行模式

```
"生成测试报告"
```

自动检测项目测试框架并执行测试，生成报告。

### 解析模式

```
"把 test-results/junit.xml 转成测试报告"
```

跳过测试执行，直接解析已有结果文件。

## 报告结构

生成的报告包含以下章节：

1. **报告头**: 项目名、生成时间、执行命令、框架/版本
2. **结果摘要**: 用例总数、通过/失败/跳过、通过率、耗时
3. **失败用例分析**: 用例名、文件路径、错误信息、堆栈摘要
4. **用例明细**: 按文件分组的用例列表
5. **覆盖率**: 语句/分支/函数/行覆盖率（若可获取）
6. **附录**: 原始结果文件路径、工具版本

## 支持的测试框架

| 框架 | 结果格式 | 状态 |
|------|---------|------|
| Jest | JSON | ✅ P0 |
| Vitest | JSON | ✅ P0 |
| pytest | JUnit XML | ✅ P0 |
| JUnit XML | XML | ✅ P0 (通用兜底) |

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式结果文件 |
| output_format | markdown | 输出格式 |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | 覆盖率数据收集 |
| fail_threshold | 无 | 通过率阈值 |
| mode | execute | 工作模式 |

## 输出示例

```markdown
# 测试报告

**项目**: my-project
**生成时间**: 2026-07-15 06:32:00
**框架**: Jest v29.5.0

## 结果摘要

✅ **通过**
- 总用例: 42
- 通过: 40 ✅
- 失败: 2 ❌
- 通过率: 95.2%
- 耗时: 3.2s

## 失败用例分析

### 1. login should reject invalid credentials
- **文件**: src/auth/login.test.ts:15
- **错误**: Expected 401 but received 200
```