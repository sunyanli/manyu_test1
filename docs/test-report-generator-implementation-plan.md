# 测试报告生成 Skill 实施计划

## 项目概述

**Feature Name**: Test Report Generator Skill  
**创建日期**: 2026-07-15  
**优先级**: P0  
**目标里程碑**: M1 (Jest/Vitest JSON + JUnit XML 解析、Markdown 报告、执行/解析双模式)

---

## 1. 背景与目标

### 1.1 问题陈述
当前团队测试结果散落在终端输出、CI 日志或框架原生产物中，存在以下痛点：
- 测试结果需人工收集整理，耗时易遗漏
- 缺乏统一格式报告，跨项目沟通成本高
- 失败用例上下文需人工回溯
- 覆盖率等质量指标无法沉淀为历史数据

### 1.2 目标
提供一个 Skill，Agent 在执行测试后能够自动解析测试结果并生成结构化、可读性强的标准测试报告。

### 1.3 成功标准 (Success Criteria)
| 编号 | 验收标准 |
|------|---------|
| AC1 | Jest/Vitest 项目执行生成报告，产出符合 FR2 标准结构的 Markdown 报告 |
| AC2 | 失败用例报告包含用例名、文件路径、错误信息 |
| AC3 | JUnit XML 解析模式不触发测试执行即可产出报告 |
| AC4 | 结果文件损坏时返回明确错误说明而非空报告 |
| AC5 | 覆盖率数据正确呈现或标注"未获取" |

---

## 2. 技术架构设计

### 2.1 插件式解析器架构 (NFR5)

```
test-report-generator/
├── SKILL.md                    # Skill 元数据与触发器定义
├── src/
│   ├── index.ts               # 主入口：工作流编排
│   ├── detector.ts            # 框架检测逻辑 (FR1.1)
│   ├── executor.ts            # 测试执行管理 (FR1.3 执行模式)
│   ├── parser/
│   │   ├── base.ts            # 解析器接口定义
│   │   ├── jest.ts            # Jest JSON 解析器
│   │   ├── vitest.ts          # Vitest JSON 解析器
│   │   ├── junit-xml.ts       # JUnit XML 解析器
│   │   └── pytest.ts          # pytest 解析器 (M2)
│   ├── coverage/
│   │   ├── collector.ts       # 覆盖率数据聚合
│   │   └── parsers/
│   │       ├── clover.ts      # Clover XML 解析
│   │       ├── lcov.ts        # LCOV 解析
│   │       └── coverage-json.ts # Coverage JSON 解析
│   ├── report/
│   │   ├── generator.ts       # 报告生成器
│   │   └── templates/
│   │       ├── markdown.ts    # Markdown 模板
│   │       ├── html.ts        # HTML 模板 (M3)
│   │       └── json.ts        # JSON 结构化输出
│   └── utils/
│       ├── logger.ts          # 日志工具
│       ├── sanitizer.ts       # 敏感信息过滤 (NFR3)
│       └── file.ts            # 文件操作工具
├── examples/                   # 示例测试项目
│   ├── jest-project/
│   ├── vitest-project/
│   └── pytest-project/
└── tests/                      # 验证测试
    ├── parser.test.ts
    ├── generator.test.ts
    └── integration.test.ts
```

### 2.2 核心接口定义

```typescript
// parser/base.ts
interface TestParser {
  name: string;
  supportedFormats: string[];
  parse(result: TestResultFile): Promise<ParsedTestResult>;
  detect(projectRoot: string): Promise<boolean>;
}

interface ParsedTestResult {
  framework: string;
  summary: TestSummary;
  testFiles: TestFile[];
  failures: FailureCase[];
  coverage?: CoverageData;
  duration: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
}

interface FailureCase {
  name: string;
  file: string;
  line?: number;
  error: string;
  stack?: string;
}
```

---

## 3. 实施步骤

### Phase 1: 核心架构 (P0 - M1)

#### Step 1: 创建 Skill 基础结构
**任务**: 创建 SKILL.md frontmatter + 插件式解析器架构  
**产出**: 
- `SKILL.md` 元数据定义
- 基础目录结构
- TypeScript 项目配置 (tsconfig.json, package.json)
- 解析器接口定义 (`parser/base.ts`)

**验证**: 项目可编译，接口类型检查通过

---

#### Step 2: 实现测试框架检测逻辑
**任务**: 实现 FR1.1 自动识别优先级  
**逻辑**:
```
优先级:
a. 用户显式指定的命令 (最高)
b. package.json scripts.test
c. pyproject.toml [tool.pytest]
d. 框架特征文件推断:
   - jest.config.* → Jest
   - vitest.config.* → Vitest
   - pytest.ini → pytest
   - pom.xml → Maven Surefire (JUnit)
```

**产出**: `src/detector.ts`  
**验证**: 在示例项目中正确检测框架类型

---

#### Step 3: 开发 Jest/Vitest JSON 解析器插件
**任务**: 实现 Jest 和 Vitest JSON reporter 输出解析  
**产出**:
- `src/parser/jest.ts`
- `src/parser/vitest.ts`

**关键点**:
- Jest JSON 格式: `testResults[].assertionResults`
- Vitest JSON 格式: 兼容 Jest 格式
- 提取失败用例的错误信息和堆栈
- 计算通过率、耗时等指标

**验证**: 使用真实 Jest/Vitest 测试项目 JSON 结果验证解析正确性

---

#### Step 4: 开发 JUnit XML 解析器插件
**任务**: 实现 JUnit XML 格式解析（跨语言兜底）  
**产出**: `src/parser/junit-xml.ts`

**XML 结构**:
```xml
<testsuites>
  <testsuite name="suite1" tests="10" failures="2" errors="1">
    <testcase name="test1" classname="TestClass" time="0.5">
      <failure message="Error message">Stack trace...</failure>
    </testcase>
  </testsuite>
</testsuites>
```

**验证**: 使用真实 JUnit XML 文件验证解析正确性

---

#### Step 5: 实现报告生成器
**任务**: 实现 Markdown 报告生成，符合 FR2 标准结构  
**产出**: `src/report/generator.ts`, `src/report/templates/markdown.ts`

**报告章节**:
1. 报告头: 项目名、生成时间、执行命令、框架/版本
2. 结果摘要: 用例总数、通过/失败/跳过、通过率、耗时、结论标识 (✅/❌)
3. 失败用例分析: 用例名、文件路径、错误信息、堆栈摘要
4. 用例明细: 按文件分组，超过 200 条截断
5. 覆盖率: 语句/分支/函数/行覆盖率（若可获取）
6. 附录: 原始结果文件路径、生成工具版本

**验证**: 生成的报告符合模板结构，数据准确

---

#### Step 6: 实现执行/解析双模式切换
**任务**: 实现 FR1.3 工作模式切换  
**产出**: `src/executor.ts`, 更新 `src/index.ts`

**逻辑**:
- **执行模式**: 检测框架 → 构建命令 → 执行测试 → 收集结果 → 解析
- **解析模式**: 跳过执行，直接解析用户指定的结果文件

**参数区分**:
```typescript
interface SkillConfig {
  testCommand?: string;      // 显式指定测试命令
  resultFile?: string;       // 解析模式：指定结果文件
  outputFormat: 'markdown' | 'html' | 'json';
  outputPath: string;
  coverage: 'auto' | 'on' | 'off';
  failThreshold?: number;
}
```

**验证**: 两种模式均可正常工作

---

### Phase 2: 覆盖率与健壮性 (P1 - M2)

#### Step 7: 实现覆盖率章节聚合逻辑
**任务**: 聚合覆盖率数据并生成报告章节  
**产出**: `src/coverage/collector.ts` + 覆盖率解析器

**支持格式**:
- Jest/Vitest: `coverage/coverage-final.json`
- pytest-cov: `.coverage` + XML 报告
- LCOV: `coverage/lcov.info`
- Clover: `coverage/clover.xml`

**验证**: 覆盖率数据正确呈现，缺失时标注"未获取"

---

#### Step 8: 开发 pytest 解析器插件
**任务**: 支持 pytest 结果解析（M2 P1）  
**产出**: `src/parser/pytest.ts`

**格式**:
- pytest-json-report 插件输出
- JUnit XML 格式（pytest 内置）

**验证**: 在 pytest 示例项目中验证解析正确性

---

#### Step 9: 添加错误处理与降级逻辑
**任务**: 满足 NFR2 健壮性要求  
**产出**: 错误处理逻辑，降级输出机制

**降级场景**:
- 结果文件格式异常 → 返回明确错误说明
- 字段缺失 → 标注"未获取"，继续生成报告
- 测试命令执行失败 → 返回诊断信息，不生成空报告
- 覆盖率文件缺失 → 跳过覆盖率章节，标注"未获取"

**验证**: 各异常场景均能优雅降级

---

#### Step 10: 编写验证测试
**任务**: 验证 AC1-AC5 全部通过  
**产出**: 
- 单元测试: `tests/parser.test.ts`, `tests/generator.test.ts`
- 集成测试: `tests/integration.test.ts`

**测试场景**:
- Jest 项目执行生成报告 (AC1)
- 失败用例包含完整信息 (AC2)
- JUnit XML 解析模式 (AC3)
- 结果文件损坏处理 (AC4)
- 覆盖率数据呈现 (AC5)

**验证**: 所有验收标准测试通过

---

## 4. 技术约束

### 4.1 非功能需求
| NFR | 要求 |
|-----|------|
| NFR1 性能 | 结果解析与报告生成 <5秒 (1000 用例) |
| NFR2 健壮性 | 格式异常时降级输出，不崩溃 |
| NFR3 安全 | 不泄露环境变量、密钥；堆栈过滤敏感路径 |
| NFR4 幂等性 | 同一结果文件多次生成内容一致 |
| NFR5 可维护性 | 插件式架构，新增框架不影响既有逻辑 |

### 4.2 环境要求
- Node.js >= 16
- TypeScript >= 5.0
- 目标项目需配置测试框架的 JSON/XML reporter

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| R1: 各框架 reporter 输出差异大 | 解析逻辑复杂 | 插件式架构 + 充分的单元测试覆盖 |
| R2: 测试执行耗时不可控 | 长任务超时 | 依赖 Agent 后台任务能力，提供进度反馈 |
| R3: 覆盖率文件路径多样 | 数据收集困难 | 多路径探测 + 用户可配置路径 |
| R4: 结果文件损坏 | 解析失败 | 明确错误诊断 + 不生成空报告 |

---

## 6. 里程碑规划

| 里程碑 | 范围 | 优先级 | 预计工期 |
|--------|------|--------|---------|
| M1 | Jest/Vitest JSON + JUnit XML 解析、Markdown 报告、执行/解析双模式 | P0 | 3-5 天 |
| M2 | pytest 支持、覆盖率章节、fail_threshold | P1 | 2-3 天 |
| M3 | HTML 输出、JSON 伴随产物 | P1 | 1-2 天 |
| M4 | 历史趋势对比、更多框架支持 | P2 | 后续迭代 |

---

## 7. 开放问题

| 问题 | 假设决策 | 待确认 |
|------|---------|--------|
| Q1: 首期目标项目栈 | 以 TypeScript/Node 为主 | ✅ 默认确认 |
| Q2: 报告语言模板 | 中文模板 | ✅ 默认中文 |
| Q3: 自动推送到 IM/邮件 | 非目标，不实现 | ✅ 明确非目标 |

---

## 8. 附录

### 8.1 参考文档
- Jest JSON Reporter: https://jestjs.io/docs/configuration#testresultsprocessor-string
- Vitest JSON Reporter: https://vitest.dev/config/#reporters
- JUnit XML Schema: https://maven.apache.org/surefire/maven-surefire-plugin/
- pytest-json-report: https://pypi.org/project/pytest-json-report/

### 8.2 示例输出

**成功场景**:
```markdown
# 测试报告

**项目**: my-project  
**生成时间**: 2026-07-15 06:32:00  
**执行命令**: npm test  
**框架**: Jest v29.5.0

---

## 结果摘要

✅ **通过**  
- 总用例: 42  
- 通过: 40 ✅  
- 失败: 2 ❌  
- 跳过: 0  
- 通过率: 95.2%  
- 耗时: 3.2s

---

## 失败用例分析

### 1. [UserAuth] login should reject invalid credentials
- **文件**: src/auth/login.test.ts:15
- **错误**: Expected 401 but received 200
- **堆栈**:
  ```
  at Object.<anonymous> (src/auth/login.test.ts:15:12)
  at processTicksAndRejections (internal/process/task_queues.js:95:5)
  ```

### 2. [API] fetchUsers should handle network error
- **文件**: src/api/users.test.ts:28
- **错误**: Network timeout after 5000ms
- **堆栈**:
  ```
  at Timeout._onTimeout (src/api/users.test.ts:28:8)
  ```

---

## 用例明细

### src/auth/login.test.ts
- ✅ login should accept valid credentials (0.12s)
- ❌ login should reject invalid credentials (0.08s)
- ✅ logout should clear session (0.05s)

### src/api/users.test.ts
- ✅ fetchUsers should return user list (0.23s)
- ❌ fetchUsers should handle network error (0.15s)

...

---

## 覆盖率

| 类型 | 覆盖率 |
|------|--------|
| 语句 | 87.5% |
| 分支 | 76.3% |
| 函数 | 92.1% |
| 行 | 88.2% |

**低于阈值文件**:
- src/utils/validator.ts (62.3%)
- src/api/client.ts (58.7%)

---

## 附录

- 原始结果文件: `test-results/jest-results.json`
- 生成工具版本: test-report-generator v1.0.0
```

**失败场景（解析模式）**:
```
❌ 无法生成测试报告

诊断:
- 结果文件: test-results/junit.xml
- 错误: XML 解析失败 - 文件格式损坏，缺少闭合标签 </testsuite>

建议:
1. 检查测试框架配置，确保生成有效的 JUnit XML
2. 手动验证文件完整性: cat test-results/junit.xml
3. 重新运行测试生成新的结果文件
```

---

**实施计划编写完成**  
下一步：按 Step 1-10 顺序实施，优先完成 M1 里程碑的 P0 功能。