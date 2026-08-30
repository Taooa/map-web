import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbClient, IndexedDBPointRepository } from '@/adapters/storage';
import type { IsoDateTime, Point, PointId } from '@/domain';
import { getPointStorageStatus, initializePointStorage, pointService } from '@/features/points';

const timestamp = '2026-07-29T10:00:00.000Z' as IsoDateTime;
const transformedAt = '2026-07-29T10:05:00.000Z' as IsoDateTime;

function point(id = 'indexeddb-point'): Point {
  return {
    id: id as PointId,
    name: '持久化设备',
    source: { type: 'manual' },
    coordinates: {
      original: {
        kind: 'geographic',
        system: 'WGS84',
        unit: 'degree',
        lng: 121.4737,
        lat: 31.2304,
      },
      converted: {},
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function setup(factory = new IDBFactory()) {
  const client = new IndexedDbClient(factory);
  const repository = new IndexedDBPointRepository(client);
  return { client, factory, repository };
}

describe('IndexedDBPointRepository', () => {
  it('initializes coordinate-toolkit v2 with paging indexes', async () => {
    const { client, repository } = setup();

    expect(await repository.initialize()).toEqual({ status: 'success', value: undefined });
    const database = await client.open();

    expect(database.name).toBe('coordinate-toolkit');
    expect(database.version).toBe(2);
    expect(database.objectStoreNames.contains('points')).toBe(true);
    expect(database.transaction('points').objectStore('points').indexNames.contains('updatedAt')).toBe(true);
    await client.close();
  });

  it('returns a page without materializing every matching point in the result', async () => {
    const { client, repository } = setup();
    const points = Array.from({ length: 120 }, (_, index) => ({
      ...point(`page-${index}`),
      name: `设备 ${index}`,
      updatedAt: `2026-07-29T10:${String(index % 60).padStart(2, '0')}:00.000Z` as IsoDateTime,
    }));
    await repository.createMany(points);
    const result = await repository.listPage({ offset: 40, limit: 20, sortField: 'updatedAt', sortDirection: 'desc' });
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.value.points).toHaveLength(20);
      expect(result.value.total).toBe(120);
      expect(result.value.pointIds).toHaveLength(120);
    }
    await client.close();
  });

  it('creates, reads, lists and deletes Points', async () => {
    const { client, repository } = setup();
    const first = point('idb-1');
    const second = { ...point('idb-2'), name: '另一个设备' };

    expect((await repository.createMany([first, second])).status).toBe('success');
    expect(await repository.get(first.id)).toEqual({ status: 'success', value: first });
    expect(await repository.list({ search: '持久化' })).toEqual({
      status: 'success',
      value: [first],
    });
    expect((await repository.delete(first.id)).status).toBe('success');
    expect(await repository.get(first.id)).toEqual({ status: 'success', value: null });
    await client.close();
  });

  it('persists original and converted coordinates including service-approved original edits', async () => {
    const { client, repository } = setup();
    const originalPoint = point();
    await repository.create(originalPoint);
    const updated: Point = {
      ...originalPoint,
      coordinates: {
        original: originalPoint.coordinates.original,
        converted: {
          GCJ02: {
            coordinate: {
              kind: 'geographic',
              system: 'GCJ02',
              unit: 'degree',
              lng: 121.47822305927693,
              lat: 31.22845773757727,
            },
            algorithmVersion: 'gcoord@0.3.2',
            transformedAt,
          },
        },
      },
      updatedAt: transformedAt,
    };

    expect((await repository.update(updated)).status).toBe('success');
    expect(await repository.get(updated.id)).toEqual({ status: 'success', value: updated });

    const overwritten: Point = {
      ...updated,
      coordinates: {
        ...updated.coordinates,
        original: {
          kind: 'geographic',
          system: 'WGS84',
          unit: 'degree',
          lng: 120,
          lat: 31.2304,
        },
      },
    };
    expect((await repository.update(overwritten)).status).toBe('success');
    expect(await repository.get(updated.id)).toEqual({ status: 'success', value: overwritten });
    await client.close();
  });

  it('restores Point data after recreating the repository like a page refresh', async () => {
    const factory = new IDBFactory();
    const firstClient = new IndexedDbClient(factory);
    const firstRepository = new IndexedDBPointRepository(firstClient);
    const stored = point('refresh-point');
    await firstRepository.create(stored);
    await firstClient.close();

    const refreshedClient = new IndexedDbClient(factory);
    const refreshedRepository = new IndexedDBPointRepository(refreshedClient);

    expect(await refreshedRepository.get(stored.id)).toEqual({
      status: 'success',
      value: stored,
    });
    await refreshedClient.close();
  });

  it('switches the application PointService to IndexedDB and falls back on open failure', async () => {
    const factory = new IDBFactory();
    const firstRepository = new IndexedDBPointRepository(new IndexedDbClient(factory));
    expect((await initializePointStorage(firstRepository)).mode).toBe('indexeddb');
    await pointService.createPoint({
      name: '刷新后点位',
      system: 'WGS84',
      first: 121.4737,
      second: 31.2304,
    });

    const refreshedRepository = new IndexedDBPointRepository(new IndexedDbClient(factory));
    await initializePointStorage(refreshedRepository);
    expect(await pointService.listPoints('刷新后')).toMatchObject({
      status: 'success',
      value: [{ name: '刷新后点位' }],
    });

    const failingFactory = {
      open: () => {
        throw new Error('IndexedDB disabled');
      },
    } as unknown as IDBFactory;
    const fallbackStatus = await initializePointStorage(
      new IndexedDBPointRepository(new IndexedDbClient(failingFactory)),
    );
    expect(fallbackStatus.mode).toBe('memory');
    expect(getPointStorageStatus().message).toContain('已降级为内存存储');
  });
});
