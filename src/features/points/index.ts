import {
  IndexedDBPointRepository,
  MemoryPointRepository,
  type PointListQuery,
  type PointListPage,
  type PointRepository,
  type RepositoryResult,
} from '@/adapters/storage';
import type { Point, PointId } from '@/domain';
import { createPointService } from './point-service';

export type PointStorageMode = 'indexeddb' | 'memory';

export interface PointStorageStatus {
  readonly mode: PointStorageMode;
  readonly message: string;
}

class ActivePointRepository implements PointRepository {
  #repository: PointRepository = new MemoryPointRepository();

  use(repository: PointRepository): void {
    this.#repository = repository;
  }

  get(id: PointId): Promise<RepositoryResult<Point | null>> {
    return this.#repository.get(id);
  }

  list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>> {
    return this.#repository.list(query);
  }

  listPage(query: PointListQuery): Promise<RepositoryResult<PointListPage>> {
    return this.#repository.listPage(query);
  }

  create(point: Point): Promise<RepositoryResult<Point>> {
    return this.#repository.create(point);
  }

  createMany(points: readonly Point[]): Promise<RepositoryResult<readonly Point[]>> {
    return this.#repository.createMany(points);
  }

  update(point: Point): Promise<RepositoryResult<Point>> {
    return this.#repository.update(point);
  }

  delete(id: PointId): Promise<RepositoryResult<void>> {
    return this.#repository.delete(id);
  }
}

const activeRepository = new ActivePointRepository();
const storageListeners = new Set<() => void>();
let storageStatus: PointStorageStatus = {
  mode: 'memory',
  message: 'IndexedDB 尚未初始化，当前使用会话内存。',
};

function publishStorageStatus(status: PointStorageStatus): void {
  storageStatus = status;
  storageListeners.forEach((listener) => listener());
}

export const pointService = createPointService(activeRepository);

export function getPointStorageStatus(): PointStorageStatus {
  return storageStatus;
}

export function subscribePointStorageStatus(listener: () => void): () => void {
  storageListeners.add(listener);
  return () => storageListeners.delete(listener);
}

export async function initializePointStorage(
  repository = new IndexedDBPointRepository(),
): Promise<PointStorageStatus> {
  const initialized = await repository.initialize();
  if (initialized.status === 'success') {
    activeRepository.use(repository);
    publishStorageStatus({
      mode: 'indexeddb',
      message: '点位已保存在当前浏览器的 IndexedDB 中。',
    });
  } else {
    activeRepository.use(new MemoryPointRepository());
    publishStorageStatus({
      mode: 'memory',
      message: `IndexedDB 不可用，已降级为内存存储：${initialized.error.message}`,
    });
  }

  return storageStatus;
}

export { createPointService } from './point-service';
export type {
  CreatePointInput,
  CoordinateEditValue,
  EditableCoordinateSystem,
  BulkDeleteResult,
  PointService,
  PointServiceError,
  PointServiceErrorCode,
  PointServiceResult,
  TransformPointsProgress,
  TransformPointsResult,
  UpdatePointInput,
} from './point-service';
