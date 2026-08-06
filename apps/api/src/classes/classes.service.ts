import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role as PrismaRole, type Prisma } from '@prisma/client';
import type {
  AuthenticatedUser,
  ClassDetail,
  ClassSummary,
  CreateClassPayload,
  CreatedCredentials,
  CreateStudentPayload,
  StudentProgress,
} from '@tt-digita/shared';
import { Role } from '@tt-digita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StatsService } from '../stats/stats.service';
import {
  generateStudentCode,
  generateTemporaryPassword,
} from '../common/credentials.util';

type ClassWithCounts = Prisma.ClassGetPayload<{
  include: { teacher: true; _count: { select: { members: true } } };
}>;

const CLASS_INCLUDE = {
  teacher: true,
  _count: { select: { members: true } },
} satisfies Prisma.ClassInclude;

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly stats: StatsService,
  ) {}

  async listForUser(user: AuthenticatedUser): Promise<ClassSummary[]> {
    const teacherId =
      user.role === Role.TEACHER ? await this.teacherIdFor(user.id) : undefined;

    const classes = await this.prisma.class.findMany({
      where: teacherId ? { teacherId } : undefined,
      orderBy: { createdAt: 'asc' },
      include: CLASS_INCLUDE,
    });

    return classes.map((cls) => this.toSummary(cls));
  }

  async getDetail(
    user: AuthenticatedUser,
    classId: string,
  ): Promise<ClassDetail> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: CLASS_INCLUDE,
    });
    if (!cls) {
      throw new NotFoundException('Turma não encontrada.');
    }
    await this.assertCanAccess(user, cls.teacherId);

    const members = await this.prisma.classMember.findMany({
      where: { classId },
      include: { student: true },
    });
    const studentIds = members.map((member) => member.studentId);

    const [publishedExercises, attempts, weakKeys] = await Promise.all([
      this.prisma.exercise.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, minAccuracy: true },
      }),
      this.prisma.attempt.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          exerciseId: true,
          accuracy: true,
          wpmNet: true,
          createdAt: true,
        },
      }),
      this.stats.getWeakKeysForStudents(studentIds),
    ]);

    const minAccuracyByExercise = new Map(
      publishedExercises.map((exercise) => [exercise.id, exercise.minAccuracy]),
    );

    const students: StudentProgress[] = members.map((member) =>
      this.buildStudentProgress(
        member.student,
        attempts.filter((attempt) => attempt.studentId === member.studentId),
        minAccuracyByExercise,
        publishedExercises.length,
      ),
    );

    return { ...this.toSummary(cls), students, weakKeys };
  }

  async create(dto: CreateClassPayload): Promise<ClassSummary> {
    if (dto.teacherId) {
      const teacherExists = await this.prisma.teacher.findUnique({
        where: { id: dto.teacherId },
      });
      if (!teacherExists) {
        throw new NotFoundException('Professor não encontrado.');
      }
    }

    const cls = await this.prisma.class.create({
      data: {
        name: dto.name,
        course: dto.course,
        shift: dto.shift,
        teacherId: dto.teacherId,
      },
      include: CLASS_INCLUDE,
    });

    return this.toSummary(cls);
  }

  async archive(classId: string): Promise<ClassSummary> {
    await this.assertClassExists(classId);

    const cls = await this.prisma.class.update({
      where: { id: classId },
      data: { status: 'ARCHIVED' },
      include: CLASS_INCLUDE,
    });

    return this.toSummary(cls);
  }

  async createStudent(
    classId: string,
    dto: CreateStudentPayload,
  ): Promise<CreatedCredentials> {
    await this.assertClassExists(classId);

    let code = dto.code?.trim().toLowerCase();
    if (code) {
      const existing = await this.prisma.student.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('Código já está em uso.');
      }
    } else {
      code = await this.uniqueStudentCode();
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword);
    const finalCode = code;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { role: PrismaRole.STUDENT, passwordHash },
      });
      const student = await tx.student.create({
        data: { userId: user.id, name: dto.name, code: finalCode },
      });
      await tx.classMember.create({ data: { studentId: student.id, classId } });
    });

    await this.audit.log('STUDENT_CREATED', null, { code: finalCode, classId });

    return { code: finalCode, email: null, temporaryPassword };
  }

  async addExistingMember(classId: string, code: string): Promise<void> {
    await this.assertClassExists(classId);

    const normalized = code.trim().toLowerCase();
    const student = await this.prisma.student.findUnique({
      where: { code: normalized },
    });
    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    const existingMembership = await this.prisma.classMember.findUnique({
      where: { studentId_classId: { studentId: student.id, classId } },
    });
    if (existingMembership) {
      throw new ConflictException('Aluno já está nesta turma.');
    }

    await this.prisma.classMember.create({
      data: { studentId: student.id, classId },
    });
  }

  async removeMember(classId: string, studentId: string): Promise<void> {
    const membership = await this.prisma.classMember.findUnique({
      where: { studentId_classId: { studentId, classId } },
    });
    if (!membership) {
      throw new NotFoundException('Aluno não está nesta turma.');
    }

    await this.prisma.classMember.delete({
      where: { studentId_classId: { studentId, classId } },
    });
  }

  private buildStudentProgress(
    student: { id: string; name: string; code: string },
    ownAttempts: {
      exerciseId: string;
      accuracy: number;
      wpmNet: number;
      createdAt: Date;
    }[],
    minAccuracyByExercise: Map<string, number>,
    exercisesTotal: number,
  ): StudentProgress {
    const bestByExercise = new Map<
      string,
      { accuracy: number; wpmNet: number }
    >();
    let lastPracticeAt: Date | null = null;

    for (const attempt of ownAttempts) {
      const current = bestByExercise.get(attempt.exerciseId);
      if (!current || attempt.accuracy > current.accuracy) {
        bestByExercise.set(attempt.exerciseId, {
          accuracy: attempt.accuracy,
          wpmNet: attempt.wpmNet,
        });
      }
      if (!lastPracticeAt || attempt.createdAt > lastPracticeAt) {
        lastPracticeAt = attempt.createdAt;
      }
    }

    let exercisesCompleted = 0;
    for (const [exerciseId, best] of bestByExercise) {
      const minAccuracy = minAccuracyByExercise.get(exerciseId);
      if (minAccuracy !== undefined && best.accuracy >= minAccuracy) {
        exercisesCompleted += 1;
      }
    }

    const bestValues = Array.from(bestByExercise.values());
    const bestAccuracyAvg = bestValues.length
      ? bestValues.reduce((sum, v) => sum + v.accuracy, 0) / bestValues.length
      : null;
    const bestWpmAvg = bestValues.length
      ? bestValues.reduce((sum, v) => sum + v.wpmNet, 0) / bestValues.length
      : null;

    return {
      id: student.id,
      name: student.name,
      code: student.code,
      exercisesCompleted,
      exercisesTotal,
      bestAccuracyAvg,
      bestWpmAvg,
      lastPracticeAt: lastPracticeAt ? lastPracticeAt.toISOString() : null,
    };
  }

  private async uniqueStudentCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateStudentCode();
      const existing = await this.prisma.student.findUnique({
        where: { code },
      });
      if (!existing) return code;
    }
    throw new ConflictException(
      'Não foi possível gerar um código único, tente novamente.',
    );
  }

  private async assertClassExists(classId: string): Promise<void> {
    const exists = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Turma não encontrada.');
    }
  }

  private async assertCanAccess(
    user: AuthenticatedUser,
    teacherId: string | null,
  ): Promise<void> {
    if (user.role === Role.ADMIN || user.role === Role.SUPERADMIN) return;

    const ownTeacherId = await this.teacherIdFor(user.id);
    if (teacherId !== ownTeacherId) {
      throw new ForbiddenException('Você não tem acesso a esta turma.');
    }
  }

  private async teacherIdFor(userId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });
    return teacher.id;
  }

  private toSummary(cls: ClassWithCounts): ClassSummary {
    return {
      id: cls.id,
      name: cls.name,
      course: cls.course,
      shift: cls.shift,
      status: cls.status,
      teacherId: cls.teacherId,
      teacherName: cls.teacher?.name ?? null,
      studentCount: cls._count.members,
    };
  }
}
