import { BaiduMap, type BaiduMarkerData } from '@/adapters/maps/baidu/baidu-map';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';
import {
  loadBaiduMapSdk,
  type BaiduMapSdk,
} from '@/adapters/maps/baidu/baidu-loader';
import type { Point, PointId, Result } from '@/domain';
import { pointService, type PointService } from '@/features/points';

export type BaiduMapServiceErrorCode =
  | 'SDK_LOAD_FAILED'
  | 'MAP_NOT_READY'
  | 'POINT_LIST_FAILED';

export interface BaiduMapServiceError {
  readonly code: BaiduMapServiceErrorCode;
  readonly message: string;
}

export interface BaiduMapDisplayResult {
  readonly markers: readonly BaiduMarkerData[];
  readonly missingCoordinatePoints: readonly Point[];
}

type BaiduMapServiceResult<Value> = Result<Value, BaiduMapServiceError>;

interface BaiduMapServiceDependencies {
  readonly loadSdk?: (ak: string) => Promise<BaiduMapSdk>;
  readonly createMap?: (container: HTMLElement, sdk: BaiduMapSdk) => BaiduMap;
}

function formatOriginalCoordinate(point: Point): string {
  const coordinate = point.coordinates.original;
  return coordinate.kind === 'geographic'
    ? `${coordinate.system} ${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.system} X ${coordinate.x}, Y ${coordinate.y}`;
}

export function createBaiduMarkerData(point: Point): BaiduMarkerData | null {
  const original = point.coordinates.original;
  const displayCoordinate =
    original.kind === 'geographic' && original.system === 'BD09'
      ? original
      : point.coordinates.converted.BD09?.coordinate;

  if (!displayCoordinate || displayCoordinate.kind !== 'geographic') {
    return null;
  }

  return {
    id: point.id,
    name: point.name,
    position: [displayCoordinate.lng, displayCoordinate.lat],
    originalCoordinate: formatOriginalCoordinate(point),
    displaySystem: 'BD09',
  };
}

export class BaiduMapService {
  readonly #pointService: PointService;
  readonly #loadSdk: (ak: string) => Promise<BaiduMapSdk>;
  readonly #createMap: (container: HTMLElement, sdk: BaiduMapSdk) => BaiduMap;
  #map: BaiduMap | null = null;

  constructor(
    points: PointService = pointService,
    dependencies: BaiduMapServiceDependencies = {},
  ) {
    this.#pointService = points;
    this.#loadSdk = dependencies.loadSdk ?? loadBaiduMapSdk;
    this.#createMap =
      dependencies.createMap ?? ((container, sdk) => new BaiduMap(container, sdk));
  }

  async initialize(container: HTMLElement, ak: string): Promise<BaiduMapServiceResult<void>> {
    this.destroy();

    try {
      const sdk = await this.#loadSdk(ak);
      this.#map = this.#createMap(container, sdk);
      return { status: 'success', value: undefined };
    } catch (error) {
      return {
        status: 'failure',
        error: {
          code: 'SDK_LOAD_FAILED',
          message: error instanceof Error ? error.message : '百度地图 SDK 加载失败。',
        },
      };
    }
  }

  async listPoints(): Promise<BaiduMapServiceResult<readonly Point[]>> {
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
  ): Promise<BaiduMapServiceResult<BaiduMapDisplayResult>> {
    if (!this.#map) {
      return {
        status: 'failure',
        error: { code: 'MAP_NOT_READY', message: '百度地图尚未加载。' },
      };
    }

    const pointsResult = await this.listPoints();
    if (pointsResult.status === 'failure') {
      return pointsResult;
    }

    const selectedIds = new Set(ids);
    const selectedPoints = pointsResult.value.filter((point) => selectedIds.has(point.id));
    const markers: BaiduMarkerData[] = [];
    const missingCoordinatePoints: Point[] = [];

    for (const point of selectedPoints) {
      const marker = createBaiduMarkerData(point);
      if (marker) markers.push(marker);
      else missingCoordinatePoints.push(point);
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
