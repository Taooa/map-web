import type { ExcelSheetData } from '@/adapters/files/excel-parser';
import type { ImportRecordId, Point } from '@/domain';
import type { ImportFormat } from '@/domain';
import {
  mapExcelRowsToPointInputs,
  type ExcelFieldMapping,
  type ExcelImportCoordinateSystem,
  type ExcelRowFailure,
} from '@/features/import/excel-importer';
import { pointService, type PointService } from '@/features/points';

export interface ImportProgress {
  readonly completed: number;
  readonly total: number;
}

export interface ImportExcelSheetInput {
  readonly sheet: ExcelSheetData;
  readonly mapping: ExcelFieldMapping;
  readonly system: ExcelImportCoordinateSystem;
  readonly onProgress?: (progress: ImportProgress) => void;
}

export interface ImportTableInput extends ImportExcelSheetInput {
  readonly format: ImportFormat;
  readonly sourceName?: string;
}

export interface ExcelImportSummary {
  readonly successfulPoints: readonly Point[];
  readonly successCount: number;
  readonly failureCount: number;
  readonly failures: readonly ExcelRowFailure[];
}

interface ImportServiceDependencies {
  readonly createImportId?: () => ImportRecordId;
}

const IMPORT_PROGRESS_BATCH_SIZE = 200;

export class ImportService {
  readonly #pointService: PointService;
  readonly #createImportId: () => ImportRecordId;

  constructor(points: PointService = pointService, dependencies: ImportServiceDependencies = {}) {
    this.#pointService = points;
    this.#createImportId =
      dependencies.createImportId ??
      (() => `import-${globalThis.crypto.randomUUID()}` as ImportRecordId);
  }

  async importExcelSheet(input: ImportExcelSheetInput): Promise<ExcelImportSummary> {
    return this.importTable({ ...input, format: 'excel' });
  }

  async importTable(input: ImportTableInput): Promise<ExcelImportSummary> {
    const mapped = mapExcelRowsToPointInputs(
      input.sheet,
      input.mapping,
      input.system,
      this.#createImportId(),
      input.format,
      input.sourceName,
    );
    const successfulPoints: Point[] = [];
    const failures: ExcelRowFailure[] = [...mapped.failures];
    const total = input.sheet.rows.length;
    let completed = mapped.failures.length;
    input.onProgress?.({ completed, total });

    for (let offset = 0; offset < mapped.candidates.length; offset += IMPORT_PROGRESS_BATCH_SIZE) {
      const candidates = mapped.candidates.slice(offset, offset + IMPORT_PROGRESS_BATCH_SIZE);
      const creationResults = await this.#pointService.createPoints(
        candidates.map((candidate) => candidate.input),
      );

      creationResults.forEach((result, index) => {
        const candidate = candidates[index];
        if (!candidate) return;

        if (result.status === 'success') {
          successfulPoints.push(result.value);
        } else {
          failures.push({ row: candidate.row, reason: result.error.message });
        }
      });
      completed += candidates.length;
      input.onProgress?.({ completed, total });
    }
    if (completed < total) input.onProgress?.({ completed: total, total });

    failures.sort((left, right) => left.row - right.row);
    return {
      successfulPoints,
      successCount: successfulPoints.length,
      failureCount: failures.length,
      failures,
    };
  }
}

export const importService = new ImportService();
