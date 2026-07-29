import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  coordinateSystemDefinitions,
  type Coordinate,
  type GeographicCoordinate,
  type ProjectedCoordinate,
} from '@/domain/coordinate';

describe('coordinate domain', () => {
  it('keeps geographic and projected coordinates structurally separate', () => {
    const geographic: GeographicCoordinate = {
      kind: 'geographic',
      system: 'WGS84',
      unit: 'degree',
      lng: 121.4737,
      lat: 31.2304,
    };
    const projected: ProjectedCoordinate = {
      kind: 'projected',
      system: 'SHANGHAI2000',
      unit: 'metre',
      x: 350_000,
      y: 310_000,
    };

    expect(geographic.kind).toBe('geographic');
    expect(projected.kind).toBe('projected');
    expectTypeOf<GeographicCoordinate>().not.toMatchTypeOf<ProjectedCoordinate>();
    expectTypeOf<ProjectedCoordinate>().not.toMatchTypeOf<GeographicCoordinate>();

    const invalidProjected: ProjectedCoordinate = {
      kind: 'projected',
      system: 'SHANGHAI2000',
      unit: 'metre',
      // @ts-expect-error Projected coordinates cannot use longitude/latitude fields.
      lng: 121,
      lat: 31,
    };
    expect(invalidProjected).toBeDefined();
  });

  it('uses a discriminated union for coordinate consumers', () => {
    const readAxes = (coordinate: Coordinate) =>
      coordinate.kind === 'geographic'
        ? [coordinate.lng, coordinate.lat]
        : [coordinate.x, coordinate.y];

    expect(
      readAxes({
        kind: 'geographic',
        system: 'GCJ02',
        unit: 'degree',
        lng: 121,
        lat: 31,
      }),
    ).toEqual([121, 31]);
  });

  it('keeps CGCS2000 experimental and outside the default user entry list', () => {
    expect(coordinateSystemDefinitions.CGCS2000).toMatchObject({
      kind: 'geographic',
      status: 'experimental',
      defaultUserEntry: false,
    });
  });

  it('represents Shanghai 2000 without defining a projection algorithm', () => {
    expect(coordinateSystemDefinitions.SHANGHAI2000).toMatchObject({
      kind: 'projected',
      unit: 'metre',
      status: 'experimental',
    });
  });
});
