import type { PointRepository } from '@/adapters/storage';
import type { Coordinate, CoordinateSystemId, IsoDateTime, Point, PointId, Result } from '@/domain';

export interface CreatePointInput {
  readonly name: string;
  readonly system: Extract<CoordinateSystemId, 'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'>;
  readonly first: number;
  readonly second: number;
}

export type PointServiceErrorCode =
  | 'EMPTY_NAME'
  | 'INVALID_COORDINATE'
  | 'POINT_NOT_FOUND'
  | 'DUPLICATE_POINT_ID'
  | 'REPOSITORY_FAILURE';

export interface PointServiceError {
  readonly code: PointServiceErrorCode;
  readonly message: string;
  readonly pointId?: PointId;
}

export type PointServiceResult<Value> = Result<Value, PointServiceError>;

export interface PointService {
  createPoint(input: CreatePointInput): Promise<PointServiceResult<Point>>;
  deletePoint(id: PointId): Promise<PointServiceResult<void>>;
  getPoint(id: PointId): Promise<PointServiceResult<Point | null>>;
  listPoints(search?: string): Promise<PointServiceResult<readonly Point[]>>;
}

interface PointServiceDependencies {
  readonly createId?: () => PointId;
  readonly now?: () => IsoDateTime;
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

  return {
    async createPoint(input) {
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
        source: { type: 'manual' },
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
  };
}
