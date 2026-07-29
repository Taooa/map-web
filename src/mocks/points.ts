export interface MockPoint {
  id: string;
  name: string;
  source: string;
  sourceDetail: string;
  originalSystem: 'WGS84' | 'GCJ02' | 'BD09' | '上海2000';
  coordinate: string;
  converted: readonly string[];
  updatedAt: string;
}

export const mockPoints: readonly MockPoint[] = [
  {
    id: 'PT-240701',
    name: '浦东机房 A-01',
    source: 'Excel 导入',
    sourceDetail: 'devices-july.xlsx',
    originalSystem: 'WGS84',
    coordinate: '121.544379, 31.221517',
    converted: ['GCJ02', 'BD09'],
    updatedAt: '今天 10:32',
  },
  {
    id: 'PT-240702',
    name: '虹桥网关 B-12',
    source: '手动添加',
    sourceDetail: 'Point Manager',
    originalSystem: 'GCJ02',
    coordinate: '121.326843, 31.196731',
    converted: ['WGS84'],
    updatedAt: '今天 09:18',
  },
  {
    id: 'PT-240703',
    name: '徐汇传感器 C-07',
    source: 'CSV 导入',
    sourceDetail: 'xuhui-sensors.csv',
    originalSystem: 'WGS84',
    coordinate: '121.437322, 31.188942',
    converted: ['GCJ02', 'BD09', '上海2000'],
    updatedAt: '昨天 17:46',
  },
  {
    id: 'PT-240704',
    name: '静安巡检点 D-03',
    source: 'JSON 粘贴',
    sourceDetail: '粘贴导入',
    originalSystem: 'BD09',
    coordinate: '121.458924, 31.233104',
    converted: [],
    updatedAt: '昨天 15:21',
  },
  {
    id: 'PT-240705',
    name: '杨浦基站 E-19',
    source: 'Excel 导入',
    sourceDetail: 'base-stations.xlsx',
    originalSystem: '上海2000',
    coordinate: 'X 506842.31 · Y 3459278.64',
    converted: ['WGS84'],
    updatedAt: '07-27 14:08',
  },
  {
    id: 'PT-240706',
    name: '闵行采集器 F-08',
    source: '手动添加',
    sourceDetail: 'Point Manager',
    originalSystem: 'WGS84',
    coordinate: '121.381764, 31.112693',
    converted: ['GCJ02'],
    updatedAt: '07-26 11:35',
  },
];
