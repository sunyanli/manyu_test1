# 部署说明

## 1. 环境准备

```bash
pip install -r requirements.txt
cp config.example.env .env
# 编辑 .env，填入实际数据库连接信息
```

## 2. 加载环境变量

```bash
set -a && source .env && set +a
```

## 3. cron 配置

每日 10:00 (UTC+8) 执行：

```cron
0 10 * * * cd /path/to/project && set -a && source .env && set +a && python report_gen.py >> logs/report_gen.log 2>&1
```

## 4. 验证

```bash
python report_gen.py
# 打开 reports/index.html 查看看板
```

## 5. 日志与监控

- 脚本日志: `logs/report_gen.log`
- 数据库不可达时脚本退出码为 1，cron 可配置 MAILTO 告警