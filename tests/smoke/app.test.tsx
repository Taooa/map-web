import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';

describe('application shell', () => {
  it('renders the product shell on the home route', () => {
    renderRoute('/');

    expect(
      screen.getByRole('heading', {
        name: '设备点位坐标转换与地图验证工作台',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
  });
});
