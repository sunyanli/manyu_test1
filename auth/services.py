"""登录认证业务逻辑"""

from datetime import datetime, timedelta
from typing import Optional, Tuple

from . import security
from .models import LoginLog, Session, User, UserStatus
from .repository import LoginLogRepository, SessionRepository, UserRepository


class AuthError(Exception):
    """认证领域异常基类"""

    pass


class AuthFailedError(AuthError):
    """账号或密码错误"""

    pass


class AccountDisabledError(AuthError):
    """账号被禁用"""

    pass


class AccountLockedError(AuthError):
    """账号被锁定"""

    pass


class CaptchaRequiredError(AuthError):
    """需要验证码"""

    pass


class AuthService:
    """认证服务：封装登录、登出、会话校验、失败锁定等逻辑"""

    # 业务常量
    MAX_FAILED_ATTEMPTS = 5
    LOCK_DURATION_MINUTES = 15
    CAPTCHA_THRESHOLD = 3
    SESSION_TTL_MINUTES = 30
    REMEMBER_ME_TTL_DAYS = 30

    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        logs: LoginLogRepository,
    ) -> None:
        self.users = users
        self.sessions = sessions
        self.logs = logs

    # ------------------------------------------------------------------
    # 登录
    # ------------------------------------------------------------------
    def login(
        self,
        account: str,
        password: str,
        remember_me: bool = False,
        captcha: Optional[str] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[dict, Session]:
        """核心登录流程

        Returns:
            (response_payload, session)

        Raises:
            AuthFailedError: 账号或密码错误
            AccountDisabledError: 账号被禁用
            AccountLockedError: 账号已锁定
            CaptchaRequiredError: 需要验证码
        """
        user = self.users.get_by_account(account)

        # 账号存在时的前置校验
        if user is not None:
            if user.status == UserStatus.DISABLED:
                self._log(account, user.id, False, "account_disabled", ip, user_agent)
                raise AccountDisabledError("账号已被禁用")

            if user.locked_until and user.locked_until > datetime.utcnow():
                self._log(account, user.id, False, "account_locked", ip, user_agent)
                raise AccountLockedError("账号已锁定，请稍后再试")

            # 连续失败达到阈值后要求验证码
            if user.failed_login_attempts >= self.CAPTCHA_THRESHOLD:
                if not captcha or not self._validate_captcha(captcha):
                    raise CaptchaRequiredError("需要验证码")

        # 密码校验
        if user is not None:
            if not security.verify_password(password, user.password_hash):
                self._handle_failed_login(user, ip, user_agent)
                raise AuthFailedError("账号或密码错误")
        else:
            # 账号不存在：执行一次虚拟校验，避免时序攻击
            dummy_hash = security.hash_password("dummy")
            security.verify_password(password, dummy_hash)
            self._log(account, None, False, "account_not_found", ip, user_agent)
            raise AuthFailedError("账号或密码错误")

        # 登录成功
        session = self._create_session(user, remember_me, ip, user_agent)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.status = UserStatus.ACTIVE
        self.users.update(user)
        self._log(account, user.id, True, "success", ip, user_agent)

        return {"userId": user.id, "account": user.account, "message": "登录成功"}, session

    def _handle_failed_login(
        self, user: User, ip: Optional[str], user_agent: Optional[str]
    ) -> None:
        """处理登录失败，累加计数并判断是否锁定"""
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= self.MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=self.LOCK_DURATION_MINUTES)
            user.status = UserStatus.LOCKED
        self.users.update(user)
        self._log(user.account, user.id, False, "password_error", ip, user_agent)

    def _create_session(
        self,
        user: User,
        remember_me: bool,
        ip: Optional[str],
        user_agent: Optional[str],
    ) -> Session:
        """创建服务端会话"""
        now = datetime.utcnow()
        ttl = (
            timedelta(days=self.REMEMBER_ME_TTL_DAYS)
            if remember_me
            else timedelta(minutes=self.SESSION_TTL_MINUTES)
        )
        session = Session(
            session_id=security.generate_token(),
            user_id=user.id,
            created_at=now,
            expires_at=now + ttl,
            remember_me=remember_me,
            ip=ip,
            user_agent=user_agent,
        )
        self.sessions.add(session)
        return session

    def _validate_captcha(self, captcha: str) -> bool:
        """验证码校验（当前为简化实现：接受任意非空验证码）"""
        return bool(captcha and captcha.strip())

    # ------------------------------------------------------------------
    # 会话
    # ------------------------------------------------------------------
    def get_session(self, session_id: str) -> Optional[Session]:
        """获取并校验会话，过期则清理"""
        session = self.sessions.get(session_id)
        if not session:
            return None
        if session.expires_at < datetime.utcnow():
            self.sessions.delete(session_id)
            return None
        return session

    def logout(self, session_id: str) -> None:
        """退出登录，销毁会话"""
        self.sessions.delete(session_id)

    # ------------------------------------------------------------------
    # 审计日志
    # ------------------------------------------------------------------
    def _log(
        self,
        account: str,
        user_id: Optional[str],
        success: bool,
        reason: str,
        ip: Optional[str],
        user_agent: Optional[str],
    ) -> None:
        self.logs.add(
            LoginLog(
                id=security.generate_token(),
                user_id=user_id,
                account=account,
                ip=ip,
                user_agent=user_agent,
                success=success,
                reason=reason,
                timestamp=datetime.utcnow(),
            )
        )
