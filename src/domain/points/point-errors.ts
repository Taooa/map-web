import type { PointId } from '../shared';

export type PointErrorCode =
  'EMPTY_NAME' | 'INVALID_COORDINATE' | 'INVALID_SOURCE' | 'POINT_NOT_FOUND' | 'DUPLICATE_POINT_ID';

export interface PointError {
  readonly code: PointErrorCode;
  readonly message: string;
  readonly pointId?: PointId;
}
