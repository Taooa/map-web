import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';

describe('route /points', () => {
  it('renders the point list workspace', async () => {
    renderRoute('/points');

    expect(await screen.findByRole('region', { name: '点位查询与操作' })).toBeInTheDocument();
  });
});

describe.each([
  ['/map/amap', '高德地图', 'amap'],
  ['/map/baidu', '百度地图', 'baidu'],
  ['/map/tianditu', '天地图', 'tianditu'],
])('legacy route %s', (path, platform, platformValue) => {
  it(`redirects to the shared workspace with ${platform} selected`, async () => {
    renderRoute(path);

    const select = await screen.findByRole('combobox', { name: '地图平台切换' });
    expect(select.closest('.ant-select')).toHaveTextContent(platform);
    expect(path).toContain(platformValue);
  });
});

it('renders the not found page for unknown routes', () => {
  renderRoute('/missing-page');

  expect(screen.getByRole('heading', { name: '页面不存在' })).toBeInTheDocument();
});
