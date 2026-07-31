export interface PaginatedResult<Item> {
  readonly items: readonly Item[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export const pointPageSizes = [20, 50, 100] as const;
export type PointPageSize = (typeof pointPageSizes)[number];

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginateItems<Item>(
  items: readonly Item[],
  requestedPage: number,
  pageSize: PointPageSize,
): PaginatedResult<Item> {
  const page = Math.min(Math.max(1, requestedPage), getPageCount(items.length, pageSize));
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}
