import type { Point, PointId } from '@/domain';
import type { PointListQuery, PointRepository, RepositoryError, RepositoryResult } from './index';

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
    const search = query?.search?.trim().toLocaleLowerCase();
    const matching = [...this.#points.values()]
      .filter((point) => !search || point.name.toLocaleLowerCase().includes(search))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const offset = Math.max(0, query?.offset ?? 0);
    const end = query?.limit === undefined ? undefined : offset + Math.max(0, query.limit);

    return Promise.resolve(success(matching.slice(offset, end)));
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
