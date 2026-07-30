import * as XLSX from 'xlsx';
import type { Result } from '@/domain';

export interface ExcelColumn {
  readonly index: number;
  readonly label: string;
}

export interface ExcelSheetData {
  readonly name: string;
  readonly columns: readonly ExcelColumn[];
  readonly rows: readonly (readonly unknown[])[];
}

export interface ExcelWorkbookData {
  readonly sheets: readonly ExcelSheetData[];
}

export interface ExcelParserError {
  readonly code: 'INVALID_EXCEL' | 'EMPTY_WORKBOOK';
  readonly message: string;
}

export type ExcelParserResult = Result<ExcelWorkbookData, ExcelParserError>;

function scalarLabel(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function createColumns(header: readonly unknown[], width: number): readonly ExcelColumn[] {
  return Array.from({ length: width }, (_, index) => {
    const rawLabel = scalarLabel(header[index]);
    const label = rawLabel || `列 ${XLSX.utils.encode_col(index)}`;
    return { index, label };
  });
}

export function parseExcelWorkbook(data: ArrayBuffer): ExcelParserResult {
  try {
    const workbook = XLSX.read(data, {
      type: 'array',
      raw: true,
      cellDates: false,
    });

    const sheets = workbook.SheetNames.flatMap((name) => {
      const worksheet = workbook.Sheets[name];
      if (!worksheet) return [];

      const table = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
      });
      const [header = [], ...rows] = table;
      const width = Math.max(header.length, ...rows.map((row) => row.length), 0);
      if (width === 0) return [];

      return [
        {
          name,
          columns: createColumns(header, width),
          rows,
        } satisfies ExcelSheetData,
      ];
    });

    return sheets.length > 0
      ? { status: 'success', value: { sheets } }
      : {
          status: 'failure',
          error: { code: 'EMPTY_WORKBOOK', message: 'Excel 中没有可导入的数据表。' },
        };
  } catch {
    return {
      status: 'failure',
      error: { code: 'INVALID_EXCEL', message: '无法解析该 Excel 文件。' },
    };
  }
}
