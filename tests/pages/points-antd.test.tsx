import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pointService } from '@/features/points';
import { renderRoute } from '@/test/render';

async function clearPoints() {
  const result = await pointService.listPoints();
  if (result.status === 'failure') throw new Error(result.error.message);
  await pointService.deletePoints(result.value.map((point) => point.id));
}

async function seedPoints(count: number) {
  for (let index = 1; index <= count; index += 1) {
    const result = await pointService.createPoint({
      name: `测试点位 ${String(index).padStart(2, '0')}`,
      system: 'WGS84',
      first: 121 + index / 1000,
      second: 31 + index / 1000,
    });
    if (result.status === 'failure') throw new Error(result.error.message);
  }
}

describe('Ant Design point management', () => {
  beforeEach(clearPoints);
  afterEach(async () => {
    delete document.documentElement.dataset.theme;
    await clearPoints();
  });

  it('keeps draft filters separate from applied filters and resets explicitly', async () => {
    await pointService.createPoint({
      name: '浦东点位',
      system: 'WGS84',
      first: 121.5,
      second: 31.2,
    });
    await pointService.createPoint({
      name: '徐汇点位',
      system: 'WGS84',
      first: 121.4,
      second: 31.1,
    });
    const user = userEvent.setup();
    renderRoute('/points');

    expect(await screen.findByText('浦东点位')).toBeVisible();
    await user.type(screen.getByRole('textbox', { name: '点位名称' }), '徐汇');
    expect(screen.getByText('浦东点位')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() => expect(screen.queryByText('浦东点位')).not.toBeInTheDocument());
    expect(screen.getByText('徐汇点位')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '重置' }));
    expect(await screen.findByText('浦东点位')).toBeVisible();
  });

  it('paginates and preserves controlled selection across pages', async () => {
    await seedPoints(25);
    const user = userEvent.setup();
    renderRoute('/points');

    await screen.findAllByRole('checkbox', { name: /选择 测试点位/ });
    const firstPageCheckbox = screen.getAllByRole('checkbox', { name: /选择 测试点位/ })[0]!;
    const firstPageLabel = firstPageCheckbox.getAttribute('aria-label')!;
    await user.click(firstPageCheckbox);
    expect(screen.getByText(/已选择 1 条/)).toBeVisible();
    await user.click(screen.getByTitle('下一页'));
    await waitFor(() => expect(screen.getByTitle('2')).toHaveClass('ant-pagination-item-active'));
    const secondPageCheckbox = screen.getAllByRole('checkbox', { name: /选择 测试点位/ })[0]!;
    await user.click(secondPageCheckbox);
    expect(screen.getByText(/已选择 2 条/)).toBeVisible();
    await user.click(screen.getByTitle('上一页'));
    expect(await screen.findByRole('checkbox', { name: firstPageLabel })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: '选择当前页' }));
    expect(screen.getByText(/已选择 21 条/)).toBeVisible();
  });

  it('adds a point, transforms the selected scope, and edits with a drawer', async () => {
    const user = userEvent.setup();
    renderRoute('/points');
    expect(await screen.findByText('暂无点位，请先新增或导入。')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '新增点位' }));
    const addDialog = screen.getAllByRole('dialog').at(-1)!;
    const firstNameInput = within(addDialog).getByLabelText('点位名称 1');
    expect(firstNameInput).toHaveAttribute('maxlength', '20');
    expect(within(addDialog).getAllByRole('button', { name: '继续添加一行' })).toHaveLength(1);
    await user.click(within(addDialog).getByRole('button', { name: '继续添加一行' }));
    expect(within(addDialog).getAllByRole('button', { name: '继续添加一行' })).toHaveLength(1);
    expect(within(addDialog).getByLabelText('点位名称 2')).toHaveAttribute('maxlength', '20');
    await user.click(within(addDialog).getByRole('button', { name: '删除第 2 行' }));
    await user.type(firstNameInput, '浦东机房 A-01');
    await user.type(within(addDialog).getByLabelText('坐标一 1'), '121.544379');
    await user.type(within(addDialog).getByLabelText('坐标二 1'), '31.221517');
    await user.click(within(addDialog).getByRole('button', { name: '确认新增' }));
    expect(await screen.findByText('浦东机房 A-01')).toBeVisible();

    await user.click(screen.getByRole('checkbox', { name: '选择 浦东机房 A-01' }));
    await user.click(screen.getByRole('button', { name: '坐标转换' }));
    const transformDialog = screen.getAllByRole('dialog').at(-1)!;
    expect(within(transformDialog).getByText('已选择')).toBeVisible();
    await user.click(within(transformDialog).getByRole('button', { name: '确认转换' }));
    expect(await screen.findByText(/坐标转换完成：成功 1 条，失败 0 条/)).toBeVisible();
    await user.click(within(transformDialog).getByRole('button', { name: '关闭' }));

    const row = screen.getByText('浦东机房 A-01').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row!).getByRole('button', { name: '编辑' }));
    const drawer = screen.getAllByRole('dialog').at(-1)!;
    const name = within(drawer).getByLabelText('编辑点位名称');
    await user.clear(name);
    await user.type(name, '浦东机房 A-02');
    await user.click(within(drawer).getByRole('button', { name: '保存' }));
    expect(await screen.findByText('浦东机房 A-02')).toBeVisible();
  }, 25_000);

  it('imports pasted JSON through Ant Design tabs and field mapping', async () => {
    const user = userEvent.setup();
    renderRoute('/points');
    await screen.findByText('暂无点位，请先新增或导入。');
    await user.click(screen.getByRole('button', { name: '新增点位' }));
    await user.click(screen.getByRole('tab', { name: 'JSON' }));
    fireEvent.change(screen.getByLabelText('JSON 数据'), {
      target: { value: '[{"name":"JSON设备一","lng":121.4,"lat":31.2}]' },
    });
    await user.click(screen.getByRole('button', { name: '解析并预览' }));
    expect(await screen.findByRole('combobox', { name: '点位名称字段' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '确认导入' }));
    expect((await screen.findAllByText('JSON设备一')).length).toBeGreaterThan(0);
  });

  it('uses selected points before all points for batch deletion', async () => {
    await seedPoints(2);
    const user = userEvent.setup();
    renderRoute('/points');
    await screen.findByText('测试点位 01');
    await user.click(screen.getByRole('checkbox', { name: '选择 测试点位 01' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    const dialog = screen.getAllByRole('dialog').at(-1)!;
    expect(within(dialog).getByText(/已选择/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: '确认批量删除' }));
    await waitFor(() => expect(screen.queryByText('测试点位 01')).not.toBeInTheDocument());
    expect(screen.getByText('测试点位 02')).toBeVisible();
  });
});
