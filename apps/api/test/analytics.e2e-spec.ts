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

describe('Analytics (e2e)', () => {
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

  async function loginAs(role: 'TEACHER' | 'ADMIN') {
    const passwordHash = await argon2.hash(STAFF_PASSWORD);
    prisma.user.findUnique.mockResolvedValue({
      id: `user-${role}`,
      role,
      status: 'ACTIVE',
      email: `${role.toLowerCase()}@tt.com`,
      passwordHash,
      teacher: role === 'TEACHER' ? { id: 'teacher-1', name: 'Prof' } : null,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login/staff')
      .send({ email: `${role.toLowerCase()}@tt.com`, password: STAFF_PASSWORD })
      .expect(200);

    return res.headers['set-cookie'];
  }

  it('blocks anonymous requests', async () => {
    await request(app.getHttpServer()).get('/admin/analytics').expect(401);
  });

  it('blocks a teacher from the product analytics dashboard', async () => {
    const cookie = await loginAs('TEACHER');
    await request(app.getHttpServer())
      .get('/admin/analytics')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('returns aggregated metrics for an admin', async () => {
    const cookie = await loginAs('ADMIN');
    prisma.student.count.mockResolvedValue(10);
    prisma.attempt.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        exerciseId: 'ex-1',
        accuracy: 0.9,
        wpmNet: 30,
        exercise: { minAccuracy: 0.85 },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/admin/analytics')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body).toMatchObject({
      totalStudents: 10,
      activatedStudents: 1,
      activationRate: 0.1,
      exercisesCompletedTotal: 1,
    });
  });
});
