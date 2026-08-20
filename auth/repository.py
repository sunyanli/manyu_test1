"""内存数据仓库：User / Session / LoginLog

实际生产环境应替换为数据库 / Redis 持久化实现。
本实现用于演示与测试，保持接口稳定。
"""

from datetime import datetime
from typing import Dict, List, Optional

from .models import LoginLog, Session, User


class UserRepository:
    """用户仓库"""

    def __init__(self) -> None:
        self._users: Dict[str, User] = {}
        self._account_to_id: Dict[str, str] = {}

    def add(self, user: User) -> None:
        self._users[user.id] = user
        self._account_to_id[user.account] = user.id

    def get_by_id(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def get_by_account(self, account: str) -> Optional[User]:
        user_id = self._account_to_id.get(account)
        if user_id is None:
            return None
        return self._users.get(user_id)

    def update(self, user: User) -> None:
        self._users[user.id] = user
        self._account_to_id[user.account] = user.id


class SessionRepository:
    """会话仓库"""

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    def add(self, session: Session) -> None:
        self._sessions[session.session_id] = session

    def get(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def delete(self, session_id: str) -> None:
        if session_id in self._sessions:
            del self._sessions[session_id]

    def delete_by_user(self, user_id: str) -> None:
        to_delete = [sid for sid, s in self._sessions.items() if s.user_id == user_id]
        for sid in to_delete:
            del self._sessions[sid]


class LoginLogRepository:
    """登录审计日志仓库"""

    def __init__(self) -> None:
        self._logs: List[LoginLog] = []

    def add(self, log: LoginLog) -> None:
        self._logs.append(log)

    def get_recent_by_account(self, account: str, limit: int = 100) -> List[LoginLog]:
        return [log for log in self._logs if log.account == account][-limit:]
