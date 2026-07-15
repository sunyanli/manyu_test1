import json
import os
from datetime import datetime, timedelta
from typing import Any


def compute_success_rate(counts: dict[str, int]) -> float:
    total = sum(counts.values())
    if total == 0:
        return 0.0
    success = counts.get("success", 0)
    return success / total


def aggregate_daily_summary(
    counts: dict[str, int],
    failure_reasons: list[dict],
    date_str: str,
) -> dict[str, Any]:
    total = sum(counts.values())
    success = counts.get("success", 0)
    failed = counts.get("failed", 0)
    return {
        "date": date_str,
        "total": total,
        "success": success,
        "failed": failed,
        "running": counts.get("running", 0),
        "paused": counts.get("paused", 0),
        "cancelled": counts.get("cancelled", 0),
        "success_rate": round(compute_success_rate(counts), 4),
        "failure_reasons": failure_reasons,
    }


def update_data_json(
    summary: dict[str, Any],
    output_dir: str,
    retention_days: int = 90,
) -> list[dict[str, Any]]:
    os.makedirs(output_dir, exist_ok=True)
    data_path = os.path.join(output_dir, "data.json")
    existing: list[dict[str, Any]] = []
    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            existing = json.load(f)
    existing = [e for e in existing if e.get("date") != summary["date"]]
    existing.append(summary)
    existing.sort(key=lambda x: x["date"])
    cutoff = (datetime.now() - timedelta(days=retention_days)).strftime("%Y-%m-%d")
    existing = [e for e in existing if e["date"] >= cutoff]
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    return existing[-30:]