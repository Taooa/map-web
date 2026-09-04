import {
  loadTiandituSdk,
  type TiandituMapSdk,
} from '@/adapters/maps/tianditu/tianditu-loader';
import {
  TiandituMap,
  type TiandituMarkerData,
} from '@/adapters/maps/tianditu/tianditu-map';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';
import type { Point, PointId, Result } from '@/domain';
import { pointService, type PointService } from '@/features/points';

export type TiandituMapServiceErrorCode =
  | 'SDK_LOAD_FAILED'
  | 'MAP_NOT_READY'
  | 'POINT_LIST_FAILED';

export interface TiandituMapServiceError {
  readonly code: TiandituMapServiceErrorCode;
  readonly message: string;
}

export interface TiandituMapDisplayResult {
  readonly markers: readonly TiandituMarkerData[];
  readonly missingCoordinatePoints: readonly Point[];
}

type TiandituMapServiceResult<Value> = Result<Value, TiandituMapServiceError>;

interface TiandituMapServiceDependencies {
  readonly loadSdk?: (token: string) => Promise<TiandituMapSdk>;
  readonly createMap?: (container: HTMLElement, sdk: TiandituMapSdk) => TiandituMap;
}

function formatOriginalCoordinate(point: Point): string {
  const coordinate = point.coordinates.original;
  return coordinate.kind === 'geographic'
    ? `${coordinate.system} ${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.system} X ${coordinate.x}, Y ${coordinate.y}`;
}

export function createTiandituMarkerData(point: Point): TiandituMarkerData | null {
  const original = point.coordinates.original;
  const coordinate =
    original.kind === 'geographic' && original.system === 'WGS84'
      ? original
      : point.coordinates.converted.WGS84?.coordinate;

  if (
    !coordinate ||
    coordinate.kind !== 'geographic' ||
    coordinate.system !== 'WGS84' ||
    !Number.isFinite(coordinate.lng) ||
    !Number.isFinite(coordinate.lat)
  ) {
    return null;
  }

  return {
    id: point.id,
    name: point.name,
    position: [coordinate.lng, coordinate.lat],
    originalCoordinate: formatOriginalCoordinate(point),
    displaySystem: 'WGS84',
  };
}

export class TiandituMapService {
  readonly #pointService: PointService;
  readonly #loadSdk: (token: string) => Promise<TiandituMapSdk>;
  readonly #createMap: (container: HTMLElement, sdk: TiandituMapSdk) => TiandituMap;
  #map: TiandituMap | null = null;

  constructor(
    points: PointService = pointService,
    dependencies: TiandituMapServiceDependencies = {},
  ) {
    this.#pointService = points;
    this.#loadSdk = dependencies.loadSdk ?? loadTiandituSdk;
    this.#createMap =
      dependencies.createMap ?? ((container, sdk) => new TiandituMap(container, sdk));
  }

  async initialize(container: HTMLElement, token: string): Promise<TiandituMapServiceResult<void>> {
    this.destroy();
    try {
      const sdk = await this.#loadSdk(token);
      this.#map = this.#createMap(container, sdk);
      return { status: 'success', value: undefined };
    } catch (error) {
      return {
        status: 'failure',
        error: {
          code: 'SDK_LOAD_FAILED',
          message: error instanceof Error ? error.message : '天地图 SDK 加载失败。',
        },
      };
    }
  }

  async listPoints(): Promise<TiandituMapServiceResult<readonly Point[]>> {
    const result = await this.#pointService.listPoints();
    return result.status === 'success'
      ? { status: 'success', value: result.value }
      : {
          status: 'failure',
          error: { code: 'POINT_LIST_FAILED', message: result.error.message },
        };
  }

  async showPoints(
    ids: readonly PointId[],
  ): Promise<TiandituMapServiceResult<TiandituMapDisplayResult>> {
    if (!this.#map) {
      return {
        status: 'failure',
        error: { code: 'MAP_NOT_READY', message: '天地图尚未加载。' },
      };
    }
    const result = await this.listPoints();
    if (result.status === 'failure') return result;

    const selectedIds = new Set(ids);
    const markers: TiandituMarkerData[] = [];
    const missingCoordinatePoints: Point[] = [];
    result.value
      .filter((point) => selectedIds.has(point.id))
      .forEach((point) => {
        const marker = createTiandituMarkerData(point);
        if (marker) markers.push(marker);
        else missingCoordinatePoints.push(point);
      });

    this.#map.setMarkers(groupMapRenderPoints(markers, null));
    this.#map.fitView();
    return { status: 'success', value: { markers, missingCoordinatePoints } };
  }

  destroy(): void {
    this.#map?.destroy();
    this.#map = null;
  }
}
