import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role as PrismaRole } from '@prisma/client';
import { AuthenticatedUser, Role } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface JwtPayload {
  sub: string;
  role: Role;
}

// Role do Prisma e Role do pacote compartilhado tem os mesmos valores de string
// (STUDENT/TEACHER/ADMIN/SUPERADMIN) por design; o Prisma so gera seu proprio tipo.
function toSharedRole(role: PrismaRole): Role {
  return role as unknown as Role;
}

const GENERIC_INVALID_CREDENTIALS = 'Código ou senha inválidos.';
const GENERIC_INVALID_STAFF_CREDENTIALS = 'E-mail ou senha inválidos.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async validateStudent(
    rawCode: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const code = rawCode.trim().toLowerCase();

    const student = await this.prisma.student.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!student || student.user.status !== 'ACTIVE') {
      await this.audit.log('LOGIN_FAILURE', null, { type: 'student', code });
      throw new UnauthorizedException(GENERIC_INVALID_CREDENTIALS);
    }

    const valid = await argon2.verify(student.user.passwordHash, password);
    if (!valid) {
      await this.audit.log('LOGIN_FAILURE', student.user.id, {
        type: 'student',
      });
      throw new UnauthorizedException(GENERIC_INVALID_CREDENTIALS);
    }

    await this.onLoginSuccess(student.user.id);

    return {
      id: student.user.id,
      role: toSharedRole(student.user.role),
      name: student.name,
      email: null,
      code: student.code,
    };
  }

  async validateStaff(
    rawEmail: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const email = rawEmail.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { teacher: true },
    });

    const isStaff = user && user.role !== 'STUDENT';

    if (!user || !isStaff || user.status !== 'ACTIVE') {
      await this.audit.log('LOGIN_FAILURE', null, { type: 'staff', email });
      throw new UnauthorizedException(GENERIC_INVALID_STAFF_CREDENTIALS);
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      await this.audit.log('LOGIN_FAILURE', user.id, { type: 'staff' });
      throw new UnauthorizedException(GENERIC_INVALID_STAFF_CREDENTIALS);
    }

    await this.onLoginSuccess(user.id);

    return {
      id: user.id,
      role: toSharedRole(user.role),
      name: user.teacher?.name ?? user.email ?? 'Equipe T&T',
      email: user.email,
      code: null,
    };
  }

  async issueToken(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwt.signAsync(payload);
  }

  async getAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true, teacher: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: user.id,
      role: toSharedRole(user.role),
      name:
        user.student?.name ?? user.teacher?.name ?? user.email ?? 'Equipe T&T',
      email: user.email,
      code: user.student?.code ?? null,
    };
  }

  private async onLoginSuccess(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log('LOGIN_SUCCESS', userId);
  }
}
