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

describe('Exercises + Attempts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let sessionCookie: string;

  const exercises = [
    {
      id: 'ex-1',
      worldId: 'world-1',
      title: 'Fundação',
      type: 'KEY_SEQUENCE',
      content: 'fj fj',
      order: 1,
      minAccuracy: 0.85,
      targetWpm: null,
      minAttempts: 1,
      allowedKeys: ['f', 'j'],
      status: 'PUBLISHED',
      world: { order: 1 },
    },
    {
      id: 'ex-2',
      worldId: 'world-1',
      title: 'Linha guia',
      type: 'KEY_SEQUENCE',
      content: 'asdf',
      order: 2,
      minAccuracy: 0.85,
      targetWpm: null,
      minAttempts: 1,
      allowedKeys: ['a', 's', 'd', 'f'],
      status: 'PUBLISHED',
      world: { order: 1 },
    },
  ];

  beforeEach(async () => {
    prisma = fakePrismaService();

    const passwordHash = await argon2.hash('Aluno#2026');
    prisma.student.findUnique.mockResolvedValue({
      id: 'student-1',
      code: 'aluno01',
      name: 'Aluno Demo 1',
      user: {
        id: 'user-1',
        role: 'STUDENT',
        status: 'ACTIVE',
        email: null,
        passwordHash,
      },
    });
    prisma.student.findUniqueOrThrow.mockResolvedValue({ id: 'student-1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'STUDENT',
      status: 'ACTIVE',
      email: null,
      passwordHash,
      student: { id: 'student-1', code: 'aluno01', name: 'Aluno Demo 1' },
      teacher: null,
    });
    prisma.exercise.findMany.mockResolvedValue(exercises);

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

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login/student')
      .send({ code: 'aluno01', password: 'Aluno#2026' })
      .expect(200);
    sessionCookie = loginRes.headers['set-cookie'];
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists exercises with only the first unlocked when there are no attempts', async () => {
    const res = await request(app.getHttpServer())
      .get('/exercises')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].unlocked).toBe(true);
    expect(res.body[1].unlocked).toBe(false);
  });

  it("returns 403 when fetching a locked exercise's content", async () => {
    await request(app.getHttpServer())
      .get('/exercises/ex-2')
      .set('Cookie', sessionCookie)
      .expect(403);
  });

  it('returns the content for an unlocked exercise', async () => {
    prisma.exercise.findUniqueOrThrow.mockResolvedValue(exercises[0]);

    const res = await request(app.getHttpServer())
      .get('/exercises/ex-1')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body.content).toBe('fj fj');
  });

  it('submits an attempt and unlocks the next exercise after passing', async () => {
    prisma.exercise.findUnique.mockResolvedValue(exercises[0]);
    prisma.attempt.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'attempt-1', ...data }),
    );

    const submitRes = await request(app.getHttpServer())
      .post('/attempts')
      .set('Cookie', sessionCookie)
      .send({
        exerciseId: 'ex-1',
        durationMs: 20_000,
        expectedChars: 10,
        typedChars: 10,
        correctChars: 10,
        incorrectChars: 0,
        backspaces: 0,
        charsPerSecondBuckets: [2, 2, 2],
        charStats: [{ char: 'f', attempts: 5, errors: 0 }],
      })
      .expect(201);

    expect(submitRes.body.passed).toBe(true);
    expect(submitRes.body.accuracy).toBe(1);
    expect(prisma.keystrokeStat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId_char: { studentId: 'student-1', char: 'f' } },
      }),
    );

    prisma.attempt.findMany.mockResolvedValue([
      { exerciseId: 'ex-1', accuracy: 1 },
    ]);

    const listRes = await request(app.getHttpServer())
      .get('/exercises')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(listRes.body[1].unlocked).toBe(true);
  });

  it('rejects an implausible attempt payload with a 400', async () => {
    prisma.exercise.findUnique.mockResolvedValue(exercises[0]);

    await request(app.getHttpServer())
      .post('/attempts')
      .set('Cookie', sessionCookie)
      .send({
        exerciseId: 'ex-1',
        durationMs: 20_000,
        expectedChars: 10,
        typedChars: 10,
        correctChars: 9,
        incorrectChars: 9,
        backspaces: 0,
        charsPerSecondBuckets: [],
        charStats: [],
      })
      .expect(400);
  });

  it('blocks access without a session', async () => {
    await request(app.getHttpServer()).get('/exercises').expect(401);
  });

  describe('GET /exercises/session (motor adaptativo)', () => {
    it('blocks access without a session', async () => {
      await request(app.getHttpServer()).get('/exercises/session').expect(401);
    });

    it('is matched by the dedicated route, not swallowed by GET /exercises/:id', async () => {
      const res = await request(app.getHttpServer())
        .get('/exercises/session')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('offers the unlocked exercise plus a locked preview of the next one', async () => {
      const res = await request(app.getHttpServer())
        .get('/exercises/session')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body).toContainEqual(
        expect.objectContaining({ id: 'ex-1', block: 'atual' }),
      );
      expect(res.body).toContainEqual(
        expect.objectContaining({
          id: 'ex-2',
          block: 'desafio',
          unlocked: false,
        }),
      );
    });
  });
});
