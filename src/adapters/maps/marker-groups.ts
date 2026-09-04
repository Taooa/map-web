import type { MapRenderGroup, MapRenderPoint } from './map-adapter';

export function createMarkerCoordinateKey(
  position: readonly [lng: number, lat: number],
): string {
  return `${position[0]},${position[1]}`;
}

export function groupMapRenderPoints(
  points: readonly MapRenderPoint[],
  activePointId: string | null,
): MapRenderGroup[] {
  const groups = new Map<
    string,
    {
      position: readonly [lng: number, lat: number];
      points: MapRenderPoint[];
    }
  >();

  points.forEach((point) => {
    const key = createMarkerCoordinateKey(point.position);
    const group = groups.get(key);
    if (group) {
      group.points.push(point);
      return;
    }
    groups.set(key, { position: point.position, points: [point] });
  });

  return [...groups].map(([key, group]) => ({
    key,
    position: group.position,
    points: group.points,
    activePointId: group.points.some((point) => point.id === activePointId)
      ? activePointId
      : null,
  }));
}
