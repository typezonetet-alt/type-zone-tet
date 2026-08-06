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

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash('Aluno#2026');
  });

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

  it('rejects a student login with the wrong password', async () => {
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

    await request(app.getHttpServer())
      .post('/auth/login/student')
      .send({ code: 'aluno01', password: 'senha-errada' })
      .expect(401);
  });

  it('rejects an unknown student code', async () => {
    prisma.student.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/auth/login/student')
      .send({ code: 'naoexiste', password: 'qualquer' })
      .expect(401);
  });

  it('logs a student in, sets a session cookie, and allows access to /auth/me', async () => {
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

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login/student')
      .send({ code: 'aluno01', password: 'Aluno#2026' })
      .expect(200);

    expect(loginRes.body).toEqual({
      id: 'user-1',
      role: 'STUDENT',
      name: 'Aluno Demo 1',
      email: null,
      code: 'aluno01',
    });

    const cookieHeader = loginRes.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    expect(String(cookieHeader)).toContain('HttpOnly');

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'STUDENT',
      status: 'ACTIVE',
      email: null,
      passwordHash,
      student: { id: 'student-1', code: 'aluno01', name: 'Aluno Demo 1' },
      teacher: null,
    });

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieHeader)
      .expect(200);

    expect(meRes.body).toEqual({
      id: 'user-1',
      role: 'STUDENT',
      name: 'Aluno Demo 1',
      email: null,
      code: 'aluno01',
    });
  });

  it('blocks /auth/me without a session cookie', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
