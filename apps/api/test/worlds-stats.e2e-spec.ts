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

describe('Worlds + Stats (e2e)', () => {
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

  it('lists worlds in order, flagging which ones have published content', async () => {
    prisma.world.findMany.mockResolvedValue([
      {
        id: 'w1',
        title: 'Mundo 1: Base',
        focus: 'F e J',
        order: 1,
        _count: { exercises: 2 },
      },
      {
        id: 'w2',
        title: 'Mundo 2: Controle',
        focus: 'Linha guia completa',
        order: 2,
        _count: { exercises: 0 },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/worlds')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body).toEqual([
      {
        id: 'w1',
        title: 'Mundo 1: Base',
        focus: 'F e J',
        order: 1,
        hasContent: true,
      },
      {
        id: 'w2',
        title: 'Mundo 2: Controle',
        focus: 'Linha guia completa',
        order: 2,
        hasContent: false,
      },
    ]);
  });

  it('blocks /worlds without a session', async () => {
    await request(app.getHttpServer()).get('/worlds').expect(401);
  });

  it('returns the weakest keys ranked by error rate', async () => {
    prisma.keystrokeStat.findMany.mockResolvedValue([
      { char: 'a', attempts: 10, errors: 1 },
      { char: 'ç', attempts: 10, errors: 7 },
    ]);

    const res = await request(app.getHttpServer())
      .get('/stats/weak-keys')
      .set('Cookie', sessionCookie)
      .expect(200);

    expect(res.body[0].char).toBe('ç');
    expect(res.body[0].errorRate).toBeCloseTo(0.7, 4);
  });

  it('blocks /stats/weak-keys without a session', async () => {
    await request(app.getHttpServer()).get('/stats/weak-keys').expect(401);
  });
});
