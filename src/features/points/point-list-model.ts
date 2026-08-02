import type { Point, PointId } from '@/domain';

export const pointPageSizes = [20, 50, 100] as const;
export type PointPageSize = (typeof pointPageSizes)[number];

export interface PointFilters {
  readonly name: string;
  readonly source: string;
  readonly createdFrom: string;
  readonly createdTo: string;
  readonly updatedFrom: string;
  readonly updatedTo: string;
}

export type PointSortField = 'createdAt' | 'updatedAt';
export type PointSortDirection = 'asc' | 'desc';

export interface PointSort {
  readonly field: PointSortField;
  readonly direction: PointSortDirection;
}

export interface PointOperationScope {
  readonly type: 'selected' | 'filtered' | 'all';
  readonly pointIds: readonly PointId[];
  readonly total: number;
  readonly label: string;
}

export const emptyPointFilters: PointFilters = {
  name: '',
  source: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
};

export const defaultPointSort: PointSort = { field: 'updatedAt', direction: 'desc' };

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function hasPointFilters(filters: PointFilters): boolean {
  return [
    filters.name,
    filters.source,
    filters.createdFrom,
    filters.createdTo,
    filters.updatedFrom,
    filters.updatedTo,
  ].some((value) => value.trim() !== '');
}

export function formatPointDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function parseFilterDate(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(normalized);
  if (!match) return Number.NaN;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute) ||
    date.getSeconds() !== Number(second)
  ) {
    return Number.NaN;
  }
  return date.getTime();
}

export function validatePointFilters(filters: PointFilters): string | null {
  const fields = [
    ['创建开始时间', filters.createdFrom],
    ['创建结束时间', filters.createdTo],
    ['更新开始时间', filters.updatedFrom],
    ['更新结束时间', filters.updatedTo],
  ] as const;
  for (const [label, value] of fields) {
    if (value && Number.isNaN(parseFilterDate(value))) {
      return `${label}格式应为 YYYY-MM-DD HH:mm:ss。`;
    }
  }
  const createdFrom = parseFilterDate(filters.createdFrom);
  const createdTo = parseFilterDate(filters.createdTo);
  if (createdFrom !== null && createdTo !== null && createdFrom > createdTo) {
    return '创建开始时间不能晚于结束时间。';
  }
  const updatedFrom = parseFilterDate(filters.updatedFrom);
  const updatedTo = parseFilterDate(filters.updatedTo);
  if (updatedFrom !== null && updatedTo !== null && updatedFrom > updatedTo) {
    return '更新开始时间不能晚于结束时间。';
  }
  return null;
}

export function filterPoints(
  points: readonly Point[],
  filters: PointFilters,
  sourceName: (point: Point) => string,
): Point[] {
  const name = filters.name.trim().toLocaleLowerCase();
  const createdFrom = parseFilterDate(filters.createdFrom);
  const createdTo = parseFilterDate(filters.createdTo);
  const updatedFrom = parseFilterDate(filters.updatedFrom);
  const updatedTo = parseFilterDate(filters.updatedTo);
  return points.filter((point) => {
    if (name && !point.name.toLocaleLowerCase().includes(name)) return false;
    if (filters.source && sourceName(point) !== filters.source) return false;
    const createdAt = new Date(point.createdAt).getTime();
    const updatedAt = new Date(point.updatedAt).getTime();
    if (createdFrom !== null && createdAt < createdFrom) return false;
    if (createdTo !== null && createdAt > createdTo) return false;
    if (updatedFrom !== null && updatedAt < updatedFrom) return false;
    if (updatedTo !== null && updatedAt > updatedTo) return false;
    return true;
  });
}

export function sortPoints(points: readonly Point[], sort: PointSort): Point[] {
  return [...points].sort((left, right) => {
    const leftTime = new Date(left[sort.field]).getTime();
    const rightTime = new Date(right[sort.field]).getTime();
    const leftValid = Number.isFinite(leftTime);
    const rightValid = Number.isFinite(rightTime);
    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    if (leftTime !== rightTime) {
      return sort.direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
    }
    const created = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (created !== 0) return sort.direction === 'asc' ? created : -created;
    return left.id.localeCompare(right.id);
  });
}

export function resolvePointOperationScope({
  points,
  filteredPoints,
  selectedIds,
  hasAppliedQuery,
}: {
  readonly points: readonly Point[];
  readonly filteredPoints: readonly Point[];
  readonly selectedIds: ReadonlySet<PointId>;
  readonly hasAppliedQuery: boolean;
}): PointOperationScope {
  const existing = new Set(points.map((point) => point.id));
  const selected = [...selectedIds].filter((id) => existing.has(id));
  if (selected.length > 0) {
    return { type: 'selected', pointIds: selected, total: selected.length, label: '已选择' };
  }
  const scoped = hasAppliedQuery ? filteredPoints : points;
  const pointIds = scoped.map((point) => point.id);
  return {
    type: hasAppliedQuery ? 'filtered' : 'all',
    pointIds,
    total: pointIds.length,
    label: hasAppliedQuery ? '当前查询结果' : '全部数据',
  };
}
