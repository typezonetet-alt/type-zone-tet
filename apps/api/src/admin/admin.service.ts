import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role as PrismaRole } from '@prisma/client';
import type {
  AdminOverview,
  AuditLogQuery,
  AuditLogRow,
  CreatedCredentials,
  CreateTeacherPayload,
  TeacherSummary,
} from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateTemporaryPassword } from '../common/credentials.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async overview(): Promise<AdminOverview> {
    const [teacherCount, classCount, studentCount] = await Promise.all([
      this.prisma.teacher.count(),
      this.prisma.class.count(),
      this.prisma.student.count(),
    ]);
    return { teacherCount, classCount, studentCount };
  }

  async listTeachers(): Promise<TeacherSummary[]> {
    const teachers = await this.prisma.teacher.findMany({
      include: { user: true, _count: { select: { classes: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      email: teacher.user.email ?? '',
      classCount: teacher._count.classes,
    }));
  }

  async createTeacher(dto: CreateTeacherPayload): Promise<CreatedCredentials> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já está em uso.');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { role: PrismaRole.TEACHER, email, passwordHash },
      });
      await tx.teacher.create({ data: { userId: user.id, name: dto.name } });
    });

    await this.audit.log('TEACHER_CREATED', null, { email });

    return { code: null, email, temporaryPassword };
  }

  // Relatorio "Auditoria" (briefing secao 35): tela restrita, sem CSV --
  // registro sensivel de quem fez o que, so pra admin/superadmin conferirem.
  async listAuditLog(query: AuditLogQuery): Promise<AuditLogRow[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId: query.userId,
        action: query.action,
        createdAt:
          query.from || query.to
            ? {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async resetStudentProgress(studentId: string): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    await this.prisma.$transaction([
      this.prisma.attempt.deleteMany({ where: { studentId } }),
      this.prisma.keystrokeStat.deleteMany({ where: { studentId } }),
    ]);

    await this.audit.log('STUDENT_PROGRESS_RESET', null, { studentId });
  }
}
