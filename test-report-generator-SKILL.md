---
name: test-report-generator
description: 自动解析测试结果并生成结构化测试报告。支持执行模式和解析模式，覆盖 Jest/Vitest/pytest/JUnit XML，输出标准 Markdown 报告。
version: 1.0.0
author: DTCoder
activation: auto
triggers:
  - "生成测试报告"
  - "跑一下测试并出报告"
  - "把这个 junit.xml 转成测试报告"
  - "test report"
tags:
  - testing
  - report
  - jest
  - vitest
  - pytest
  - junit
---

# 测试报告生成 Skill

## 概述

此 Skill 在测试执行后自动解析测试结果并生成结构化、可读性强的标准测试报告。

## 核心功能

1. **自动框架识别**：自动检测 Jest、Vitest、pytest 等主流测试框架
2. **双模式运行**：支持执行模式（运行测试）和解析模式（仅解析已有结果）
3. **标准报告结构**：摘要、失败分析、用例明细、覆盖率、附录五大板块
4. **多格式输出**：默认 Markdown，支持 HTML/JSON

## 使用方式

### 执行模式
```
生成测试报告
```

### 解析模式
```
把 reports/junit.xml 转成测试报告
```

## 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式下的结果文件路径 |
| output_format | markdown | markdown / html / json |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | auto / on / off |
| fail_threshold | 无 | 通过率低于该值时标记不达标 |

## 支持的框架（P0）

- JavaScript/TypeScript: Jest、Vitest（JSON reporter）
- Python: pytest（JUnit XML / JSON report）
- 通用: JUnit XML

## 报告结构

1. **报告头**：项目名、生成时间、执行命令、框架/版本
2. **结果摘要**：用例总数、通过/失败/跳过数、通过率、耗时
3. **失败用例分析**：用例名、文件路径、错误信息、堆栈摘要
4. **用例明细**：按文件分组的用例列表及耗时
5. **覆盖率**：语句/分支/函数/行覆盖率
6. **附录**：原始文件路径、工具版本