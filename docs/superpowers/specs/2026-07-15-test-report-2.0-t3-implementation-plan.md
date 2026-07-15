# test-report-generator v2.0.0 T3 — 实施计划

> 生成时间：2026-07-15 11:08 UTC
> 技能：test-report-generator (v1.0.0 → v2.0.0)
> 当前阶段：plan（实施计划）
> 上游文档：docs/superpowers/specs/2026-07-15-test-report-2.0-t3-clarification.md

---

## 1. 目标

将 test-report-generator 从 v1.0.0 升级到 v2.0.0，完成 M1 + M2 里程碑：
- **M1**: Jest/Vitest JSON + JUnit XML 解析增强、Markdown 报告 6 章节结构、执行/解析双模式
- **M2**: pytest 支持、覆盖率章节、fail_threshold 配置

## 2. 成功标准

| # | 标准 | 验证方式 |
|---|------|----------|
| AC1 | Markdown 报告包含 6 大章节：报告头、结果摘要、失败用例分析、用例明细、覆盖率、附录 | 生成报告后逐章节比对 |
| AC2 | 覆盖率章节正确显示语句/分支/函数/行覆盖率及低覆盖率文件清单（<50%） | 用含 coverage 的项目实测 |
| AC3 | fail_threshold 生效：通过率低于阈值时结论标记为 ❌ 不达标 | 构造低通过率场景验证 |
| AC4 | pytest 框架可被自动检测，JUnit XML 结果可被正确解析 | 创建含 pytest 特征的测试项目 |
| AC5 | 结果文件字段缺失时降级输出"未获取"，不崩溃 | 损坏 XML/JSON 文件测试 |

## 3. 影响面

| 文件 | 操作 | 变更范围 |
|------|------|----------|
| `skills/test-report-generator/SKILL.md` | 修改 | 版本号、触发示例、配置项、覆盖率说明 |
| `skills/test-report-generator/templates/markdown-report.md` | 修改 | 新增第5章覆盖率、第6章附录、200+用例截断文案 |
| `skills/test-report-generator/parsers/jest-vitest-json.md` | 修改 | 新增 coverage 数据提取、错误信息截断规则 |
| `skills/test-report-generator/parsers/junit-xml.md` | 修改 | 新增 pytest 兼容、属性缺失降级、error 元素支持 |
| `skills/test-report-generator/framework-detector.md` | 修改 | 新增 pytest 命令映射、pyproject.toml 检测 |

## 4. 实施步骤

### Step 1 — 升级 SKILL.md 主文档
**优先级**: high | **状态**: pending

**变更清单**:
1. 版本号 `1.0.0` → `2.0.0`
2. 触发示例追加覆盖率相关意图（"看覆盖率"、"生成带覆盖率的报告"）
3. 配置项表新增 `coverage`（auto/on/off）、`fail_threshold`（默认无）
4. 工作流程中加入覆盖率收集步骤：执行测试 → 收集结果 → 收集覆盖率 → 生成报告
5. 输出格式说明追加 HTML/JSON 为 P1 计划

**输入**: 澄清文档 §3.2（配置项）、§4.3（输出格式）
**验收**: 新配置项均在 SKILL.md 中有明确说明

---

### Step 2 — 升级 Markdown 报告模板
**优先级**: high | **状态**: pending

**变更清单**:
1. 新增第 5 章「覆盖率」模板：
   - 语句/分支/函数/行覆盖率总表
   - 低覆盖率文件清单（<50% 阈值），含文件名、各类覆盖率值
   - 覆盖率数据缺失时标注"未获取"
2. 新增第 6 章「附录」模板：
   - 原始结果文件路径
   - 生成工具名称与版本
3. 200+ 用例截断文案对齐澄清文档格式：
   ```
   ... 及其他 N 条用例，完整明细见原始结果文件
   ```
4. 结果摘要增加 `fail_threshold` 不达标标记：当通过率 < 阈值时，结论显示 `❌ 不达标（通过率 XX% < 阈值 YY%）`

**输入**: 澄清文档 §3.3（报告结构）、§3.4（覆盖率阈值）
**验收**: 模板包含 6 个章节占位符，覆盖率数据缺失时正确输出"未获取"

---

### Step 3 — 升级 Jest/Vitest JSON 解析器
**优先级**: high | **状态**: pending

**变更清单**:
1. 新增 `coverage-final.json` 解析逻辑：
   - 文件路径推断：`coverage/coverage-final.json`（Jest 默认）或 `coverage/coverage-final.json`（Vitest 默认）
   - 提取语句/分支/函数/行覆盖率（`pct` 字段）
   - 提取每个文件的覆盖率明细用于低覆盖率文件清单
2. 错误信息截断规则：单条失败信息截断至 500 字符，堆栈保留前 10 行
3. 新增 `extractCoverageData()` 函数伪代码

**输入**: 澄清文档 §3.4（覆盖率阈值）、§3.3（失败用例分析）
**验收**: 覆盖率数据正确映射到 4 个维度，低覆盖率文件判定准确

---

### Step 4 — 升级 JUnit XML 解析器
**优先级**: high | **状态**: pending

**变更清单**:
1. pytest 兼容性：
   - 识别 `classname` 属性中的测试类名，映射到文件路径
   - 支持 `<error>` 元素（与 `<failure>` 并列，pytest 使用 error 标记收集错误）
   - 处理 `time` 属性缺失（默认 0）
2. 属性缺失降级：
   - `tests` / `failures` / `errors` / `skipped` 缺失 → "未获取"
   - `name` 缺失 → 使用 `classname` 拼接
3. 跳过计数：`skipped` 属性映射到 `skipped` 字段

**输入**: 澄清文档 §4.1（pytest 支持）、NFR2（健壮性降级）
**验收**: pytest 生成的 JUnit XML 可正确解析，缺失字段输出"未获取"

---

### Step 5 — 升级 framework-detector 支持 pytest
**优先级**: medium | **状态**: pending

**变更清单**:
1. 已有 pytest 特征文件检测（无需新增），需补充：
   - pytest 执行命令映射：`python -m pytest --junitxml=test-results.xml`
   - `pyproject.toml` 中 `[tool.pytest.ini_options]` 配置检测
   - 覆盖率命令：`python -m pytest --junitxml=test-results.xml --cov --cov-report=xml --cov-report=json`
2. 补充 Python 项目检测：检查 `pyproject.toml`、`setup.cfg`、`pytest.ini` 存在性

**输入**: 澄清文档 §4.1（FR1.1 框架检测）
**验收**: 含 pytest 配置的 Python 项目可被正确识别

---

### Step 6 — 集成覆盖率与 fail_threshold
**优先级**: medium | **状态**: pending

**变更清单**:
1. 在报告生成流程中增加覆盖率数据注入点：
   - 解析器输出增加 `coverage` 字段（可选）
   - 模板渲染时根据 `coverage` 数据决定是否渲染覆盖率章节
2. fail_threshold 逻辑：
   - 比较 `passRate < fail_threshold`，若成立则覆盖结论为 `❌ 不达标`
   - 不影响其余章节内容
3. coverage 配置 `auto` 模式：若覆盖率文件存在则自动采集，不存在则跳过

**输入**: 澄清文档 §3.2（配置项）
**验收**: 覆盖率章节仅在数据存在时渲染，fail_threshold 触发正确

---

### Step 7 — 端到端验证
**优先级**: high | **状态**: pending

**验证清单**:
1. 在含 Jest 的 TS 项目中执行完整流程，验证 Markdown 报告 6 章节完整性
2. 在含 pytest 的 Python 项目中执行，验证 JUnit XML 解析与覆盖率提取
3. 构造损坏的 XML/JSON 文件，验证降级输出不崩溃
4. 通过率低于 fail_threshold 阈值时，验证结论标记为不达标
5. 覆盖率数据不存在时，验证覆盖率章节显示"未获取"

**输入**: 澄清文档 §6（验收标准）
**验收**: 5 条验证全通过

---

## 5. 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| Jest/Vitest coverage-final.json 格式差异 | 统一按标准 Istanbul 格式解析，两框架输出一致 |
| pytest JUnit XML 与标准 JUnit 差异 | 增加 `<error>` 元素处理，time 属性默认 0 |
| 覆盖率数据量大导致解析超时 | 仅提取 `pct` 汇总与低覆盖率文件（<50%），不加载全量明细 |
| 解析器变更影响现有 v1.0.0 行为 | 纯增量变更，不修改已有字段映射逻辑 |

## 6. 回滚策略

- 每个文件修改前保留原始内容备份
- Git 仓库提供最终安全网：`git checkout -- <file>` 可恢复任意文件
- 若 M2 验证失败，M1 变更不受影响（独立文件修改）

---

## 7. 依赖与假设

- **假设**: 现有 v1.0.0 解析器逻辑正确，仅需增量扩展
- **假设**: Jest/Vitest 的 coverage-final.json 格式遵循 Istanbul 标准
- **依赖**: 测试项目环境需具备可运行的 Jest/Vitest/pytest 框架

---

*本文档由 writing-plans 技能驱动生成，遵循 Anti-Blocking 协议自主决策。*