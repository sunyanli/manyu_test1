import pytest
from unittest.mock import MagicMock
from config import Config
from task_fetcher import fetch_status_counts, fetch_failure_reasons


def test_fetch_status_counts():
    cfg = Config()
    mock_db = MagicMock()
    mock_db.fetch_all.return_value = [
        {"status": "success", "cnt": 120},
        {"status": "failed", "cnt": 8},
        {"status": "running", "cnt": 3},
    ]
    result = fetch_status_counts(mock_db, cfg, "2026-07-15")
    assert result == {"success": 120, "failed": 8, "running": 3}
    called_sql = mock_db.fetch_all.call_args[0][0]
    assert "DATE(" in called_sql
    assert called_sql.endswith("GROUP BY status")


def test_fetch_status_counts_empty():
    cfg = Config()
    mock_db = MagicMock()
    mock_db.fetch_all.return_value = []
    result = fetch_status_counts(mock_db, cfg, "2026-07-15")
    assert result == {}


def test_fetch_failure_reasons():
    cfg = Config()
    mock_db = MagicMock()
    mock_db.fetch_all.return_value = [
        {"fail_reason": "timeout", "cnt": 5},
        {"fail_reason": "connection refused", "cnt": 3},
    ]
    result = fetch_failure_reasons(mock_db, cfg, "2026-07-15")
    assert result == [
        {"fail_reason": "timeout", "cnt": 5},
        {"fail_reason": "connection refused", "cnt": 3},
    ]


def test_fetch_failure_reasons_null_handling():
    cfg = Config()
    mock_db = MagicMock()
    mock_db.fetch_all.return_value = [
        {"fail_reason": None, "cnt": 2},
        {"fail_reason": "", "cnt": 1},
        {"fail_reason": "timeout", "cnt": 5},
    ]
    result = fetch_failure_reasons(mock_db, cfg, "2026-07-15")
    reasons = {r["fail_reason"]: r["cnt"] for r in result}
    assert reasons.get("未分类") == 3
    assert reasons.get("timeout") == 5