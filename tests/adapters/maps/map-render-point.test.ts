import { createMapRenderPoint } from '@/adapters/maps/map-render-point';
import type { Coordinate, IsoDateTime, Point, PointId } from '@/domain';

const timestamp = '2026-07-29T09:00:00.000Z' as IsoDateTime;

function createPoint(
  idValue: string,
  original: Coordinate,
  converted: Point['coordinates']['converted'] = {},
): Point {
  return {
    id: idValue as PointId,
    name: idValue,
    source: { type: 'manual' },
    coordinates: { original, converted },
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

describe('createMapRenderPoint', () => {
  it('uses an original coordinate when it already matches the target system', () => {
    expect(createMapRenderPoint(createPoint('wgs-original', wgs84), 'WGS84')).toEqual({
      id: 'wgs-original',
      name: 'wgs-original',
      position: [121.4737, 31.2304],
      originalCoordinate: 'WGS84 121.4737, 31.2304',
      displaySystem: 'WGS84',
    });
  });

  it.each([
    ['GCJ02', 121.47822305927693, 31.22845773757727],
    ['BD09', 121.484781468503, 31.234310593689997],
  ] as const)('uses the cached %s coordinate for map rendering', (system, lng, lat) => {
    const point = createPoint('converted', wgs84, {
      [system]: {
        coordinate: { kind: 'geographic', system, unit: 'degree', lng, lat },
        algorithmVersion: 'gcoord@0.3.2',
        transformedAt: timestamp,
      },
    });

    expect(createMapRenderPoint(point, system)).toMatchObject({
      position: [lng, lat],
      originalCoordinate: 'WGS84 121.4737, 31.2304',
      displaySystem: system,
    });
  });

  it('returns null instead of falling back to a different coordinate system', () => {
    expect(createMapRenderPoint(createPoint('missing', wgs84), 'BD09')).toBeNull();
  });

  it('keeps projected original coordinates as display-only metadata', () => {
    const point = createPoint('projected', {
      kind: 'projected',
      system: 'SHANGHAI2000',
      unit: 'metre',
      x: 350000,
      y: 310000,
    });

    expect(createMapRenderPoint(point, 'WGS84')).toBeNull();
  });
});
