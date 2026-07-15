import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from config import Config
from report_gen import render_report, generate_report


def test_render_report_contains_required_elements():
    report = {
        "date": "2026-07-15",
        "total": 131,
        "success": 120,
        "failed": 8,
        "running": 3,
        "paused": 0,
        "cancelled": 0,
        "success_rate": 0.916,
        "failure_reasons": [{"fail_reason": "timeout", "cnt": 5}, {"fail_reason": "OOM", "cnt": 3}],
    }
    trend_data = json.dumps(
        [
            {"date": "2026-07-14", "success_rate": 0.92},
            {"date": "2026-07-15", "success_rate": 0.916},
        ],
        ensure_ascii=False,
    )
    history = json.dumps(
        [{"date": "2026-07-14", "total": 120, "success": 100, "failed": 5, "success_rate": 0.833}],
        ensure_ascii=False,
    )
    html = render_report(report, trend_data, history)
    assert "2026-07-15" in html
    assert "91.6%" in html
    assert "echarts" in html.lower()
    assert "timeout" in html
    assert "OOM" in html


def test_generate_report_writes_files():
    cfg = Config()
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg.output_dir = tmpdir
        with patch("report_gen.DbConnector") as MockDb, \
             patch("report_gen.fetch_status_counts") as mock_counts, \
             patch("report_gen.fetch_failure_reasons") as mock_reasons, \
             patch("report_gen.update_data_json") as mock_update:
            mock_db = MockDb.return_value
            mock_counts.return_value = {"success": 100, "failed": 5, "running": 2}
            mock_reasons.return_value = [{"fail_reason": "timeout", "cnt": 5}]
            mock_update.return_value = [
                {"date": "2026-07-14", "total": 90, "success": 85, "failed": 5, "success_rate": 0.944},
                {"date": "2026-07-15", "total": 107, "success": 100, "failed": 5, "running": 2, "paused": 0, "cancelled": 0, "success_rate": 0.9346, "failure_reasons": []},
            ]
            generate_report(cfg)
            assert os.path.exists(os.path.join(tmpdir, "index.html"))
            assert os.path.exists(os.path.join(tmpdir, "report_2026-07-15.html"))
            mock_db.close.assert_called_once()