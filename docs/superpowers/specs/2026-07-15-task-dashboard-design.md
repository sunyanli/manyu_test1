# 数据看板 — 任务成功率报告脚本

> 创建日期: 2026-07-15
> 状态: 设计阶段 (clarify)
> 版本: v1.0

---

## 1. 目标

开发一个 Python 脚本，每日 10:00 自动连接线上数据库，查询任务创建状态（成功/失败/执行中/暂停/取消），输出成功率报告并分析失败原因，最终生成可视化看板。

## 2. 成功标准

- [x] 脚本可通过 cron 定时调度，每日 10:00 自动执行
- [x] 生成的 HTML 看板包含当日成功率、状态分布、失败原因分析
- [x] 看板可直接在浏览器中打开，无需 Web 服务
- [x] 历史数据可追溯（每日快照 + 汇总 JSON）
- [x] 数据库连接参数通过环境变量/配置文件注入，不硬编码

## 3. 方案选型

**选择方案 A：纯 Python 脚本 + 静态 HTML 看板**

| 对比维度 | 方案 A (纯静态) | 方案 B (Flask 实时) | 方案 C (Grafana) |
|---------|:---------:|:---------:|:---------:|
| 部署复杂度 | ⭐ 低 | ⭐⭐ 中 | ⭐⭐⭐ 高 |
| 交互性 | 中 | 高 | 高 |
| 依赖数量 | 3-4 | 6-8 | 10+ |
| 适用场景 | 定时报告 | 实时监控 | 专业运维 |

**理由**：需求明确为"脚本"+"看板"，静态 HTML 方案零运行时依赖，部署简单，与现有项目结构（Python）一致。

## 4. 架构

```
┌──────────────┐    cron 10:00    ┌──────────────────┐
│  cron 调度    │ ───────────────→ │  report_gen.py   │
└──────────────┘                  │  (主入口)         │
                                  │                  │
                    ┌─────────────┤  1. 连接数据库    │
                    │             │  2. 查询任务状态   │
                    ▼             │  3. 计算成功率    │
              ┌──────────┐       │  4. 分析失败原因   │
              │ 线上数据库 │       │  5. 生成 HTML 看板 │
              └──────────┘       └────────┬─────────┘
                                          │
                                          ▼
                                  ┌──────────────┐
                                  │ reports/     │
                                  │ ├── index.html│  ← 看板入口
                                  │ ├── report_   │
                                  │ │   YYYY-MM-  │
                                  │ │   DD.html   │  ← 每日报告
                                  │ └── data.json │  ← 汇总数据
                                  └──────────────┘
```

## 5. 模块划分

| 模块 | 文件 | 职责 |
|------|------|------|
| 数据库连接 | `db_connector.py` | 管理连接池，执行 SQL 查询 |
| 任务查询 | `task_fetcher.py` | 按状态分组统计，获取失败原因 |
| 数据分析 | `analyzer.py` | 成功率计算、趋势分析、失败原因聚合 |
| 报告生成 | `report_gen.py` | 主入口，协调模块，渲染 HTML |
| HTML 模板 | `templates/report.html` | Jinja2 + ECharts 可视化 |

## 6. 数据模型

### 数据库表假设（可配置）

```sql
-- 任务表（默认名: task）
CREATE TABLE task (
    id          BIGINT PRIMARY KEY,
    name        VARCHAR(255),
    status      VARCHAR(32),    -- success / failed / running / paused / cancelled
    fail_reason VARCHAR(512),   -- 失败原因（可选）
    created_at  DATETIME,       -- 任务创建时间
    updated_at  DATETIME        -- 最后更新时间
);
```

### 配置项

| 配置项 | 环境变量 | 默认值 |
|--------|---------|-------|
| 数据库类型 | `DB_TYPE` | `mysql` |
| 主机 | `DB_HOST` | `localhost` |
| 端口 | `DB_PORT` | `3306` |
| 数据库名 | `DB_NAME` | `task_db` |
| 用户名 | `DB_USER` | `root` |
| 密码 | `DB_PASSWORD` | (必填) |
| 任务表名 | `TASK_TABLE` | `task` |
| 状态字段 | `STATUS_COLUMN` | `status` |
| 失败原因字段 | `FAIL_REASON_COLUMN` | `fail_reason` |
| 创建时间字段 | `CREATED_AT_COLUMN` | `created_at` |

## 7. 看板内容

每天生成的 HTML 看板包含：

1. **概览卡片**：当日任务总数、成功率、失败数、运行中数
2. **7日成功率趋势图**：折线图
3. **当日状态分布**：饼图
4. **失败原因 Top N**：柱状图 + 明细表
5. **历史数据汇总表**：最近 30 天每日摘要

## 8. 技术栈

- **语言**: Python 3.8+
- **数据库驱动**: `pymysql` (MySQL) / `psycopg2` (PostgreSQL)
- **模板引擎**: `Jinja2`
- **可视化**: `ECharts` (CDN 引入，纯前端渲染)
- **调度**: `cron` (Linux) / `Task Scheduler` (Windows)

## 9. 依赖清单

```
pymysql>=1.0.0          # MySQL 驱动
psycopg2-binary>=2.9     # PostgreSQL 驱动（可选）
jinja2>=3.0              # HTML 模板渲染
```

## 10. 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 数据库不可达 | 脚本退出码非零，cron 捕获并告警 |
| 失败原因字段缺失 | 归入"未分类"，不阻塞流程 |
| 历史数据膨胀 | 仅保留最近 90 天，自动清理旧数据 |
| 时区问题 | 所有时间统一使用 UTC+8 (Asia/Shanghai) |

## 11. 输出产物

- `reports/index.html` — 看板入口（最新报告）
- `reports/report_YYYY-MM-DD.html` — 每日报告快照
- `reports/data.json` — 汇总数据（供趋势图使用）
- `report_gen.py` — 主脚本入口
- `db_connector.py` — 数据库连接模块
- `task_fetcher.py` — 任务查询模块
- `analyzer.py` — 数据分析模块
- `templates/report.html` — HTML 模板
- `requirements.txt` — 依赖清单
- `config.example.env` — 配置示例

---

## 自审清单

- [x] 无 TBD / TODO 占位
- [x] 各章节内部一致，架构与模块划分对应
- [x] 范围聚焦单一脚本+看板，无过度设计
- [x] 所有配置项有明确默认值或标记必填
- [x] 数据库表结构假设已显式声明，可配置