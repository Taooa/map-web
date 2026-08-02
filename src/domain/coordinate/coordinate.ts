import type {
  GeographicCoordinateSystemId,
  ProjectedCoordinateSystemId,
} from './coordinate-system';

export interface GeographicCoordinate {
  readonly kind: 'geographic';
  readonly system: GeographicCoordinateSystemId;
  readonly unit: 'degree';
  readonly lng: number;
  readonly lat: number;
}

export interface ProjectedCoordinate {
  readonly kind: 'projected';
  readonly system: ProjectedCoordinateSystemId;
  readonly unit: 'metre';
  readonly x: number;
  readonly y: number;
}

/**
 * The discriminant prevents longitude/latitude and projected X/Y values from
 * being used interchangeably.
 */
export type Coordinate = GeographicCoordinate | ProjectedCoordinate;
