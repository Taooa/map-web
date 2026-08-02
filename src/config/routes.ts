export interface NavigationItem {
  label: string;
  path: string;
}

export const appNavigation: readonly NavigationItem[] = [
  { label: '首页', path: '/' },
  { label: '点位管理', path: '/points' },
  { label: '地图展示', path: '/map' },
];

export const mapNavigation: readonly NavigationItem[] = [
  { label: '高德地图', path: '/map?platform=amap' },
  { label: '百度地图', path: '/map?platform=baidu' },
  { label: '天地图', path: '/map?platform=tianditu' },
];
