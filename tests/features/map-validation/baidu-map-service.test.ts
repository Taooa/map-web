import type { BaiduMap, BaiduMarkerData } from '@/adapters/maps/baidu/baidu-map';
import type { BaiduMapSdk } from '@/adapters/maps/baidu/baidu-loader';
import { MemoryPointRepository } from '@/adapters/storage';
import type { IsoDateTime, Point, PointId } from '@/domain';
import {
  BaiduMapService,
  createBaiduMarkerData,
} from '@/features/map-validation/baidu-map-service';
import { createPointService } from '@/features/points';

const pointId = 'baidu-point' as PointId;
const timestamp = '2026-07-29T08:00:00.000Z' as IsoDateTime;

function createWgs84Point(converted = true): Point {
  return {
    id: pointId,
    name: '人民广场设备',
    source: { type: 'manual' },
    coordinates: {
      original: {
        kind: 'geographic',
        system: 'WGS84',
        unit: 'degree',
        lng: 121.4737,
        lat: 31.2304,
      },
      converted: converted
        ? {
            BD09: {
              coordinate: {
                kind: 'geographic',
                system: 'BD09',
                unit: 'degree',
                lng: 121.484781468503,
                lat: 31.234310593689997,
              },
              algorithmVersion: 'gcoord@0.3.2',
              transformedAt: timestamp,
            },
          }
        : {},
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('BaiduMapService', () => {
  it('maps cached BD09 data to a Baidu marker', () => {
    expect(createBaiduMarkerData(createWgs84Point())).toEqual({
      id: pointId,
      name: '人民广场设备',
      position: [121.484781468503, 31.234310593689997],
      originalCoordinate: 'WGS84 121.4737, 31.2304',
      displaySystem: 'BD09',
    });
  });

  it('does not use WGS84 original coordinates when BD09 is missing', async () => {
    const repository = new MemoryPointRepository();
    const points = createPointService(repository, {
      createId: () => pointId,
      now: () => timestamp,
    });
    await repository.create(createWgs84Point(false));

    const setMarkers = vi.fn<(markers: readonly BaiduMarkerData[]) => void>();
    const fakeMap = { setMarkers, fitView: vi.fn(), destroy: vi.fn() } as unknown as BaiduMap;
    const service = new BaiduMapService(points, {
      loadSdk: () => Promise.resolve({} as BaiduMapSdk),
      createMap: () => fakeMap,
    });
    expect((await service.initialize(document.createElement('div'), 'test-ak')).status).toBe(
      'success',
    );

    const result = await service.showPoints([pointId]);

    expect(result).toMatchObject({
      status: 'success',
      value: {
        markers: [],
        missingCoordinatePoints: [{ id: pointId, name: '人民广场设备' }],
      },
    });
    expect(setMarkers).toHaveBeenCalledWith([]);
  });

  it('returns a clear failure when the Baidu SDK cannot load', async () => {
    const service = new BaiduMapService(undefined, {
      loadSdk: () => Promise.reject(new Error('模拟 SDK 加载失败')),
    });

    await expect(service.initialize(document.createElement('div'), 'invalid-ak')).resolves.toEqual({
      status: 'failure',
      error: { code: 'SDK_LOAD_FAILED', message: '模拟 SDK 加载失败' },
    });
  });
});
