import type {
  MapAdapter,
  MapAdapterOptions,
  MapPointActivateHandler,
  MapRenderGroup,
} from '../map-adapter';
import { loadAMapSdk, type AMapSdk } from './amap-loader';
import { AMapMap } from './amap-map';

export class AMapAdapter implements MapAdapter {
  #map: AMapMap | null = null;
  #mountVersion = 0;
  readonly #loadSdk: (key: string) => Promise<AMapSdk>;
  readonly #onActivatePoint: MapPointActivateHandler;

  constructor(
    options: MapAdapterOptions = {},
    loadSdk: (key: string) => Promise<AMapSdk> = loadAMapSdk,
  ) {
    this.#loadSdk = loadSdk;
    this.#onActivatePoint = options.onPointActivate ?? (() => undefined);
  }

  async mount(container: HTMLElement, key: string): Promise<void> {
    this.destroy();
    const mountVersion = this.#mountVersion;
    const sdk = await this.#loadSdk(key);
    if (mountVersion !== this.#mountVersion) return;
    this.#map = new AMapMap(container, sdk, this.#onActivatePoint);
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
