import { MemoryPointRepository } from '@/adapters/storage';
import type { IsoDateTime, Point, PointId } from '@/domain';

const timestamp = '2026-07-29T06:00:00.000Z' as IsoDateTime;

function point(id: string, name: string): Point {
  return {
    id: id as PointId,
    name,
    source: { type: 'manual' },
    coordinates: {
      original: {
        kind: 'geographic',
        system: 'WGS84',
        unit: 'degree',
        lng: 121.4737,
        lat: 31.2304,
      },
      converted: {},
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('MemoryPointRepository', () => {
  it('creates, lists and deletes points in memory', async () => {
    const repository = new MemoryPointRepository();
    const first = point('memory-1', '浦东机房');
    const second = point('memory-2', '虹桥网关');

    expect((await repository.create(first)).status).toBe('success');
    expect((await repository.create(second)).status).toBe('success');

    const listed = await repository.list({ search: '浦东' });
    expect(listed).toEqual({ status: 'success', value: [first] });

    expect((await repository.delete(first.id)).status).toBe('success');
    expect(await repository.get(first.id)).toEqual({ status: 'success', value: null });
  });

  it('rejects duplicate ids', async () => {
    const repository = new MemoryPointRepository();
    const existing = point('duplicate', '已有点位');

    await repository.create(existing);
    const duplicate = await repository.create(point('duplicate', '重复点位'));

    expect(duplicate).toMatchObject({
      status: 'failure',
      error: { code: 'CONFLICT' },
    });
  });
});
