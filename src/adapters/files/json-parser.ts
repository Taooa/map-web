import type { Result } from '@/domain';
import type { ExcelSheetData } from './excel-parser';

export interface JsonParserError {
  readonly code: 'INVALID_JSON' | 'INVALID_JSON_SHAPE' | 'EMPTY_JSON';
  readonly message: string;
}

export type JsonParserResult = Result<ExcelSheetData, JsonParserError>;

export function parseJsonPoints(text: string, name = 'JSON数据'): JsonParserResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      status: 'failure',
      error: { code: 'INVALID_JSON', message: 'JSON 格式不正确。' },
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      status: 'failure',
      error: { code: 'INVALID_JSON_SHAPE', message: 'JSON 顶层必须是对象数组。' },
    };
  }
  if (parsed.length === 0) {
    return {
      status: 'failure',
      error: { code: 'EMPTY_JSON', message: 'JSON 数组为空。' },
    };
  }
  if (parsed.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    return {
      status: 'failure',
      error: { code: 'INVALID_JSON_SHAPE', message: 'JSON 数组中的每一项都必须是对象。' },
    };
  }

  const records = parsed as Record<string, unknown>[];
  const keys = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  if (keys.length === 0) {
    return {
      status: 'failure',
      error: { code: 'EMPTY_JSON', message: 'JSON 对象中没有可映射字段。' },
    };
  }

  return {
    status: 'success',
    value: {
      name,
      columns: keys.map((label, index) => ({ index, label })),
      rows: records.map((record) => keys.map((key) => record[key])),
    },
  };
}
