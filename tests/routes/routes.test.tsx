import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';

describe.each([
  ['/points', 'Point Manager'],
  ['/map/amap', '高德地图'],
  ['/map/baidu', '百度地图'],
  ['/map/tianditu', '天地图'],
])('route %s', (path, heading) => {
  it(`renders ${heading}`, () => {
    renderRoute(path);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

it('renders the not found page for unknown routes', () => {
  renderRoute('/missing-page');

  expect(screen.getByRole('heading', { name: '页面不存在' })).toBeInTheDocument();
});
