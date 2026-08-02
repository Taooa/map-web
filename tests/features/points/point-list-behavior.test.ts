import type { IsoDateTime, Point, PointId } from '@/domain';
import {
  emptyPointFilters,
  filterPoints,
  resolvePointOperationScope,
  sortPoints,
  validatePointFilters,
} from '@/features/points/point-list-model';

function point(
  id: string,
  name: string,
  source: 'manual' | 'import',
  createdAt: string,
  updatedAt: string,
): Point {
  return {
    id: id as PointId,
    name,
    source:
      source === 'manual'
        ? { type: 'manual' }
        : {
            type: 'import',
            format: 'csv',
            importId: `import-${id}` as never,
            sourceName: '点位.csv',
          },
    coordinates: {
      original: { kind: 'geographic', system: 'WGS84', unit: 'degree', lng: 121, lat: 31 },
      converted: {},
    },
    createdAt: createdAt as IsoDateTime,
    updatedAt: updatedAt as IsoDateTime,
  };
}

const points = [
  point('one', '浦东点位', 'manual', '2026-08-01T08:00:00.000Z', '2026-08-02T08:00:00.000Z'),
  point('two', '徐汇点位', 'import', '2026-08-02T08:00:00.000Z', '2026-08-01T08:00:00.000Z'),
];

it('filters by applied name, source and inclusive date ranges', () => {
  const filtered = filterPoints(
    points,
    {
      ...emptyPointFilters,
      name: '徐汇',
      source: '点位.csv',
      createdFrom: '2026-08-02 00:00:00',
      createdTo: '2026-08-02 23:59:59',
    },
    (item) => (item.source.type === 'manual' ? '手动输入' : item.source.sourceName!),
  );
  expect(filtered.map((item) => item.id)).toEqual(['two']);
  expect(validatePointFilters({ ...emptyPointFilters, createdFrom: '2026/08/02' })).toMatch(
    'YYYY-MM-DD HH:mm:ss',
  );
});

it('sorts deterministically and resolves selected then filtered then all scopes', () => {
  expect(
    sortPoints(points, { field: 'updatedAt', direction: 'desc' }).map((item) => item.id),
  ).toEqual(['one', 'two']);
  expect(
    resolvePointOperationScope({
      points,
      filteredPoints: [points[1]!],
      selectedIds: new Set([points[0]!.id]),
      hasAppliedQuery: true,
    }),
  ).toMatchObject({ type: 'selected', pointIds: ['one'], total: 1 });
  expect(
    resolvePointOperationScope({
      points,
      filteredPoints: [points[1]!],
      selectedIds: new Set(),
      hasAppliedQuery: true,
    }),
  ).toMatchObject({ type: 'filtered', pointIds: ['two'], total: 1 });
  expect(
    resolvePointOperationScope({
      points,
      filteredPoints: points,
      selectedIds: new Set(),
      hasAppliedQuery: false,
    }),
  ).toMatchObject({ type: 'all', pointIds: ['one', 'two'], total: 2 });
});
