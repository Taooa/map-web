import { describe, expect, it } from 'vitest';
import type { ImportRecord } from '@/domain/imports';
import type { ImportRecordId, IsoDateTime } from '@/domain/shared';

describe('import record domain', () => {
  it('stores file metadata and summary without original file contents', () => {
    const record: ImportRecord = {
      id: 'import-1' as ImportRecordId,
      source: {
        type: 'excel',
        fileName: 'points.xlsx',
        fileSizeBytes: 2048,
        sheetName: '设备点位',
      },
      coordinateSystem: 'WGS84',
      mapping: {
        name: 'name',
        x: 'lng',
        y: 'lat',
      },
      status: 'completed',
      summary: {
        totalRows: 10,
        importedRows: 9,
        skippedRows: 1,
      },
      createdAt: '2026-07-29T02:00:00.000Z' as IsoDateTime,
    };

    expect(record.source).toEqual({
      type: 'excel',
      fileName: 'points.xlsx',
      fileSizeBytes: 2048,
      sheetName: '设备点位',
    });
    expect(record).not.toHaveProperty('rawContent');
    expect(record).not.toHaveProperty('file');
    expect(record).not.toHaveProperty('rows');
  });
});
