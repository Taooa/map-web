import type {
  BaiduMapInstance,
  BaiduMapSdk,
  BaiduMarkerInstance,
  BaiduPointInstance,
} from './baidu-loader';

export interface BaiduMarkerData {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [lng: number, lat: number];
  readonly originalCoordinate: string;
  readonly displaySystem: 'BD09';
}

function createInfoContent(marker: BaiduMarkerData): string {
  const content = document.createElement('article');
  content.className = 'baidu-info-window';

  const title = document.createElement('strong');
  title.textContent = marker.name;
  const original = document.createElement('span');
  original.textContent = `原始坐标：${marker.originalCoordinate}`;
  const system = document.createElement('span');
  system.textContent = `展示坐标系：${marker.displaySystem}`;
  const coordinate = document.createElement('code');
  coordinate.textContent = `${marker.position[0]}, ${marker.position[1]}`;

  content.append(title, original, system, coordinate);
  return content.outerHTML;
}

export class BaiduMap {
  readonly #container: HTMLElement;
  readonly #map: BaiduMapInstance;
  readonly #sdk: BaiduMapSdk;
  #markers: BaiduMarkerInstance[] = [];
  #markerListeners = new Map<BaiduMarkerInstance, () => void>();
  #viewportPoints: BaiduPointInstance[] = [];

  constructor(container: HTMLElement, sdk: BaiduMapSdk) {
    this.#container = container;
    this.#sdk = sdk;
    this.#map = new sdk.Map(container);
    this.#map.centerAndZoom(new sdk.Point(121.4737, 31.2304), 11);
    this.#map.enableScrollWheelZoom();
  }

  setMarkers(markerData: readonly BaiduMarkerData[]): void {
    this.clear();

    this.#viewportPoints = markerData.map((data) => {
      const point = new this.#sdk.Point(data.position[0], data.position[1]);
      const marker = new this.#sdk.Marker(point);
      marker.setTitle(data.name);
      const handleClick = () => {
        const infoWindow = new this.#sdk.InfoWindow(createInfoContent(data));
        this.#map.openInfoWindow(infoWindow, marker.getPosition());
      };
      marker.addEventListener('click', handleClick);
      this.#markerListeners.set(marker, handleClick);
      this.#map.addOverlay(marker);
      this.#markers.push(marker);
      return point;
    });

    this.fitView();
  }

  fitView(): void {
    if (this.#viewportPoints.length > 0) this.#map.setViewport(this.#viewportPoints);
  }

  clear(): void {
    this.#map.closeInfoWindow?.();
    this.#markers.forEach((marker) => {
      const listener = this.#markerListeners.get(marker);
      if (listener) marker.removeEventListener?.('click', listener);
      this.#map.removeOverlay(marker);
    });
    this.#markers = [];
    this.#markerListeners.clear();
    this.#viewportPoints = [];
  }

  destroy(): void {
    this.clear();
    this.#container.replaceChildren();
  }
}
