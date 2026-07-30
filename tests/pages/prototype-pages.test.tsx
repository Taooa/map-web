import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderRoute } from '@/test/render';

describe('visible page prototypes', () => {
  it('presents the primary home workflow and platform entrances', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: /打开点位管理/ })).toHaveAttribute(
      'href',
      '/points',
    );
    const brandLogos = screen.getAllByRole('img', { name: '地图工具' });
    expect(brandLogos).toHaveLength(2);
    expect(brandLogos[0]).toHaveAttribute('src', '/brand/logo-192.png');
    expect(brandLogos[1]).toHaveAttribute('src', '/brand/logo-512.png');
    expect(screen.getByRole('heading', { name: '把点位工作集中在一条清晰路径上' })).toBeVisible();
    expect(screen.getByRole('link', { name: '进入高德地图验证' })).toHaveAttribute(
      'href',
      '/map/amap',
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
    expect(screen.getByRole('link', { name: '访问国家地理信息公共服务平台' })).toHaveAttribute(
      'target',
      '_blank',
    );
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

    expect(screen.getByLabelText('目标坐标系')).toHaveValue('GCJ02');
    await user.click(screen.getByRole('button', { name: '转换坐标' }));

    expect(await screen.findByText('算法版本 gcoord@0.3.2')).toBeVisible();
    expect(screen.getByText('121.54866172656749, 31.21937229419649')).toBeVisible();
  });

  it('opens map credential configuration as a placeholder interaction', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderRoute('/map/amap');

    expect(screen.getByRole('heading', { name: '请先配置高德地图密钥' })).toBeVisible();
    expect(screen.getByText('没有密钥时不会请求或加载高德地图服务。')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '配置密钥' }));
    expect(screen.getByRole('dialog', { name: '配置高德地图密钥' })).toBeVisible();
  });

  it('does not load Baidu Map without an AK and opens its configuration', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderRoute('/map/baidu');

    expect(screen.getByRole('heading', { name: '请先配置百度地图访问密钥' })).toBeVisible();
    expect(screen.getByText('没有访问密钥时不会请求或加载百度地图服务。')).toBeVisible();
    const configureButtons = screen.getAllByRole('button', { name: /配置访问密钥/ });
    await user.click(configureButtons[0]!);
    expect(screen.getByRole('dialog', { name: '配置百度地图访问密钥' })).toBeVisible();
  });

  it('does not load Tianditu without a Token and opens its configuration', async () => {
    const user = userEvent.setup();
    renderRoute('/map/tianditu');

    expect(screen.getByRole('heading', { name: '请先配置天地图访问令牌' })).toBeVisible();
    expect(screen.getByText('没有访问令牌时不会请求或加载天地图服务。')).toBeVisible();
    const configureButtons = screen.getAllByRole('button', { name: /配置访问令牌/ });
    await user.click(configureButtons[0]!);
    expect(screen.getByRole('dialog', { name: '配置天地图访问令牌' })).toBeVisible();
  });

  it('opens the Excel import workflow from Point Manager', async () => {
    const user = userEvent.setup();
    renderRoute('/points');

    await user.click(screen.getByRole('button', { name: '导入点位' }));

    expect(screen.getByRole('dialog', { name: '导入表格点位' })).toBeVisible();
    expect(screen.getByLabelText('表格文件')).toHaveAttribute('accept', '.xlsx');
  });
});
