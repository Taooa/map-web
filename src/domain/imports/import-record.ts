import type { CoordinateSystemId } from '../coordinate';
import type { ImportRecordId, IsoDateTime } from '../shared';
import type { ImportSource } from './import-source';
import type { ImportStatus, ImportSummary } from './import-status';

export interface ImportFieldMapping {
  readonly name: string;
  readonly x: string;
  readonly y: string;
}

export interface ImportRecord {
  readonly id: ImportRecordId;
  readonly source: ImportSource;
  readonly coordinateSystem: CoordinateSystemId;
  readonly mapping: ImportFieldMapping;
  readonly status: ImportStatus;
  readonly summary: ImportSummary;
  readonly createdAt: IsoDateTime;
}
