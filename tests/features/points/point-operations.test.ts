import { MemoryPointRepository } from '@/adapters/storage';
import type { IsoDateTime, PointId } from '@/domain';
import { createPointService } from '@/features/points';

describe('PointService editing and scoped operations', () => {
  it('edits original and converted coordinate pairs while preserving source identity', async () => {
    const service = createPointService(new MemoryPointRepository(), {
      createId: () => 'edit-point' as PointId,
      now: () => '2026-08-02T08:00:00.000Z' as IsoDateTime,
    });
    await service.createPoint({ name: '原名称', system: 'WGS84', first: 121, second: 31 });
    const result = await service.updatePoint('edit-point' as PointId, {
      name: '新名称',
      coordinates: { WGS84: { first: 122, second: 32 }, GCJ02: { first: 122.1, second: 31.9 } },
    });
    expect(result).toMatchObject({
      status: 'success',
      value: {
        name: '新名称',
        coordinates: {
          original: { system: 'WGS84', lng: 122, lat: 32 },
          converted: {
            GCJ02: { coordinate: { lng: 122.1, lat: 31.9 }, algorithmVersion: 'manual-edit' },
          },
        },
      },
    });
  });

  it('transforms from the chosen cached source and reports missing sources per point', async () => {
    let id = 0;
    const service = createPointService(new MemoryPointRepository(), {
      createId: () => `point-${++id}` as PointId,
    });
    const first = await service.createPoint({
      name: '有源坐标',
      system: 'WGS84',
      first: 121,
      second: 31,
    });
    const second = await service.createPoint({
      name: '缺少源坐标',
      system: 'WGS84',
      first: 122,
      second: 32,
    });
    if (first.status !== 'success' || second.status !== 'success') throw new Error('seed failed');
    await service.transformPointFrom(first.value.id, 'WGS84', 'GCJ02');
    const progress: { completed: number; total: number }[] = [];
    const result = await service.transformPointsFrom(
      [first.value.id, second.value.id],
      'GCJ02',
      'BD09',
      (next) => progress.push(next),
    );
    expect(progress).toEqual([
      { completed: 1, total: 2 },
      { completed: 2, total: 2 },
    ]);
    expect(result).toMatchObject({
      total: 2,
      successCount: 1,
      failureCount: 1,
      failures: [{ pointName: '缺少源坐标', source: 'GCJ02' }],
    });
  });
});
