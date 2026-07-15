import pymysql
from pymysql.cursors import DictCursor
from config import Config


class DbConnector:
    def __init__(self, config: Config) -> None:
        self._conn = pymysql.connect(
            cursorclass=DictCursor,
            **config.connection_string(),
        )

    def fetch_all(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()

    def close(self) -> None:
        self._conn.close()