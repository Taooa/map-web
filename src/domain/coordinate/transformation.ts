import type {
  AlgorithmId,
  AlgorithmVersion,
  IsoDateTime,
  TransformationPathSignature,
} from '../shared';
import type { Coordinate } from './coordinate';
import type { CoordinateSystemId } from './coordinate-system';

export type TransformationAlgorithmStatus = 'verified' | 'experimental' | 'disabled';

export interface TransformationStep {
  readonly algorithmId: AlgorithmId;
  readonly algorithmVersion: AlgorithmVersion;
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
  readonly status: TransformationAlgorithmStatus;
}

export interface TransformationMetadata {
  readonly generatedAt: IsoDateTime;
  readonly pathSignature: TransformationPathSignature;
  readonly steps: readonly TransformationStep[];
}

export interface ConvertedCoordinate {
  readonly coordinate: Coordinate;
  readonly transformation: TransformationMetadata;
}

/**
 * Converted coordinates are cached by their target coordinate system.
 * The original system must not be duplicated in this cache.
 */
export type ConvertedCoordinateCache = Readonly<
  Partial<Record<CoordinateSystemId, ConvertedCoordinate>>
>;
