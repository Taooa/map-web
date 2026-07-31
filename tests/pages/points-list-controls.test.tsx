import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { ImportRecordId } from '@/domain';
import { pointService } from '@/features/points';
import { renderRoute } from '@/test/render';

async function clearPoints() {
  const result = await pointService.listPoints();
  if (result.status === 'failure') {
    throw new Error(result.error.message);
  }
  await Promise.all(result.value.map((point) => pointService.deletePoint(point.id)));
}

async function seedPoints(count: number) {
  for (let index = 1; index <= count; index += 1) {
    const result = await pointService.createPoint({
      name: `测试点位 ${String(index).padStart(2, '0')}`,
      system: 'WGS84',
      first: 121 + index / 1000,
      second: 31 + index / 1000,
    });
    if (result.status === 'failure') {
      throw new Error(result.error.message);
    }
  }
}

describe('point list controls', () => {
  beforeEach(async () => {
    await clearPoints();
  });

  afterEach(async () => {
    await clearPoints();
  });

  it('paginates, changes page size, and keeps selection across pages', async () => {
    await seedPoints(25);
    const user = userEvent.setup();
    renderRoute('/points');

    await screen.findByRole('table');
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText(/点位总数/)).toHaveTextContent('25');

    await user.click(screen.getByRole('button', { name: '下一页' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6));
    await user.click(screen.getAllByRole('checkbox')[1]!);
    expect(screen.getByText('已选择 1 个点位')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '上一页' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(21));
    await user.click(screen.getAllByRole('checkbox')[1]!);
    expect(screen.getByText('已选择 2 个点位')).toBeVisible();

    const currentPageCheckbox = screen.getByRole('checkbox', { name: '选择当前页' });
    await user.click(currentPageCheckbox);
    expect(screen.getByText('已选择 21 个点位')).toBeVisible();
    await user.click(currentPageCheckbox);
    expect(screen.getByText('已选择 1 个点位')).toBeVisible();

    await user.selectOptions(screen.getByRole('combobox', { name: '每页条数' }), '50');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(26));
    expect(screen.getByText(/第 1 \/ 1 页/)).toBeVisible();
  });

  it('disables batch actions until selected and requires confirmation for deletion', async () => {
    await seedPoints(2);
    const user = userEvent.setup();
    renderRoute('/points');

    await screen.findByText('测试点位 01');
    expect(screen.getByRole('button', { name: '坐标转换' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '在地图中查看' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '批量导出' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '批量删除' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: '选择当前页' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    const dialog = screen.getByRole('dialog', { name: '确认批量删除' });
    expect(dialog).toBeVisible();
    expect(screen.getByText('确认删除 2 个点位？')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: '确认批量删除' }));

    expect(await screen.findByText('还没有点位')).toBeVisible();
    expect(screen.getByText('已选择 0 个点位')).toBeVisible();
  });

  it('shows the source filename, four coordinate columns, missing values, and copies coordinates', async () => {
    const result = await pointService.createPoint({
      name: '上海设备点位',
      system: 'WGS84',
      first: 121.4737014,
      second: 31.2304164,
      source: {
        type: 'import',
        format: 'excel',
        importId: 'import-test' as ImportRecordId,
        sourceName: '上海设备点位.xlsx',
        sourceRow: 2,
      },
    });
    if (result.status === 'failure') throw new Error(result.error.message);
    const projectedResult = await pointService.createPoint({
      name: '上海2000样例',
      system: 'SHANGHAI2000',
      first: 345678.1234,
      second: 267890.4564,
    });
    if (projectedResult.status === 'failure') throw new Error(projectedResult.error.message);

    const user = userEvent.setup();
    renderRoute('/points');

    expect(await screen.findByText('上海设备点位.xlsx')).toBeVisible();
    for (const heading of ['WGS84', 'GCJ02', 'BD09', 'SH2000']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeVisible();
    }
    expect(screen.getByText('Lng: 121.473701')).toBeVisible();
    expect(screen.getByText('Lat: 31.230416')).toBeVisible();
    expect(screen.getByText('X: 345678.123')).toBeVisible();
    expect(screen.getByText('Y: 267890.456')).toBeVisible();
    expect(screen.getAllByText('—')).toHaveLength(6);

    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: '复制 上海设备点位 WGS84 坐标' }));
    expect(await screen.findByText('已复制 上海设备点位 的 WGS84 坐标。')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith('121.4737014, 31.2304164');
  });

  it('returns to the first page after search and corrects the page after deletion', async () => {
    await seedPoints(21);
    const user = userEvent.setup();
    renderRoute('/points');

    await screen.findByText('测试点位 01');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByText('测试点位 21')).toBeVisible();

    await user.type(screen.getByRole('searchbox', { name: '搜索点位' }), '01');
    expect(await screen.findByText('测试点位 01')).toBeVisible();
    expect(screen.getByText(/第 1 \/ 1 页/)).toBeVisible();
    await user.clear(screen.getByRole('searchbox', { name: '搜索点位' }));

    await user.click(screen.getByRole('button', { name: '下一页' }));
    await user.click(screen.getByRole('button', { name: '删除' }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));

    await waitFor(() => {
      expect(screen.getByText(/第 1 \/ 1 页/)).toBeVisible();
    });
    expect(screen.getByText('测试点位 20')).toBeVisible();
  });
});
