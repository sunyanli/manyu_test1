---
name: test-report-generator
description: 自动执行测试并生成结构化测试报告，支持 Jest/Vitest/pytest/JUnit XML，输出标准 Markdown 报告
version: 1.0.0
author: agent
triggers:
  - "生成测试报告"
  - "跑测试并出报告"
  - "运行测试生成报告"
  - "把这个 junit.xml 转成测试报告"
  - "解析测试结果"
  - "test report"
  - "generate test report"
activation: auto
tags:
  - testing
  - report
  - jest
  - vitest
  - pytest
  - junit
config:
  test_command:
    type: string
    default: auto
    description: 测试执行命令，auto 表示自动检测
  result_file:
    type: string
    default: auto
    description: 解析模式下的结果文件路径
  output_format:
    type: string
    default: markdown
    enum: [markdown, html, json]
    description: 报告输出格式
  output_path:
    type: string
    default: reports/
    description: 报告输出目录
  coverage:
    type: string
    default: auto
    enum: [auto, on, off]
    description: 覆盖率数据收集模式
  fail_threshold:
    type: number
    default: null
    description: 通过率低于该值时报告结论标记为不达标
---

# 测试报告生成 Skill

## 功能概述

本 Skill 在测试执行后自动解析测试结果并生成结构化、可读性强的标准测试报告。

## 支持的测试框架

### P0（首期支持）
- **JavaScript/TypeScript**: Jest、Vitest（JSON reporter）
- **通用格式**: JUnit XML（跨语言兜底）

### P1（后续迭代）
- **Python**: pytest（JUnit XML / JSON report）

## 工作模式

### 1. 执行模式
自动识别测试框架并执行测试，收集结果后生成报告。

**执行流程**:
1. 检测项目测试框架和运行命令
2. 执行测试命令（必要时使用 JSON reporter）
3. 解析测试结果
4. 生成报告并落盘

### 2. 解析模式
跳过测试执行，直接解析用户指定的已有结果文件。

**使用场景**:
- CI 流程中已有测试结果，仅需转换格式
- 分析历史测试数据

## 报告结构

生成的报告包含以下固定章节：

1. **报告头**: 项目名、生成时间、执行命令、框架/版本、执行环境
2. **结果摘要**: 用例总数、通过/失败/跳过数、通过率、总耗时、整体结论（✅/❌）
3. **失败用例分析**: 用例名、所属文件、错误信息、堆栈关键行
4. **用例明细**: 按测试文件分组的用例列表与耗时
5. **覆盖率**: 语句/分支/函数/行覆盖率（若可获取）
6. **附录**: 原始结果文件路径、生成工具版本

## 使用示例

### 示例 1：自动执行测试并生成报告
```
用户: 帮我跑测试并生成报告
Agent: [调用 test-report-generator skill]
       - 检测到 Jest 框架
       - 执行 npm test -- --json
       - 解析结果
       - 生成 reports/test-report-20260715-143022.md
```

### 示例 2：解析已有 JUnit XML
```
用户: 把 test-results/junit.xml 转成测试报告
Agent: [调用 test-report-generator skill，result_file=test-results/junit.xml]
       - 跳过测试执行
       - 解析 JUnit XML
       - 生成 reports/test-report-20260715-143500.md
```

### 示例 3：指定通过率阈值
```
用户: 跑测试生成报告，通过率低于 80% 标记为不达标
Agent: [调用 test-report-generator skill，fail_threshold=80]
```

## 输出示例

### 报告路径与摘要
```
📋 测试报告已生成: reports/test-report-20260715-143022.md

📊 结果摘要:
- 总用例: 42
- ✅ 通过: 40
- ❌ 失败: 2
- ⏭️ 跳过: 0
- 通过率: 95.2%
- 耗时: 12.5s

❌ 失败用例 (2):
1. [src/utils/calculator.test.ts] subtract should handle negative numbers
   - AssertionError: expected -5 to equal 5
   
2. [src/services/auth.test.ts] login should reject invalid token
   - TypeError: Cannot read property 'id' of undefined
```

## 技术实现

### 框架检测逻辑
见 `framework-detector.md`

### 解析器
- Jest/Vitest JSON: `parsers/jest-vitest-json.md`
- JUnit XML: `parsers/junit-xml.md`

### 报告模板
见 `templates/markdown-report.md`

## 配置项说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `test_command` | auto | 测试执行命令，auto 表示自动检测 |
| `result_file` | auto | 解析模式的结果文件路径 |
| `output_format` | markdown | 输出格式 (markdown/html/json) |
| `output_path` | reports/ | 报告输出目录 |
| `coverage` | auto | 覆盖率收集 (auto/on/off) |
| `fail_threshold` | null | 通过率阈值，低于此值标记不达标 |

## 验收标准

- ✅ AC1: Jest/Vitest 项目执行"生成测试报告"，产出符合结构的 Markdown 报告
- ✅ AC2: 存在失败用例时，报告包含用例名、文件路径、错误信息
- ✅ AC3: 提供 JUnit XML 走解析模式，不触发测试执行
- ✅ AC4: 结果文件损坏时返回明确错误说明
- ✅ AC5: 覆盖率数据存在时正确呈现，不存在时标注"未获取"

## 限制与后续迭代

### 本期不做
- 测试用例的自动生成或修复
- 报告的在线托管/Web 服务化
- 多次运行结果的趋势对比
- 非 Test 类质量报告（lint、安全扫描）

### 后续迭代 (P1-P2)
- pytest 支持
- HTML 输出格式
- JSON 伴随产物
- 历史趋势对比
- Go test / cargo test 支持