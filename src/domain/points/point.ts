import type { Coordinate, ConvertedCoordinateCache } from '../coordinate';
import type { IsoDateTime, PointId } from '../shared';
import type { PointSource } from './point-source';

export interface PointCoordinates {
  /**
   * Immutable user-provided or imported coordinate.
   */
  readonly original: Coordinate;
  /**
   * Successful, on-demand transformations indexed by target system.
   */
  readonly converted: ConvertedCoordinateCache;
}

export interface Point {
  readonly id: PointId;
  readonly name: string;
  readonly source: PointSource;
  readonly coordinates: PointCoordinates;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}
