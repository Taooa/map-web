import type { IsoDateTime } from '../shared';
import type { Coordinate } from './coordinate';
import type { CoordinateSystemId } from './coordinate-system';

export interface ConvertedCoordinate {
  readonly coordinate: Coordinate;
  readonly transformedAt: IsoDateTime;
  readonly algorithmVersion: string;
}

/**
 * Converted coordinates are cached by their target coordinate system.
 * The original system must not be duplicated in this cache.
 */
export type ConvertedCoordinateCache = Readonly<
  Partial<Record<CoordinateSystemId, ConvertedCoordinate>>
>;
