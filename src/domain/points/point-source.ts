import type { ImportRecordId } from '../shared';

export type ImportFormat = 'excel' | 'csv' | 'json-file' | 'json-paste';
export type PointSourceType = 'manual' | 'import';

export interface ManualPointSource {
  readonly type: 'manual';
}

export interface ImportedPointSource {
  readonly type: 'import';
  readonly format: ImportFormat;
  readonly importId: ImportRecordId;
  /**
   * One-based source row when a row concept exists. This is trace metadata,
   * not a copy of the original source record.
   */
  readonly sourceRow?: number;
}

export type PointSource = ManualPointSource | ImportedPointSource;
