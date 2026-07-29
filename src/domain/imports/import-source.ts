export type FileImportSourceType = 'excel' | 'csv' | 'json-file';
export type ImportSourceType = FileImportSourceType | 'json-paste';

export interface FileImportSource {
  readonly type: FileImportSourceType;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly sheetName?: string;
}

export interface JsonPasteImportSource {
  readonly type: 'json-paste';
}

/**
 * Import source metadata intentionally excludes File, ArrayBuffer, raw text,
 * full paths and parsed source rows.
 */
export type ImportSource = FileImportSource | JsonPasteImportSource;
