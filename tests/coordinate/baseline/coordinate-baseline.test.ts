import gcoord from 'gcoord';

import {
  coordinateBaselineCases,
  OUTPUT_TOLERANCE_DEGREES,
  ROUND_TRIP_TOLERANCE_DEGREES,
  SHANGHAI_GCJ02,
  SHANGHAI_WGS84,
  type BaselineCoordinateSystem,
  type BaselinePosition,
} from './coordinate-baseline.fixtures';

type BaselineSuccess = {
  readonly status: 'success';
  readonly coordinate: BaselinePosition;
};

type BaselineFailure = {
  readonly status: 'failure';
  readonly error: 'INVALID_COORDINATE';
};

type BaselineResult = BaselineSuccess | BaselineFailure;

const expectPositionCloseTo = (
  actual: BaselinePosition,
  expected: BaselinePosition,
  tolerance: number,
): void => {
  expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(tolerance);
};

const isValidGeographicPosition = (position: BaselinePosition): boolean => {
  const [lng, lat] = position;
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

const transformDirect = (
  position: BaselinePosition,
  source: BaselineCoordinateSystem,
  target: BaselineCoordinateSystem,
): BaselinePosition => {
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
};

/**
 * Test-only reproduction of map-tools' two explicit composite routes.
 * This is a baseline harness, not the production CoordinateService.
 */
const transformBaseline = (
  position: BaselinePosition,
  source: BaselineCoordinateSystem,
  target: BaselineCoordinateSystem,
): BaselineResult => {
  if (!isValidGeographicPosition(position)) {
    return { status: 'failure', error: 'INVALID_COORDINATE' };
  }

  if (source === 'WGS84' && target === 'BD09') {
    const gcj02 = transformDirect(position, 'WGS84', 'GCJ02');
    return { status: 'success', coordinate: transformDirect(gcj02, 'GCJ02', 'BD09') };
  }

  if (source === 'BD09' && target === 'WGS84') {
    const gcj02 = transformDirect(position, 'BD09', 'GCJ02');
    return { status: 'success', coordinate: transformDirect(gcj02, 'GCJ02', 'WGS84') };
  }

  return { status: 'success', coordinate: transformDirect(position, source, target) };
};

describe('gcoord 0.3.2 coordinate behavior baseline', () => {
  it.each(coordinateBaselineCases)(
    'keeps $id output stable',
    ({ input, source, target, expected }) => {
      const result = transformBaseline(input, source, target);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expectPositionCloseTo(result.coordinate, expected, OUTPUT_TOLERANCE_DEGREES);
      }
    },
  );

  it.each([
    {
      id: 'WGS84 ↔ GCJ02',
      input: SHANGHAI_WGS84,
      intermediate: 'GCJ02' as const,
      source: 'WGS84' as const,
    },
    {
      id: 'GCJ02 ↔ BD09',
      input: SHANGHAI_GCJ02,
      intermediate: 'BD09' as const,
      source: 'GCJ02' as const,
    },
    {
      id: 'WGS84 ↔ BD09',
      input: SHANGHAI_WGS84,
      intermediate: 'BD09' as const,
      source: 'WGS84' as const,
    },
  ])('keeps $id round-trip error within tolerance', ({ input, source, intermediate }) => {
    const forward = transformBaseline(input, source, intermediate);
    expect(forward.status).toBe('success');
    if (forward.status !== 'success') {
      return;
    }

    const backward = transformBaseline(forward.coordinate, intermediate, source);
    expect(backward.status).toBe('success');
    if (backward.status === 'success') {
      expectPositionCloseTo(backward.coordinate, input, ROUND_TRIP_TOLERANCE_DEGREES);
    }
  });

  it.each([
    [Number.NaN, 31.2304],
    [Number.POSITIVE_INFINITY, 31.2304],
    [181, 31.2304],
    [121.4737, 91],
  ] satisfies readonly BaselinePosition[])(
    'rejects invalid input (%s, %s) without returning a coordinate',
    (lng, lat) => {
      const result = transformBaseline([lng, lat], 'WGS84', 'GCJ02');

      expect(result).toEqual({ status: 'failure', error: 'INVALID_COORDINATE' });
      expect(result).not.toHaveProperty('coordinate');
      expect(result).not.toMatchObject({ coordinate: [0, 0] });
    },
  );
});
