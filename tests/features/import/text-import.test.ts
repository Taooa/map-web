import { parseCsv } from '@/adapters/files/csv-parser';
import { parseJsonPoints } from '@/adapters/files/json-parser';
import { MemoryPointRepository } from '@/adapters/storage';
import type { ImportRecordId, IsoDateTime, PointId } from '@/domain';
import { ImportService } from '@/features/import/import-service';
import { createPointService } from '@/features/points';

const timestamp = '2026-07-31T09:00:00.000Z' as IsoDateTime;
const importId = 'text-import-test' as ImportRecordId;

describe('CSV and JSON import', () => {
  it('parses quoted CSV values, escaped quotes and Chinese headers', () => {
    const result = parseCsv(
      '\uFEFF名称,经度,纬度,备注\r\n"设备,一",121.4,31.2,"机房""东""区"\r\n设备二,121.5,31.3,',
    );

    expect(result).toMatchObject({
      status: 'success',
      value: {
        columns: [
          { index: 0, label: '名称' },
          { index: 1, label: '经度' },
          { index: 2, label: '纬度' },
          { index: 3, label: '备注' },
        ],
        rows: [
          ['设备,一', '121.4', '31.2', '机房"东"区'],
          ['设备二', '121.5', '31.3', ''],
        ],
      },
    });
  });

  it('rejects malformed CSV and non-array JSON', () => {
    expect(parseCsv('名称,经度\n"设备,121.4')).toMatchObject({
      status: 'failure',
      error: { code: 'INVALID_CSV' },
    });
    expect(parseJsonPoints('{"name":"设备一"}')).toMatchObject({
      status: 'failure',
      error: { code: 'INVALID_JSON_SHAPE' },
    });
  });

  it('creates field-mappable rows from a JSON object array', () => {
    expect(
      parseJsonPoints(
        JSON.stringify([
          { name: '设备一', lng: 121.4, lat: 31.2 },
          { name: '设备二', lng: 121.5, lat: 31.3, group: 'A' },
        ]),
      ),
    ).toMatchObject({
      status: 'success',
      value: {
        columns: [
          { index: 0, label: 'name' },
          { index: 1, label: 'lng' },
          { index: 2, label: 'lat' },
          { index: 3, label: 'group' },
        ],
        rows: [
          ['设备一', 121.4, 31.2, undefined],
          ['设备二', 121.5, 31.3, 'A'],
        ],
      },
    });
  });

  it('persists JSON-paste source metadata without unrelated fields', async () => {
    const parsed = parseJsonPoints('[{"name":"设备一","lng":121.4,"lat":31.2,"ignored":"x"}]');
    expect(parsed.status).toBe('success');
    if (parsed.status !== 'success') return;

    const repository = new MemoryPointRepository();
    const pointService = createPointService(repository, {
      createId: () => 'json-point-1' as PointId,
      now: () => timestamp,
    });
    const service = new ImportService(pointService, { createImportId: () => importId });
    const summary = await service.importTable({
      sheet: parsed.value,
      mapping: { nameColumn: 0, longitudeColumn: 1, latitudeColumn: 2 },
      system: 'WGS84',
      format: 'json-paste',
    });

    expect(summary).toMatchObject({
      successCount: 1,
      failureCount: 0,
      successfulPoints: [
        {
          name: '设备一',
          source: { type: 'import', format: 'json-paste', importId, sourceRow: 2 },
          coordinates: {
            original: { system: 'WGS84', lng: 121.4, lat: 31.2 },
            converted: {},
          },
        },
      ],
    });
    expect(summary.successfulPoints[0]).not.toHaveProperty('ignored');
  });
});
