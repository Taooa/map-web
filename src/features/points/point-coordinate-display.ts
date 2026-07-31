import type { CoordinateSystemId, Point } from '@/domain';

export type DisplayCoordinateSystem = Extract<
  CoordinateSystemId,
  'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'
>;

export function coordinateFor(point: Point, system: DisplayCoordinateSystem) {
  if (point.coordinates.original.system === system) {
    return point.coordinates.original;
  }

  return point.coordinates.converted[system]?.coordinate;
}

export function fullCoordinateText(
  point: Point,
  system: DisplayCoordinateSystem,
): string | null {
  const coordinate = coordinateFor(point, system);
  if (!coordinate) {
    return null;
  }

  return coordinate.kind === 'geographic'
    ? `${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.x}, ${coordinate.y}`;
}
