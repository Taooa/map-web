import { AMapAdapter } from './amap/amap-adapter';
import { BaiduAdapter } from './baidu/baidu-adapter';
import type { MapAdapter, MapAdapterOptions } from './map-adapter';
import { TiandituAdapter } from './tianditu/tianditu-adapter';

export type MapPlatform = 'amap' | 'baidu' | 'tianditu';

export function createMapAdapter(
  platform: MapPlatform,
  options: MapAdapterOptions = {},
): MapAdapter {
  if (platform === 'amap') return new AMapAdapter(options);
  if (platform === 'baidu') return new BaiduAdapter(options);
  return new TiandituAdapter(options);
}
