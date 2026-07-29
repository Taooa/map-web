import type {
  CoordinateSystemDefinition,
  CoordinateSystemId,
  CoordinateSystemStatus,
  Result,
} from '@/domain';
import type { CoordinateCoreError } from '../errors/coordinate-core-errors';

/**
 * Read-only access to the five coordinate-system definitions owned by Domain.
 */
export interface CoordinateSystemRegistry {
  get(id: string): Result<CoordinateSystemDefinition, CoordinateCoreError>;
  list(): readonly CoordinateSystemDefinition[];
  listByStatus(status: CoordinateSystemStatus): readonly CoordinateSystemDefinition[];
  isDefaultUserEntry(id: CoordinateSystemId): boolean;
}
