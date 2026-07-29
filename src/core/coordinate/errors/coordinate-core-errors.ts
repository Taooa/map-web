import type { AlgorithmId, CoordinateSystemId } from '@/domain';

export type CoordinateCoreErrorCode =
  'UNSUPPORTED' | 'NO_PATH' | 'INVALID_COORDINATE' | 'ALGORITHM_UNAVAILABLE';

/**
 * Structured Core failure. Implementations return this value through Result
 * instead of throwing a generic Error for expected transformation failures.
 */
export interface CoordinateCoreError {
  readonly code: CoordinateCoreErrorCode;
  readonly message: string;
  readonly source?: CoordinateSystemId;
  readonly target?: CoordinateSystemId;
  readonly algorithmId?: AlgorithmId;
  readonly details?: Readonly<Record<string, unknown>>;
}
