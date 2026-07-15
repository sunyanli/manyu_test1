import pytest
from unittest.mock import patch, MagicMock
from config import Config
from db_connector import DbConnector


def test_fetch_all_returns_dict_list():
    cfg = Config(db_host="mock", db_user="u", db_password="p", db_name="db")
    mock_rows = [{"id": 1, "status": "success"}, {"id": 2, "status": "failed"}]
    with patch("db_connector.pymysql.connect") as mock_connect:
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = mock_rows
        mock_connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        db = DbConnector(cfg)
        result = db.fetch_all("SELECT id, status FROM task WHERE DATE(created_at) = %s", ("2026-07-15",))
        assert result == mock_rows
        mock_cursor.execute.assert_called_once_with(
            "SELECT id, status FROM task WHERE DATE(created_at) = %s", ("2026-07-15",)
        )


def test_fetch_all_empty_result():
    cfg = Config(db_host="mock", db_user="u", db_password="p", db_name="db")
    with patch("db_connector.pymysql.connect") as mock_connect:
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor
        db = DbConnector(cfg)
        result = db.fetch_all("SELECT 1", ())
        assert result == []


def test_close_connection():
    cfg = Config(db_host="mock", db_user="u", db_password="p", db_name="db")
    with patch("db_connector.pymysql.connect") as mock_connect:
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn
        db = DbConnector(cfg)
        db.close()
        mock_conn.close.assert_called_once()