import type { Result } from '@/domain';
import type { ExcelSheetData } from './excel-parser';

export interface CsvParserError {
  readonly code: 'INVALID_CSV' | 'EMPTY_CSV';
  readonly message: string;
}

export type CsvParserResult = Result<ExcelSheetData, CsvParserError>;

function parseRows(text: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      if (value) return null;
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (character !== '\r') {
      value += character;
    }
  }

  if (quoted) return null;
  row.push(value);
  if (row.some((cell) => cell !== '') || rows.length === 0) rows.push(row);
  return rows;
}

export function parseCsv(text: string, name = 'CSV数据'): CsvParserResult {
  const table = parseRows(text.replace(/^\uFEFF/, ''));
  if (!table) {
    return {
      status: 'failure',
      error: { code: 'INVALID_CSV', message: 'CSV 引号格式不正确。' },
    };
  }

  const [header, ...rows] = table;
  if (!header || header.every((value) => value.trim() === '') || rows.length === 0) {
    return {
      status: 'failure',
      error: { code: 'EMPTY_CSV', message: 'CSV 中没有可导入的数据。' },
    };
  }

  const width = Math.max(header.length, ...rows.map((current) => current.length));
  return {
    status: 'success',
    value: {
      name,
      columns: Array.from({ length: width }, (_, index) => ({
        index,
        label: header[index]?.trim() || `列 ${index + 1}`,
      })),
      rows: rows.filter((current) => current.some((cell) => cell.trim() !== '')),
    },
  };
}
