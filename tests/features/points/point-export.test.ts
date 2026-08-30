import type { IsoDateTime, Point, PointId } from '@/domain';
import { fullCoordinateText } from '@/features/points/point-coordinate-display';
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
      wgs84Lng: '121.4737',
      wgs84Lat: '31.2304',
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

it('uses the same coordinate precision in the table and exported fields', () => {
  const point: Point = {
    id: 'point-precision' as PointId,
    name: '精度测试点',
    source: { type: 'manual' },
    coordinates: {
      original: {
        kind: 'geographic',
        system: 'WGS84',
        unit: 'degree',
        lng: 121.473700009,
        lat: -0.000000001,
      },
      converted: {
        SHANGHAI2000: {
          coordinate: {
            kind: 'projected',
            system: 'SHANGHAI2000',
            unit: 'metre',
            x: 3456789.123456,
            y: 456789.987654,
          },
          algorithmVersion: 'manual',
          transformedAt: '2026-08-02T08:00:00.000Z' as IsoDateTime,
        },
      },
    },
    createdAt: '2026-08-02T08:00:00.000Z' as IsoDateTime,
    updatedAt: '2026-08-02T08:00:00.000Z' as IsoDateTime,
  };

  const row = createPointExportRows([point])[0]!;

  expect(row).toMatchObject({
    wgs84Lng: '121.473700009',
    wgs84Lat: '-1e-9',
    sh2000X: '3456789.123456',
    sh2000Y: '456789.987654',
  });
  expect(fullCoordinateText(point, 'WGS84')).toBe(`${row.wgs84Lng}, ${row.wgs84Lat}`);
  expect(fullCoordinateText(point, 'SHANGHAI2000')).toBe(`${row.sh2000X}, ${row.sh2000Y}`);
});
