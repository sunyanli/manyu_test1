# T2 测试报告生成 (Test Report Generator) Implementation Plan

## Overview

**Goal**: 构建一个 Skill，Agent 在执行测试后能够自动解析测试结果并生成结构化、可读性强的标准测试报告（Markdown），支持执行模式与解析模式双模式，覆盖 Jest/Vitest/JUnit XML/pytest 框架。

**Current State**: 项目骨架已存在 (`test-report-generator/`)，包含：
- 类型定义 (`types.ts`, `src/types/index.ts`)
- 三个解析器：Jest JSON (`parsers/jest.ts`), Vitest JSON (`parsers/vitest.ts`), JUnit XML (`parsers/junit.ts`)
- Markdown 报告生成器 (`generators/markdown.ts`, `src/report/markdown.ts`)
- 测试执行器 (`executor.ts`) 含框架自动检测
- 主入口 (`index.ts`, `src/index.ts`)
- 测试固件 (`fixtures/jest-result.json`, `fixtures/junit-result.xml`)
- 验证脚本 (`test-verify.js`)

**Success Criteria**:
- AC1：Jest/Vitest 项目执行模式产出符合 4.2 结构的 Markdown 报告
- AC2：失败用例报告含用例名、文件路径、错误信息
- AC3：JUnit XML 解析模式不触发测试执行
- AC4：结果文件损坏时返回明确错误
- AC5：覆盖率数据正确呈现或标注"未获取"

**Constraints**:
- 首期 P0 以 TypeScript/Node 为主
- 报告默认中文，Markdown 格式
- 不执行 git commit/push
- 不做在线托管/Web 服务化

## File Structure

```
test-report-generator/
├── SKILL.md                          # Skill 定义与使用说明
├── package.json                      # 项目元数据与依赖
├── tsconfig.json                     # TypeScript 配置
├── types.ts                          # 根级类型导出（兼容层）
├── index.ts                          # 根级入口（主 API）
├── executor.ts                       # 测试执行器（框架检测 + 命令执行）
├── test-verify.js                    # 完整性验证脚本
│
├── src/
│   ├── index.ts                      # 模块入口（重导出）
│   ├── types/
│   │   └── index.ts                  # 核心类型定义
│   ├── parsers/
│   │   ├── jest.ts                   # Jest JSON 解析器
│   │   ├── vitest.ts                 # Vitest JSON 解析器
│   │   ├── junit.ts                  # JUnit XML 解析器
│   │   └── pytest.ts                 # [NEW] pytest 解析器 (M2)
│   └── report/
│       ├── markdown.ts               # Markdown 报告生成器
│       ├── html.ts                   # [NEW] HTML 报告生成器 (M3)
│       └── json.ts                   # [NEW] JSON 伴随产物生成器 (M3)
│
├── parsers/                          # [DEPRECATED] 根级解析器兼容层
│   ├── jest.ts
│   ├── vitest.ts
│   └── junit.ts
├── generators/                       # [DEPRECATED] 根级生成器兼容层
│   └── markdown.ts
│
├── fixtures/
│   ├── jest-result.json              # Jest 正常结果固件
│   ├── jest-result-failure.json      # [NEW] Jest 失败用例固件
│   ├── junit-result.xml              # JUnit 正常结果固件
│   ├── junit-result-corrupt.xml      # [NEW] JUnit 损坏文件固件
│   ├── vitest-result.json            # [NEW] Vitest 正常结果固件
│   └── pytest-result.xml             # [NEW] pytest JUnit XML 固件 (M2)
│
└── reports/                          # 报告输出目录
    └── test-report-*.md
```

## Tasks

### Task 1: 修复代码评审发现的问题 (P0)

**Files:**
- Modify: `test-report-generator/src/parsers/jest.ts`
- Modify: `test-report-generator/src/parsers/vitest.ts`
- Modify: `test-report-generator/src/parsers/junit.ts`
- Modify: `test-report-generator/src/report/markdown.ts`
- Modify: `test-report-generator/src/types/index.ts`
- Modify: `test-report-generator/executor.ts`

**Interfaces:**
- `TestResult` 类型统一：`error` → `failureMessages: string[]`
- 解析器统一返回 `TestSuite` 接口，`TestCase` 的 `status` 支持 `'passed' | 'failed' | 'skipped' | 'pending'`
- `executor.ts` 的 CWD 路径处理：使用 `process.cwd()` 的项目根目录作为基准

**Steps:**
1. 修复 `TestResult` 类型定义：将 `error` 字段重命名为 `failureMessages: string[]`，同步更新 `TestSuite` 接口
2. 修复 Jest 解析器：增加 `pending`/`skipped` 状态映射，`failureMessages` 字段适配
3. 修复 Vitest 解析器：增加 `pending`/`skipped` 状态映射，`failureMessages` 字段适配
4. 修复 JUnit 解析器：`skipped` 状态正确映射，`failureMessages` 字段适配
5. 修复 Markdown 生成器：`TestResult` 类型引用更新，`failureMessages` 渲染
6. 修复 `executor.ts`：CWD 路径处理修正，确保相对路径解析正确
7. TDD 验证：运行 `test-verify.js` 确认所有解析器正常工作

### Task 2: 补充测试固件与边界用例 (P0)

**Files:**
- Create: `test-report-generator/fixtures/jest-result-failure.json`
- Create: `test-report-generator/fixtures/junit-result-corrupt.xml`
- Create: `test-report-generator/fixtures/vitest-result.json`
- Modify: `test-report-generator/test-verify.js`

**Interfaces:**
- 固件遵循各框架原始 reporter 输出格式
- `test-verify.js` 覆盖所有框架 + 异常路径

**Steps:**
1. 创建 `jest-result-failure.json`：包含 `numFailedTests > 0` 的 Jest JSON 输出
2. 创建 `junit-result-corrupt.xml`：格式损坏的 XML（如缺少闭合标签）
3. 创建 `vitest-result.json`：Vitest JSON reporter 正常输出
4. 更新 `test-verify.js`：增加失败用例、损坏文件、Vitest 解析的验证逻辑
5. TDD 验证：运行 `test-verify.js` 确认所有路径通过

### Task 3: 清理双层目录结构 (P0)

**Files:**
- Modify: `test-report-generator/index.ts` — 统一从 `src/` 导入
- Modify: `test-report-generator/types.ts` — 重导出 `src/types/index.ts`
- Delete: `test-report-generator/parsers/jest.ts` (迁移至 src/parsers/)
- Delete: `test-report-generator/parsers/vitest.ts`
- Delete: `test-report-generator/parsers/junit.ts`
- Delete: `test-report-generator/generators/markdown.ts` (迁移至 src/report/)

**Interfaces:**
- 根级 `index.ts` 保持原有导出 API 不变：`runTestsAndGenerateReport`, `parseResultFile`, `generateMarkdownReport`
- 根级 `types.ts` 重导出 `src/types/index.ts` 所有类型

**Steps:**
1. 更新 `index.ts`：将所有导入改为从 `src/` 路径导入
2. 更新 `types.ts`：改为 `export * from './src/types'`
3. 删除根级 `parsers/` 目录下的三个文件
4. 删除根级 `generators/` 目录下的 `markdown.ts`
5. 验证编译：`npx tsc --noEmit` 确认无类型错误
6. TDD 验证：运行 `test-verify.js` 确认所有功能正常

### Task 4: 覆盖率章节实现 (P1)

**Files:**
- Create: `test-report-generator/src/report/coverage.ts`
- Modify: `test-report-generator/src/report/markdown.ts`
- Modify: `test-report-generator/src/types/index.ts`
- Modify: `test-report-generator/index.ts`

**Interfaces:**
- `CoverageSummary { statements: number; branches: number; functions: number; lines: number; }`
- `CoverageReport { summary: CoverageSummary; files: CoverageFile[]; }`
- `CoverageFile { path: string; summary: CoverageSummary; }`
- 覆盖率来源：`coverage/coverage-summary.json` (Istanbul/Jest) 或 `coverage/coverage.json` (Vitest)

**Steps:**
1. 在 `src/types/index.ts` 中定义 `CoverageSummary`、`CoverageFile`、`CoverageReport` 类型
2. 创建 `src/report/coverage.ts`：实现覆盖率数据解析（Istanbul JSON 格式），支持 `auto` 模式下自动检测
3. 若覆盖率数据不可获取，返回 `null` 并标注"未获取"
4. 修改 `src/report/markdown.ts`：在报告末尾追加覆盖率章节（语句/分支/函数/行覆盖率总表 + 低于阈值文件清单）
5. 修改 `index.ts`：在 `runTestsAndGenerateReport` 流程中集成覆盖率收集
6. TDD 验证：用含覆盖率数据的测试项目验证报告完整性

### Task 5: pytest 支持 (P1)

**Files:**
- Create: `test-report-generator/src/parsers/pytest.ts`
- Create: `test-report-generator/fixtures/pytest-result.xml`
- Modify: `test-report-generator/src/index.ts`
- Modify: `test-report-generator/index.ts`
- Modify: `test-report-generator/executor.ts`

**Interfaces:**
- 输入：pytest 生成的 JUnit XML（`--junitxml=` 输出）
- 输出：统一 `TestSuite` 接口
- pytest 特有字段映射：`classname` → `suiteName`，`name` → `caseName`

**Steps:**
1. 创建 `src/parsers/pytest.ts`：复用 JUnit XML 解析基础设施，处理 pytest 特有字段（如 `classname` 中的模块路径）
2. 创建 `fixtures/pytest-result.xml`：pytest 典型输出固件
3. 修改 `src/index.ts`：注册 `pytestParser`
4. 修改 `index.ts`：导出 `pytestParser`
5. 修改 `executor.ts`：在框架检测中增加 pytest 识别（`pyproject.toml` 含 `[tool.pytest]`、`pytest.ini` 存在）
6. TDD 验证：用 `pytest-result.xml` 固件验证解析正确性

### Task 6: fail_threshold 功能 (P1)

**Files:**
- Modify: `test-report-generator/src/types/index.ts`
- Modify: `test-report-generator/src/report/markdown.ts`
- Modify: `test-report-generator/index.ts`

**Interfaces:**
- `ReportOptions.failThreshold?: number` — 通过率阈值（0-100），低于此值时报告结论标记为 ❌ 不达标
- 报告摘要结论：通过率 ≥ failThreshold → ✅，否则 → ❌

**Steps:**
1. 在 `src/types/index.ts` 的 `ReportOptions` 中增加 `failThreshold?: number` 字段
2. 修改 `src/report/markdown.ts`：在摘要章节根据 `failThreshold` 计算结论标记
3. 修改 `index.ts`：`runTestsAndGenerateReport` 中接收并传递 `failThreshold` 参数
4. TDD 验证：设置 `failThreshold=80`，构造通过率 75% 的测试结果，确认报告标记 ❌

### Task 7: HTML 输出格式 (P1)

**Files:**
- Create: `test-report-generator/src/report/html.ts`
- Modify: `test-report-generator/src/types/index.ts`
- Modify: `test-report-generator/index.ts`

**Interfaces:**
- `generateHtmlReport(report: TestReport): string` — 返回完整 HTML 文档字符串
- HTML 报告包含与 Markdown 相同的六个章节，使用内联 CSS 样式
- 输出文件扩展名 `.html`

**Steps:**
1. 创建 `src/report/html.ts`：将 `TestReport` 渲染为自包含 HTML 文档（内联 CSS，无外部依赖）
2. HTML 结构：报告头 → 摘要表 → 失败用例折叠面板 → 用例明细表格 → 覆盖率表 → 附录
3. 修改 `src/types/index.ts`：`outputFormat` 增加 `'html'` 枚举值
4. 修改 `index.ts`：`runTestsAndGenerateReport` 中根据 `outputFormat` 选择生成器
5. TDD 验证：用固件数据生成 HTML 报告，浏览器直接打开验证可读性

### Task 8: JSON 伴随产物 (P1)

**Files:**
- Create: `test-report-generator/src/report/json.ts`
- Modify: `test-report-generator/index.ts`

**Interfaces:**
- `generateJsonReport(report: TestReport): string` — 返回 `TestReport` 的 JSON 序列化
- JSON 产物与 Markdown/HTML 报告同时输出，文件名 `<basename>.json`

**Steps:**
1. 创建 `src/report/json.ts`：将 `TestReport` 序列化为格式化 JSON（`JSON.stringify(report, null, 2)`）
2. 修改 `index.ts`：在报告生成流程中，始终输出 JSON 伴随产物（与 Markdown/HTML 同级目录）
3. TDD 验证：确认 JSON 输出结构完整，可被 `JSON.parse` 反序列化

### Task 9: 端到端集成验证 (P0)

**Files:**
- Modify: `test-report-generator/test-verify.js`
- Create: `test-report-generator/fixtures/jest-result-failure.json`

**Steps:**
1. 运行完整 `test-verify.js` 验证所有解析器（Jest、Vitest、JUnit XML、pytest）
2. 验证 Markdown 报告生成完整性（六个章节全部存在）
3. 验证执行模式：在含 Jest 的测试项目中执行 `runTestsAndGenerateReport`
4. 验证解析模式：用 `parseResultFile` 解析已有 JUnit XML
5. 验证错误处理：损坏文件返回明确错误信息
6. 验证覆盖率：覆盖率数据正确呈现或标注"未获取"
7. 验证 `failThreshold`：阈值判定正确
8. 验证 HTML 输出：HTML 文件内容完整
9. 验证 JSON 伴随产物：JSON 文件与主报告同时输出

## Risks

- **R1：框架 reporter 输出差异**：各框架 JSON/XML 格式细节不同，解析层需做好兼容——已通过 NFR5 插件式解析器设计缓解，每个解析器独立实现
- **R2：测试执行耗时不可控**：executor.ts 依赖 `execSync`，长时间测试会阻塞——当前实现为同步执行，后续可升级为后台任务
- **R3：双层目录结构遗留**：根级 `parsers/` 和 `generators/` 与 `src/` 下重复——Task 3 专门清理此问题

## Rollback

- 每个 Task 独立可回滚：修改仅影响对应文件，不涉及共享状态
- 解析器为纯函数，无副作用，回滚即替换文件
- 生成器为纯函数，回滚即替换文件

## Verification

```bash
# 编译验证
cd test-report-generator && npx tsc --noEmit

# 完整性验证
cd test-report-generator && node test-verify.js

# 端到端验证（需在含 Jest 的测试项目中）
# 执行模式
node -e "require('./index').runTestsAndGenerateReport({})" 
# 解析模式
node -e "require('./index').parseResultFile('fixtures/junit-result.xml')"
```