import type { IsoDateTime, Point, PointId } from '@/domain';
import { createPointExportRows, exportTimestamp } from '@/features/points/point-export';

it('exports only the public point fields in stable coordinate order', () => {
  const point: Point = {
    id: 'point-1' as PointId,
    name: '人民广场',
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
    createdAt: '2026-08-02T08:00:00.000Z' as IsoDateTime,
    updatedAt: '2026-08-02T08:00:00.000Z' as IsoDateTime,
  };
  expect(createPointExportRows([point])).toEqual([
    {
      name: '人民广场',
      wgs84Lng: 121.4737,
      wgs84Lat: 31.2304,
      gcj02Lng: null,
      gcj02Lat: null,
      bd09Lng: null,
      bd09Lat: null,
      sh2000X: null,
      sh2000Y: null,
    },
  ]);
  expect(exportTimestamp(new Date(2026, 7, 2, 16, 5, 9))).toBe('20260802160509');
});
