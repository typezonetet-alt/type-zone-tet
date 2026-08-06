import { Test, type TestingModule } from '@nestjs/testing';
import { WorldsService } from './worlds.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorldsService', () => {
  let service: WorldsService;

  const prismaMock = {
    world: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(WorldsService);
  });

  it('marks a world with published exercises as having content', async () => {
    prismaMock.world.findMany.mockResolvedValue([
      {
        id: 'w1',
        title: 'Base',
        focus: 'F e J',
        order: 1,
        _count: { exercises: 2 },
      },
      {
        id: 'w2',
        title: 'Elite',
        focus: 'Testes avançados',
        order: 12,
        _count: { exercises: 0 },
      },
    ]);

    const result = await service.list();

    expect(result).toEqual([
      { id: 'w1', title: 'Base', focus: 'F e J', order: 1, hasContent: true },
      {
        id: 'w2',
        title: 'Elite',
        focus: 'Testes avançados',
        order: 12,
        hasContent: false,
      },
    ]);
  });

  it('orders worlds by their sequence number', async () => {
    await service.list();

    expect(prismaMock.world.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: 'asc' } }),
    );
  });
});
