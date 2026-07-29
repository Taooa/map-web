import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render';

describe('visible page prototypes', () => {
  it('presents the primary home workflow and platform entrances', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: /打开 Point Manager/ })).toHaveAttribute(
      'href',
      '/points',
    );
    expect(screen.getByRole('heading', { name: '把点位工作集中在一条清晰路径上' })).toBeVisible();
    expect(screen.getByRole('link', { name: /高德地图/ })).toHaveAttribute('href', '/map/amap');
  });

  it('creates a real in-memory point and opens its detail drawer', async () => {
    const user = userEvent.setup();
    renderRoute('/points');

    expect(await screen.findByText('还没有点位')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '新增点位' }));
    await user.type(screen.getByLabelText('点位名称'), '浦东机房 A-01');
    await user.type(screen.getByLabelText('经度'), '121.544379');
    await user.type(screen.getByLabelText('纬度'), '31.221517');
    await user.click(screen.getByRole('button', { name: '保存点位' }));

    expect(await screen.findByText('浦东机房 A-01')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '查看 浦东机房 A-01 详情' }));
    expect(screen.getByRole('dialog', { name: '浦东机房 A-01' })).toBeVisible();
    expect(screen.getByText('这个点位还没有转换结果')).toBeVisible();
  });

  it('opens map credential configuration as a placeholder interaction', async () => {
    const user = userEvent.setup();
    renderRoute('/map/amap');

    await user.click(screen.getByRole('button', { name: '配置 Key' }));
    expect(screen.getByRole('dialog', { name: '配置 高德地图 Key' })).toBeVisible();
  });
});
