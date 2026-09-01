import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IsoDateTime, Point, PointId } from '@/domain';
import { pointService } from '@/features/points';
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
    expect(screen.getByRole('button', { name: '显示已加载点位' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: '点位分页' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空地图' })).toBeVisible();
    expect(screen.getByRole('button', { name: '查看全部点位' })).toBeVisible();
    expect(screen.getByRole('complementary', { name: '点位面板' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: '地图平台切换' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '图层设置' }));
    expect(await screen.findByText('高德专属设置')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '地图 Key 配置' }));
    const credentialDialog = screen.getByRole('dialog');
    expect(credentialDialog).toBeVisible();
    expect(within(credentialDialog).getByText('地图 Key 配置')).toBeVisible();
    expect(screen.getByLabelText('高德地图 Key')).toBeVisible();
    expect(screen.getByLabelText('百度地图 AK')).toBeVisible();
    expect(screen.getByLabelText('天地图 Token')).toBeVisible();
    await user.click(within(credentialDialog).getByRole('button', { name: /取\s*消/ }));

    const platformSelect = screen.getByRole('combobox', { name: '地图平台切换' });
    await user.click(platformSelect);
    const baiduOption = screen
      .getAllByText('百度地图')
      .find((element) => element.classList.contains('ant-select-item-option-content'));
    expect(baiduOption).toBeDefined();
    await user.click(baiduOption!);
    expect(screen.getByRole('button', { name: '地图 Key 配置' })).toBeVisible();

    await user.click(platformSelect);
    const tiandituOption = screen
      .getAllByText('天地图')
      .find((element) => element.classList.contains('ant-select-item-option-content'));
    expect(tiandituOption).toBeDefined();
    await user.click(tiandituOption!);
    expect(screen.getByLabelText('地图工具')).toBeVisible();
    expect(screen.getByLabelText('基础地图控制')).toBeVisible();
    expect(screen.getByRole('button', { name: '地图 Key 配置' })).toBeVisible();
  });

  it('opens Baidu in the same workspace with independent settings', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    renderRoute('/map/baidu');

    expect(await screen.findByRole('heading', { name: '请先配置访问密钥' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '图层设置' }));
    expect(await screen.findByText('百度专属设置')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '地图 Key 配置' }));
    const credentialDialog = screen.getByRole('dialog');
    expect(within(credentialDialog).getByText('地图 Key 配置')).toBeVisible();
  });

  it('opens Tianditu in the same workspace with independent settings', async () => {
    const user = userEvent.setup();
    renderRoute('/map/tianditu');

    expect(await screen.findByRole('heading', { name: '请先配置访问令牌' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '图层设置' }));
    expect(await screen.findByText('天地图专属设置')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '地图 Key 配置' }));
    const credentialDialog = screen.getByRole('dialog');
    expect(within(credentialDialog).getByText('地图 Key 配置')).toBeVisible();
  });

  it('loads the next point batch when the device list reaches the bottom', async () => {
    const user = userEvent.setup();
    const timestamp = '2026-08-30T08:00:00.000Z' as IsoDateTime;
    const points: Point[] = Array.from({ length: 51 }, (_, index) => ({
      id: `map-point-${index + 1}` as PointId,
      name: `设备 ${index + 1}`,
      source: { type: 'manual' },
      coordinates: {
        original: {
          kind: 'geographic',
          system: 'WGS84',
          unit: 'degree',
          lng: 121.4 + index / 10_000,
          lat: 31.2 + index / 10_000,
        },
        converted: {},
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const listSpy = vi.spyOn(pointService, 'listPointPage').mockImplementation((query) => {
      const offset = query.offset ?? 0;
      const limit = query.limit ?? points.length;
      return Promise.resolve({
        status: 'success',
        value: {
          points: points.slice(offset, offset + limit),
          pointIds: [],
          total: points.length,
          sourceOptions: [],
        },
      });
    });

    renderRoute('/map?platform=amap');

    expect(await screen.findByText('设备 1')).toBeVisible();
    expect(screen.queryByText('设备 51')).not.toBeInTheDocument();
    const list = screen.getByLabelText('点位滚动列表');
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, value: 260, writable: true },
    });
    fireEvent.scroll(list);

    expect(await screen.findByText('设备 51')).toBeVisible();
    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 50, limit: 50 }));

    const mapContainer = document.querySelector('.unified-map-container');
    const pointRequestCount = listSpy.mock.calls.length;
    await user.click(screen.getByRole('checkbox', { name: '设备 1' }));
    await user.click(screen.getByRole('button', { name: '收起点位面板' }));
    expect(document.querySelector('.unified-map-panel')).toHaveClass('is-collapsed');
    await user.click(screen.getByRole('button', { name: '展开点位面板' }));

    expect(screen.getByRole('complementary', { name: '点位面板' })).not.toHaveClass(
      'is-collapsed',
    );
    expect(screen.getByRole('checkbox', { name: '设备 1' })).toBeChecked();
    expect(document.querySelector('.unified-map-container')).toBe(mapContainer);
    expect(listSpy).toHaveBeenCalledTimes(pointRequestCount);
    listSpy.mockRestore();
  });
});
