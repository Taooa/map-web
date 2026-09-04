import type {
  MapAdapter,
  MapPointActivateHandler,
  MapRenderGroup,
} from '../map-adapter';
import { loadTiandituSdk, type TiandituMapSdk } from './tianditu-loader';
import { TiandituMap } from './tianditu-map';

export class TiandituAdapter implements MapAdapter {
  #map: TiandituMap | null = null;
  #mountVersion = 0;
  readonly #loadSdk: (token: string) => Promise<TiandituMapSdk>;
  readonly #onActivatePoint: MapPointActivateHandler;

  constructor(
    loadSdk: (token: string) => Promise<TiandituMapSdk> = loadTiandituSdk,
    onActivatePoint: MapPointActivateHandler = () => undefined,
  ) {
    this.#loadSdk = loadSdk;
    this.#onActivatePoint = onActivatePoint;
  }

  async mount(container: HTMLElement, token: string): Promise<void> {
    this.destroy();
    const mountVersion = this.#mountVersion;
    const sdk = await this.#loadSdk(token);
    if (mountVersion !== this.#mountVersion) return;
    this.#map = new TiandituMap(container, sdk, this.#onActivatePoint);
  }
  setPoints(groups: readonly MapRenderGroup[]): void {
    this.#map?.setMarkers(groups);
  }
  focusPoint(position: readonly [number, number]): void { this.#map?.focusPoint(position); }
  fitView(): void { this.#map?.fitView(); }
  clear(): void { this.#map?.clear(); }
  destroy(): void {
    this.#mountVersion += 1;
    this.#map?.destroy();
    this.#map = null;
  }
}
