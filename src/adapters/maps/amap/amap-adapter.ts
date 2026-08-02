import type { MapAdapter, MapRenderPoint } from '../map-adapter';
import { loadAMapSdk, type AMapSdk } from './amap-loader';
import { AMapMap, type AMapMarkerData } from './amap-map';

export class AMapAdapter implements MapAdapter {
  #map: AMapMap | null = null;
  #mountVersion = 0;
  readonly #loadSdk: (key: string) => Promise<AMapSdk>;

  constructor(loadSdk: (key: string) => Promise<AMapSdk> = loadAMapSdk) {
    this.#loadSdk = loadSdk;
  }

  async mount(container: HTMLElement, key: string): Promise<void> {
    this.destroy();
    const mountVersion = this.#mountVersion;
    const sdk = await this.#loadSdk(key);
    if (mountVersion !== this.#mountVersion) return;
    this.#map = new AMapMap(container, sdk);
  }
  setPoints(points: readonly MapRenderPoint[]): void {
    this.#map?.setMarkers(points as readonly AMapMarkerData[]);
  }
  fitView(): void { this.#map?.fitView(); }
  clear(): void { this.#map?.clear(); }
  destroy(): void {
    this.#mountVersion += 1;
    this.#map?.destroy();
    this.#map = null;
  }
}
