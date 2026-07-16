# OpenSpec Proposal: 测试报告生成 Skill (test-report-generator)

| 属性 | 值 |
|------|-----|
| **提案标题** | T3: 测试报告生成 Skill 设计与实现 |
| **状态** | ✅ 已澄清 → 待提交 PR |
| **创建日期** | 2026-07-15 |
| **关联 PR** | _(待提交验证)_ |
| **需求文档** | 详见 `需求描述` 章节 |
| **澄清文档** | `docs/test-report-skill-clarification.md` |
| **Skill 路径** | `test-report-generator/` |

---

## 1. 概述

### 1.1 背景

当前团队在完成测试执行后，测试结果散落在终端输出、CI 日志或框架原生产物中，存在以下痛点：
- 测试结果需要人工收集、整理、汇总，耗时且易遗漏；
- 缺乏统一格式的测试报告，跨项目/跨团队沟通成本高；
- 失败用例的上下文（错误信息、堆栈、关联代码）需要人工回溯；
- 覆盖率、通过率等质量指标无法沉淀为可追踪的历史数据。

### 1.2 目标

提供一个 Skill，Agent 在执行测试后能够自动解析测试结果并生成结构化、可读性强的标准测试报告。

---

## 2. 需求澄清结论

> 基于 T2 阶段澄清 (`docs/test-report-skill-clarification.md`)，以下开放问题已自动决策。

### 2.1 Q1: 首期目标项目栈

**结论**: ✅ TypeScript/Node 为主（Jest、Vitest），JUnit XML 作为跨语言兜底格式。

**依据**: M1 里程碑 P0 范围明确为 Jest/Vitest JSON + JUnit XML 解析；FR1.2 首期支持框架 JS/TS 排在首位。

### 2.2 Q2: 报告语言

**结论**: ❌ 首期仅中文模板，英文模板列为 P2 候选。

**依据**: 需求全文中文编写；FR2 章节名称均为中文；用户故事面向中文用户群体。

### 2.3 Q3: 自动推送

**结论**: ❌ 本期不做，仅支持本地文件落盘。

**依据**: 需求文档 2.2 非目标明确列出；FR3.3 输出形式为"报告路径 + 结果摘要"。

### 2.4 首期范围确认

| 维度 | 决策 |
|------|------|
| 目标技术栈 | TypeScript/Node 为主（Jest/Vitest），JUnit XML 兜底 |
| 报告语言 | 中文 |
| 输出渠道 | 本地文件落盘，不推送 |
| 输出格式 | Markdown（默认） |
| 执行模式 | 执行模式 + 解析模式双模式 |

---

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                  Skill 入口层 (SKILL.md)              │
│  触发词匹配 → 参数解析 → 模式选择 (execute / parse)    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              框架检测器 (framework-detector)          │
│  用户指定 → package.json scripts → 特征文件 → 依赖    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│               测试执行器 (可选，执行模式)              │
│  npx jest --json / npx vitest run --reporter=json    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                解析器层 (parsers/)                    │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ Jest/Vitest  │  │  JUnit XML   │  (插件式扩展)    │
│  │ JSON Parser  │  │   Parser     │                 │
│  └──────────────┘  └──────────────┘                 │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              报告生成器 (report_writer)               │
│  解析结果 → 统一中间模型 → 模板渲染 → 文件落盘         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              输出产物 (reports/)                      │
│  test-report-<YYYYMMDD-HHmmss>.md                    │
└─────────────────────────────────────────────────────┘
```

### 3.2 核心设计原则

1. **插件式解析器**: 新增框架支持仅需添加解析器文件，不影响既有解析器（NFR5）。
2. **统一中间模型**: 所有解析器输出统一的数据结构，报告生成器不感知框架差异。
3. **降级策略**: 结果文件格式异常、字段缺失时标注"未获取"，不崩溃、不丢数据（NFR2）。
4. **安全过滤**: 错误堆栈过滤敏感路径外的凭据信息（NFR3）。

### 3.3 统一中间模型

```python
@dataclass
class TestReport:
    meta: MetaInfo           # 项目名、生成时间、执行命令、框架/版本、环境
    summary: ResultSummary   # 用例总数、通过/失败/跳过数、通过率、总耗时、结论
    failures: list[Failure]  # 失败用例列表
    suites: list[TestSuite]  # 按文件分组的用例明细
    coverage: CoverageInfo   # 语句/分支/函数/行覆盖率
    appendix: Appendix       # 原始结果文件路径、生成工具版本
```

---

## 4. 实现清单

### 4.1 文件清单

| 文件 | 类型 | 说明 | 状态 |
|------|------|------|------|
| `test-report-generator/SKILL.md` | 技能元数据 | 触发词、配置项、使用示例、验收标准 | ✅ 已完成 |
| `test-report-generator/framework-detector.md` | 设计文档 | 框架检测优先级、伪代码、错误处理 | ✅ 已完成 |
| `test-report-generator/parsers/__init__.py` | Python 模块 | 解析器注册与自动发现 | ✅ 已完成 |
| `test-report-generator/parsers/jest_vitest.py` | 解析器实现 | Jest/Vitest JSON 结果解析 | ✅ 已完成 |
| `test-report-generator/parsers/jest-vitest-json.md` | 解析器文档 | Jest/Vitest JSON 格式说明与解析逻辑 | ✅ 已完成 |
| `test-report-generator/parsers/junit_xml.py` | 解析器实现 | JUnit XML 结果解析 | ✅ 已完成 |
| `test-report-generator/parsers/junit-xml.md` | 解析器文档 | JUnit XML 格式说明与解析逻辑 | ✅ 已完成 |
| `test-report-generator/report_writer.py` | 报告生成器 | 模板渲染、Markdown 输出、文件落盘 | ✅ 已完成 |
| `test-report-generator/generate_report.py` | 主入口 | CLI 参数解析、模式调度、统一入口 | ✅ 已完成 |
| `test-report-generator/templates/markdown-report.md` | 报告模板 | 标准 Markdown 报告模板 | ✅ 已完成 |

### 4.2 支持的功能矩阵

| 功能 | 需求编号 | 实现状态 |
|------|----------|----------|
| 自动识别测试框架 | FR1.1 | ✅ `framework-detector.md` |
| Jest/Vitest JSON 解析 | FR1.2 (P0) | ✅ `parsers/jest_vitest.py` |
| JUnit XML 解析 | FR1.2 (P0) | ✅ `parsers/junit_xml.py` |
| 执行模式 | FR1.3 | ✅ `generate_report.py --mode execute` |
| 解析模式 | FR1.3 | ✅ `generate_report.py --mode parse` |
| 执行失败诊断 | FR1.4 | ✅ 异常处理 + 明确错误信息 |
| 报告头 | FR2-1 | ✅ 模板中实现 |
| 结果摘要 | FR2-2 | ✅ 模板中实现 |
| 失败用例分析 | FR2-3 | ✅ 模板中实现 |
| 用例明细 | FR2-4 | ✅ 模板中实现（200条截断） |
| 覆盖率 | FR2-5 | ✅ 模板中实现（不可获取时标注"未获取"） |
| 附录 | FR2-6 | ✅ 模板中实现 |
| Markdown 输出 | FR3.1 | ✅ 默认格式 |
| 自定义输出路径 | FR3.2 | ✅ `--output-path` 参数 |
| 结果摘要回调 | FR3.3 | ✅ 终端输出摘要 + 失败用例 |
| 配置项默认值 | FR4.2 | ✅ SKILL.md config 段 |

---

## 5. 验收标准对照

| 验收标准 | 需求 | 验证方式 | 实现状态 |
|----------|------|----------|----------|
| **AC1**: Jest/Vitest 项目产出符合结构的 Markdown 报告 | FR2 | 在含 Jest/Vitest 的 TS 项目中执行，核对报告结构 | ✅ 解析器 + 模板就绪 |
| **AC2**: 失败用例含用例名、文件路径、错误信息 | FR2-3 | 构造失败用例，检查报告"失败用例分析"章节 | ✅ `Failure` 模型包含所有字段 |
| **AC3**: JUnit XML 解析模式不触发测试执行 | FR1.3 | 提供 XML 文件，验证未执行测试命令 | ✅ `--mode parse` 跳过执行 |
| **AC4**: 结果文件损坏时返回明确错误 | FR1.4 | 提供格式错误的 JSON/XML 文件 | ✅ 解析器异常处理 + 降级 |
| **AC5**: 覆盖率存在时正确呈现，不存在时标注"未获取" | FR2-5 | 分别测试有/无覆盖率数据的场景 | ✅ `CoverageInfo` 默认值处理 |

---

## 6. 风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 各框架 reporter 输出差异大 | 中 | NFR5 插件式解析器设计，统一中间模型隔离差异 |
| 测试执行耗时不可控 | 中 | 依赖 Agent 运行时后台任务能力；解析模式绕过执行 |
| 结果文件格式异常 | 低 | NFR2 降级策略：字段缺失标注"未获取"，不崩溃 |
| 敏感信息泄露 | 低 | NFR3 安全过滤：堆栈信息过滤凭据类内容 |

---

## 7. 后续迭代

| 阶段 | 范围 | 优先级 |
|------|------|--------|
| M2 | pytest 支持、覆盖率章节增强、fail_threshold | P1 |
| M3 | HTML 输出、JSON 伴随产物 | P1 |
| M4 | 历史趋势对比、Go test / cargo test 支持 | P2 |

---

## 8. PR 提交检查清单

- [x] 需求澄清完成（T2: `docs/test-report-skill-clarification.md`）
- [x] Skill 元数据定义（`test-report-generator/SKILL.md`）
- [x] 框架检测逻辑（`test-report-generator/framework-detector.md`）
- [x] Jest/Vitest JSON 解析器（`test-report-generator/parsers/jest_vitest.py`）
- [x] JUnit XML 解析器（`test-report-generator/parsers/junit_xml.py`）
- [x] 报告生成器（`test-report-generator/report_writer.py`）
- [x] 主入口脚本（`test-report-generator/generate_report.py`）
- [x] Markdown 报告模板（`test-report-generator/templates/markdown-report.md`）
- [x] 设计文档（本文档）
- [ ] PR 链接提交验证 ← **当前步骤**

---

> **生成工具**: OpenSpec Proposal v1.0 | **生成时间**: 2026-07-15T13:24:11Z