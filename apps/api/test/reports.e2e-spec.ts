import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  fakePrismaService,
  type FakePrismaService,
} from './fake-prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;

  const STAFF_PASSWORD = 'Staff#2026';

  beforeEach(async () => {
    prisma = fakePrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAs(
    role: 'TEACHER' | 'ADMIN' | 'SUPERADMIN',
    extra?: { teacherId?: string },
  ) {
    const passwordHash = await argon2.hash(STAFF_PASSWORD);
    prisma.user.findUnique.mockResolvedValue({
      id: `user-${role}`,
      role,
      status: 'ACTIVE',
      email: `${role.toLowerCase()}@tt.com`,
      passwordHash,
      teacher:
        role === 'TEACHER'
          ? { id: extra?.teacherId ?? 'teacher-1', name: 'Prof' }
          : null,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login/staff')
      .send({ email: `${role.toLowerCase()}@tt.com`, password: STAFF_PASSWORD })
      .expect(200);

    return res.headers['set-cookie'];
  }

  describe('GET /classes/:id/reports/practice-frequency', () => {
    it('blocks anonymous requests', async () => {
      await request(app.getHttpServer())
        .get('/classes/class-1/reports/practice-frequency')
        .expect(401);
    });

    it('returns minutes/days aggregated per student as JSON', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findUnique.mockResolvedValue({ teacherId: null });
      prisma.classMember.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          student: { id: 'student-1', name: 'Aluno 1' },
        },
      ]);
      prisma.dailyActivity.findMany.mockResolvedValue([
        { studentId: 'student-1', secondsTrained: 1200 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/classes/class-1/reports/practice-frequency')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual([
        {
          studentId: 'student-1',
          studentName: 'Aluno 1',
          daysActive: 1,
          totalMinutes: 20,
          avgMinutesPerActiveDay: 20,
        },
      ]);
    });

    it('returns the same data as a CSV download', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findUnique.mockResolvedValue({ teacherId: null });
      prisma.classMember.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          student: { id: 'student-1', name: 'Aluno 1' },
        },
      ]);
      prisma.dailyActivity.findMany.mockResolvedValue([
        { studentId: 'student-1', secondsTrained: 1200 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/classes/class-1/reports/practice-frequency?format=csv')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Aluno');
      expect(res.text).toContain('Aluno 1');
    });

    it("forbids a teacher from another class's report", async () => {
      const cookie = await loginAs('TEACHER', { teacherId: 'teacher-1' });
      prisma.teacher.findUniqueOrThrow.mockResolvedValue({ id: 'teacher-1' });
      prisma.class.findUnique.mockResolvedValue({ teacherId: 'someone-else' });

      await request(app.getHttpServer())
        .get('/classes/class-1/reports/practice-frequency')
        .set('Cookie', cookie)
        .expect(403);
    });
  });

  describe('GET /classes/:id/reports/students/:studentId/evolution', () => {
    it('404s when the student does not belong to the class', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findUnique.mockResolvedValue({ teacherId: null });
      prisma.classMember.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/classes/class-1/reports/students/student-1/evolution')
        .set('Cookie', cookie)
        .expect(404);
    });
  });

  describe('GET /classes/:id/reports/season-ranking', () => {
    it('returns an empty ranking when there is no active season', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findUnique.mockResolvedValue({ teacherId: null });
      prisma.classMember.findMany.mockResolvedValue([]);
      prisma.season.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/classes/class-1/reports/season-ranking')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /rooms/:id/results', () => {
    it('returns results ordered by position for the host', async () => {
      const cookie = await loginAs('TEACHER', { teacherId: 'teacher-1' });
      prisma.liveRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        hostUserId: 'user-TEACHER',
        participants: [
          {
            studentId: 'student-1',
            position: 1,
            totalPoints: 180,
            student: { name: 'Aluno 1' },
          },
        ],
        roundResults: [{ studentId: 'student-1' }, { studentId: 'student-1' }],
      });

      const res = await request(app.getHttpServer())
        .get('/rooms/room-1/results')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual([
        {
          studentId: 'student-1',
          studentName: 'Aluno 1',
          position: 1,
          totalPoints: 180,
          roundsCompleted: 2,
        },
      ]);
    });

    it('forbids a teacher who does not host the room', async () => {
      const cookie = await loginAs('TEACHER', { teacherId: 'teacher-1' });
      prisma.liveRoom.findUnique.mockResolvedValue({
        id: 'room-1',
        hostUserId: 'someone-else',
        participants: [],
        roundResults: [],
      });

      await request(app.getHttpServer())
        .get('/rooms/room-1/results')
        .set('Cookie', cookie)
        .expect(403);
    });
  });

  describe('GET /admin/audit-log', () => {
    it('blocks an admin (superadmin-only report)', async () => {
      const cookie = await loginAs('ADMIN');
      await request(app.getHttpServer())
        .get('/admin/audit-log')
        .set('Cookie', cookie)
        .expect(403);
    });

    it('returns log rows for a superadmin', async () => {
      const cookie = await loginAs('SUPERADMIN');
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: null,
          action: 'STUDENT_CREATED',
          metadata: { classId: 'class-1' },
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/admin/audit-log')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual([
        {
          id: 'log-1',
          userId: null,
          action: 'STUDENT_CREATED',
          metadata: { classId: 'class-1' },
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });
});
