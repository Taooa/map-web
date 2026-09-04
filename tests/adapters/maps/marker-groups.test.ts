import { describe, expect, it, vi } from 'vitest';
import type { MapRenderPoint } from '@/adapters/maps/map-adapter';
import {
  createMarkerCoordinateKey,
  groupMapRenderPoints,
} from '@/adapters/maps/marker-groups';
import { createMarkerHoverContent } from '@/adapters/maps/marker-ui';

function point(id: string, lng: number, lat: number): MapRenderPoint {
  return {
    id,
    name: `点位 ${id}`,
    position: [lng, lat],
    originalCoordinate: `${lng}, ${lat}`,
    displaySystem: 'WGS84',
  };
}

describe('marker coordinate groups', () => {
  it('merges only exactly equal final marker coordinates and preserves order', () => {
    const groups = groupMapRenderPoints(
      [
        point('a', 121.473701, 31.230416),
        point('b', 121.473701, 31.230416),
        point('near', 121.473702, 31.230417),
      ],
      'b',
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.points.map((item) => item.id)).toEqual(['a', 'b']);
    expect(groups[0]?.activePointId).toBe('b');
    expect(groups[1]?.points.map((item) => item.id)).toEqual(['near']);
    expect(groups[1]?.activePointId).toBeNull();
  });

  it('builds a stable key from the unrounded numeric values', () => {
    expect(createMarkerCoordinateKey([121.473701, 31.230416])).toBe(
      '121.473701,31.230416',
    );
    expect(createMarkerCoordinateKey([121.473702, 31.230417])).not.toBe(
      createMarkerCoordinateKey([121.473701, 31.230416]),
    );
  });

  it('creates an interactive, bounded overlap list and marks the active point', () => {
    const points = Array.from({ length: 100 }, (_, index) =>
      point(`same-${index}`, 121.473701, 31.230416),
    );
    const group = groupMapRenderPoints(points, 'same-51')[0]!;
    const activate = vi.fn();
    const content = createMarkerHoverContent(group, activate, vi.fn(), vi.fn());

    expect(content.textContent).toContain('该位置共 100 个点位');
    expect(content.querySelectorAll('.map-marker-hover__item')).toHaveLength(100);
    expect(content.querySelector('[aria-current="true"]')).toHaveTextContent('点位 same-51');
    content.querySelectorAll<HTMLButtonElement>('.map-marker-hover__item')[75]!.click();
    expect(activate).toHaveBeenCalledWith('same-75');
  });
});
