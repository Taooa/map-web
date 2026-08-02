import { MemoryPointRepository } from '@/adapters/storage';
import type { IsoDateTime, PointId } from '@/domain';
import { createPointService } from '@/features/points';

const pointId = 'point-feature-test' as PointId;
const timestamp = '2026-07-29T06:30:00.000Z' as IsoDateTime;

function setup() {
  const repository = new MemoryPointRepository();
  const service = createPointService(repository, {
    createId: () => pointId,
    now: () => timestamp,
  });
  return { repository, service };
}

describe('PointService', () => {
  it('creates a point with an immutable original and empty converted cache', async () => {
    const { repository, service } = setup();

    const result = await service.createPoint({
      name: '  浦东机房 A-01  ',
      system: 'WGS84',
      first: 121.544379,
      second: 31.221517,
    });

    expect(result).toMatchObject({
      status: 'success',
      value: {
        id: pointId,
        name: '浦东机房 A-01',
        source: { type: 'manual' },
        coordinates: {
          original: {
            kind: 'geographic',
            system: 'WGS84',
            unit: 'degree',
            lng: 121.544379,
            lat: 31.221517,
          },
          converted: {},
        },
      },
    });
    expect(await repository.get(pointId)).toEqual(result);
  });

  it('stores Shanghai 2000 as projected original data without conversion', async () => {
    const { service } = setup();

    const result = await service.createPoint({
      name: '杨浦基站',
      system: 'SHANGHAI2000',
      first: 506842.31,
      second: 3459278.64,
    });

    expect(result).toMatchObject({
      status: 'success',
      value: {
        coordinates: {
          original: {
            kind: 'projected',
            system: 'SHANGHAI2000',
            unit: 'metre',
            x: 506842.31,
            y: 3459278.64,
          },
          converted: {},
        },
      },
    });
  });

  it('lists and deletes points through the repository boundary', async () => {
    const { service } = setup();
    await service.createPoint({
      name: '测试点位',
      system: 'GCJ02',
      first: 121,
      second: 31,
    });

    const listed = await service.listPoints('测试');
    expect(listed.status === 'success' && listed.value).toHaveLength(1);

    expect((await service.deletePoint(pointId)).status).toBe('success');
    expect(await service.listPoints()).toEqual({ status: 'success', value: [] });
  });

  it('rejects invalid geographic coordinates', async () => {
    const { service } = setup();

    const result = await service.createPoint({
      name: '无效点位',
      system: 'BD09',
      first: 200,
      second: 31,
    });

    expect(result).toMatchObject({
      status: 'failure',
      error: { code: 'INVALID_COORDINATE' },
    });
  });

  it('transforms one point, writes converted data and preserves original', async () => {
    const { repository, service } = setup();
    const created = await service.createPoint({
      name: '人民广场设备',
      system: 'WGS84',
      first: 121.4737,
      second: 31.2304,
    });
    expect(created.status).toBe('success');
    if (created.status !== 'success') return;
    const original = created.value.coordinates.original;

    const transformed = await service.transformPoint(pointId, 'GCJ02');

    expect(transformed).toMatchObject({
      status: 'success',
      value: {
        coordinates: {
          original: {
            kind: 'geographic',
            system: 'WGS84',
            lng: 121.4737,
            lat: 31.2304,
          },
          converted: {
            GCJ02: {
              coordinate: {
                kind: 'geographic',
                system: 'GCJ02',
                lng: 121.47822305927693,
                lat: 31.22845773757727,
              },
              algorithmVersion: 'gcoord@0.3.2',
              transformedAt: timestamp,
            },
          },
        },
        updatedAt: timestamp,
      },
    });
    if (transformed.status === 'success') {
      expect(transformed.value.coordinates.original).toBe(original);
      expect(await repository.get(pointId)).toEqual(transformed);
    }
  });

  it('rejects unsupported transformation without writing converted data', async () => {
    const { repository, service } = setup();
    await service.createPoint({
      name: '上海2000点位',
      system: 'SHANGHAI2000',
      first: 506842.31,
      second: 3459278.64,
    });

    const transformed = await service.transformPoint(pointId, 'WGS84');

    expect(transformed).toMatchObject({
      status: 'failure',
      error: { code: 'UNSUPPORTED_TRANSFORMATION', pointId },
    });
    const stored = await repository.get(pointId);
    expect(stored).toMatchObject({
      status: 'success',
      value: { coordinates: { converted: {} } },
    });
  });

  it('does not overwrite existing converted data when a later transformation fails', async () => {
    const { repository, service } = setup();
    await service.createPoint({
      name: '缓存保护点位',
      system: 'WGS84',
      first: 121.4737,
      second: 31.2304,
    });
    const firstTransformation = await service.transformPoint(pointId, 'GCJ02');
    expect(firstTransformation.status).toBe('success');
    if (firstTransformation.status !== 'success') return;
    const cachedGcj02 = firstTransformation.value.coordinates.converted.GCJ02;

    const failedTransformation = await service.transformPoint(pointId, 'CGCS2000');

    expect(failedTransformation).toMatchObject({
      status: 'failure',
      error: { code: 'UNSUPPORTED_TRANSFORMATION' },
    });
    const stored = await repository.get(pointId);
    expect(stored.status).toBe('success');
    if (stored.status === 'success' && stored.value) {
      expect(stored.value.coordinates.converted.GCJ02).toEqual(cachedGcj02);
      expect(stored.value.coordinates.converted.CGCS2000).toBeUndefined();
    }
  });
});
