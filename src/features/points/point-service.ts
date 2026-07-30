import type { PointRepository } from '@/adapters/storage';
import type {
  Coordinate,
  CoordinateSystemId,
  IsoDateTime,
  Point,
  PointId,
  PointSource,
  Result,
} from '@/domain';
import { CoordinateService } from '@/services/coordinate-service';

export interface CreatePointInput {
  readonly name: string;
  readonly system: Extract<CoordinateSystemId, 'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'>;
  readonly first: number;
  readonly second: number;
  readonly source?: PointSource;
}

export type PointServiceErrorCode =
  | 'EMPTY_NAME'
  | 'INVALID_COORDINATE'
  | 'POINT_NOT_FOUND'
  | 'DUPLICATE_POINT_ID'
  | 'UNSUPPORTED_TRANSFORMATION'
  | 'COORDINATE_TRANSFORMATION_FAILED'
  | 'REPOSITORY_FAILURE';

export interface PointServiceError {
  readonly code: PointServiceErrorCode;
  readonly message: string;
  readonly pointId?: PointId;
}

export type PointServiceResult<Value> = Result<Value, PointServiceError>;

export interface PointService {
  createPoint(input: CreatePointInput): Promise<PointServiceResult<Point>>;
  createPoints(
    inputs: readonly CreatePointInput[],
  ): Promise<readonly PointServiceResult<Point>[]>;
  deletePoint(id: PointId): Promise<PointServiceResult<void>>;
  getPoint(id: PointId): Promise<PointServiceResult<Point | null>>;
  listPoints(search?: string): Promise<PointServiceResult<readonly Point[]>>;
  transformPoint(
    id: PointId,
    target: CoordinateSystemId,
  ): Promise<PointServiceResult<Point>>;
}

interface PointServiceDependencies {
  readonly createId?: () => PointId;
  readonly now?: () => IsoDateTime;
  readonly coordinateService?: CoordinateService;
}

function success<Value>(value: Value): PointServiceResult<Value> {
  return { status: 'success', value };
}

function failure(error: PointServiceError): PointServiceResult<never> {
  return { status: 'failure', error };
}

function repositoryFailure(message: string, pointId?: PointId): PointServiceResult<never> {
  return failure({
    code: 'POINT_NOT_FOUND',
    message,
    ...(pointId ? { pointId } : {}),
  });
}

function buildCoordinate(input: CreatePointInput): Coordinate | null {
  if (!Number.isFinite(input.first) || !Number.isFinite(input.second)) {
    return null;
  }

  if (input.system === 'SHANGHAI2000') {
    return {
      kind: 'projected',
      system: 'SHANGHAI2000',
      unit: 'metre',
      x: input.first,
      y: input.second,
    };
  }

  if (input.first < -180 || input.first > 180 || input.second < -90 || input.second > 90) {
    return null;
  }

  return {
    kind: 'geographic',
    system: input.system,
    unit: 'degree',
    lng: input.first,
    lat: input.second,
  };
}

export function createPointService(
  repository: PointRepository,
  dependencies: PointServiceDependencies = {},
): PointService {
  const createId =
    dependencies.createId ?? (() => `point-${globalThis.crypto.randomUUID()}` as PointId);
  const now = dependencies.now ?? (() => new Date().toISOString() as IsoDateTime);
  const coordinateService = dependencies.coordinateService ?? new CoordinateService();

  async function createOnePoint(input: CreatePointInput): Promise<PointServiceResult<Point>> {
    const name = input.name.trim();
    if (!name) {
      return failure({ code: 'EMPTY_NAME', message: '请输入点位名称。' });
    }

    const original = buildCoordinate(input);
    if (!original) {
      return failure({
        code: 'INVALID_COORDINATE',
        message:
          input.system === 'SHANGHAI2000'
            ? '请输入有效的 X、Y 坐标。'
            : '经度需在 -180 至 180 之间，纬度需在 -90 至 90 之间。',
      });
    }

    const timestamp = now();
    const point: Point = {
      id: createId(),
      name,
      source: input.source ?? { type: 'manual' },
      coordinates: {
        original,
        converted: {},
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const result = await repository.create(point);

    return result.status === 'success'
      ? success(result.value)
      : failure({
          code: result.error.code === 'CONFLICT' ? 'DUPLICATE_POINT_ID' : 'REPOSITORY_FAILURE',
          message: result.error.message,
          pointId: point.id,
        });
  }

  return {
    createPoint: createOnePoint,

    async createPoints(inputs) {
      const results: PointServiceResult<Point>[] = [];
      for (const input of inputs) {
        results.push(await createOnePoint(input));
      }
      return results;
    },

    async deletePoint(id) {
      const result = await repository.delete(id);
      return result.status === 'success'
        ? success(undefined)
        : repositoryFailure('未找到需要删除的点位。', id);
    },

    async getPoint(id) {
      const result = await repository.get(id);
      return result.status === 'success'
        ? success(result.value)
        : repositoryFailure('读取点位失败。', id);
    },

    async listPoints(search) {
      const result = await repository.list(search ? { search } : undefined);
      return result.status === 'success'
        ? success(result.value)
        : repositoryFailure('读取点位列表失败。');
    },

    async transformPoint(id, target) {
      const pointResult = await repository.get(id);
      if (pointResult.status === 'failure') {
        return failure({
          code: 'REPOSITORY_FAILURE',
          message: pointResult.error.message,
          pointId: id,
        });
      }

      const point = pointResult.value;
      if (!point) {
        return failure({
          code: 'POINT_NOT_FOUND',
          message: '未找到需要转换的点位。',
          pointId: id,
        });
      }

      if (point.coordinates.original.system === target) {
        return failure({
          code: 'UNSUPPORTED_TRANSFORMATION',
          message: '目标坐标系不能与原始坐标系相同。',
          pointId: id,
        });
      }

      const transformation = coordinateService.transform(point.coordinates.original, target);
      if (transformation.status === 'failure') {
        return failure({
          code:
            transformation.error.code === 'UNSUPPORTED_TRANSFORMATION'
              ? 'UNSUPPORTED_TRANSFORMATION'
              : 'COORDINATE_TRANSFORMATION_FAILED',
          message: transformation.error.message,
          pointId: id,
        });
      }

      const transformedAt = now();
      const updatedPoint: Point = {
        ...point,
        coordinates: {
          original: point.coordinates.original,
          converted: {
            ...point.coordinates.converted,
            [target]: {
              coordinate: transformation.value.coordinate,
              algorithmVersion: transformation.value.algorithmVersion,
              transformedAt,
            },
          },
        },
        updatedAt: transformedAt,
      };
      const updateResult = await repository.update(updatedPoint);

      return updateResult.status === 'success'
        ? success(updateResult.value)
        : failure({
            code: 'REPOSITORY_FAILURE',
            message: updateResult.error.message,
            pointId: id,
          });
    },
  };
}
