import gcoord from 'gcoord';

export const gcoordCoordinateSystemIds = ['WGS84', 'GCJ02', 'BD09'] as const;

export type GcoordCoordinateSystemId = (typeof gcoordCoordinateSystemIds)[number];
export type GcoordPosition = readonly [lng: number, lat: number];

export const GCOORD_ALGORITHM_VERSION = 'gcoord@0.3.2';

/**
 * Thin wrapper around the frozen gcoord dependency.
 *
 * Validation, supported-route decisions and Result handling belong to
 * CoordinateService rather than this adapter.
 */
export class GcoordAdapter {
  transform(
    position: GcoordPosition,
    source: GcoordCoordinateSystemId,
    target: GcoordCoordinateSystemId,
  ): GcoordPosition {
    const coordinateReferenceSystems = {
      WGS84: gcoord.WGS84,
      GCJ02: gcoord.GCJ02,
      BD09: gcoord.BD09,
    } as const;

    const transformed = gcoord.transform(
      [...position],
      coordinateReferenceSystems[source],
      coordinateReferenceSystems[target],
    );

    return [transformed[0], transformed[1]];
  }
}
