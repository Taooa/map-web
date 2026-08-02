import {
  GCOORD_ALGORITHM_VERSION,
  GcoordAdapter,
  gcoordCoordinateSystemIds,
  type GcoordCoordinateSystemId,
  type GcoordPosition,
} from '@/adapters/coordinates/gcoord-adapter';
import type {
  Coordinate,
  CoordinateSystemId,
  GeographicCoordinate,
  Result,
} from '@/domain';

export type CoordinateServiceErrorCode =
  | 'INVALID_COORDINATE'
  | 'UNSUPPORTED_TRANSFORMATION'
  | 'TRANSFORMATION_FAILED';

export interface CoordinateServiceError {
  readonly code: CoordinateServiceErrorCode;
  readonly message: string;
  readonly source: CoordinateSystemId;
  readonly target: CoordinateSystemId;
}

export interface CoordinateTransformation {
  readonly coordinate: GeographicCoordinate;
  readonly algorithmVersion: typeof GCOORD_ALGORITHM_VERSION;
}

export type CoordinateTransformationResult = Result<
  CoordinateTransformation,
  CoordinateServiceError
>;

const isGcoordSystem = (system: CoordinateSystemId): system is GcoordCoordinateSystemId =>
  gcoordCoordinateSystemIds.some((supportedSystem) => supportedSystem === system);

const isValidGeographicCoordinate = (coordinate: GeographicCoordinate): boolean =>
  Number.isFinite(coordinate.lng) &&
  Number.isFinite(coordinate.lat) &&
  coordinate.lng >= -180 &&
  coordinate.lng <= 180 &&
  coordinate.lat >= -90 &&
  coordinate.lat <= 90;

const unsupportedTransformation = (
  source: CoordinateSystemId,
  target: CoordinateSystemId,
): CoordinateTransformationResult => ({
  status: 'failure',
  error: {
    code: 'UNSUPPORTED_TRANSFORMATION',
    message: `暂不支持从 ${source} 转换到 ${target}`,
    source,
    target,
  },
});

export class CoordinateService {
  constructor(private readonly adapter: GcoordAdapter = new GcoordAdapter()) {}

  transform(
    coordinate: Coordinate,
    target: CoordinateSystemId,
  ): CoordinateTransformationResult {
    const source = coordinate.system;

    if (
      coordinate.kind !== 'geographic' ||
      !isGcoordSystem(source) ||
      !isGcoordSystem(target)
    ) {
      return unsupportedTransformation(source, target);
    }

    if (!isValidGeographicCoordinate(coordinate)) {
      return {
        status: 'failure',
        error: {
          code: 'INVALID_COORDINATE',
          message: '坐标必须是有效且位于经纬度范围内的有限数值',
          source,
          target,
        },
      };
    }

    try {
      const input: GcoordPosition = [coordinate.lng, coordinate.lat];
      const transformed = this.transformSupported(input, source, target);

      if (!this.isValidPosition(transformed)) {
        return {
          status: 'failure',
          error: {
            code: 'TRANSFORMATION_FAILED',
            message: '坐标转换未返回有效经纬度',
            source,
            target,
          },
        };
      }

      return {
        status: 'success',
        value: {
          coordinate: {
            kind: 'geographic',
            system: target,
            unit: 'degree',
            lng: transformed[0],
            lat: transformed[1],
          },
          algorithmVersion: GCOORD_ALGORITHM_VERSION,
        },
      };
    } catch {
      return {
        status: 'failure',
        error: {
          code: 'TRANSFORMATION_FAILED',
          message: '坐标转换执行失败',
          source,
          target,
        },
      };
    }
  }

  private transformSupported(
    input: GcoordPosition,
    source: GcoordCoordinateSystemId,
    target: GcoordCoordinateSystemId,
  ): GcoordPosition {
    if (source === target) {
      return [...input];
    }

    if (source === 'WGS84' && target === 'BD09') {
      const gcj02 = this.adapter.transform(input, 'WGS84', 'GCJ02');
      return this.adapter.transform(gcj02, 'GCJ02', 'BD09');
    }

    if (source === 'BD09' && target === 'WGS84') {
      const gcj02 = this.adapter.transform(input, 'BD09', 'GCJ02');
      return this.adapter.transform(gcj02, 'GCJ02', 'WGS84');
    }

    return this.adapter.transform(input, source, target);
  }

  private isValidPosition(position: GcoordPosition): boolean {
    const [lng, lat] = position;
    return (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    );
  }
}
