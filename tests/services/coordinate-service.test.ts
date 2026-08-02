import { CoordinateService } from '@/services/coordinate-service';
import type { Coordinate, CoordinateSystemId, GeographicCoordinate } from '@/domain';

import {
  coordinateBaselineCases,
  GCOORD_BASELINE_VERSION,
  OUTPUT_TOLERANCE_DEGREES,
  SHANGHAI_WGS84,
  type BaselineCoordinateSystem,
  type BaselinePosition,
} from '../coordinate/baseline/coordinate-baseline.fixtures';

const service = new CoordinateService();

const geographicCoordinate = (
  system: BaselineCoordinateSystem,
  position: BaselinePosition,
): GeographicCoordinate => ({
  kind: 'geographic',
  system,
  unit: 'degree',
  lng: position[0],
  lat: position[1],
});

const expectCoordinateCloseTo = (
  coordinate: GeographicCoordinate,
  expected: BaselinePosition,
): void => {
  expect(Math.abs(coordinate.lng - expected[0])).toBeLessThanOrEqual(
    OUTPUT_TOLERANCE_DEGREES,
  );
  expect(Math.abs(coordinate.lat - expected[1])).toBeLessThanOrEqual(
    OUTPUT_TOLERANCE_DEGREES,
  );
};

describe('CoordinateService', () => {
  it.each(coordinateBaselineCases)(
    'matches the frozen $id baseline',
    ({ source, target, input, expected }) => {
      const result = service.transform(geographicCoordinate(source, input), target);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.value.coordinate.system).toBe(target);
        expect(result.value.algorithmVersion).toBe(`gcoord@${GCOORD_BASELINE_VERSION}`);
        expectCoordinateCloseTo(result.value.coordinate, expected);
      }
    },
  );

  it.each([
    geographicCoordinate('WGS84', [Number.NaN, 31.2304]),
    geographicCoordinate('WGS84', [Number.POSITIVE_INFINITY, 31.2304]),
    geographicCoordinate('WGS84', [181, 31.2304]),
    geographicCoordinate('WGS84', [121.4737, 91]),
  ])('rejects invalid coordinates without returning a fake coordinate', (coordinate) => {
    const result = service.transform(coordinate, 'GCJ02');

    expect(result.status).toBe('failure');
    if (result.status === 'failure') {
      expect(result.error.code).toBe('INVALID_COORDINATE');
    }
    expect(result).not.toHaveProperty('value.coordinate');
    expect(result).not.toMatchObject({ value: { coordinate: { lng: 0, lat: 0 } } });
  });

  it.each([
    {
      coordinate: geographicCoordinate('WGS84', SHANGHAI_WGS84),
      target: 'CGCS2000' as CoordinateSystemId,
    },
    {
      coordinate: {
        kind: 'geographic',
        system: 'CGCS2000',
        unit: 'degree',
        lng: 121.4737,
        lat: 31.2304,
      } satisfies Coordinate,
      target: 'WGS84' as CoordinateSystemId,
    },
    {
      coordinate: {
        kind: 'projected',
        system: 'SHANGHAI2000',
        unit: 'metre',
        x: 350000,
        y: 310000,
      } satisfies Coordinate,
      target: 'WGS84' as CoordinateSystemId,
    },
  ])('rejects unsupported transformations', ({ coordinate, target }) => {
    const result = service.transform(coordinate, target);

    expect(result.status).toBe('failure');
    if (result.status === 'failure') {
      expect(result.error.code).toBe('UNSUPPORTED_TRANSFORMATION');
    }
    expect(result).not.toHaveProperty('value.coordinate');
  });

  it('does not mutate the original Coordinate', () => {
    const original = Object.freeze(geographicCoordinate('WGS84', SHANGHAI_WGS84));
    const snapshot = { ...original };

    const result = service.transform(original, 'BD09');

    expect(result.status).toBe('success');
    expect(original).toEqual(snapshot);
    if (result.status === 'success') {
      expect(result.value.coordinate).not.toBe(original);
    }
  });
});
