import { getPageCount, paginateItems } from '@/features/points/point-list-model';

describe('point list pagination model', () => {
  const items = Array.from({ length: 45 }, (_, index) => index + 1);

  it('uses a 20-item first page without rendering the full collection', () => {
    expect(paginateItems(items, 1, 20)).toEqual({
      items: items.slice(0, 20),
      page: 1,
      pageSize: 20,
      total: 45,
    });
  });

  it('returns the requested page and page size', () => {
    expect(paginateItems(items, 2, 20)).toEqual({
      items: items.slice(20, 40),
      page: 2,
      pageSize: 20,
      total: 45,
    });
    expect(paginateItems(items, 1, 50).items).toHaveLength(45);
  });

  it('clamps a page after the last item on that page is removed', () => {
    expect(getPageCount(20, 20)).toBe(1);
    expect(paginateItems(items.slice(0, 20), 2, 20).page).toBe(1);
  });
});
