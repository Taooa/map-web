import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';

describe.each([['/points', '点位管理']])('route %s', (path, heading) => {
  it(`renders ${heading}`, async () => {
    renderRoute(path);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

describe.each([
  ['/map/amap', '高德地图'],
  ['/map/baidu', '百度地图'],
  ['/map/tianditu', '天地图'],
])('legacy route %s', (path, platform) => {
  it(`redirects to the shared workspace with ${platform} selected`, async () => {
    renderRoute(path);

    expect(await screen.findByRole('tab', { name: platform })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

it('renders the not found page for unknown routes', () => {
  renderRoute('/missing-page');

  expect(screen.getByRole('heading', { name: '页面不存在' })).toBeInTheDocument();
});
