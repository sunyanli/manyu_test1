import json
import os
import shutil
import sys
from datetime import datetime
from typing import Any

import pytz
from jinja2 import Environment, FileSystemLoader

from config import Config
from db_connector import DbConnector
from task_fetcher import fetch_status_counts, fetch_failure_reasons
from analyzer import aggregate_daily_summary, update_data_json


TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
TZ = pytz.timezone("Asia/Shanghai")


def render_report(report: dict[str, Any], trend_data: str, history: str) -> str:
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template("report.html")
    return template.render(report=report, trend_data=trend_data, history=history)


def generate_report(cfg: Config) -> None:
    today = datetime.now(TZ).strftime("%Y-%m-%d")
    db = DbConnector(cfg)
    try:
        counts = fetch_status_counts(db, cfg, today)
        failure_reasons = fetch_failure_reasons(db, cfg, today)
    finally:
        db.close()

    summary = aggregate_daily_summary(counts, failure_reasons, today)
    history = update_data_json(summary, cfg.output_dir, cfg.retention_days)

    trend_data = json.dumps(
        [{"date": h["date"], "success_rate": h["success_rate"]} for h in history[-7:]],
        ensure_ascii=False,
    )
    history_json = json.dumps(history, ensure_ascii=False)

    html = render_report(summary, trend_data, history_json)

    os.makedirs(cfg.output_dir, exist_ok=True)
    daily_path = os.path.join(cfg.output_dir, f"report_{today}.html")
    index_path = os.path.join(cfg.output_dir, "index.html")
    with open(daily_path, "w", encoding="utf-8") as f:
        f.write(html)
    shutil.copyfile(daily_path, index_path)

    print(f"[OK] 报告已生成: {daily_path}")
    print(f"     成功率: {summary['success_rate'] * 100:.1f}%")
    print(f"     任务总数: {summary['total']} | 成功: {summary['success']} | 失败: {summary['failed']}")


def main() -> None:
    cfg = Config()
    if not cfg.db_password:
        print("[ERROR] DB_PASSWORD 环境变量未设置，程序退出", file=sys.stderr)
        sys.exit(1)
    try:
        generate_report(cfg)
    except Exception as e:
        print(f"[ERROR] 报告生成失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()