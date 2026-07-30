import type { Point, PointId } from '@/domain';
import type { RepositoryResult } from './index';

export interface PointListQuery {
  readonly search?: string;
  readonly offset?: number;
  readonly limit?: number;
}

/**
 * Persistence port for Point entities.
 *
 * Implementations must preserve `coordinates.original` when updating a Point.
 * Storage transactions and concrete database types must not leak through this
 * interface.
 */
export interface PointRepository {
  get(id: PointId): Promise<RepositoryResult<Point | null>>;
  list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>>;
  create(point: Point): Promise<RepositoryResult<Point>>;
  createMany(points: readonly Point[]): Promise<RepositoryResult<readonly Point[]>>;
  update(point: Point): Promise<RepositoryResult<Point>>;
  delete(id: PointId): Promise<RepositoryResult<void>>;
}
