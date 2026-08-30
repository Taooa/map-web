import type { Point, PointId } from '@/domain';
import type {
  PointListQuery,
  PointListPage,
  PointRepository,
  RepositoryError,
  RepositoryResult,
} from '@/adapters/storage/repositories';
import {
  IndexedDbClient,
  POINT_STORE_NAME,
  requestToPromise,
  transactionToPromise,
} from './indexeddb-client';

function success<Value>(value: Value): RepositoryResult<Value> {
  return { status: 'success', value };
}

function errorCode(error: unknown): RepositoryError['code'] {
  if (error instanceof DOMException) {
    if (error.name === 'ConstraintError') return 'CONFLICT';
    if (error.name === 'QuotaExceededError') return 'QUOTA_EXCEEDED';
  }
  return 'UNAVAILABLE';
}

function failure(message: string, error: unknown): RepositoryResult<never> {
  return {
    status: 'failure',
    error: { code: errorCode(error), message, cause: error },
  };
}

function sourceName(point: Point): string {
  if (point.source.type === 'manual') return '手动输入';
  return point.source.sourceName || ({ excel: 'Excel 导入', csv: 'CSV 导入', 'json-file': 'JSON 文件导入', 'json-paste': 'JSON 粘贴' } as const)[point.source.format];
}

function matches(point: Point, query: PointListQuery): boolean {
  const search = query.search?.trim().toLocaleLowerCase();
  return (!search || point.name.toLocaleLowerCase().includes(search)) &&
    (!query.source || sourceName(point) === query.source) &&
    (!query.createdFrom || point.createdAt >= query.createdFrom) &&
    (!query.createdTo || point.createdAt <= query.createdTo) &&
    (!query.updatedFrom || point.updatedAt >= query.updatedFrom) &&
    (!query.updatedTo || point.updatedAt <= query.updatedTo);
}

export class IndexedDBPointRepository implements PointRepository {
  readonly #client: IndexedDbClient;

  constructor(client = new IndexedDbClient()) {
    this.#client = client;
  }

  async initialize(): Promise<RepositoryResult<void>> {
    try {
      await this.#client.open();
      return success(undefined);
    } catch (error) {
      return failure('无法打开点位数据库。', error);
    }
  }

  async get(id: PointId): Promise<RepositoryResult<Point | null>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readonly');
      const point = await requestToPromise(
        transaction.objectStore(POINT_STORE_NAME).get(id) as IDBRequest<Point | undefined>,
      );
      await transactionToPromise(transaction);
      return success(point ?? null);
    } catch (error) {
      return failure('读取点位失败。', error);
    }
  }

  async list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readonly');
      const points = await requestToPromise(
        transaction.objectStore(POINT_STORE_NAME).getAll() as IDBRequest<Point[]>,
      );
      await transactionToPromise(transaction);

      const search = query?.search?.trim().toLocaleLowerCase();
      const matching = points
        .filter((point) => !search || point.name.toLocaleLowerCase().includes(search))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const offset = Math.max(0, query?.offset ?? 0);
      const end = query?.limit === undefined ? undefined : offset + Math.max(0, query.limit);
      return success(matching.slice(offset, end));
    } catch (error) {
      return failure('读取点位列表失败。', error);
    }
  }

  async listPage(query: PointListQuery): Promise<RepositoryResult<PointListPage>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(POINT_STORE_NAME);
      const field = query.sortField ?? 'updatedAt';
      const direction = (query.sortDirection ?? 'desc') === 'asc' ? 'next' : 'prev';
      const hasFilters = Boolean(
        query.search?.trim() || query.source || query.createdFrom || query.createdTo ||
        query.updatedFrom || query.updatedTo,
      );
      const offset = Math.max(0, query.offset ?? 0);
      const limit = Math.max(0, query.limit ?? 20);

      if (!hasFilters) {
        const includePointIds = query.includePointIds !== false;
        const pointIds = includePointIds
          ? ((await requestToPromise(store.getAllKeys())) as PointId[])
          : [];
        const total = includePointIds
          ? pointIds.length
          : await requestToPromise(store.count());
        const points: Point[] = [];
        const cursorRequest = store.index(field).openCursor(undefined, direction);
        await new Promise<void>((resolve, reject) => {
          let advanced = offset === 0;
          cursorRequest.addEventListener('error', () => reject(cursorRequest.error));
          cursorRequest.addEventListener('success', () => {
            const cursor = cursorRequest.result;
            if (!cursor || points.length >= limit) { resolve(); return; }
            if (!advanced) { advanced = true; cursor.advance(offset); return; }
            points.push(cursor.value as Point);
            cursor.continue();
          });
        });
        await transactionToPromise(transaction);
        return success({
          points,
          pointIds,
          total,
          sourceOptions: [...new Set(points.map(sourceName))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
        });
      }

      const cursorRequest = store.index(field).openCursor(
        undefined,
        direction,
      );
      const points: Point[] = [];
      const pointIds: PointId[] = [];
      const sources = new Set<string>();
      let matched = 0;
      await new Promise<void>((resolve, reject) => {
        cursorRequest.addEventListener('error', () => reject(cursorRequest.error));
        cursorRequest.addEventListener('success', () => {
          const cursor = cursorRequest.result;
          if (!cursor) { resolve(); return; }
          const point = cursor.value as Point;
          sources.add(sourceName(point));
          if (matches(point, query)) {
            if (query.includePointIds !== false) pointIds.push(point.id);
            if (matched >= offset && points.length < limit) points.push(point);
            matched += 1;
          }
          cursor.continue();
        });
      });
      await transactionToPromise(transaction);
      return success({
        points,
        pointIds,
        total: matched,
        sourceOptions: [...sources].sort((a, b) => a.localeCompare(b, 'zh-CN')),
      });
    } catch (error) {
      return failure('读取点位分页失败。', error);
    }
  }

  async create(point: Point): Promise<RepositoryResult<Point>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readwrite');
      transaction.objectStore(POINT_STORE_NAME).add(point);
      await transactionToPromise(transaction);
      return success(point);
    } catch (error) {
      return failure('创建点位失败。', error);
    }
  }

  async createMany(points: readonly Point[]): Promise<RepositoryResult<readonly Point[]>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(POINT_STORE_NAME);
      points.forEach((point) => store.add(point));
      await transactionToPromise(transaction);
      return success(points);
    } catch (error) {
      return failure('批量创建点位失败。', error);
    }
  }

  async update(point: Point): Promise<RepositoryResult<Point>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(POINT_STORE_NAME);
      const existing = await requestToPromise(store.get(point.id) as IDBRequest<Point | undefined>);
      if (!existing) {
        transaction.abort();
        return {
          status: 'failure',
          error: { code: 'NOT_FOUND', message: `Point ${point.id} does not exist.` },
        };
      }

      store.put(point);
      await transactionToPromise(transaction);
      return success(point);
    } catch (error) {
      return failure('更新点位失败。', error);
    }
  }

  async delete(id: PointId): Promise<RepositoryResult<void>> {
    try {
      const database = await this.#client.open();
      const transaction = database.transaction(POINT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(POINT_STORE_NAME);
      const existingKey = await requestToPromise(store.getKey(id));
      if (existingKey === undefined) {
        transaction.abort();
        return {
          status: 'failure',
          error: { code: 'NOT_FOUND', message: `Point ${id} does not exist.` },
        };
      }

      store.delete(id);
      await transactionToPromise(transaction);
      return success(undefined);
    } catch (error) {
      return failure('删除点位失败。', error);
    }
  }
}
