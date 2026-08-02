import type { Point } from '@/domain';
import { coordinateFor } from './point-coordinate-display';

export interface PointExportRow {
  readonly name: string;
  readonly wgs84Lng: number | null;
  readonly wgs84Lat: number | null;
  readonly gcj02Lng: number | null;
  readonly gcj02Lat: number | null;
  readonly bd09Lng: number | null;
  readonly bd09Lat: number | null;
  readonly sh2000X: number | null;
  readonly sh2000Y: number | null;
}

function geographic(
  point: Point,
  system: 'WGS84' | 'GCJ02' | 'BD09',
): [number | null, number | null] {
  const coordinate = coordinateFor(point, system);
  return coordinate?.kind === 'geographic' ? [coordinate.lng, coordinate.lat] : [null, null];
}

export function createPointExportRows(points: readonly Point[]): PointExportRow[] {
  return points.map((point) => {
    const [wgs84Lng, wgs84Lat] = geographic(point, 'WGS84');
    const [gcj02Lng, gcj02Lat] = geographic(point, 'GCJ02');
    const [bd09Lng, bd09Lat] = geographic(point, 'BD09');
    const shanghai = coordinateFor(point, 'SHANGHAI2000');
    return {
      name: point.name,
      wgs84Lng,
      wgs84Lat,
      gcj02Lng,
      gcj02Lat,
      bd09Lng,
      bd09Lat,
      sh2000X: shanghai?.kind === 'projected' ? shanghai.x : null,
      sh2000Y: shanghai?.kind === 'projected' ? shanghai.y : null,
    };
  });
}

export function exportTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export async function downloadPointExport(
  points: readonly Point[],
  format: 'excel' | 'json',
): Promise<void> {
  const rows = createPointExportRows(points);
  const baseName = `地图工具-点位数据-${exportTimestamp()}`;
  if (format === 'excel') {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        'name',
        'wgs84Lng',
        'wgs84Lat',
        'gcj02Lng',
        'gcj02Lat',
        'bd09Lng',
        'bd09Lat',
        'sh2000X',
        'sh2000Y',
      ],
    });
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [
          '点位名称',
          'WGS84经度',
          'WGS84纬度',
          'GCJ02经度',
          'GCJ02纬度',
          'BD09经度',
          'BD09纬度',
          'SH2000 X',
          'SH2000 Y',
        ],
      ],
      { origin: 'A1' },
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '点位数据');
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
    return;
  }
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${baseName}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
