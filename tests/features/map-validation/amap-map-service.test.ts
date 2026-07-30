import type { AMapMap, AMapMarkerData } from '@/adapters/maps/amap/amap-map';
import type { AMapSdk } from '@/adapters/maps/amap/amap-loader';
import { MemoryPointRepository } from '@/adapters/storage';
import type { IsoDateTime, Point, PointId } from '@/domain';
import {
  AMapMapService,
  createAMapMarkerData,
} from '@/features/map-validation/amap-map-service';
import { createPointService } from '@/features/points';

const pointId = 'amap-point' as PointId;
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
            GCJ02: {
              coordinate: {
                kind: 'geographic',
                system: 'GCJ02',
                unit: 'degree',
                lng: 121.47822305927693,
                lat: 31.22845773757727,
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

describe('AMapMapService', () => {
  it('converts Point cached GCJ02 data into marker data', () => {
    expect(createAMapMarkerData(createWgs84Point())).toEqual({
      id: pointId,
      name: '人民广场设备',
      position: [121.47822305927693, 31.22845773757727],
      originalCoordinate: 'WGS84 121.4737, 31.2304',
      displaySystem: 'GCJ02',
    });
  });

  it('reports a Point without GCJ02 data instead of using its original coordinate', async () => {
    const repository = new MemoryPointRepository();
    const points = createPointService(repository, {
      createId: () => pointId,
      now: () => timestamp,
    });
    await repository.create(createWgs84Point(false));

    const setMarkers = vi.fn<(markers: readonly AMapMarkerData[]) => void>();
    const fakeMap = {
      setMarkers,
      destroy: vi.fn(),
    } as unknown as AMapMap;
    const service = new AMapMapService(points, {
      loadSdk: () => Promise.resolve({} as AMapSdk),
      createMap: () => fakeMap,
    });
    expect((await service.initialize(document.createElement('div'), 'test-key')).status).toBe(
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

  it('returns a clear failure when the AMap SDK cannot load', async () => {
    const service = new AMapMapService(undefined, {
      loadSdk: () => Promise.reject(new Error('模拟 SDK 加载失败')),
    });

    const result = await service.initialize(document.createElement('div'), 'invalid-key');

    expect(result).toEqual({
      status: 'failure',
      error: {
        code: 'SDK_LOAD_FAILED',
        message: '模拟 SDK 加载失败',
      },
    });
  });
});
