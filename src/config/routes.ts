export interface NavigationItem {
  label: string;
  path: string;
}

export const appNavigation: readonly NavigationItem[] = [
  { label: '首页', path: '/' },
  { label: 'Point Manager', path: '/points' },
  { label: '地图验证', path: '/map/amap' },
];

export const mapNavigation: readonly NavigationItem[] = [
  { label: '高德地图', path: '/map/amap' },
  { label: '百度地图', path: '/map/baidu' },
  { label: '天地图', path: '/map/tianditu' },
];
