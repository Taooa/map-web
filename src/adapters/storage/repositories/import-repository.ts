import type { ImportRecord, ImportRecordId, ImportSourceType } from '@/domain';
import type { RepositoryResult } from './index';

export interface ImportListQuery {
  readonly sourceType?: ImportSourceType;
  readonly offset?: number;
  readonly limit?: number;
  readonly newestFirst?: boolean;
}

/**
 * Persistence port for import batch summaries.
 *
 * ImportRecord does not contain the source file or raw imported rows, so those
 * values cannot enter storage through this contract.
 */
export interface ImportRepository {
  save(record: ImportRecord): Promise<RepositoryResult<ImportRecord>>;
  list(query?: ImportListQuery): Promise<RepositoryResult<readonly ImportRecord[]>>;
  get(id: ImportRecordId): Promise<RepositoryResult<ImportRecord | null>>;
}
