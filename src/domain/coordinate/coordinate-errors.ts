import type { CoordinateSystemId } from './coordinate-system';

export type CoordinateErrorCode =
  | 'INVALID_NUMBER'
  | 'INVALID_GEOGRAPHIC_RANGE'
  | 'INCOMPATIBLE_COORDINATE_KIND'
  | 'UNSUPPORTED_SYSTEM'
  | 'SYSTEM_NOT_AVAILABLE';

export interface CoordinateError {
  readonly code: CoordinateErrorCode;
  readonly message: string;
  readonly system?: CoordinateSystemId;
  readonly field?: 'lng' | 'lat' | 'x' | 'y';
}
