import type { MapAdapter, MapRenderPoint } from '../map-adapter';
import { loadBaiduMapSdk, type BaiduMapSdk } from './baidu-loader';
import { BaiduMap, type BaiduMarkerData } from './baidu-map';

export class BaiduAdapter implements MapAdapter {
  #map: BaiduMap | null = null;
  #mountVersion = 0;
  readonly #loadSdk: (ak: string) => Promise<BaiduMapSdk>;

  constructor(loadSdk: (ak: string) => Promise<BaiduMapSdk> = loadBaiduMapSdk) {
    this.#loadSdk = loadSdk;
  }

  async mount(container: HTMLElement, ak: string): Promise<void> {
    this.destroy();
    const mountVersion = this.#mountVersion;
    const sdk = await this.#loadSdk(ak);
    if (mountVersion !== this.#mountVersion) return;
    this.#map = new BaiduMap(container, sdk);
  }
  setPoints(points: readonly MapRenderPoint[]): void {
    this.#map?.setMarkers(points as readonly BaiduMarkerData[]);
  }
  fitView(): void { this.#map?.fitView(); }
  clear(): void { this.#map?.clear(); }
  destroy(): void {
    this.#mountVersion += 1;
    this.#map?.destroy();
    this.#map = null;
  }
}
