import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

interface UserInfo {
  username: string;
  password: string;
  role: string;
  deptId?: number;
}

const USERS: UserInfo[] = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'hr', password: 'hr123', role: 'hr' },
  { username: 'manager', password: 'manager123', role: 'manager', deptId: 1 },
];

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(loginDto: LoginDto): { access_token: string } {
    const user = USERS.find(
      (u) => u.username === loginDto.username && u.password === loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload: { sub: string; role: string; deptId?: number } = {
      sub: user.username,
      role: user.role,
    };

    if (user.deptId !== undefined) {
      payload.deptId = user.deptId;
    }

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  validateUser(payload: { sub: string; role: string; deptId?: number }): {
    sub: string;
    role: string;
    deptId?: number;
  } {
    const user = USERS.find((u) => u.username === payload.sub);
    if (!user) {
      throw new UnauthorizedException('无效的用户');
    }
    return { sub: payload.sub, role: payload.role, deptId: payload.deptId };
  }
}