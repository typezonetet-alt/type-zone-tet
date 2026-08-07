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

describe('Gamification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let sessionCookie: string;

  const activeSeason = {
    id: 'season-1',
    index: 1,
    startsAt: new Date('2026-06-01T00:00:00Z'),
    endsAt: new Date('2026-07-01T00:00:00Z'),
    closedAt: null,
  };

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
    prisma.season.findFirst.mockResolvedValue(activeSeason);

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

  it('blocks every gamification route without a session', async () => {
    await request(app.getHttpServer()).get('/gamification/profile').expect(401);
    await request(app.getHttpServer())
      .get('/gamification/missions')
      .expect(401);
    await request(app.getHttpServer())
      .get('/gamification/leaderboard')
      .expect(401);
  });

  it('returns a fresh zeroed profile for a student with no history', async () => {
    const res = await request(app.getHttpServer())
      .get('/gamification/profile')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toMatchObject({
      xp: 0,
      level: 1,
      coins: 0,
      currentStreak: 0,
      longestStreak: 0,
      equippedFrameId: null,
    });
  });

  it('lists all six daily missions, none completed for a fresh day', async () => {
    const res = await request(app.getHttpServer())
      .get('/gamification/missions')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toHaveLength(6);
    expect(
      res.body.every((m: { completed: boolean }) => m.completed === false),
    ).toBe(true);
  });

  it('lists all eight achievements as locked when none were unlocked', async () => {
    const res = await request(app.getHttpServer())
      .get('/gamification/achievements')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toHaveLength(8);
    expect(
      res.body.every((a: { unlocked: boolean }) => a.unlocked === false),
    ).toBe(true);
  });

  it('reflects an unlocked achievement from the database', async () => {
    prisma.studentAchievement.findMany.mockResolvedValue([
      { key: 'FIRST_LESSON', unlockedAt: new Date('2026-05-20T10:00:00Z') },
    ]);

    const res = await request(app.getHttpServer())
      .get('/gamification/achievements')
      .set('Cookie', sessionCookie)
      .expect(200);

    const firstLesson = res.body.find(
      (a: { key: string }) => a.key === 'FIRST_LESSON',
    );
    expect(firstLesson.unlocked).toBe(true);
    expect(firstLesson.unlockedAt).toBe('2026-05-20T10:00:00.000Z');
  });

  it('purchases a free level-1 cosmetic and reflects it as owned', async () => {
    prisma.studentCosmetic.findUnique.mockResolvedValue(null);
    prisma.studentCosmetic.findMany.mockResolvedValue([
      { cosmeticId: 'frame_bronze' },
    ]);

    const res = await request(app.getHttpServer())
      .post('/gamification/cosmetics/frame_bronze/purchase')
      .set('Cookie', sessionCookie)
      .expect(201);

    const bronze = res.body.find(
      (c: { id: string }) => c.id === 'frame_bronze',
    );
    expect(bronze.owned).toBe(true);
  });

  it('rejects purchasing a cosmetic above the student level', async () => {
    prisma.studentCosmetic.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/gamification/cosmetics/frame_neon/purchase')
      .set('Cookie', sessionCookie)
      .expect(400);
  });

  it('rejects equipping a cosmetic the student does not own', async () => {
    prisma.studentCosmetic.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/gamification/cosmetics/frame_prata/equip')
      .set('Cookie', sessionCookie)
      .expect(400);
  });

  it('equips an owned cosmetic', async () => {
    prisma.studentCosmetic.findUnique.mockResolvedValue({
      studentId: 'student-1',
    });
    prisma.studentCosmetic.findMany.mockResolvedValue([
      { cosmeticId: 'frame_prata' },
    ]);
    prisma.studentProfile.upsert.mockResolvedValue({
      studentId: 'student-1',
      xp: 0,
      level: 3,
      coins: 0,
      totalCorrectWords: 0,
      bestWpmNet: 0,
      currentStreak: 0,
      longestStreak: 0,
      distinctActiveDays: 0,
      lastActiveDate: null,
      equippedFrameId: 'frame_prata',
      equippedThemeId: null,
      equippedTitleId: null,
    });

    const res = await request(app.getHttpServer())
      .post('/gamification/cosmetics/frame_prata/equip')
      .set('Cookie', sessionCookie)
      .expect(201);

    const prata = res.body.find((c: { id: string }) => c.id === 'frame_prata');
    expect(prata.equipped).toBe(true);
  });

  it('reports the current league and distance to the next one', async () => {
    prisma.seasonScore.upsert.mockResolvedValue({
      id: 'score-1',
      seasonId: 'season-1',
      studentId: 'student-1',
      points: 250,
      league: 'PRATA',
      finalRank: null,
    });

    const res = await request(app.getHttpServer())
      .get('/gamification/season')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toMatchObject({
      index: 1,
      league: 'PRATA',
      points: 250,
      nextLeague: 'OURO',
      pointsToNextLeague: 350,
    });
  });

  it('ranks the leaderboard by season points, highest first', async () => {
    prisma.seasonScore.findMany.mockResolvedValue([
      {
        studentId: 'student-2',
        points: 500,
        league: 'OURO',
        student: { name: 'Aluno Dois' },
      },
      {
        studentId: 'student-1',
        points: 250,
        league: 'PRATA',
        student: { name: 'Aluno Demo 1' },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/gamification/leaderboard?scope=geral')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toEqual([
      {
        studentId: 'student-2',
        name: 'Aluno Dois',
        points: 500,
        league: 'OURO',
        rank: 1,
        isCurrentStudent: false,
      },
      {
        studentId: 'student-1',
        name: 'Aluno Demo 1',
        points: 250,
        league: 'PRATA',
        rank: 2,
        isCurrentStudent: true,
      },
    ]);
  });

  it('rejects an invalid leaderboard scope', async () => {
    await request(app.getHttpServer())
      .get('/gamification/leaderboard?scope=invalido')
      .set('Cookie', sessionCookie)
      .expect(400);
  });
});
