import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AMapAdapter } from '@/adapters/maps/amap/amap-adapter';
import type { ImportRecordId, IsoDateTime, Point, PointId } from '@/domain';
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
    expect(screen.getByRole('button', { name: '添加点位' })).toBeVisible();
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

  it('manages candidate selection, workspace membership, and marker visibility independently', async () => {
    const user = userEvent.setup();
    const timestamp = '2026-08-30T08:00:00.000Z' as IsoDateTime;
    const points: Point[] = Array.from({ length: 51 }, (_, index) => ({
      id: `map-point-${index + 1}` as PointId,
      name: `设备 ${index + 1}`,
      source:
        index < 25
          ? { type: 'manual' }
          : {
              type: 'import',
              format: 'csv',
              importId: `import-${index + 1}` as ImportRecordId,
              sourceName: 'CSV 批次',
            },
      coordinates: {
        original: {
          kind: 'geographic',
          system: 'WGS84',
          unit: 'degree',
          lng: 121.4 + index / 10_000,
          lat: 31.2 + index / 10_000,
        },
        converted: {
          GCJ02: {
            coordinate: {
              kind: 'geographic',
              system: 'GCJ02',
              unit: 'degree',
              lng: 121.4 + index / 10_000,
              lat: 31.2 + index / 10_000,
            },
            algorithmVersion: 'test',
            transformedAt: timestamp,
          },
          ...(index === 0
            ? {}
            : {
                BD09: {
                  coordinate: {
                    kind: 'geographic' as const,
                    system: 'BD09' as const,
                    unit: 'degree' as const,
                    lng: 121.4 + index / 10_000,
                    lat: 31.2 + index / 10_000,
                  },
                  algorithmVersion: 'test',
                  transformedAt: timestamp,
                },
              }),
        },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const listSpy = vi.spyOn(pointService, 'listPointPage').mockImplementation((query) => {
      const search = query.search?.trim().toLocaleLowerCase() ?? '';
      const sourceName = (point: Point) =>
        point.source.type === 'manual' ? '手动输入' : point.source.sourceName || 'CSV 导入';
      const matching = points.filter(
        (point) =>
          (!search || point.name.toLocaleLowerCase().includes(search)) &&
          (!query.source || sourceName(point) === query.source),
      );
      const offset = query.offset ?? 0;
      const limit = query.limit ?? matching.length;
      return Promise.resolve({
        status: 'success',
        value: {
          points: matching.slice(offset, offset + limit),
          pointIds: matching.map((point) => point.id),
          total: matching.length,
          sourceOptions: ['CSV 批次', '手动输入'],
        },
      });
    });
    const getPointSpy = vi.spyOn(pointService, 'getPoint').mockImplementation((pointId) =>
      Promise.resolve({
        status: 'success',
        value: points.find((point) => point.id === pointId) ?? null,
      }),
    );
    const deleteSpy = vi.spyOn(pointService, 'deletePoint');
    const mountSpy = vi.spyOn(AMapAdapter.prototype, 'mount').mockResolvedValue();
    const setPointsSpy = vi.spyOn(AMapAdapter.prototype, 'setPoints').mockImplementation(() => {});
    localStorage.setItem('coordinate-toolkit.amap-key', 'test-key');

    renderRoute('/map?platform=amap');

    expect(await screen.findByText('尚未添加点位')).toBeVisible();
    const mapContainer = document.querySelector('.unified-map-container');
    await user.click(screen.getByRole('button', { name: '添加点位' }));
    const picker = await screen.findByRole('dialog');
    expect(await within(picker).findByText('设备 1')).toBeVisible();
    expect(within(picker).getByText('当前查询可添加 51 条')).toBeVisible();
    expect(within(picker).getByRole('button', { name: '添加点位' })).toBeDisabled();
    expect(within(picker).getByRole('columnheader', { name: 'WGS84' })).toBeVisible();
    expect(within(picker).getByRole('columnheader', { name: 'GCJ02' })).toBeVisible();
    expect(within(picker).getByRole('columnheader', { name: 'BD09' })).toBeVisible();
    expect(within(picker).queryByRole('columnheader', { name: '坐标系' })).not.toBeInTheDocument();
    expect(
      within(picker).queryByRole('columnheader', { name: '原始坐标' }),
    ).not.toBeInTheDocument();
    const firstPointRow = within(picker).getByText('设备 1').closest('tr');
    expect(firstPointRow).not.toBeNull();
    expect(within(firstPointRow!).getAllByText('有')).toHaveLength(2);
    expect(within(firstPointRow!).getByText('无')).toBeVisible();

    const sourceSelect = within(picker).getByRole('combobox', { name: '来源筛选' });
    await user.click(sourceSelect);
    const importedOption = screen
      .getAllByText('CSV 批次')
      .find((element) => element.classList.contains('ant-select-item-option-content'));
    await user.click(importedOption!);
    expect(await within(picker).findByText('当前查询可添加 26 条')).toBeVisible();
    expect(await within(picker).findByText('设备 26')).toBeVisible();
    await user.click(sourceSelect);
    const allSourcesOption = screen
      .getAllByText('全部来源')
      .find((element) => element.classList.contains('ant-select-item-option-content'));
    await user.click(allSourcesOption!);
    expect(await within(picker).findByText('当前查询可添加 51 条')).toBeVisible();

    await user.click(within(picker).getByRole('checkbox', { name: '选择当前页' }));
    expect(within(picker).getByText('已选择 20 个')).toBeVisible();
    expect(within(picker).getByRole('button', { name: '添加 20 个点位' })).toBeEnabled();
    await user.click(within(picker).getByRole('checkbox', { name: '选择当前页' }));
    expect(within(picker).getByText('已选择 0 个')).toBeVisible();
    expect(within(picker).getByRole('button', { name: '添加点位' })).toBeDisabled();

    await user.click(within(picker).getByRole('checkbox', { name: '选择 设备 1' }));
    await user.click(within(picker).getByTitle('2'));
    expect(await within(picker).findByText('设备 21')).toBeVisible();
    await user.click(within(picker).getByRole('checkbox', { name: '选择 设备 21' }));
    expect(within(picker).getByText('已选择 2 个')).toBeVisible();

    await user.clear(within(picker).getByRole('searchbox', { name: '搜索可添加点位' }));
    await user.type(within(picker).getByRole('searchbox', { name: '搜索可添加点位' }), '设备 51');
    await user.click(within(picker).getByRole('button', { name: /查\s*询/ }));
    expect(await within(picker).findByText('当前查询可添加 1 条')).toBeVisible();
    expect(within(picker).getByText('已选择 2 个')).toBeVisible();
    await user.click(within(picker).getByRole('button', { name: '全选全部 1 个结果' }));
    expect(within(picker).getByText('已选择 3 个')).toBeVisible();
    expect(within(picker).getByRole('button', { name: '取消全选全部 1 个结果' })).toBeVisible();
    await user.click(within(picker).getByRole('button', { name: '添加 3 个点位' }));

    expect(await screen.findByText('点位 3')).toBeVisible();
    expect(screen.getByText('已显示 3')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: '显示 设备 1' })).toBeChecked();
    await waitFor(() => expect(setPointsSpy.mock.lastCall?.[0]).toHaveLength(3));

    await user.click(screen.getByRole('checkbox', { name: '显示 设备 1' }));
    expect(await screen.findByText('已显示 2')).toBeVisible();
    await waitFor(() => expect(setPointsSpy.mock.lastCall?.[0]).toHaveLength(2));
    expect(screen.getByText('点位 3')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: '显示 设备 1' }));
    expect(await screen.findByText('已显示 3')).toBeVisible();
    await waitFor(() => expect(setPointsSpy.mock.lastCall?.[0]).toHaveLength(3));

    await user.click(screen.getByRole('button', { name: '从当前地图移除 设备 21' }));
    expect(screen.queryByText('设备 21')).not.toBeInTheDocument();
    expect(screen.getByText('点位 2')).toBeVisible();
    expect(screen.getByText('已显示 2')).toBeVisible();
    expect(deleteSpy).not.toHaveBeenCalled();

    const platformSelect = screen.getByRole('combobox', { name: '地图平台切换' });
    await user.click(platformSelect);
    const tiandituOption = screen
      .getAllByText('天地图')
      .find((element) => element.classList.contains('ant-select-item-option-content'));
    await user.click(tiandituOption!);
    expect(screen.getByText('点位 2')).toBeVisible();
    expect(screen.getByText('已显示 2')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '添加点位' }));
    const reopenedPicker = await screen.findByRole('dialog');
    expect(await within(reopenedPicker).findByText('当前查询可添加 49 条')).toBeVisible();
    expect(within(reopenedPicker).queryByText('设备 1')).not.toBeInTheDocument();
    expect(within(reopenedPicker).getByText('设备 21')).toBeVisible();
    await user.click(within(reopenedPicker).getByRole('button', { name: /取\s*消/ }));

    await user.click(screen.getByRole('button', { name: '清空显示' }));
    expect(await screen.findByText('已显示 0')).toBeVisible();
    expect(screen.getByText('点位 2')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: '显示 设备 1' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: '全部显示' }));
    expect(await screen.findByText('已显示 2')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '清空列表' }));
    expect(await screen.findByText('确定清空当前点位列表？')).toBeInTheDocument();
    expect(
      screen.getByText(/将移除当前列表中的 2 个点位，不会删除原始点位数据/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确认清空/ }));
    expect(await screen.findByText('点位 0')).toBeVisible();
    expect(screen.getByText('已显示 0')).toBeVisible();
    expect(deleteSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '收起点位面板' }));
    expect(document.querySelector('.unified-map-panel')).toHaveClass('is-collapsed');
    await user.click(screen.getByRole('button', { name: '展开点位面板' }));

    expect(screen.getByRole('complementary', { name: '点位面板' })).not.toHaveClass('is-collapsed');
    expect(document.querySelector('.unified-map-container')).toBe(mapContainer);
    listSpy.mockRestore();
    getPointSpy.mockRestore();
    deleteSpy.mockRestore();
    mountSpy.mockRestore();
    setPointsSpy.mockRestore();
  });
});
