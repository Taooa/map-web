import type {
  AlgorithmId,
  AlgorithmVersion,
  Coordinate,
  CoordinateSystemId,
  Result,
  TransformationAlgorithmStatus,
} from '@/domain';
import type { CoordinateCoreError } from '../errors/coordinate-core-errors';

export type AlgorithmExecutionResult = Result<Coordinate, CoordinateCoreError>;

export interface TransformationAlgorithm {
  readonly id: AlgorithmId;
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
  readonly version: AlgorithmVersion;
  readonly status: TransformationAlgorithmStatus;
  execute(coordinate: Coordinate): Promise<AlgorithmExecutionResult>;
}

export interface AlgorithmQuery {
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
  readonly allowExperimental?: boolean;
}

/**
 * Registry port for directed transformation algorithms.
 *
 * Registration stores an algorithm contract; it does not verify numerical
 * correctness or activate experimental algorithms.
 */
export interface AlgorithmRegistry {
  register(algorithm: TransformationAlgorithm): Result<void, CoordinateCoreError>;
  get(id: AlgorithmId): TransformationAlgorithm | undefined;
  find(query: AlgorithmQuery): readonly TransformationAlgorithm[];
  list(): readonly TransformationAlgorithm[];
}
