# Test Report Generator Skill

## 元数据
- **name**: test-report-generator
- **version**: 2.0.0
- **author**: AI Agent
- **created**: 2026-07-15
- **tags**: testing, report, jest, vitest, junit, markdown

## 概述
测试报告生成 Skill，自动解析测试结果并生成结构化 Markdown 报告。

## 触发意图
- "生成测试报告"
- "跑一下测试并出报告"
- "把这个 junit.xml 转成测试报告"
- "看覆盖率"
- "生成带覆盖率的报告"

## 支持的框架
| 框架 | 结果格式 | 优先级 |
|------|----------|--------|
| Jest | JSON reporter | P0 |
| Vitest | JSON reporter | P0 |
| pytest | JUnit XML | P1 |
| 通用 | JUnit XML | P0 |

## 配置项
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式下的结果文件路径 |
| output_format | markdown | 输出格式 (markdown/html/json) |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | 覆盖率处理 (auto/on/off) |
| fail_threshold | 无 | 通过率阈值（默认无，不强制达标检查） |

> **P1 计划**: HTML 和 JSON 输出格式将在后续迭代中支持，当前版本仅完整支持 Markdown。

## 工作模式
1. **执行模式**: 触发测试运行并收集结果
2. **解析模式**: 跳过执行，直接解析已有结果文件

## 工作流程
1. 执行测试 → 收集测试结果
2. 收集覆盖率（根据 `coverage` 配置项决定：auto 自动检测 / on 强制开启 / off 跳过）
3. 生成结构化报告

## 输出结构
1. 报告头：项目名、生成时间、执行命令、框架/版本、执行环境摘要
2. 结果摘要：用例总数、通过/失败/跳过数、通过率、总耗时、整体结论 ✅/❌
3. 失败用例分析：用例名、文件路径、错误信息、堆栈摘要（截断）
4. 用例明细：按文件分组的用例列表（>200 条时截断）
5. 覆盖率：语句/分支/函数/行覆盖率、低覆盖率文件清单（若可获取，否则标注"未获取"）
6. 附录：原始结果文件路径、生成工具版本

## 使用示例
```
# 执行模式
生成测试报告

# 解析模式
把 reports/junit.xml 转成测试报告

# 指定输出路径
生成测试报告，输出到 docs/reports/
```