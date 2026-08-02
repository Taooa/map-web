export const POINT_DATABASE_NAME = 'coordinate-toolkit';
export const POINT_DATABASE_VERSION = 1;
export const POINT_STORE_NAME = 'points';

export function getIndexedDbFactory(): IDBFactory | undefined {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

export function requestToPromise<Value>(request: IDBRequest<Value>): Promise<Value> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB request failed.')),
      { once: true },
    );
  });
}

export function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.')),
      { once: true },
    );
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('IndexedDB transaction failed.')),
      { once: true },
    );
  });
}

export class IndexedDbClient {
  readonly #factory: IDBFactory | undefined;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(factory: IDBFactory | undefined = getIndexedDbFactory()) {
    this.#factory = factory;
  }

  open(): Promise<IDBDatabase> {
    if (!this.#factory) {
      return Promise.reject(new Error('当前浏览器不支持 IndexedDB。'));
    }

    this.#databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.#factory?.open(POINT_DATABASE_NAME, POINT_DATABASE_VERSION);
      if (!request) {
        reject(new Error('无法创建 IndexedDB 打开请求。'));
        return;
      }

      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(POINT_STORE_NAME)) {
          database.createObjectStore(POINT_STORE_NAME, { keyPath: 'id' });
        }
      });
      request.addEventListener(
        'success',
        () => {
          const database = request.result;
          database.addEventListener('versionchange', () => {
            database.close();
            this.#databasePromise = null;
          });
          resolve(database);
        },
        { once: true },
      );
      request.addEventListener(
        'error',
        () => {
          this.#databasePromise = null;
          reject(request.error ?? new Error('IndexedDB 打开失败。'));
        },
        { once: true },
      );
      request.addEventListener(
        'blocked',
        () => {
          this.#databasePromise = null;
          reject(new Error('IndexedDB 升级被其他页面阻塞。'));
        },
        { once: true },
      );
    });

    return this.#databasePromise;
  }

  async close(): Promise<void> {
    if (!this.#databasePromise) return;
    const database = await this.#databasePromise;
    database.close();
    this.#databasePromise = null;
  }
}
