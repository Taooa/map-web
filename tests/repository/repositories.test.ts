import { expectTypeOf } from 'vitest';
import type { PointListQuery, PointRepository, RepositoryResult } from '@/adapters/storage';
import type { Point, PointId } from '@/domain';

function success<Value>(value: Value): RepositoryResult<Value> {
  return { status: 'success', value };
}

class MockPointRepository implements PointRepository {
  readonly #points = new Map<PointId, Point>();

  get(id: PointId): Promise<RepositoryResult<Point | null>> {
    return Promise.resolve(success(this.#points.get(id) ?? null));
  }

  list(query?: PointListQuery): Promise<RepositoryResult<readonly Point[]>> {
    const search = query?.search?.toLocaleLowerCase();
    const points = [...this.#points.values()].filter(
      (point) => !search || point.name.toLocaleLowerCase().includes(search),
    );
    const offset = query?.offset ?? 0;
    const end = query?.limit === undefined ? undefined : offset + query.limit;
    return Promise.resolve(success(points.slice(offset, end)));
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

describe('PointRepository contract', () => {
  it('remains infrastructure-independent and mockable', () => {
    expectTypeOf<MockPointRepository>().toMatchTypeOf<PointRepository>();
    expectTypeOf<ReturnType<PointRepository['list']>>().toEqualTypeOf<
      Promise<RepositoryResult<readonly Point[]>>
    >();
  });
});
