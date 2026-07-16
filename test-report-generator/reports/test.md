# 测试报告

## 报告头

**项目**: test-report-generator
**生成时间**: 2026-07-16 02:50:58
**执行命令**: 未指定
**测试框架**: jest
**执行环境**: Linux

## 📊 结果摘要

| 指标 | 值 |
|------|----|
| 用例总数 | 10 |
| 通过 | 8 |
| 失败 | 2 |
| 跳过 | 0 |
| 通过率 | 80.0% |
| 总耗时 | 5.5s |
| 整体结论 | ❌ |

## ❌ 失败用例分析

共 1 个用例失败：

### 1. Math.should fail

- **文件**: `test/a.test.js`
- **套件**: Math
- **耗时**: 5ms

**错误信息**:
```
expected 1 to be 2
```

<details>
<summary>堆栈追踪</summary>

```
at Object.<anonymous> (test/a.test.js:10:5)
```

</details>

## 📋 用例明细

### ❌ test/a.test.js

*耗时: 5.0s | 用例数: 2*

| 用例 | 状态 | 耗时 |
|------|------|------|
| Math.should pass | ✅ passed | 10ms |
| Math.should fail | ❌ failed | 5ms |

## 📈 覆盖率

**覆盖率数据**: 未获取

## 📎 附录

- **原始结果文件**: `results.json`
- **生成工具**: test-report-generator v1.0.0
- **生成时间**: 2026-07-16 02:50:58

---

*本报告由 test-report-generator 自动生成*
