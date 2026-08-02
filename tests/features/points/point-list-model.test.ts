import { getPageCount, pointPageSizes } from '@/features/points/point-list-model';

describe('point list pagination model', () => {
  it('exposes the supported page sizes', () => {
    expect(pointPageSizes).toEqual([20, 50, 100]);
  });

  it('calculates a non-zero page count for empty and populated lists', () => {
    expect(getPageCount(0, 20)).toBe(1);
    expect(getPageCount(20, 20)).toBe(1);
    expect(getPageCount(21, 20)).toBe(2);
  });
});
