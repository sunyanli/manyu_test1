from config import Config
from db_connector import DbConnector


def fetch_status_counts(db: DbConnector, cfg: Config, date_str: str) -> dict[str, int]:
    sql = (
        f"SELECT {cfg.status_column} AS status, COUNT(*) AS cnt "
        f"FROM {cfg.task_table} "
        f"WHERE DATE({cfg.created_at_column}) = %s "
        f"GROUP BY {cfg.status_column}"
    )
    rows = db.fetch_all(sql, (date_str,))
    return {row["status"]: row["cnt"] for row in rows}


def fetch_failure_reasons(db: DbConnector, cfg: Config, date_str: str) -> list[dict]:
    sql = (
        f"SELECT {cfg.fail_reason_column} AS fail_reason, COUNT(*) AS cnt "
        f"FROM {cfg.task_table} "
        f"WHERE DATE({cfg.created_at_column}) = %s "
        f"AND {cfg.status_column} = 'failed' "
        f"GROUP BY {cfg.fail_reason_column} "
        f"ORDER BY cnt DESC"
    )
    rows = db.fetch_all(sql, (date_str,))
    result: list[dict] = []
    unclassified = 0
    for row in rows:
        reason = row["fail_reason"]
        if reason is None or str(reason).strip() == "":
            unclassified += row["cnt"]
        else:
            result.append({"fail_reason": str(reason), "cnt": row["cnt"]})
    if unclassified > 0:
        result.append({"fail_reason": "未分类", "cnt": unclassified})
    return result