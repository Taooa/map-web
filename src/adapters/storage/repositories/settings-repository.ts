import type { Settings } from '@/domain';
import type { RepositoryResult } from './index';

/**
 * Product-preference persistence only.
 *
 * Map API keys, access tokens and provider credentials deliberately do not
 * belong to Settings or this repository.
 */
export interface SettingsRepository {
  get(): Promise<RepositoryResult<Settings>>;
  save(settings: Settings): Promise<RepositoryResult<Settings>>;
  reset(): Promise<RepositoryResult<Settings>>;
}
