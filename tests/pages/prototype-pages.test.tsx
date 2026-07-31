import { fireEvent, screen } from '@testing-library/react';
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

  it('creates a real in-memory point and converts it through the selected-point action', async () => {
    const user = userEvent.setup();
    renderRoute('/points');

    expect(await screen.findByText('还没有点位')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '新增点位' }));
    await user.type(screen.getByLabelText('点位名称'), '浦东机房 A-01');
    await user.type(screen.getByLabelText('经度'), '121.544379');
    await user.type(screen.getByLabelText('纬度'), '31.221517');
    await user.click(screen.getByRole('button', { name: '保存点位' }));

    expect(await screen.findByText('浦东机房 A-01')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: '选择 浦东机房 A-01' }));
    await user.click(screen.getByRole('button', { name: '坐标转换' }));
    expect(screen.getByLabelText('批量转换目标坐标系')).toHaveValue('GCJ02');
    await user.click(screen.getByRole('button', { name: '开始转换' }));

    expect(await screen.findByText(/坐标转换完成：新增 1，跳过 0，失败 0/)).toBeVisible();
    expect(screen.getByText('Lng: 121.548662')).toBeVisible();
    expect(screen.getByText('Lat: 31.219372')).toBeVisible();
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

  it('opens the multi-format point import workflow', async () => {
    const user = userEvent.setup();
    renderRoute('/points');

    await user.click(screen.getByRole('button', { name: '导入点位' }));

    expect(screen.getByRole('dialog', { name: '导入点位' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Excel' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('导入文件')).toHaveAttribute('accept', '.xlsx');
    expect(screen.getByRole('tab', { name: 'CSV' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'JSON文件' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'JSON粘贴' })).toBeVisible();
  });

  it('imports pasted JSON through field mapping into the point list', async () => {
    const user = userEvent.setup();
    renderRoute('/points');

    await user.click(screen.getByRole('button', { name: '导入点位' }));
    await user.click(screen.getByRole('tab', { name: 'JSON粘贴' }));
    fireEvent.change(screen.getByLabelText('JSON内容'), {
      target: { value: '[{"name":"JSON设备一","lng":121.4,"lat":31.2}]' },
    });
    await user.click(screen.getByRole('button', { name: '解析JSON' }));

    expect(screen.getByRole('combobox', { name: '点位名称列' })).toHaveValue('0');
    expect(screen.getByRole('combobox', { name: '经度列' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: '纬度列' })).toHaveValue('2');
    await user.click(screen.getByRole('button', { name: '开始导入' }));

    expect(await screen.findByText('全部点位已成功导入。')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '完成' }));
    expect(await screen.findByText('JSON设备一')).toBeVisible();
  });
});
