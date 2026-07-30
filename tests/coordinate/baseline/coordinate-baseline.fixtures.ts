export type BaselineCoordinateSystem = 'WGS84' | 'GCJ02' | 'BD09';

export type BaselinePosition = readonly [lng: number, lat: number];

export interface CoordinateBaselineCase {
  readonly id: string;
  readonly source: BaselineCoordinateSystem;
  readonly target: BaselineCoordinateSystem;
  readonly input: BaselinePosition;
  readonly expected: BaselinePosition;
}

export const GCOORD_BASELINE_VERSION = '0.3.2';
export const OUTPUT_TOLERANCE_DEGREES = 1e-10;
export const ROUND_TRIP_TOLERANCE_DEGREES = 2e-6;

export const SHANGHAI_WGS84: BaselinePosition = [121.4737, 31.2304];
export const SHANGHAI_GCJ02: BaselinePosition = [
  121.47822305927693, 31.22845773757727,
];
export const SHANGHAI_BD09: BaselinePosition = [121.484781468503, 31.234310593689997];

export const coordinateBaselineCases: readonly CoordinateBaselineCase[] = [
  {
    id: 'wgs84-to-gcj02',
    source: 'WGS84',
    target: 'GCJ02',
    input: SHANGHAI_WGS84,
    expected: SHANGHAI_GCJ02,
  },
  {
    id: 'gcj02-to-wgs84',
    source: 'GCJ02',
    target: 'WGS84',
    input: SHANGHAI_GCJ02,
    expected: [121.4737000482381, 31.230400035084926],
  },
  {
    id: 'gcj02-to-bd09',
    source: 'GCJ02',
    target: 'BD09',
    input: SHANGHAI_GCJ02,
    expected: SHANGHAI_BD09,
  },
  {
    id: 'bd09-to-gcj02',
    source: 'BD09',
    target: 'GCJ02',
    input: SHANGHAI_BD09,
    expected: [121.47822281170295, 31.22845875293493],
  },
  {
    id: 'wgs84-to-bd09',
    source: 'WGS84',
    target: 'BD09',
    input: SHANGHAI_WGS84,
    expected: SHANGHAI_BD09,
  },
  {
    id: 'bd09-to-wgs84',
    source: 'BD09',
    target: 'WGS84',
    input: SHANGHAI_BD09,
    expected: [121.47369979976708, 31.230401049296855],
  },
];
