import type { ExcelSheetData } from '@/adapters/files/excel-parser';
import type { CoordinateSystemId, ImportRecordId, PointSource } from '@/domain';
import type { CreatePointInput } from '@/features/points';

export type ExcelImportCoordinateSystem = Extract<
  CoordinateSystemId,
  'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'
>;

export interface ExcelFieldMapping {
  readonly nameColumn: number;
  readonly longitudeColumn: number;
  readonly latitudeColumn: number;
}

export interface ExcelRowFailure {
  readonly row: number;
  readonly reason: string;
}

export interface ExcelPointCandidate {
  readonly row: number;
  readonly input: CreatePointInput;
}

export interface ExcelMappingResult {
  readonly candidates: readonly ExcelPointCandidate[];
  readonly failures: readonly ExcelRowFailure[];
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseName(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function mapExcelRowsToPointInputs(
  sheet: ExcelSheetData,
  mapping: ExcelFieldMapping,
  system: ExcelImportCoordinateSystem,
  importId: ImportRecordId,
): ExcelMappingResult {
  const candidates: ExcelPointCandidate[] = [];
  const failures: ExcelRowFailure[] = [];

  sheet.rows.forEach((row, index) => {
    const sourceRow = index + 2;
    const name = parseName(row[mapping.nameColumn]);
    if (!name) {
      failures.push({ row: sourceRow, reason: '点位名称为空。' });
      return;
    }

    const first = parseNumber(row[mapping.longitudeColumn]);
    const second = parseNumber(row[mapping.latitudeColumn]);
    if (first === null || second === null) {
      failures.push({ row: sourceRow, reason: '经纬度为空或不是有效数字。' });
      return;
    }

    const source: PointSource = {
      type: 'import',
      format: 'excel',
      importId,
      sourceRow,
    };
    candidates.push({
      row: sourceRow,
      input: { name, system, first, second, source },
    });
  });

  return { candidates, failures };
}
