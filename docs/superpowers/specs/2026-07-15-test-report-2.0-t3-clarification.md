# 2.0 T3 测试报告生成 — 需求澄清文档

> 生成时间：2026-07-15 11:01 UTC
> 技能：test-report-generator (v1.0.0 → v2.0.0)
> 当前阶段：clarify（需求澄清）

---

## 1. 现状盘点

### 1.1 现有资产 (v1.0.0)

| 文件 | 作用 | 行数 |
|------|------|------|
| `SKILL.md` | 技能主入口：触发词、工作流、配置项、输出约定 | 188 |
| `framework-detector.md` | 框架检测逻辑：用户指定 > package.json > 配置文件特征 | 135 |
| `parsers/jest-vitest-json.md` | Jest/Vitest JSON 输出解析（含覆盖率映射） | 230 |
| `parsers/junit-xml.md` | JUnit XML 解析（跨语言兜底，含 pytest/Maven 变体） | 234 |
| `templates/markdown-report.md` | Markdown 报告模板（6 章节 + 脱敏函数） | 234 |

### 1.2 v1.0.0 已覆盖 vs 2.0 T3 需求对照

| 需求项 | v1.0.0 状态 | 2.0 T3 缺口 |
|--------|------------|-------------|
| FR1.1 框架自动检测 | ✅ 已实现 | — |
| FR1.2 Jest/Vitest (P0) | ✅ 已实现 | — |
| FR1.2 JUnit XML (P0) | ✅ 已实现 | — |
| FR1.2 pytest (P0) | ❌ 未实现 | 需新增 pytest 解析器 |
| FR1.3 执行模式 | ✅ 已实现 | — |
| FR1.3 解析模式 | ✅ 已实现 | — |
| FR1.4 执行失败诊断 | ✅ 已实现 | — |
| FR2 报告结构 | ⚠️ 部分（6章节） | 需对齐 4.2 精确结构 |
| FR3.1 Markdown 输出 | ✅ 已实现 | — |
| FR3.1 HTML 输出 | ❌ 未实现 | 需新增 HTML 模板 |
| FR3.1 JSON 伴随产物 | ❌ 未实现 | 需新增 JSON 序列化 |
| FR3.2 默认路径 | ✅ 已实现 | 需微调格式 |
| FR3.3 生成后摘要 | ✅ 已实现 | — |
| FR4.1 触发意图 | ✅ 已实现 | — |
| FR4.2 fail_threshold | ❌ 未实现 | 需新增阈值判断 |
| NFR1 性能 | ❌ 未验证 | 需基准测试 |
| NFR2 健壮性 | ⚠️ 部分 | 需补充降级路径 |
| NFR3 安全 | ⚠️ 模板含脱敏 | 需形式化 |
| NFR4 幂等性 | ❌ 未约束 | 需在生成流程中保证 |
| NFR5 插件式架构 | ⚠️ 解析器为 markdown 文档 | 需形式化解析器接口 |

---

## 2. 开放问题决策

根据需求文档中的开放问题，结合上下文做出以下自主决策：

| 编号 | 问题 | 决策 | 依据 |
|------|------|------|------|
| Q1 | 首期目标项目栈是否以 TypeScript/Node 为主？ | **是。** P0 范围：Jest + Vitest + JUnit XML + pytest | 需求文档已明确"本文档按此假设制定 P0 范围"；现有 v1.0.0 已实现 Jest/Vitest/JUnit |
| Q2 | 报告语言：中文/英文双语？ | **仅中文。** | 现有模板和需求文档均为中文；双语可作为后续迭代 |
| Q3 | 自动推送到 IM/邮件？ | **不做。** | 需求文档明确列为非目标 |

### 补充决策

| 编号 | 问题 | 决策 | 依据 |
|------|------|------|------|
| D1 | pytest 解析器技术路线 | 使用 pytest `--junitxml` 生成 JUnit XML，复用现有 JUnit 解析器；同时支持 pytest-json-report 插件输出的 JSON 格式 | JUnit XML 为 pytest 最通用输出，且已有解析器；JSON 提供更丰富元数据 |
| D2 | HTML 模板方案 | 基于 Markdown 模板渲染后转 HTML，使用 `marked` 或等价库 | 避免维护两套模板；Markdown→HTML 转换成熟 |
| D3 | 解析器插件化实现 | 每个解析器定义统一接口：`{ name, match, parse, version }`，注册到解析器注册表 | 符合 NFR5 插件式设计 |
| D4 | 覆盖率获取策略 | `auto` 模式：框架支持时自动收集；`on` 强制开启；`off` 跳过 | 与需求文档 4.2.5 对齐 |
| D5 | 报告时间戳格式 | `YYYYMMDD-HHmmss`（UTC） | 需求文档 3.2 明确指定 |

---

## 3. 需求细化与规格澄清

### 3.1 FR2 报告结构精确化（基于 4.2）

v1.0.0 模板已有 6 个章节，但需要对齐 2.0 T3 的精确结构。以下为逐章节对照：

| 章节 | 2.0 T3 要求 | v1.0.0 现状 | 调整 |
|------|------------|------------|------|
| 1. 报告头 | 项目名、生成时间、执行命令、框架/版本、执行环境摘要 | 有项目名、时间、框架、命令 | 补充"执行环境摘要"（Node/Python 版本、OS） |
| 2. 结果摘要 | 用例总数、通过/失败/跳过数、通过率、总耗时、✅/❌ | 有总数、通过/失败、通过率、耗时 | 补充"跳过数"和整体结论标记 |
| 3. 失败用例分析 | 用例名、所属文件、错误信息、堆栈关键行（截断） | 有（但未明确截断规则） | 明确堆栈截断规则：保留前 5 行 + 匹配项目源码的第 1 行 |
| 4. 用例明细 | 按文件分组、耗时、折叠/截断（>200 条） | 有按文件分组 | 补充截断策略与折叠方案 |
| 5. 覆盖率 | 语句/分支/函数/行覆盖率 + 低于阈值文件清单 | 有基础覆盖率 | 增加分支覆盖率 + 低覆盖文件清单 |
| 6. 附录 | 原始结果文件路径、生成工具版本 | 有 | 对齐 |

### 3.2 堆栈截断规则（精确化）

```
输入：完整错误堆栈
输出：保留前 5 行 + 向后扫描到第一个匹配项目源码路径的行（最多 10 行）
标记：若堆栈被截断，末尾追加 "... (截断，完整堆栈见原始结果文件)"
```

### 3.3 用例明细截断策略

```
当用例数 ≤ 200：全部展示，按文件分组
当用例数 > 200：前 200 条全量展示，末尾追加：
  "... 及其他 N 条用例，完整明细见原始结果文件"
```

### 3.4 覆盖率阈值清单

低覆盖率文件判定标准：
- 语句覆盖率 < 50%
- 或分支覆盖率 < 50%
- 或函数覆盖率 < 50%

---

## 4. 里程碑重新规划

基于 2.0 T3 需求与现有资产，重新规划里程碑：

| 阶段 | 范围 | 优先级 | 预估工作量 |
|------|------|--------|-----------|
| M1 | 报告结构对齐 4.2、fail_threshold、降级路径、安全脱敏、幂等性保证、性能基准 | P0 | 2-3d |
| M2 | pytest 解析器（JUnit XML 复用 + JSON 支持）、覆盖率章节增强 | P0 | 1-2d |
| M3 | HTML 输出、JSON 伴随产物 | P1 | 1-2d |
| M4 | 历史趋势对比、更多框架 | P2 | 后续迭代 |

与需求文档原始里程碑的差异：
- 原始 M1 包含了"Jest/Vitest JSON + JUnit XML 解析"——这些已在 v1.0.0 实现，因此在 2.0 T3 中 M1 聚焦于**报告结构升级和基础质量保证**
- 将 pytest 提升为独立 M2（P0），确保并行开发不阻塞
- 保持原始 M3/M4 不变

---

## 5. 风险识别与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| R1: pytest 输出格式差异大（pytest-json-report 插件版本不一致） | 中 | 以 JUnit XML 为主路径，JSON 为增强路径；解析失败时降级到 JUnit 路径 |
| R2: HTML 渲染质量依赖 Markdown→HTML 转换库 | 低 | 使用成熟的 marked/remark 库，输出前做结构校验 |
| R3: 覆盖率数据源不统一（Jest 用 `--coverage`，pytest 用 `pytest-cov`） | 中 | 覆盖率收集独立为 CoverageCollector 模块，各框架适配 |
| R4: 性能目标（5s / 1000 用例）在解析复杂 XML 时可能超标 | 低 | JUnit XML 使用流式解析（SAX）；大文件分片处理 |
| R5: 敏感信息过滤遗漏（环境变量注入堆栈） | 中 | 统一脱敏管道：运行前 scan + 运行时 filter + 输出前校验 |

---

## 6. 技术决策记录

### 6.1 解析器插件架构

```typescript
interface ParserPlugin {
  /** 解析器唯一标识 */
  name: string;
  /** 支持的框架名称列表 */
  frameworks: string[];
  /** 判断是否能解析给定结果 */
  canParse(resultPath: string, content?: string): boolean;
  /** 解析为统一中间表示 */
  parse(resultPath: string, content: string): TestReport;
  /** 解析器版本 */
  version: string;
}
```

现有解析器迁移路径：
- `parsers/jest-vitest-json.md` → `JestVitestParser` (实现 ParserPlugin)
- `parsers/junit-xml.md` → `JUnitXmlParser` (实现 ParserPlugin)
- 新增 `parsers/pytest-json.md` → `PytestJsonParser` (实现 ParserPlugin)

### 6.2 统一中间表示 (TestReport)

```typescript
interface TestReport {
  meta: ReportMeta;           // 报告头
  summary: TestSummary;       // 结果摘要
  failures: TestFailure[];    // 失败用例
  suites: TestSuite[];        // 用例明细（按文件分组）
  coverage: CoverageData | null; // 覆盖率
  appendix: ReportAppendix;   // 附录
}
```

### 6.3 输出管道

```
解析器 → TestReport (IR) → 渲染器 → 文件落盘
                              ├── MarkdownRenderer
                              ├── HtmlRenderer
                              └── JsonRenderer (伴随产物)
```

---

## 7. 待确认项（降级条件下可推进）

| 编号 | 待确认项 | 默认决策 | 影响范围 |
|------|---------|---------|---------|
| ?1 | 报告是否需要在 git 中忽略 `reports/` 目录 | 默认 `.gitignore` 建议但不强制 | 低 |
| ?2 | `fail_threshold` 默认值（需求文档说"无"） | 默认关闭（不阻断），用户显式开启后默认 80% | 低 |

---

## 8. 下一步行动

1. **进入 M1 实现**：升级报告模板（对齐 4.2 结构）、实现 fail_threshold、补充降级路径
2. **M2 并行准备**：设计 pytest 解析器规格（复用 JUnit XML 路径 + JSON 增强）
3. **M3 预研**：选型 Markdown→HTML 渲染方案

---

*本文档由 brainstorming 技能驱动生成，遵循 Anti-Blocking 协议自主决策。*