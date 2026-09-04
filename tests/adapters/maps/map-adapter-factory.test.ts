import { AMapAdapter } from '@/adapters/maps/amap/amap-adapter';
import { BaiduAdapter } from '@/adapters/maps/baidu/baidu-adapter';
import { createMapAdapter } from '@/adapters/maps/map-adapter-factory';
import { TiandituAdapter } from '@/adapters/maps/tianditu/tianditu-adapter';

describe('createMapAdapter', () => {
  it.each([
    ['amap', AMapAdapter],
    ['baidu', BaiduAdapter],
    ['tianditu', TiandituAdapter],
  ] as const)('creates the %s implementation through the common factory', (platform, Adapter) => {
    const onPointActivate = vi.fn();

    expect(createMapAdapter(platform, { onPointActivate })).toBeInstanceOf(Adapter);
  });
});
