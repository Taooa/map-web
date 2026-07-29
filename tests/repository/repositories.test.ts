import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ImportListQuery,
  ImportRepository,
  PointListQuery,
  PointRepository,
  RepositoryResult,
  SettingsRepository,
} from '@/adapters/storage';
import type { ImportRecord, ImportRecordId, IsoDateTime, Point, PointId, Settings } from '@/domain';

function success<Value>(value: Value): RepositoryResult<Value> {
  return {
    status: 'success',
    value,
  };
}

class MockPointRepository implements PointRepository {
  readonly #points = new Map<PointId, Point>();

  get(id: PointId): Promise<RepositoryResult<Point | null>> {
    return Promise.resolve(success(this.#points.get(id) ?? null));
  }

  list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>> {
    const points = [...this.#points.values()];
    const searched = query?.search
      ? points.filter((point) => point.name.includes(query.search ?? ''))
      : points;
    const offset = query?.offset ?? 0;
    const end = query?.limit === undefined ? undefined : offset + query.limit;

    return Promise.resolve(success(searched.slice(offset, end)));
  }

  create(point: Point): Promise<RepositoryResult<Point>> {
    this.#points.set(point.id, point);
    return Promise.resolve(success(point));
  }

  update(point: Point): Promise<RepositoryResult<Point>> {
    this.#points.set(point.id, point);
    return Promise.resolve(success(point));
  }

  delete(id: PointId): Promise<RepositoryResult<void>> {
    this.#points.delete(id);
    return Promise.resolve(success(undefined));
  }
}

class MockImportRepository implements ImportRepository {
  readonly #records = new Map<ImportRecordId, ImportRecord>();

  save(record: ImportRecord): Promise<RepositoryResult<ImportRecord>> {
    this.#records.set(record.id, record);
    return Promise.resolve(success(record));
  }

  list(query?: ImportListQuery): Promise<RepositoryResult<readonly ImportRecord[]>> {
    const records = [...this.#records.values()].filter(
      (record) => query?.sourceType === undefined || record.source.type === query.sourceType,
    );
    const ordered = query?.newestFirst ? [...records].reverse() : records;
    const offset = query?.offset ?? 0;
    const end = query?.limit === undefined ? undefined : offset + query.limit;

    return Promise.resolve(success(ordered.slice(offset, end)));
  }

  get(id: ImportRecordId): Promise<RepositoryResult<ImportRecord | null>> {
    return Promise.resolve(success(this.#records.get(id) ?? null));
  }
}

class MockSettingsRepository implements SettingsRepository {
  readonly #defaults: Settings = {
    theme: 'system',
    locale: 'zh-CN',
  };

  #settings: Settings = this.#defaults;

  get(): Promise<RepositoryResult<Settings>> {
    return Promise.resolve(success(this.#settings));
  }

  save(settings: Settings): Promise<RepositoryResult<Settings>> {
    this.#settings = settings;
    return Promise.resolve(success(this.#settings));
  }

  reset(): Promise<RepositoryResult<Settings>> {
    this.#settings = this.#defaults;
    return Promise.resolve(success(this.#settings));
  }
}

const createdAt = '2026-07-29T03:00:00.000Z' as IsoDateTime;

function createPoint(): Point {
  return {
    id: 'point-repository-test' as PointId,
    name: 'Repository Mock Point',
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
    createdAt,
    updatedAt: createdAt,
  };
}

function createImportRecord(): ImportRecord {
  return {
    id: 'import-repository-test' as ImportRecordId,
    source: {
      type: 'csv',
      fileName: 'points.csv',
      fileSizeBytes: 512,
    },
    coordinateSystem: 'WGS84',
    mapping: {
      name: 'name',
      x: 'lng',
      y: 'lat',
    },
    status: 'completed',
    summary: {
      totalRows: 1,
      importedRows: 1,
      skippedRows: 0,
    },
    createdAt,
  };
}

describe('repository contracts', () => {
  it('allows a mock PointRepository implementation', async () => {
    const repository: PointRepository = new MockPointRepository();
    const point = createPoint();

    const created = await repository.create(point);
    const found = await repository.get(point.id);
    const listed = await repository.list({ search: 'Mock' });
    const deleted = await repository.delete(point.id);

    expect(created).toEqual(success(point));
    expect(found).toEqual(success(point));
    expect(listed).toEqual(success([point]));
    expect(deleted.status).toBe('success');
  });

  it('allows a mock ImportRepository implementation', async () => {
    const repository: ImportRepository = new MockImportRepository();
    const record = createImportRecord();

    await repository.save(record);

    expect(await repository.get(record.id)).toEqual(success(record));
    expect(await repository.list({ sourceType: 'csv' })).toEqual(success([record]));
  });

  it('keeps SettingsRepository limited to product preferences', async () => {
    const repository: SettingsRepository = new MockSettingsRepository();
    const settings: Settings = {
      theme: 'dark',
      locale: 'zh-CN',
    };

    expect(await repository.save(settings)).toEqual(success(settings));
    expect(await repository.get()).toEqual(success(settings));
    expect(await repository.reset()).toEqual(
      success({
        theme: 'system',
        locale: 'zh-CN',
      }),
    );

    expectTypeOf<Parameters<SettingsRepository['save']>[0]>().toEqualTypeOf<Settings>();
  });
});
