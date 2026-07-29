import type {
  Coordinate,
  CoordinateSystemId,
  Result,
  TransformationPathSignature,
  TransformationStep,
} from '@/domain';
import type { CoordinateCoreError } from '../errors/coordinate-core-errors';

export interface CoordinateTransformationRequest {
  readonly coordinate: Coordinate;
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
  /**
   * Explicit opt-in for experimental definitions and algorithms.
   * Production flows must not silently enable them.
   */
  readonly allowExperimental?: boolean;
}

export interface CoordinateTransformationSuccess {
  readonly coordinate: Coordinate;
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
  readonly steps: readonly TransformationStep[];
  readonly pathSignature: TransformationPathSignature;
}

export type CoordinateTransformationResult = Result<
  CoordinateTransformationSuccess,
  CoordinateCoreError
>;
