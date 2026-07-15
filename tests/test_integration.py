import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from config import Config
from report_gen import generate_report


def test_end_to_end_pipeline():
    cfg = Config()
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg.output_dir = tmpdir
        mock_db = MagicMock()
        mock_db.fetch_all.side_effect = [
            [{"status": "success", "cnt": 100}, {"status": "failed", "cnt": 5}, {"status": "running", "cnt": 2}],
            [{"fail_reason": "timeout", "cnt": 3}, {"fail_reason": "OOM", "cnt": 2}],
        ]
        with patch("report_gen.DbConnector", return_value=mock_db), \
             patch("report_gen.update_data_json") as mock_update:
            mock_update.return_value = [
                {"date": "2026-07-14", "total": 90, "success": 85, "failed": 5, "success_rate": 0.944},
                {"date": "2026-07-15", "total": 107, "success": 100, "failed": 5, "running": 2, "paused": 0, "cancelled": 0, "success_rate": 0.9346, "failure_reasons": []},
            ]
            generate_report(cfg)
            assert os.path.exists(os.path.join(tmpdir, "index.html"))
            with open(os.path.join(tmpdir, "index.html"), "r", encoding="utf-8") as f:
                html = f.read()
            assert "100" in html
            assert "timeout" in html
            assert "ECharts" in html or "echarts" in html
            assert html.startswith("<!DOCTYPE html>")