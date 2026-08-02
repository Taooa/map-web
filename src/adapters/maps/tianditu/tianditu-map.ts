import type {
  TiandituLngLatInstance,
  TiandituMapInstance,
  TiandituMapSdk,
  TiandituMarkerInstance,
} from './tianditu-loader';

export interface TiandituMarkerData {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [lng: number, lat: number];
  readonly originalCoordinate: string;
  readonly displaySystem: 'WGS84';
}

function createInfoContent(data: TiandituMarkerData): string {
  const content = document.createElement('article');
  content.className = 'tianditu-info-window';
  const title = document.createElement('strong');
  title.textContent = data.name;
  const original = document.createElement('span');
  original.textContent = `原始坐标：${data.originalCoordinate}`;
  const system = document.createElement('span');
  system.textContent = `展示坐标系：${data.displaySystem}`;
  const coordinate = document.createElement('code');
  coordinate.textContent = `${data.position[0]}, ${data.position[1]}`;
  content.append(title, original, system, coordinate);
  return content.outerHTML;
}

export class TiandituMap {
  readonly #container: HTMLElement;
  readonly #map: TiandituMapInstance;
  readonly #sdk: TiandituMapSdk;
  #markers: TiandituMarkerInstance[] = [];
  #markerListeners = new Map<TiandituMarkerInstance, () => void>();
  #positions: TiandituLngLatInstance[] = [];

  constructor(container: HTMLElement, sdk: TiandituMapSdk) {
    this.#container = container;
    this.#sdk = sdk;
    this.#map = new sdk.Map(container);
    this.#map.centerAndZoom(new sdk.LngLat(121.4737, 31.2304), 11);
    this.#map.enableScrollWheelZoom();
    this.#map.enableDoubleClickZoom();
  }

  setMarkers(markerData: readonly TiandituMarkerData[]): void {
    this.clear();

    this.#positions = markerData.map((data) => {
      const position: TiandituLngLatInstance = new this.#sdk.LngLat(
        data.position[0],
        data.position[1],
      );
      const marker = new this.#sdk.Marker(position);
      const handleClick = () => {
        const infoWindow = new this.#sdk.InfoWindow({ content: createInfoContent(data) });
        this.#map.openInfoWindow(infoWindow, position);
      };
      marker.addEventListener('click', handleClick);
      this.#markerListeners.set(marker, handleClick);
      this.#map.addOverLay(marker);
      this.#markers.push(marker);
      return position;
    });

    this.fitView();
  }

  fitView(): void {
    if (this.#positions.length > 0) this.#map.centerAndZoom(this.#positions[0]!, 15);
  }

  clear(): void {
    this.#map.closeInfoWindow?.();
    this.#markers.forEach((marker) => {
      const listener = this.#markerListeners.get(marker);
      if (listener) marker.removeEventListener?.('click', listener);
      this.#map.removeOverLay(marker);
    });
    this.#markers = [];
    this.#markerListeners.clear();
    this.#positions = [];
  }

  destroy(): void {
    this.clear();
    this.#container.replaceChildren();
  }
}
