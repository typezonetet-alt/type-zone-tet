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

describe('Classes + Admin (e2e)', () => {
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
    role: 'TEACHER' | 'ADMIN',
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

  describe('GET /classes', () => {
    it('blocks anonymous requests', async () => {
      await request(app.getHttpServer()).get('/classes').expect(401);
    });

    it('lists every class for an admin', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findMany.mockResolvedValue([
        {
          id: 'class-1',
          name: 'Turma A',
          course: null,
          shift: null,
          status: 'ACTIVE',
          teacherId: 'teacher-1',
          teacher: { name: 'Prof' },
          _count: { members: 3 },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/classes')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual([
        {
          id: 'class-1',
          name: 'Turma A',
          course: null,
          shift: null,
          status: 'ACTIVE',
          teacherId: 'teacher-1',
          teacherName: 'Prof',
          studentCount: 3,
        },
      ]);
    });

    it('scopes results to the logged in teacher', async () => {
      const cookie = await loginAs('TEACHER', { teacherId: 'teacher-9' });
      prisma.teacher.findUniqueOrThrow.mockResolvedValue({ id: 'teacher-9' });
      prisma.class.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/classes')
        .set('Cookie', cookie)
        .expect(200);

      expect(prisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teacherId: 'teacher-9' } }),
      );
    });
  });

  describe('GET /classes/:id', () => {
    it('forbids a teacher from viewing a class they do not own', async () => {
      const cookie = await loginAs('TEACHER', { teacherId: 'teacher-9' });
      prisma.teacher.findUniqueOrThrow.mockResolvedValue({ id: 'teacher-9' });
      prisma.class.findUnique.mockResolvedValue({
        id: 'class-1',
        name: 'Turma A',
        course: null,
        shift: null,
        status: 'ACTIVE',
        teacherId: 'someone-else',
        teacher: { name: 'Outro Prof' },
        _count: { members: 0 },
      });

      await request(app.getHttpServer())
        .get('/classes/class-1')
        .set('Cookie', cookie)
        .expect(403);
    });
  });

  describe('POST /classes', () => {
    it('rejects a teacher trying to create a class', async () => {
      const cookie = await loginAs('TEACHER');
      await request(app.getHttpServer())
        .post('/classes')
        .set('Cookie', cookie)
        .send({ name: 'Turma Nova' })
        .expect(403);
    });

    it('lets an admin create a class', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.create.mockResolvedValue({
        id: 'class-2',
        name: 'Turma Nova',
        course: null,
        shift: null,
        status: 'ACTIVE',
        teacherId: null,
        teacher: null,
        _count: { members: 0 },
      });

      const res = await request(app.getHttpServer())
        .post('/classes')
        .set('Cookie', cookie)
        .send({ name: 'Turma Nova' })
        .expect(201);

      expect(res.body.name).toBe('Turma Nova');
    });
  });

  describe('POST /classes/:id/students', () => {
    it('creates a student and returns one-time credentials', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prisma.student.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/classes/class-1/students')
        .set('Cookie', cookie)
        .send({ name: 'Aluno Novo' })
        .expect(201);

      expect(res.body.code).toMatch(/^aluno/);
      expect(typeof res.body.temporaryPassword).toBe('string');
      expect(res.body.temporaryPassword.length).toBeGreaterThan(0);
    });
  });

  describe('POST /classes/:id/students/bulk', () => {
    it('imports every valid name in one request', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prisma.student.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/classes/class-1/students/bulk')
        .set('Cookie', cookie)
        .send({ names: ['Maria Silva', '  ', 'João Souza'] })
        .expect(201);

      expect(res.body.created).toHaveLength(2);
      expect(res.body.failed).toEqual([{ name: '  ', reason: 'Nome vazio.' }]);
    });

    it('blocks a teacher from bulk-importing students', async () => {
      const cookie = await loginAs('TEACHER');
      await request(app.getHttpServer())
        .post('/classes/class-1/students/bulk')
        .set('Cookie', cookie)
        .send({ names: ['Aluno'] })
        .expect(403);
    });

    it('rejects an empty names array', async () => {
      const cookie = await loginAs('ADMIN');
      await request(app.getHttpServer())
        .post('/classes/class-1/students/bulk')
        .set('Cookie', cookie)
        .send({ names: [] })
        .expect(400);
    });
  });

  describe('admin overview + teachers', () => {
    it('blocks a teacher from the admin overview', async () => {
      const cookie = await loginAs('TEACHER');
      await request(app.getHttpServer())
        .get('/admin/overview')
        .set('Cookie', cookie)
        .expect(403);
    });

    it('returns counts for an admin', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.teacher.count.mockResolvedValue(2);
      prisma.class.count.mockResolvedValue(5);
      prisma.student.count.mockResolvedValue(60);

      const res = await request(app.getHttpServer())
        .get('/admin/overview')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toEqual({
        teacherCount: 2,
        classCount: 5,
        studentCount: 60,
      });
    });

    it('creates a teacher with a generated password', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-ADMIN',
        role: 'ADMIN',
        status: 'ACTIVE',
        email: 'admin@tt.com',
        passwordHash: await argon2.hash(STAFF_PASSWORD),
        teacher: null,
      });
      // A checagem de e-mail duplicado dentro do service deve achar "ninguem".
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/admin/teachers')
        .set('Cookie', cookie)
        .send({ name: 'Novo Professor', email: 'novo.professor@tt.com' })
        .expect(201);

      expect(res.body.email).toBe('novo.professor@tt.com');
      expect(res.body.temporaryPassword).toBeTruthy();
    });
  });

  describe('POST /admin/students/:id/reset-progress', () => {
    it('deletes attempts and keystroke stats', async () => {
      const cookie = await loginAs('ADMIN');
      prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });

      await request(app.getHttpServer())
        .post('/admin/students/student-1/reset-progress')
        .set('Cookie', cookie)
        .expect(201);

      expect(prisma.attempt.deleteMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
      });
      expect(prisma.keystrokeStat.deleteMany).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
      });
    });

    it('rejects a teacher trying to reset progress', async () => {
      const cookie = await loginAs('TEACHER');
      await request(app.getHttpServer())
        .post('/admin/students/student-1/reset-progress')
        .set('Cookie', cookie)
        .expect(403);
    });
  });
});
