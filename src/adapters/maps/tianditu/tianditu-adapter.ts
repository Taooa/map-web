import type { MapAdapter, MapRenderPoint } from '../map-adapter';
import { loadTiandituSdk, type TiandituMapSdk } from './tianditu-loader';
import { TiandituMap, type TiandituMarkerData } from './tianditu-map';

export class TiandituAdapter implements MapAdapter {
  #map: TiandituMap | null = null;
  #mountVersion = 0;
  readonly #loadSdk: (token: string) => Promise<TiandituMapSdk>;

  constructor(loadSdk: (token: string) => Promise<TiandituMapSdk> = loadTiandituSdk) {
    this.#loadSdk = loadSdk;
  }

  async mount(container: HTMLElement, token: string): Promise<void> {
    this.destroy();
    const mountVersion = this.#mountVersion;
    const sdk = await this.#loadSdk(token);
    if (mountVersion !== this.#mountVersion) return;
    this.#map = new TiandituMap(container, sdk);
  }
  setPoints(points: readonly MapRenderPoint[]): void {
    this.#map?.setMarkers(points as readonly TiandituMarkerData[]);
  }
  fitView(): void { this.#map?.fitView(); }
  clear(): void { this.#map?.clear(); }
  destroy(): void {
    this.#mountVersion += 1;
    this.#map?.destroy();
    this.#map = null;
  }
}
