import { AMapMap, type AMapMarkerData } from '@/adapters/maps/amap/amap-map';
import { loadAMapSdk, type AMapSdk } from '@/adapters/maps/amap/amap-loader';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';
import type { Point, PointId, Result } from '@/domain';
import { pointService, type PointService } from '@/features/points';

export type AMapServiceErrorCode =
  | 'SDK_LOAD_FAILED'
  | 'MAP_NOT_READY'
  | 'POINT_LIST_FAILED';

export interface AMapServiceError {
  readonly code: AMapServiceErrorCode;
  readonly message: string;
}

export interface AMapDisplayResult {
  readonly markers: readonly AMapMarkerData[];
  readonly missingCoordinatePoints: readonly Point[];
}

type AMapServiceResult<Value> = Result<Value, AMapServiceError>;

interface AMapMapServiceDependencies {
  readonly loadSdk?: (key: string) => Promise<AMapSdk>;
  readonly createMap?: (container: HTMLElement, sdk: AMapSdk) => AMapMap;
}

function formatOriginalCoordinate(point: Point): string {
  const coordinate = point.coordinates.original;
  return coordinate.kind === 'geographic'
    ? `${coordinate.system} ${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.system} X ${coordinate.x}, Y ${coordinate.y}`;
}

export function createAMapMarkerData(point: Point): AMapMarkerData | null {
  const original = point.coordinates.original;
  const displayCoordinate =
    original.kind === 'geographic' && original.system === 'GCJ02'
      ? original
      : point.coordinates.converted.GCJ02?.coordinate;

  if (!displayCoordinate || displayCoordinate.kind !== 'geographic') {
    return null;
  }

  return {
    id: point.id,
    name: point.name,
    position: [displayCoordinate.lng, displayCoordinate.lat],
    originalCoordinate: formatOriginalCoordinate(point),
    displaySystem: 'GCJ02',
  };
}

export class AMapMapService {
  readonly #pointService: PointService;
  readonly #loadSdk: (key: string) => Promise<AMapSdk>;
  readonly #createMap: (container: HTMLElement, sdk: AMapSdk) => AMapMap;
  #map: AMapMap | null = null;

  constructor(
    points: PointService = pointService,
    dependencies: AMapMapServiceDependencies = {},
  ) {
    this.#pointService = points;
    this.#loadSdk = dependencies.loadSdk ?? loadAMapSdk;
    this.#createMap =
      dependencies.createMap ?? ((container, sdk) => new AMapMap(container, sdk));
  }

  async initialize(container: HTMLElement, key: string): Promise<AMapServiceResult<void>> {
    this.destroy();

    try {
      const sdk = await this.#loadSdk(key);
      this.#map = this.#createMap(container, sdk);
      return { status: 'success', value: undefined };
    } catch (error) {
      return {
        status: 'failure',
        error: {
          code: 'SDK_LOAD_FAILED',
          message: error instanceof Error ? error.message : '高德地图 SDK 加载失败。',
        },
      };
    }
  }

  async listPoints(): Promise<AMapServiceResult<readonly Point[]>> {
    const result = await this.#pointService.listPoints();
    return result.status === 'success'
      ? { status: 'success', value: result.value }
      : {
          status: 'failure',
          error: { code: 'POINT_LIST_FAILED', message: result.error.message },
        };
  }

  async showPoints(ids: readonly PointId[]): Promise<AMapServiceResult<AMapDisplayResult>> {
    if (!this.#map) {
      return {
        status: 'failure',
        error: { code: 'MAP_NOT_READY', message: '高德地图尚未加载。' },
      };
    }

    const pointsResult = await this.listPoints();
    if (pointsResult.status === 'failure') {
      return pointsResult;
    }

    const selectedIds = new Set(ids);
    const selectedPoints = pointsResult.value.filter((point) => selectedIds.has(point.id));
    const markers: AMapMarkerData[] = [];
    const missingCoordinatePoints: Point[] = [];

    for (const point of selectedPoints) {
      const marker = createAMapMarkerData(point);
      if (marker) {
        markers.push(marker);
      } else {
        missingCoordinatePoints.push(point);
      }
    }

    this.#map.setMarkers(groupMapRenderPoints(markers, null));
    this.#map.fitView();
    return {
      status: 'success',
      value: { markers, missingCoordinatePoints },
    };
  }

  destroy(): void {
    this.#map?.destroy();
    this.#map = null;
  }
}
