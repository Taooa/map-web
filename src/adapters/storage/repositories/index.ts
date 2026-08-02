import type { Result } from '@/domain';

export type RepositoryErrorCode =
  'UNAVAILABLE' | 'NOT_FOUND' | 'CONFLICT' | 'QUOTA_EXCEEDED' | 'VALIDATION_FAILED' | 'UNKNOWN';

/**
 * Infrastructure-neutral persistence error.
 *
 * `cause` is intentionally unknown so a concrete database error cannot become
 * part of the application contract.
 */
export interface RepositoryError {
  readonly code: RepositoryErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export type RepositoryResult<Value> = Result<Value, RepositoryError>;

export type { PointListQuery, PointRepository } from './point-repository';
export { MemoryPointRepository } from './memory-point-repository';
