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

  it('uses the shared map workspace and switches platform toolbars', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderRoute('/map/amap');

    expect(await screen.findByRole('heading', { name: '请先配置密钥' })).toBeVisible();
    expect(screen.getByRole('searchbox', { name: '搜索点位' })).toBeVisible();
    expect(screen.getByRole('button', { name: '显示全部点位' })).toBeVisible();
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

  it('opens the Excel import workflow from Point Manager', async () => {
    const user = userEvent.setup();
    renderRoute('/points');

    await user.click(screen.getByRole('button', { name: '导入点位' }));

    expect(screen.getByRole('dialog', { name: '导入表格点位' })).toBeVisible();
    expect(screen.getByLabelText('表格文件')).toHaveAttribute('accept', '.xlsx');
  });
});
