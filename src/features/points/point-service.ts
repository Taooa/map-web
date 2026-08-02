import type { PointRepository } from '@/adapters/storage';
import type {
  Coordinate,
  ConvertedCoordinate,
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

export type EditableCoordinateSystem = Extract<
  CoordinateSystemId,
  'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'
>;

export interface CoordinateEditValue {
  readonly first: number;
  readonly second: number;
}

export interface UpdatePointInput {
  readonly name: string;
  readonly coordinates?: Partial<Record<EditableCoordinateSystem, CoordinateEditValue | null>>;
}

export interface PointOperationFailure {
  readonly pointId: PointId;
  readonly pointName: string;
  readonly message: string;
}

export interface BulkDeleteResult {
  readonly successIds: readonly PointId[];
  readonly failures: readonly PointOperationFailure[];
}

export interface TransformPointFailure extends PointOperationFailure {
  readonly source: EditableCoordinateSystem;
  readonly sourceCoordinate: string;
}

export interface TransformPointsResult {
  readonly total: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly failures: readonly TransformPointFailure[];
}

export type PointServiceErrorCode =
  | 'EMPTY_NAME'
  | 'INVALID_COORDINATE'
  | 'POINT_NOT_FOUND'
  | 'DUPLICATE_POINT_ID'
  | 'SOURCE_COORDINATE_MISSING'
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
  createPoints(inputs: readonly CreatePointInput[]): Promise<readonly PointServiceResult<Point>[]>;
  deletePoint(id: PointId): Promise<PointServiceResult<void>>;
  getPoint(id: PointId): Promise<PointServiceResult<Point | null>>;
  listPoints(search?: string): Promise<PointServiceResult<readonly Point[]>>;
  updatePointName(id: PointId, name: string): Promise<PointServiceResult<Point>>;
  updatePoint(id: PointId, input: UpdatePointInput): Promise<PointServiceResult<Point>>;
  transformPoint(id: PointId, target: CoordinateSystemId): Promise<PointServiceResult<Point>>;
  transformPointFrom(
    id: PointId,
    source: EditableCoordinateSystem,
    target: EditableCoordinateSystem,
  ): Promise<PointServiceResult<Point>>;
  transformPointsFrom(
    ids: readonly PointId[],
    source: EditableCoordinateSystem,
    target: EditableCoordinateSystem,
  ): Promise<TransformPointsResult>;
  deletePoints(ids: readonly PointId[]): Promise<BulkDeleteResult>;
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

function buildCoordinate(input: {
  readonly system: EditableCoordinateSystem;
  readonly first: number;
  readonly second: number;
}): Coordinate | null {
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

function coordinateText(coordinate: Coordinate | null): string {
  if (!coordinate) return '—';
  return coordinate.kind === 'geographic'
    ? `${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.x}, ${coordinate.y}`;
}

function coordinateAt(point: Point, system: EditableCoordinateSystem): Coordinate | null {
  if (point.coordinates.original.system === system) {
    return point.coordinates.original;
  }
  return point.coordinates.converted[system]?.coordinate ?? null;
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

  async function updateOnePoint(
    id: PointId,
    input: UpdatePointInput,
  ): Promise<PointServiceResult<Point>> {
    const name = input.name.trim();
    if (!name) return failure({ code: 'EMPTY_NAME', message: '请输入点位名称。', pointId: id });
    const pointResult = await repository.get(id);
    if (pointResult.status === 'failure' || !pointResult.value) {
      return repositoryFailure('未找到需要编辑的点位。', id);
    }
    const point = pointResult.value;
    const timestamp = now();
    const originalSystem = point.coordinates.original.system as EditableCoordinateSystem;
    let original = point.coordinates.original;
    const originalEdit = input.coordinates?.[originalSystem];
    if (originalEdit === null) {
      return failure({
        code: 'INVALID_COORDINATE',
        message: '原始坐标不能为空。',
        pointId: id,
      });
    }
    if (originalEdit) {
      const nextOriginal = buildCoordinate({ system: originalSystem, ...originalEdit });
      if (!nextOriginal) {
        return failure({
          code: 'INVALID_COORDINATE',
          message: `${originalSystem} 坐标不合法。`,
          pointId: id,
        });
      }
      original = nextOriginal;
    }

    const converted: Partial<Record<CoordinateSystemId, ConvertedCoordinate>> = {
      ...point.coordinates.converted,
    };
    const editableSystems: readonly EditableCoordinateSystem[] = [
      'WGS84',
      'GCJ02',
      'BD09',
      'SHANGHAI2000',
    ];
    for (const system of editableSystems) {
      if (system === originalSystem || !input.coordinates || !(system in input.coordinates)) {
        continue;
      }
      const edit = input.coordinates[system];
      if (edit === null) {
        delete converted[system];
        continue;
      }
      if (!edit) continue;
      const coordinate = buildCoordinate({ system, ...edit });
      if (!coordinate) {
        return failure({
          code: 'INVALID_COORDINATE',
          message: `${system} 坐标不合法。`,
          pointId: id,
        });
      }
      converted[system] = {
        coordinate,
        transformedAt: timestamp,
        algorithmVersion: 'manual-edit',
      };
    }
    delete converted[originalSystem];
    const updateResult = await repository.update({
      ...point,
      name,
      coordinates: { original, converted },
      updatedAt: timestamp,
    });
    return updateResult.status === 'success'
      ? success(updateResult.value)
      : failure({
          code: 'REPOSITORY_FAILURE',
          message: updateResult.error.message,
          pointId: id,
        });
  }

  async function transformOnePointFrom(
    id: PointId,
    source: EditableCoordinateSystem,
    target: EditableCoordinateSystem,
  ): Promise<PointServiceResult<Point>> {
    const pointResult = await repository.get(id);
    if (pointResult.status === 'failure' || !pointResult.value) {
      return repositoryFailure('未找到需要转换的点位。', id);
    }
    const point = pointResult.value;
    if (source === target) {
      return failure({
        code: 'UNSUPPORTED_TRANSFORMATION',
        message: '源坐标系和目标坐标系不能相同。',
        pointId: id,
      });
    }
    const sourceCoordinate = coordinateAt(point, source);
    if (!sourceCoordinate) {
      return failure({
        code: 'SOURCE_COORDINATE_MISSING',
        message: `缺少 ${source} 源坐标。`,
        pointId: id,
      });
    }
    const transformation = coordinateService.transform(sourceCoordinate, target);
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
    const converted = { ...point.coordinates.converted };
    let original = point.coordinates.original;
    if (target === point.coordinates.original.system) {
      original = transformation.value.coordinate;
      delete converted[target];
    } else {
      converted[target] = {
        coordinate: transformation.value.coordinate,
        algorithmVersion: transformation.value.algorithmVersion,
        transformedAt,
      };
    }
    const updateResult = await repository.update({
      ...point,
      coordinates: { original, converted },
      updatedAt: transformedAt,
    });
    return updateResult.status === 'success'
      ? success(updateResult.value)
      : failure({ code: 'REPOSITORY_FAILURE', message: updateResult.error.message, pointId: id });
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

    updatePointName(id, name) {
      return updateOnePoint(id, { name });
    },

    updatePoint: updateOnePoint,

    async transformPoint(id, target) {
      const pointResult = await repository.get(id);
      if (pointResult.status === 'failure' || !pointResult.value) {
        return repositoryFailure('未找到需要转换的点位。', id);
      }
      return transformOnePointFrom(
        id,
        pointResult.value.coordinates.original.system as EditableCoordinateSystem,
        target as EditableCoordinateSystem,
      );
    },

    transformPointFrom: transformOnePointFrom,

    async transformPointsFrom(ids, source, target) {
      const failures: TransformPointFailure[] = [];
      let successCount = 0;
      for (const id of ids) {
        const pointResult = await repository.get(id);
        const point = pointResult.status === 'success' ? pointResult.value : null;
        const sourceCoordinate = point ? coordinateAt(point, source) : null;
        const result = await transformOnePointFrom(id, source, target);
        if (result.status === 'success') {
          successCount += 1;
        } else {
          failures.push({
            pointId: id,
            pointName: point?.name ?? String(id),
            source,
            sourceCoordinate: coordinateText(sourceCoordinate),
            message: result.error.message,
          });
        }
      }
      return { total: ids.length, successCount, failureCount: failures.length, failures };
    },

    async deletePoints(ids) {
      const successIds: PointId[] = [];
      const failures: PointOperationFailure[] = [];
      for (const id of ids) {
        const pointResult = await repository.get(id);
        const pointName =
          pointResult.status === 'success' && pointResult.value
            ? pointResult.value.name
            : String(id);
        const result = await repository.delete(id);
        if (result.status === 'success') successIds.push(id);
        else failures.push({ pointId: id, pointName, message: result.error.message });
      }
      return { successIds, failures };
    },
  };
}
