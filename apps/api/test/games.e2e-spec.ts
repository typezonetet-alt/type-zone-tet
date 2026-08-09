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

describe('Games (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let sessionCookie: string;

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

  it('blocks score submission without a session', async () => {
    await request(app.getHttpServer())
      .post('/games/orbital/scores')
      .send({
        score: 100,
        wordsCompleted: 5,
        accuracy: 0.9,
        durationMs: 30_000,
      })
      .expect(401);
  });

  it('submits a score and flags it as a new best', async () => {
    prisma.gameScore.findFirst.mockResolvedValue(null);
    prisma.gameScore.create.mockResolvedValue({
      id: 'score-1',
      score: 500,
      wordsCompleted: 20,
      accuracy: 0.95,
    });

    const res = await request(app.getHttpServer())
      .post('/games/orbital/scores')
      .set('Cookie', sessionCookie)
      .send({
        score: 500,
        wordsCompleted: 20,
        accuracy: 0.95,
        durationMs: 60_000,
      })
      .expect(201);

    expect(res.body).toEqual({
      id: 'score-1',
      score: 500,
      wordsCompleted: 20,
      accuracy: 0.95,
      isNewBest: true,
      previousBest: null,
    });
  });

  it('rejects an implausible score payload', async () => {
    await request(app.getHttpServer())
      .post('/games/orbital/scores')
      .set('Cookie', sessionCookie)
      .send({
        score: -5,
        wordsCompleted: 20,
        accuracy: 0.95,
        durationMs: 60_000,
      })
      .expect(400);
  });

  it('returns the personal best', async () => {
    prisma.gameScore.findFirst.mockResolvedValue({
      score: 900,
      wordsCompleted: 40,
      accuracy: 0.92,
    });

    const res = await request(app.getHttpServer())
      .get('/games/orbital/best')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toEqual({
      score: 900,
      wordsCompleted: 40,
      accuracy: 0.92,
    });
  });

  describe.each(['robo', 'chuva', 'defesa', 'fruta', 'ritmo'])('%s routes', (slug) => {
    it('blocks score submission without a session', async () => {
      await request(app.getHttpServer())
        .post(`/games/${slug}/scores`)
        .send({
          score: 100,
          wordsCompleted: 5,
          accuracy: 0.9,
          durationMs: 30_000,
        })
        .expect(401);
    });

    it('submits a score and flags it as a new best', async () => {
      prisma.gameScore.findFirst.mockResolvedValue(null);
      prisma.gameScore.create.mockResolvedValue({
        id: `${slug}-score-1`,
        score: 300,
        wordsCompleted: 12,
        accuracy: 0.88,
      });

      const res = await request(app.getHttpServer())
        .post(`/games/${slug}/scores`)
        .set('Cookie', sessionCookie)
        .send({
          score: 300,
          wordsCompleted: 12,
          accuracy: 0.88,
          durationMs: 45_000,
        })
        .expect(201);

      expect(res.body).toEqual({
        id: `${slug}-score-1`,
        score: 300,
        wordsCompleted: 12,
        accuracy: 0.88,
        isNewBest: true,
        previousBest: null,
      });
    });

    it('rejects an implausible score payload', async () => {
      await request(app.getHttpServer())
        .post(`/games/${slug}/scores`)
        .set('Cookie', sessionCookie)
        .send({
          score: -5,
          wordsCompleted: 12,
          accuracy: 0.88,
          durationMs: 45_000,
        })
        .expect(400);
    });

    it('returns the personal best', async () => {
      prisma.gameScore.findFirst.mockResolvedValue({
        score: 700,
        wordsCompleted: 30,
        accuracy: 0.9,
      });

      const res = await request(app.getHttpServer())
        .get(`/games/${slug}/best`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body).toEqual({
        score: 700,
        wordsCompleted: 30,
        accuracy: 0.9,
      });
    });
  });
});
