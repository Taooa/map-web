import type { Point, PointId } from '@/domain';
import type { RepositoryResult } from './index';

export interface PointListQuery {
  readonly search?: string;
  readonly source?: string;
  readonly createdFrom?: string;
  readonly createdTo?: string;
  readonly updatedFrom?: string;
  readonly updatedTo?: string;
  readonly sortField?: 'createdAt' | 'updatedAt';
  readonly sortDirection?: 'asc' | 'desc';
  readonly offset?: number;
  readonly limit?: number;
  /** Set to false for browse-only pages that do not need an all-results operation scope. */
  readonly includePointIds?: boolean;
}

export interface PointListPage {
  readonly points: readonly Point[];
  readonly pointIds: readonly PointId[];
  readonly total: number;
  readonly sourceOptions: readonly string[];
}

/**
 * Persistence port for Point entities.
 *
 * Coordinate validation and original-system identity are enforced by PointService.
 * Storage transactions and concrete database types must not leak through this interface.
 */
export interface PointRepository {
  get(id: PointId): Promise<RepositoryResult<Point | null>>;
  list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>>;
  listPage(query: PointListQuery): Promise<RepositoryResult<PointListPage>>;
  create(point: Point): Promise<RepositoryResult<Point>>;
  createMany(points: readonly Point[]): Promise<RepositoryResult<readonly Point[]>>;
  update(point: Point): Promise<RepositoryResult<Point>>;
  delete(id: PointId): Promise<RepositoryResult<void>>;
}
