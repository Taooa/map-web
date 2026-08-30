import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render';

describe('visible page prototypes', () => {
  it('presents the primary home workflow and resource entrances', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: /打开点位管理/ })).toHaveAttribute('href', '/points');
    const brandLogos = screen.getAllByRole('img', { name: '地图工具' });
    expect(brandLogos).toHaveLength(2);
    expect(brandLogos[0]).toHaveAttribute('src', '/brand/logo-192.png');
    expect(brandLogos[1]).toHaveAttribute('src', '/brand/logo-512.png');
    expect(screen.getByRole('heading', { name: '把点位工作集中在一条清晰路径上' })).toBeVisible();
    expect(screen.getByRole('link', { name: '进入地图展示' })).toHaveAttribute(
      'href',
      '/map?platform=amap',
    );
    expect(screen.getByRole('link', { name: '访问高德地图官网' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: '查看天地图开发文档' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: '访问EPSG.io' })).toHaveAttribute(
      'href',
      'https://epsg.io/',
    );
    expect(
      screen.queryByRole('link', { name: '访问国家地理信息公共服务平台' }),
    ).not.toBeInTheDocument();
  });

  it('uses the shared map workspace and switches platform toolbars', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderRoute('/map/amap');

    expect(await screen.findByRole('heading', { name: '请先配置密钥' })).toBeVisible();
    expect(screen.getByRole('searchbox', { name: '搜索点位' })).toBeVisible();
    expect(screen.getByRole('button', { name: '显示当前页点位' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: '点位分页' })).toBeVisible();
    expect(screen.getByRole('button', { name: '清空地图' })).toBeVisible();
    expect(screen.getByText('高德专属设置')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '配置密钥' }));
    expect(screen.getByRole('dialog', { name: '配置密钥' })).toBeVisible();

    await user.click(screen.getByRole('tab', { name: '百度地图' }));
    expect(await screen.findByText('百度专属设置')).toBeVisible();
    expect(screen.queryByText('高德专属设置')).not.toBeInTheDocument();
  });

  it('opens Baidu in the same workspace with independent settings', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderRoute('/map/baidu');

    expect(await screen.findByRole('heading', { name: '请先配置访问密钥' })).toBeVisible();
    expect(screen.getByText('百度专属设置')).toBeVisible();
    const configureButtons = screen.getAllByRole('button', { name: /配置访问密钥/ });
    await user.click(configureButtons[0]!);
    expect(screen.getByRole('dialog', { name: '配置访问密钥' })).toBeVisible();
  });

  it('opens Tianditu in the same workspace with independent settings', async () => {
    const user = userEvent.setup();
    renderRoute('/map/tianditu');

    expect(await screen.findByRole('heading', { name: '请先配置访问令牌' })).toBeVisible();
    expect(screen.getByText('天地图专属设置')).toBeVisible();
    const configureButtons = screen.getAllByRole('button', { name: /配置访问令牌/ });
    await user.click(configureButtons[0]!);
    expect(screen.getByRole('dialog', { name: '配置访问令牌' })).toBeVisible();
  });
});
