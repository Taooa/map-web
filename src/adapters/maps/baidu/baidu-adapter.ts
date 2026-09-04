import type {
  MapAdapter,
  MapAdapterOptions,
  MapPointActivateHandler,
  MapRenderGroup,
} from '../map-adapter';
import { loadBaiduMapSdk, type BaiduMapSdk } from './baidu-loader';
import { BaiduMap } from './baidu-map';

export class BaiduAdapter implements MapAdapter {
  #map: BaiduMap | null = null;
  #mountVersion = 0;
  readonly #loadSdk: (ak: string) => Promise<BaiduMapSdk>;
  readonly #onActivatePoint: MapPointActivateHandler;

  constructor(
    options: MapAdapterOptions = {},
    loadSdk: (ak: string) => Promise<BaiduMapSdk> = loadBaiduMapSdk,
  ) {
    this.#loadSdk = loadSdk;
    this.#onActivatePoint = options.onPointActivate ?? (() => undefined);
  }

  async mount(container: HTMLElement, ak: string): Promise<void> {
    this.destroy();
    const mountVersion = this.#mountVersion;
    const sdk = await this.#loadSdk(ak);
    if (mountVersion !== this.#mountVersion) return;
    this.#map = new BaiduMap(container, sdk, this.#onActivatePoint);
  }
  setPoints(groups: readonly MapRenderGroup[]): void {
    this.#map?.setMarkers(groups);
  }
  focusPoint(position: readonly [number, number]): void {
    this.#map?.focusPoint(position);
  }
  fitView(): void {
    this.#map?.fitView();
  }
  clear(): void {
    this.#map?.clear();
  }
  destroy(): void {
    this.#mountVersion += 1;
    this.#map?.destroy();
    this.#map = null;
  }
}
