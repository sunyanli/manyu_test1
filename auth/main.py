"""FastAPI 接口层"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .models import User, UserStatus
from .repository import LoginLogRepository, SessionRepository, UserRepository
from .security import hash_password
from .services import (
    AccountDisabledError,
    AccountLockedError,
    AuthFailedError,
    AuthService,
    CaptchaRequiredError,
)

app = FastAPI(title="Login Authentication API", version="1.0.0")

# ----------------------------------------------------------------------
# 内存存储与认证服务实例（演示/测试用途）
# ----------------------------------------------------------------------
users_repo = UserRepository()
sessions_repo = SessionRepository()
logs_repo = LoginLogRepository()
auth_service = AuthService(users_repo, sessions_repo, logs_repo)

# 初始化一个演示用户（与规格示例一致）
_seed_user = User(
    id="u-123",
    account="user@example.com",
    password_hash=hash_password("Secret123!"),
    status=UserStatus.ACTIVE,
)
users_repo.add(_seed_user)

# ----------------------------------------------------------------------
# 请求/响应模型
# ----------------------------------------------------------------------
class LoginRequest(BaseModel):
    account: str = Field(..., min_length=1, description="账号")
    password: str = Field(..., min_length=8, description="密码")
    rememberMe: bool = Field(False, description="记住我")
    captcha: Optional[str] = Field(None, description="验证码")


class ErrorResponse(BaseModel):
    code: str
    message: str


# ----------------------------------------------------------------------
# IP 限流（内存版）
# ----------------------------------------------------------------------
_ip_attempts: dict = {}
IP_LIMIT = 10  # 每 IP 每分钟最多请求次数


def check_ip_limit(ip: Optional[str]) -> None:
    if ip is None:
        return
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=1)
    attempts = [t for t in _ip_attempts.get(ip, []) if t > cutoff]
    _ip_attempts[ip] = attempts
    if len(attempts) >= IP_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")
    attempts.append(now)


# ----------------------------------------------------------------------
# 接口
# ----------------------------------------------------------------------
@app.post("/api/auth/login")
def login(request: Request, body: LoginRequest):
    """登录接口"""
    client_ip = request.client.host if request.client else None
    check_ip_limit(client_ip)

    try:
        result, session = auth_service.login(
            account=body.account,
            password=body.password,
            remember_me=body.rememberMe,
            captcha=body.captcha,
            ip=client_ip,
            user_agent=request.headers.get("user-agent"),
        )
    except AuthFailedError as exc:
        return JSONResponse(
            status_code=401,
            content={"code": "AUTH_FAILED", "message": str(exc)},
        )
    except AccountDisabledError as exc:
        return JSONResponse(
            status_code=403,
            content={"code": "ACCOUNT_DISABLED", "message": str(exc)},
        )
    except AccountLockedError as exc:
        return JSONResponse(
            status_code=429,
            content={"code": "ACCOUNT_LOCKED", "message": str(exc)},
        )
    except CaptchaRequiredError as exc:
        return JSONResponse(
            status_code=429,
            content={"code": "CAPTCHA_REQUIRED", "message": str(exc)},
        )

    # 设置 Session Cookie
    response = JSONResponse(content=result)
    max_age = (
        30 * 24 * 60 * 60 if session.remember_me else 30 * 60
    )  # 30 天 或 30 分钟
    # 仅在 HTTPS 请求时标记 Secure，方便测试环境通过 HTTP 访问
    secure_flag = request.url.scheme == "https"
    response.set_cookie(
        key="session_id",
        value=session.session_id,
        httponly=True,
        secure=secure_flag,
        samesite="lax",
        max_age=max_age,
    )
    return response


@app.post("/api/auth/logout")
def logout(request: Request):
    """退出登录"""
    session_id = request.cookies.get("session_id")
    if session_id:
        auth_service.logout(session_id)
    response = JSONResponse(status_code=204, content=None)
    response.delete_cookie(key="session_id")
    return response


@app.get("/api/auth/session")
def session_info(request: Request):
    """获取当前会话信息"""
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse(
            status_code=401,
            content={"code": "UNAUTHORIZED", "message": "未登录"},
        )

    session = auth_service.get_session(session_id)
    if not session:
        return JSONResponse(
            status_code=401,
            content={"code": "UNAUTHORIZED", "message": "会话已过期"},
        )

    user = users_repo.get_by_id(session.user_id)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"code": "UNAUTHORIZED", "message": "用户不存在"},
        )

    return {
        "userId": user.id,
        "account": user.account,
        "expiresAt": session.expires_at.isoformat(),
    }
