import json
import os
import tempfile
import pytest
from analyzer import compute_success_rate, aggregate_daily_summary, update_data_json


def test_compute_success_rate_normal():
    counts = {"success": 120, "failed": 8, "running": 3, "paused": 1, "cancelled": 2}
    rate = compute_success_rate(counts)
    assert rate == pytest.approx(120 / 134, rel=1e-4)


def test_compute_success_rate_empty():
    assert compute_success_rate({}) == 0.0


def test_compute_success_rate_all_success():
    assert compute_success_rate({"success": 50}) == 1.0


def test_compute_success_rate_all_failed():
    assert compute_success_rate({"failed": 10}) == 0.0


def test_aggregate_daily_summary():
    counts = {"success": 120, "failed": 8, "running": 3}
    reasons = [{"fail_reason": "timeout", "cnt": 5}, {"fail_reason": "OOM", "cnt": 3}]
    summary = aggregate_daily_summary(counts, reasons, "2026-07-15")
    assert summary["date"] == "2026-07-15"
    assert summary["total"] == 131
    assert summary["success"] == 120
    assert summary["failed"] == 8
    assert summary["success_rate"] == pytest.approx(120 / 131, rel=1e-4)
    assert len(summary["failure_reasons"]) == 2


def test_update_data_json_new_entry():
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.json")
        summary = {
            "date": "2026-07-15",
            "total": 131,
            "success": 120,
            "failed": 8,
            "success_rate": 0.916,
            "failure_reasons": [],
        }
        update_data_json(summary, tmpdir, retention_days=90)
        with open(data_path, "r") as f:
            data = json.load(f)
        assert len(data) == 1
        assert data[0]["date"] == "2026-07-15"


def test_update_data_json_dedup_and_retention():
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.json")
        existing = [
            {"date": "2026-07-01", "total": 100, "success": 90, "failed": 10, "success_rate": 0.9, "failure_reasons": []},
            {"date": "2026-07-15", "total": 200, "success": 180, "failed": 20, "success_rate": 0.9, "failure_reasons": []},
        ]
        os.makedirs(tmpdir, exist_ok=True)
        with open(data_path, "w") as f:
            json.dump(existing, f)
        summary = {
            "date": "2026-07-15",
            "total": 131,
            "success": 120,
            "failed": 8,
            "success_rate": 0.916,
            "failure_reasons": [],
        }
        update_data_json(summary, tmpdir, retention_days=90)
        with open(data_path, "r") as f:
            data = json.load(f)
        assert len(data) == 2
        assert data[1]["date"] == "2026-07-15"
        assert data[1]["total"] == 131