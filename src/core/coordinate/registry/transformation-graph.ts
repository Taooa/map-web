import type { CoordinateSystemId, Result, TransformationStep } from '@/domain';
import type { CoordinateCoreError } from '../errors/coordinate-core-errors';

export interface TransformationPathRequest {
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
  readonly allowExperimental?: boolean;
}

export type TransformationPathResult = Result<readonly TransformationStep[], CoordinateCoreError>;

/**
 * Plans a directed path between systems. A Graph implementation may inspect an
 * AlgorithmRegistry, but it must not execute an algorithm.
 */
export interface TransformationGraph {
  findPath(request: TransformationPathRequest): TransformationPathResult;
}
