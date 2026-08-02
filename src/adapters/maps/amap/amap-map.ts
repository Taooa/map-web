import type {
  AMapInfoWindowInstance,
  AMapInstance,
  AMapMarkerInstance,
  AMapSdk,
} from './amap-loader';

export interface AMapMarkerData {
  readonly id: string;
  readonly name: string;
  readonly position: readonly [lng: number, lat: number];
  readonly originalCoordinate: string;
  readonly displaySystem: 'GCJ02';
}

function createInfoContent(marker: AMapMarkerData): HTMLElement {
  const content = document.createElement('article');
  content.className = 'amap-info-window';

  const title = document.createElement('strong');
  title.textContent = marker.name;
  const original = document.createElement('span');
  original.textContent = `原始坐标：${marker.originalCoordinate}`;
  const system = document.createElement('span');
  system.textContent = `展示坐标系：${marker.displaySystem}`;
  const coordinate = document.createElement('code');
  coordinate.textContent = `${marker.position[0]}, ${marker.position[1]}`;

  content.append(title, original, system, coordinate);
  return content;
}

export class AMapMap {
  readonly #map: AMapInstance;
  readonly #sdk: AMapSdk;
  #markers: AMapMarkerInstance[] = [];
  #markerListeners = new Map<AMapMarkerInstance, () => void>();
  #infoWindow: AMapInfoWindowInstance | null = null;

  constructor(container: HTMLElement, sdk: AMapSdk) {
    this.#sdk = sdk;
    this.#map = new sdk.Map(container, {
      zoom: 11,
      center: [121.4737, 31.2304],
    });
  }

  setMarkers(markerData: readonly AMapMarkerData[]): void {
    this.clear();

    this.#markers = markerData.map((data) => {
      const marker = new this.#sdk.Marker({
        position: data.position,
        title: data.name,
      });
      const handleClick = () => {
        this.#infoWindow?.close();
        this.#infoWindow = new this.#sdk.InfoWindow({
          content: createInfoContent(data),
          offset: [0, -24],
        });
        this.#infoWindow.open(this.#map, marker.getPosition());
      };
      marker.on('click', handleClick);
      this.#markerListeners.set(marker, handleClick);
      return marker;
    });

    if (this.#markers.length > 0) {
      this.#map.add(this.#markers);
      this.fitView();
    }
  }

  fitView(): void {
    if (this.#markers.length > 0) this.#map.setFitView(this.#markers);
  }

  clear(): void {
    this.#markers.forEach((marker) => {
      const listener = this.#markerListeners.get(marker);
      if (listener) marker.off?.('click', listener);
    });
    if (this.#markers.length > 0) this.#map.remove(this.#markers);
    this.#markers = [];
    this.#markerListeners.clear();
    this.#infoWindow?.close();
    this.#infoWindow = null;
  }

  destroy(): void {
    this.clear();
    this.#map.destroy();
  }
}
