# 测试报告生成 Skill 实施计划

## 1. 概述

### 1.1 目标
构建一个自动化测试报告生成 Skill，支持：
- 自动识别并执行测试（Jest/Vitest/pytest）
- 解析测试结果（JSON/JUnit XML）
- 生成结构化 Markdown 报告
- 支持执行模式和解析模式

### 1.2 范围边界
| 类别 | 包含 | 不包含 |
|------|------|--------|
| 框架支持 | Jest JSON、Vitest JSON、pytest JUnit XML、通用 JUnit XML | Go test、cargo test（后续迭代） |
| 输出格式 | Markdown（P0）、HTML（P1）、JSON（可选） | PDF、Word |
| 功能 | 报告生成、失败分析、覆盖率展示 | 测试用例自动生成/修复、趋势对比 |

---

## 2. 技术架构

### 2.1 目录结构
```
skills/test-report-generator/
├── SKILL.md                    # Skill 定义文件
├── src/
│   ├── index.ts               # 入口模块
│   ├── types.ts               # 类型定义
│   ├── config/
│   │   └── default-config.ts  # 默认配置
│   ├── detectors/
│   │   └── framework-detector.ts  # 框架检测（FR1.1）
│   ├── parsers/
│   │   ├── base-parser.ts     # 解析器基类
│   │   ├── jest-parser.ts     # Jest JSON 解析器
│   │   ├── vitest-parser.ts   # Vitest JSON 解析器
│   │   └── junit-parser.ts    # JUnit XML 解析器
│   ├── generators/
│   │   ├── base-generator.ts  # 生成器基类
│   │   └── markdown-generator.ts  # Markdown 报告生成器
│   ├── runners/
│   │   └── test-runner.ts     # 测试执行器
│   └── utils/
│       ├── file-utils.ts      # 文件工具
│       └── format-utils.ts    # 格式化工具
└── templates/
    └── markdown-template.md    # Markdown 模板
```

### 2.2 核心类型定义
```typescript
// types.ts
interface TestResult {
  framework: 'jest' | 'vitest' | 'pytest' | 'junit';
  summary: TestSummary;
  testCases: TestCase[];
  coverage?: CoverageData;
  duration: number;
  timestamp: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
}

interface TestCase {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

interface CoverageData {
  lines: number;
  statements: number;
  branches: number;
  functions: number;
  files?: CoverageFile[];
}

interface ReportConfig {
  testCommand?: string;
  resultFile?: string;
  outputFormat: 'markdown' | 'html' | 'json';
  outputPath: string;
  coverage: 'auto' | 'on' | 'off';
  failThreshold?: number;
}
```

### 2.3 插件式架构
```
┌─────────────────────────────────────────────────────────┐
│                     Skill Entry (index.ts)               │
│  - 解析用户意图                                           │
│  - 协调执行流程                                           │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼────┐                  ┌─────▼─────┐
   │ 执行模式 │                  │ 解析模式   │
   │ Executor │                 │ Parser Only│
   └────┬────┘                  └─────┬─────┘
        │                             │
   ┌────▼────┐                        │
   │Detector │                        │
   │框架检测  │                        │
   └────┬────┘                        │
        │                             │
   ┌────▼────┐                  ┌─────▼─────┐
   │ Runner  │                  │  Parser   │
   │测试执行  │                 │ 结果解析   │
   └────┬────┘                  └─────┬─────┘
        │                             │
        └──────────┬──────────────────┘
                   │
            ┌──────▼──────┐
            │ TestResult  │
            │  统一结构    │
            └──────┬──────┘
                   │
            ┌──────▼──────┐
            │  Generator  │
            │  报告生成    │
            └─────────────┘
```

---

## 3. 实施步骤

### Step 1: 创建 Skill 基础结构与配置模块

**目标**: 搭建 Skill 骨架，定义核心类型和配置

**产出物**:
- `SKILL.md` - Skill 定义文件
- `src/types.ts` - 类型定义
- `src/config/default-config.ts` - 默认配置
- `src/index.ts` - 入口骨架

**验收要点**:
- 类型定义完整覆盖需求
- 配置项与 FR4.2 对齐

---

### Step 2: 实现测试框架自动检测逻辑

**目标**: 实现 FR1.1 框架自动识别

**检测优先级**:
1. 用户显式指定的命令
2. `package.json` scripts.test
3. 项目配置文件（jest.config.*, vitest.config.*, pytest.ini）
4. 框架特征文件推断

**产出物**:
- `src/detectors/framework-detector.ts`

**关键逻辑**:
```typescript
async function detectFramework(projectRoot: string): Promise<FrameworkInfo> {
  // 1. 检查 package.json scripts.test
  // 2. 检查配置文件存在性
  // 3. 返回 { framework, testCommand, configFile }
}
```

---

### Step 3: 实现测试结果解析器

**目标**: 实现 FR1.2 三种解析器

#### 3.1 Jest JSON 解析器
- 触发命令: `jest --json --outputFile=result.json`
- 解析字段: numPassedTests, numFailedTests, testResults[].assertionResults

#### 3.2 Vitest JSON 解析器
- 触发命令: `vitest run --reporter=json --outputFile=result.json`
- 解析字段: 与 Jest 类似的 JSON 结构

#### 3.3 JUnit XML 解析器
- 解析 XML 结构: `<testsuites>` -> `<testsuite>` -> `<testcase>`
- 提取: failures, errors, skipped, testcase/@name, failure/@message

**产出物**:
- `src/parsers/base-parser.ts`
- `src/parsers/jest-parser.ts`
- `src/parsers/vitest-parser.ts`
- `src/parsers/junit-parser.ts`

**错误处理**:
- 文件不存在: 明确错误信息
- 格式异常: 降级输出，标注"未获取"

---

### Step 4: 实现 Markdown 报告生成器

**目标**: 实现 FR2 标准报告结构

**报告结构** (按 FR2):
1. **报告头**: 项目名、生成时间、执行命令、框架/版本、执行环境
2. **结果摘要**: 用例总数、通过/失败/跳过数、通过率、总耗时、整体结论（✅/❌）
3. **失败用例分析**: 用例名、所属文件、错误信息、堆栈关键行（截断至可读长度）
4. **用例明细**: 按测试文件分组，支持超过 200 条截断
5. **覆盖率**: 语句/分支/函数/行覆盖率总表，低于阈值的文件清单
6. **附录**: 原始结果文件路径、生成工具版本

**产出物**:
- `src/generators/base-generator.ts`
- `src/generators/markdown-generator.ts`
- `templates/markdown-template.md`

**关键实现**:
```typescript
class MarkdownGenerator extends BaseGenerator {
  generate(result: TestResult, config: ReportConfig): string {
    // 1. 报告头
    // 2. 结果摘要
    // 3. 失败用例分析（如有）
    // 4. 用例明细（支持截断）
    // 5. 覆盖率（如有）
    // 6. 附录
  }
}
```

---

### Step 5: 实现执行/解析双模式入口

**目标**: 实现 FR1.3 双模式支持

**执行模式**:
```typescript
async function executeMode(config: ReportConfig): Promise<TestResult> {
  // 1. 检测框架
  // 2. 构建测试命令（带 JSON 输出）
  // 3. 执行测试
  // 4. 解析结果文件
  // 5. 返回 TestResult
}
```

**解析模式**:
```typescript
async function parseMode(resultFile: string): Promise<TestResult> {
  // 1. 读取结果文件
  // 2. 自动识别格式（JSON/XML）
  // 3. 选择对应解析器
  // 4. 返回 TestResult
}
```

**产出物**:
- `src/runners/test-runner.ts`
- `src/index.ts` 完整实现

**错误处理**:
- 测试命令无法运行: 返回诊断信息，不生成空报告
- 结果文件损坏: 明确错误说明

---

### Step 6: 编写 Skill 文档与验收测试

**目标**: 完成 Skill 文档和验收测试

**产出物**:
- `SKILL.md` 完整文档（触发意图、配置项、使用示例）
- 验收测试脚本/用例

**验收测试清单**:
| 编号 | 测试场景 | 预期结果 |
|------|----------|----------|
| AC1 | Jest 项目执行"生成测试报告" | 产出符合 FR2 结构的 Markdown 报告 |
| AC2 | 测试有失败用例 | 报告包含用例名、文件路径、错误信息 |
| AC3 | 提供 JUnit XML 文件走解析模式 | 不触发测试执行即可产出报告 |
| AC4 | 结果文件损坏 | 返回明确错误说明而非空报告 |
| AC5 | 无覆盖率数据 | 标注"未获取"且其余章节正常 |

---

## 4. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 各框架 reporter 输出差异大 | 插件式解析器架构，新增框架不影响既有代码 |
| 测试执行耗时不可控 | 支持解析模式，复用已有结果；长任务交由后台执行 |
| 敏感信息泄露 | 错误堆栈过滤环境变量、密钥类内容 |

---

## 5. 里程碑

| 阶段 | 内容 | 优先级 | 预计工作量 |
|------|------|--------|-----------|
| M1 | Jest/Vitest JSON + JUnit XML 解析、Markdown 报告、执行/解析双模式 | P0 | 2-3 天 |
| M2 | pytest 支持、覆盖率章节、fail_threshold | P1 | 1-2 天 |
| M3 | HTML 输出、JSON 伴随产物 | P1 | 1 天 |
| M4 | 历史趋势对比、更多框架 | P2 | 后续迭代 |

---

## 6. 附录

### 6.1 触发意图示例
- "生成测试报告"
- "跑一下测试并出报告"
- "把这个 junit.xml 转成测试报告"

### 6.2 配置项一览
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式下的结果文件路径 |
| output_format | markdown | 输出格式（markdown/html/json） |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | 覆盖率收集（auto/on/off） |
| fail_threshold | 无 | 通过率低于该值时标记为不达标 |

### 6.3 输出路径规则
- 默认: `reports/test-report-<YYYYMMDD-HHmmss>.md`
- 用户指定: 按 `output_path` 参数