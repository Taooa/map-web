import * as XLSX from 'xlsx';
import { parseExcelWorkbook, type ExcelSheetData } from '@/adapters/files/excel-parser';
import { MemoryPointRepository } from '@/adapters/storage';
import type { ImportRecordId, IsoDateTime, PointId } from '@/domain';
import { mapExcelRowsToPointInputs } from '@/features/import/excel-importer';
import { ImportService } from '@/features/import/import-service';
import { createPointService } from '@/features/points';

const timestamp = '2026-07-29T09:00:00.000Z' as IsoDateTime;
const importId = 'excel-import-test' as ImportRecordId;

function createSheet(rows: readonly (readonly unknown[])[]): ExcelSheetData {
  return {
    name: '设备点位',
    columns: [
      { index: 0, label: '设备名称' },
      { index: 1, label: '经度' },
      { index: 2, label: '纬度' },
    ],
    rows,
  };
}

describe('Excel import', () => {
  it('parses xlsx sheets, headers and rows through SheetJS', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['设备名称', '经度', '纬度'],
        ['设备 A', 121.4737, 31.2304],
      ]),
      '点位表',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['名称', '经度', '纬度'],
        ['设备 B', 116.397389, 39.908722],
      ]),
      '备用表',
    );
    const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const result = parseExcelWorkbook(data);

    expect(result).toMatchObject({
      status: 'success',
      value: {
        sheets: [
          {
            name: '点位表',
            columns: [
              { index: 0, label: '设备名称' },
              { index: 1, label: '经度' },
              { index: 2, label: '纬度' },
            ],
            rows: [['设备 A', 121.4737, 31.2304]],
          },
          { name: '备用表', rows: [['设备 B', 116.397389, 39.908722]] },
        ],
      },
    });
  });

  it('maps selected fields and rejects empty or non-numeric rows', () => {
    const result = mapExcelRowsToPointInputs(
      createSheet([
        ['设备 A', '121.4737', '31.2304'],
        ['', 121, 31],
        ['设备 C', 'not-a-number', 31],
        ['设备 D', Number.POSITIVE_INFINITY, 31],
      ]),
      { nameColumn: 0, longitudeColumn: 1, latitudeColumn: 2 },
      'WGS84',
      importId,
    );

    expect(result.candidates).toEqual([
      {
        row: 2,
        input: {
          name: '设备 A',
          system: 'WGS84',
          first: 121.4737,
          second: 31.2304,
          source: {
            type: 'import',
            format: 'excel',
            importId,
            sourceRow: 2,
          },
        },
      },
    ]);
    expect(result.failures).toEqual([
      { row: 3, reason: '点位名称为空。' },
      { row: 4, reason: '经纬度为空或不是有效数字。' },
      { row: 5, reason: '经纬度为空或不是有效数字。' },
    ]);
  });

  it('batch creates valid Points and reports invalid rows without storing them', async () => {
    const repository = new MemoryPointRepository();
    let idSequence = 0;
    const points = createPointService(repository, {
      createId: () => `imported-point-${++idSequence}` as PointId,
      now: () => timestamp,
    });
    const service = new ImportService(points, {
      createImportId: () => importId,
    });

    const summary = await service.importExcelSheet({
      sheet: createSheet([
        ['设备 A', 121.4737, 31.2304],
        ['设备 B', null, 31],
        ['设备 C', 200, 31],
      ]),
      mapping: { nameColumn: 0, longitudeColumn: 1, latitudeColumn: 2 },
      system: 'WGS84',
    });

    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(2);
    expect(summary.failures).toEqual([
      { row: 3, reason: '经纬度为空或不是有效数字。' },
      { row: 4, reason: '经度需在 -180 至 180 之间，纬度需在 -90 至 90 之间。' },
    ]);
    expect(await points.listPoints()).toMatchObject({
      status: 'success',
      value: [
        {
          name: '设备 A',
          source: {
            type: 'import',
            format: 'excel',
            importId,
            sourceRow: 2,
          },
          coordinates: {
            original: {
              kind: 'geographic',
              system: 'WGS84',
              lng: 121.4737,
              lat: 31.2304,
            },
            converted: {},
          },
        },
      ],
    });
  });

  it('reports processed rows as import progress across storage batches', async () => {
    const repository = new MemoryPointRepository();
    let idSequence = 0;
    const points = createPointService(repository, {
      createId: () => `progress-point-${++idSequence}` as PointId,
      now: () => timestamp,
    });
    const service = new ImportService(points, {
      createImportId: () => importId,
    });
    const progress: { completed: number; total: number }[] = [];
    const validRows = Array.from({ length: 201 }, (_, index) => [
      `设备 ${index + 1}`,
      120 + index / 10_000,
      30 + index / 10_000,
    ]);

    const summary = await service.importExcelSheet({
      sheet: createSheet([['无效设备', null, 31], ...validRows]),
      mapping: { nameColumn: 0, longitudeColumn: 1, latitudeColumn: 2 },
      system: 'WGS84',
      onProgress: (next) => progress.push(next),
    });

    expect(progress).toEqual([
      { completed: 1, total: 202 },
      { completed: 201, total: 202 },
      { completed: 202, total: 202 },
    ]);
    expect(summary).toMatchObject({
      successCount: 201,
      failureCount: 1,
    });
  });
});
