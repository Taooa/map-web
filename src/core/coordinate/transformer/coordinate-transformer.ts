import type {
  CoordinateTransformationRequest,
  CoordinateTransformationResult,
} from './transformation-result';

/**
 * Application-facing port for a single coordinate transformation.
 *
 * This contract does not select a concrete algorithm or persist the result.
 */
export interface CoordinateTransformer {
  transform(request: CoordinateTransformationRequest): Promise<CoordinateTransformationResult>;
}
