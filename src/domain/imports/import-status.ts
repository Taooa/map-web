export type ImportStatus = 'pending' | 'completed' | 'partial' | 'failed';

export interface ImportSummary {
  readonly totalRows: number;
  readonly importedRows: number;
  readonly skippedRows: number;
}
