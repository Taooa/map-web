import type { MapRenderPoint } from './map-adapter';
import type { GeographicCoordinateSystemId, Point } from '@/domain';

function formatOriginalCoordinate(point: Point): string {
  const coordinate = point.coordinates.original;
  return coordinate.kind === 'geographic'
    ? `${coordinate.system} ${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.system} X ${coordinate.x}, Y ${coordinate.y}`;
}

export function createMapRenderPoint(
  point: Point,
  targetSystem: GeographicCoordinateSystemId,
): MapRenderPoint | null {
  const original = point.coordinates.original;
  const coordinate =
    original.kind === 'geographic' && original.system === targetSystem
      ? original
      : point.coordinates.converted[targetSystem]?.coordinate;

  if (
    !coordinate ||
    coordinate.kind !== 'geographic' ||
    coordinate.system !== targetSystem ||
    !Number.isFinite(coordinate.lng) ||
    !Number.isFinite(coordinate.lat)
  ) {
    return null;
  }

  return {
    id: point.id,
    name: point.name,
    position: [coordinate.lng, coordinate.lat],
    originalCoordinate: formatOriginalCoordinate(point),
    displaySystem: targetSystem,
  };
}
