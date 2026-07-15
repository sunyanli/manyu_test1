# 测试报告生成 Skill 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个 Skill，使 Agent 能够在测试执行后自动解析测试结果并生成结构化、可读性强的标准测试报告（Markdown 格式）。

**Architecture:** 采用插件式解析器架构，核心模块包括：框架检测器（识别项目测试框架）、解析器插件（Jest/Vitest JSON、JUnit XML）、报告生成器（Markdown 模板）、Skill 主入口（协调执行/解析双模式）。解析器可独立扩展，新增框架不影响既有代码。

**Tech Stack:** TypeScript/Node.js，无外部运行时依赖，使用 Node.js 原生模块进行文件 I/O 和 JSON/XML 解析。

## Global Constraints

- **输出格式:** 默认 Markdown (.md)，P1 支持 HTML，JSON 作为可选伴随产物
- **输出路径:** 默认 `reports/test-report-<YYYYMMDD-HHmmss>.md`，用户可指定
- **解析性能:** 结果解析与报告生成（不含测试执行）应在 5 秒内完成（1000 用例规模）
- **报告结构:** 固定包含报告头、结果摘要、失败分析、用例明细、覆盖率、附录六大板块
- **安全要求:** 报告中不得泄露环境变量、密钥；错误堆栈过滤敏感路径
- **幂等性:** 同一结果文件多次生成报告，内容一致（时间戳除外）
- **TDD 原则:** 每个任务先写测试，再实现功能
- **Milestone M1 范围:** Jest/Vitest JSON + JUnit XML 解析、Markdown 报告、执行/解析双模式

---

## File Structure

```
skills/test-report-generation/
├── SKILL.md                    # Skill 元数据和主入口文档
├── src/
│   ├── index.ts               # Skill 主入口，协调检测/执行/解析/生成
│   ├── detector.ts            # 测试框架检测器
│   ├── parsers/
│   │   ├── base.ts            # 解析器基类接口
│   │   ├── jest-vitest.ts     # Jest/Vitest JSON 解析器
│   │   └── junit-xml.ts       # JUnit XML 解析器
│   ├── generator/
│   │   ├── markdown.ts        # Markdown 报告生成器
│   │   └── templates.ts       # 报告模板片段
│   └── types.ts               # 共享类型定义
└── tests/
    ├── detector.test.ts       # 框架检测器测试
    ├── parsers/
    │   ├── jest-vitest.test.ts
    │   └── junit-xml.test.ts
    └── generator/
        └── markdown.test.ts
```

---

### Task 1: 技能基础结构和类型定义

**Files:**
- Create: `skills/test-report-generation/SKILL.md`
- Create: `skills/test-report-generation/src/types.ts`
- Create: `skills/test-report-generation/tests/types.test.ts`

**Interfaces:**
- Produces:
  - `TestResult` interface: `{summary: TestSummary, testCases: TestCase[], coverage?: CoverageData}`
  - `TestSummary` interface: `{total: number, passed: number, failed: number, skipped: number, duration: number, passRate: number}`
  - `TestCase` interface: `{name: string, file: string, status: 'passed'|'failed'|'skipped', duration: number, error?: TestError}`
  - `TestError` interface: `{message: string, stack?: string}`
  - `CoverageData` interface: `{lines: number, statements: number, branches: number, functions: number}`
  - `ReportOptions` interface: `{outputPath?: string, format?: 'markdown'|'html'|'json', failThreshold?: number}`

- [ ] **Step 1: 创建 SKILL.md 元数据文件**

```yaml
---
name: test-report-generation
description: Execute tests and generate structured test reports with summary, failure analysis, and coverage
triggers:
  - "生成测试报告"
  - "跑测试并出报告"
  - "把 junit.xml 转成测试报告"
---

# Test Report Generation Skill

## Overview
Automatically execute tests or parse existing test results, then generate structured test reports in Markdown format.

## Usage
...
```

- [ ] **Step 2: 定义核心类型接口**

```typescript
// src/types.ts
export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  passRate: number;
}

export interface TestCase {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: TestError;
}

export interface TestError {
  message: string;
  stack?: string;
}

export interface CoverageData {
  lines: number;
  statements: number;
  branches: number;
  functions: number;
  uncoveredFiles?: string[];
}

export interface TestResult {
  summary: TestSummary;
  testCases: TestCase[];
  coverage?: CoverageData;
  metadata: {
    framework: string;
    command: string;
    timestamp: string;
    resultFile?: string;
  };
}

export interface ReportOptions {
  outputPath?: string;
  format?: 'markdown' | 'html' | 'json';
  failThreshold?: number;
  testCommand?: string;
  resultFile?: string;
  coverage?: 'auto' | 'on' | 'off';
}
```

- [ ] **Step 3: 编写类型验证测试**
- [ ] **Step 4: 运行测试确保类型定义正确**
- [ ] **Step 5: 提交类型定义和 Skill 元数据**

---

### Task 2: 测试框架检测器

**Files:**
- Create: `skills/test-report-generation/src/detector.ts`
- Create: `skills/test-report-generation/tests/detector.test.ts`

**Interfaces:**
- Produces: `detectTestFramework(projectRoot: string): Promise<DetectedFramework>`
- `DetectedFramework`: `{name: string, command: string, configPath?: string, resultFormat: 'jest-json' | 'junit-xml'}`

- [ ] **Step 1: 编写框架检测失败场景测试**
- [ ] **Step 2: 编写 Jest 检测测试（package.json scripts + jest.config.*）**
- [ ] **Step 3: 编写 Vitest 检测测试**
- [ ] **Step 4: 编写 pytest 检测测试（pyproject.toml / pytest.ini）**
- [ ] **Step 5: 实现检测器核心逻辑**
- [ ] **Step 6: 运行测试确保检测逻辑正确**
- [ ] **Step 7: 提交检测器模块**

---

### Task 3: Jest/Vitest JSON 解析器

**Files:**
- Create: `skills/test-report-generation/src/parsers/base.ts`
- Create: `skills/test-report-generation/src/parsers/jest-vitest.ts`
- Create: `skills/test-report-generation/tests/parsers/jest-vitest.test.ts`
- Create: `skills/test-report-generation/tests/fixtures/jest-result.json`

**Interfaces:**
- Consumes: `TestResult`, `TestCase` from Task 1
- Produces: `JestVitestParser.parse(jsonContent: string): TestResult`

- [ ] **Step 1: 创建 Jest JSON 测试数据 fixture**
- [ ] **Step 2: 编写成功用例解析测试**
- [ ] **Step 3: 编写失败用例解析测试（含错误信息和堆栈）**
- [ ] **Step 4: 编写覆盖率数据解析测试**
- [ ] **Step 5: 编写异常格式降级测试**
- [ ] **Step 6: 实现解析器基类接口**
- [ ] **Step 7: 实现 Jest/Vitest JSON 解析器**
- [ ] **Step 8: 运行测试确保解析正确**
- [ ] **Step 9: 提交 Jest/Vitest 解析器**

---

### Task 4: JUnit XML 解析器

**Files:**
- Create: `skills/test-report-generation/src/parsers/junit-xml.ts`
- Create: `skills/test-report-generation/tests/parsers/junit-xml.test.ts`
- Create: `skills/test-report-generation/tests/fixtures/junit-result.xml`

**Interfaces:**
- Consumes: `TestResult` from Task 1, `BaseParser` from Task 3
- Produces: `JUnitXmlParser.parse(xmlContent: string): TestResult`

- [ ] **Step 1: 创建 JUnit XML 测试数据 fixture**
- [ ] **Step 2: 编写标准 JUnit 格式解析测试**
- [ ] **Step 3: 编写失败用例解析测试（含 system-err/system-out）**
- [ ] **Step 4: 编写属性提取测试（classname, time）**
- [ ] **Step 5: 编写异常 XML 降级测试**
- [ ] **Step 6: 实现 JUnit XML 解析器（使用 Node 原生 XML 解析）**
- [ ] **Step 7: 运行测试确保解析正确**
- [ ] **Step 8: 提交 JUnit XML 解析器**

---

### Task 5: Markdown 报告生成器

**Files:**
- Create: `skills/test-report-generation/src/generator/templates.ts`
- Create: `skills/test-report-generation/src/generator/markdown.ts`
- Create: `skills/test-report-generation/tests/generator/markdown.test.ts`

**Interfaces:**
- Consumes: `TestResult` from Task 1, `ReportOptions` from Task 1
- Produces: `MarkdownGenerator.generate(result: TestResult, options: ReportOptions): string`

- [ ] **Step 1: 编写报告头模板测试（项目名、时间、命令）**
- [ ] **Step 2: 编写结果摘要模板测试（通过率、总耗时、整体结论标识）**
- [ ] **Step 3: 编写失败分析模板测试（用例名、文件、错误、堆栈截断）**
- [ ] **Step 4: 编写用例明细模板测试（按文件分组，超过 200 条截断）**
- [ ] **Step 5: 编写覆盖率模板测试（百分比表格、低阈值文件清单）**
- [ ] **Step 6: 编写附录模板测试（原始文件路径、工具版本）**
- [ ] **Step 7: 编写完整报告生成集成测试**
- [ ] **Step 8: 实现报告模板片段**
- [ ] **Step 9: 实现 Markdown 生成器**
- [ ] **Step 10: 运行测试确保生成正确**
- [ ] **Step 11: 提交报告生成器**

---

### Task 6: Skill 主入口集成

**Files:**
- Create: `skills/test-report-generation/src/index.ts`
- Create: `skills/test-report-generation/tests/index.test.ts`

**Interfaces:**
- Consumes: All modules from Tasks 1-5
- Produces: `generateTestReport(options: ReportOptions): Promise<string>` (返回报告路径)

- [ ] **Step 1: 编写执行模式测试（检测框架 -> 运行测试 -> 解析结果 -> 生成报告）**
- [ ] **Step 2: 编写解析模式测试（指定结果文件 -> 解析 -> 生成报告）**
- [ ] **Step 3: 编写测试执行失败诊断测试（非用例失败，命令无法运行）**
- [ ] **Step 4: 编写格式异常降级测试**
- [ ] **Step 5: 编写输出路径配置测试**
- [ ] **Step 6: 编写 fail_threshold 标记测试**
- [ ] **Step 7: 实现主入口协调逻辑**
- [ ] **Step 8: 实现"仅解析已有结果"模式**
- [ ] **Step 9: 实现错误处理和诊断输出**
- [ ] **Step 10: 运行全链路测试**
- [ ] **Step 11: 提交主入口模块**

---

### Task 7: 验收测试与文档

**Files:**
- Modify: `skills/test-report-generation/SKILL.md` (补充使用示例和配置说明)
- Create: `skills/test-report-generation/README.md`
- Create: `skills/test-report-generation/tests/fixtures/sample-ts-project/` (模拟 TS 项目)

**Interfaces:**
- N/A（验收级测试，不对外暴露接口）

- [ ] **Step 1: 创建模拟 TS 项目（含 Jest 配置和示例测试）**
- [ ] **Step 2: 编写 AC1 验收测试（Jest 项目生成符合结构的 Markdown 报告）**
- [ ] **Step 3: 编写 AC2 验收测试（失败用例包含用例名、文件路径、错误信息）**
- [ ] **Step 4: 编写 AC3 验收测试（JUnit XML 解析模式不触发测试执行）**
- [ ] **Step 5: 编写 AC4 验收测试（结果文件损坏返回明确错误）**
- [ ] **Step 6: 编写 AC5 验收测试（覆盖率数据存在/不存在场景）**
- [ ] **Step 7: 补充 SKILL.md 使用示例和触发意图**
- [ ] **Step 8: 编写 README.md（功能说明、配置项、输出示例）**
- [ ] **Step 9: 运行全量验收测试**
- [ ] **Step 10: 修复验收测试发现的问题**
- [ ] **Step 11: 提交验收测试和文档**

---

## Verification

验收通过标准：
- AC1: Jest/Vitest 项目执行"生成测试报告"，产出符合结构的 Markdown 报告，摘要数据与原始输出一致
- AC2: 失败用例报告包含用例名、文件路径、错误信息
- AC3: JUnit XML 解析模式不触发测试执行即可产出报告
- AC4: 结果文件损坏时返回明确错误说明
- AC5: 覆盖率数据存在时正确呈现，不存在时标注"未获取"

验证命令：
```bash
cd skills/test-report-generation
npm test
npm run test:acceptance
```

---

## Risks & Mitigations

- **R1: 框架 Reporter 输出差异大**
  - 缓解：插件式解析器架构（NFR5），每个框架独立解析器
  
- **R2: 测试执行耗时不可控**
  - 缓解：支持解析模式（FR1.3），后台执行依赖 Agent 运行时能力

- **R3: 错误堆栈可能含敏感路径**
  - 缓解：堆栈过滤逻辑在 Task 5 模板中实现

---

## Notes

- 本计划覆盖 Milestone M1（Jest/Vitest JSON + JUnit XML 解析、Markdown 报告、执行/解析双模式）
- M2（pytest 支持、覆盖率章节、fail_threshold）可在 M1 完成后迭代
- 文档使用中文模板（基于需求文档语言），可根据 Q2 回答调整