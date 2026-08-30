import type { Point, PointId } from '@/domain';
import type { PointListPage, PointListQuery, PointRepository, RepositoryError, RepositoryResult } from './index';

function sourceName(point: Point): string {
  if (point.source.type === 'manual') return '手动输入';
  return point.source.sourceName || ({ excel: 'Excel 导入', csv: 'CSV 导入', 'json-file': 'JSON 文件导入', 'json-paste': 'JSON 粘贴' } as const)[point.source.format];
}

function matches(point: Point, query: PointListQuery): boolean {
  const search = query.search?.trim().toLocaleLowerCase();
  return (!search || point.name.toLocaleLowerCase().includes(search)) &&
    (!query.source || sourceName(point) === query.source) &&
    (!query.createdFrom || point.createdAt >= query.createdFrom) &&
    (!query.createdTo || point.createdAt <= query.createdTo) &&
    (!query.updatedFrom || point.updatedAt >= query.updatedFrom) &&
    (!query.updatedTo || point.updatedAt <= query.updatedTo);
}

function success<Value>(value: Value): RepositoryResult<Value> {
  return { status: 'success', value };
}

function failure(code: RepositoryError['code'], message: string): RepositoryResult<never> {
  return { status: 'failure', error: { code, message } };
}

/**
 * Session-only Point storage used to validate the V1 business flow before
 * committing the model to IndexedDB.
 */
export class MemoryPointRepository implements PointRepository {
  readonly #points = new Map<PointId, Point>();

  get(id: PointId): Promise<RepositoryResult<Point | null>> {
    return Promise.resolve(success(this.#points.get(id) ?? null));
  }

  list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>> {
    const matching = [...this.#points.values()]
      .filter((point) => matches(point, query ?? {}))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const offset = Math.max(0, query?.offset ?? 0);
    const end = query?.limit === undefined ? undefined : offset + Math.max(0, query.limit);

    return Promise.resolve(success(matching.slice(offset, end)));
  }

  listPage(query: PointListQuery): Promise<RepositoryResult<PointListPage>> {
    const field = query.sortField ?? 'updatedAt';
    const direction = query.sortDirection ?? 'desc';
    const all = [...this.#points.values()];
    const sourceOptions = [...new Set(all.map(sourceName))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const matching = all.filter((point) => matches(point, query)).sort((a, b) => {
      const compared = a[field].localeCompare(b[field]) || a.id.localeCompare(b.id);
      return direction === 'asc' ? compared : -compared;
    });
    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.max(0, query.limit ?? 20);
    return Promise.resolve(success({
      points: matching.slice(offset, offset + limit),
      pointIds: query.includePointIds === false ? [] : matching.map((point) => point.id),
      total: matching.length,
      sourceOptions,
    }));
  }

  create(point: Point): Promise<RepositoryResult<Point>> {
    if (this.#points.has(point.id)) {
      return Promise.resolve(failure('CONFLICT', `Point ${point.id} already exists.`));
    }

    this.#points.set(point.id, point);
    return Promise.resolve(success(point));
  }

  createMany(points: readonly Point[]): Promise<RepositoryResult<readonly Point[]>> {
    const ids = new Set<PointId>();
    const conflict = points.find((point) => this.#points.has(point.id) || ids.has(point.id));
    if (conflict) {
      return Promise.resolve(failure('CONFLICT', `Point ${conflict.id} already exists.`));
    }

    points.forEach((point) => {
      ids.add(point.id);
      this.#points.set(point.id, point);
    });
    return Promise.resolve(success(points));
  }

  update(point: Point): Promise<RepositoryResult<Point>> {
    const existing = this.#points.get(point.id);
    if (!existing) {
      return Promise.resolve(failure('NOT_FOUND', `Point ${point.id} does not exist.`));
    }

    this.#points.set(point.id, point);
    return Promise.resolve(success(point));
  }

  delete(id: PointId): Promise<RepositoryResult<void>> {
    if (!this.#points.delete(id)) {
      return Promise.resolve(failure('NOT_FOUND', `Point ${id} does not exist.`));
    }

    return Promise.resolve(success(undefined));
  }
}
