import type { TiandituMap } from '@/adapters/maps/tianditu/tianditu-map';
import type { TiandituMapSdk } from '@/adapters/maps/tianditu/tianditu-loader';
import { MemoryPointRepository } from '@/adapters/storage';
import type { Coordinate, IsoDateTime, Point, PointId } from '@/domain';
import {
  createTiandituMarkerData,
  TiandituMapService,
} from '@/features/map-validation/tianditu-map-service';
import { createPointService } from '@/features/points';

const timestamp = '2026-07-29T09:00:00.000Z' as IsoDateTime;

function createPoint(
  idValue: string,
  original: Coordinate,
  convertedWgs84 = false,
): Point {
  return {
    id: idValue as PointId,
    name: idValue,
    source: { type: 'manual' },
    coordinates: {
      original,
      converted: convertedWgs84
        ? {
            WGS84: {
              coordinate: {
                kind: 'geographic',
                system: 'WGS84',
                unit: 'degree',
                lng: 121.4737,
                lat: 31.2304,
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

const wgs84: Coordinate = {
  kind: 'geographic',
  system: 'WGS84',
  unit: 'degree',
  lng: 121.4737,
  lat: 31.2304,
};
const gcj02: Coordinate = {
  kind: 'geographic',
  system: 'GCJ02',
  unit: 'degree',
  lng: 121.4782,
  lat: 31.2284,
};
const bd09: Coordinate = {
  kind: 'geographic',
  system: 'BD09',
  unit: 'degree',
  lng: 121.4847,
  lat: 31.2343,
};
const projected: Coordinate = {
  kind: 'projected',
  system: 'SHANGHAI2000',
  unit: 'metre',
  x: 350000,
  y: 310000,
};

describe('TiandituMapService', () => {
  it('uses a WGS84 original coordinate directly', () => {
    expect(createTiandituMarkerData(createPoint('wgs-original', wgs84))).toEqual({
      id: 'wgs-original',
      name: 'wgs-original',
      position: [121.4737, 31.2304],
      originalCoordinate: 'WGS84 121.4737, 31.2304',
      displaySystem: 'WGS84',
    });
  });

  it('uses converted.WGS84 for a GCJ02 point', () => {
    expect(createTiandituMarkerData(createPoint('gcj-converted', gcj02, true))).toMatchObject({
      position: [121.4737, 31.2304],
      originalCoordinate: 'GCJ02 121.4782, 31.2284',
      displaySystem: 'WGS84',
    });
  });

  it.each([
    ['GCJ02', gcj02],
    ['BD09', bd09],
    ['projected', projected],
  ])('rejects %s without an explicit WGS84 coordinate', (_label, original) => {
    expect(createTiandituMarkerData(createPoint('invalid', original))).toBeNull();
  });

  it('reports rejected selected points and only sends valid markers to the map', async () => {
    const repository = new MemoryPointRepository();
    const points = createPointService(repository, {
      createId: () => 'unused' as PointId,
      now: () => timestamp,
    });
    await repository.create(createPoint('valid', wgs84));
    await repository.create(createPoint('missing', gcj02));
    const setMarkers = vi.fn();
    const map = { setMarkers, destroy: vi.fn() } as unknown as TiandituMap;
    const service = new TiandituMapService(points, {
      loadSdk: () => Promise.resolve({} as TiandituMapSdk),
      createMap: () => map,
    });
    await service.initialize(document.createElement('div'), 'token');

    const result = await service.showPoints(['valid' as PointId, 'missing' as PointId]);

    expect(result).toMatchObject({
      status: 'success',
      value: {
        markers: [{ id: 'valid', displaySystem: 'WGS84' }],
        missingCoordinatePoints: [{ id: 'missing' }],
      },
    });
    expect(setMarkers).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'valid', position: [121.4737, 31.2304] }),
    ]);
  });
});
