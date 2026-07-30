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
  #infoWindow: AMapInfoWindowInstance | null = null;

  constructor(container: HTMLElement, sdk: AMapSdk) {
    this.#sdk = sdk;
    this.#map = new sdk.Map(container, {
      zoom: 11,
      center: [121.4737, 31.2304],
    });
  }

  setMarkers(markerData: readonly AMapMarkerData[]): void {
    if (this.#markers.length > 0) {
      this.#map.remove(this.#markers);
    }
    this.#infoWindow?.close();
    this.#infoWindow = null;

    this.#markers = markerData.map((data) => {
      const marker = new this.#sdk.Marker({
        position: data.position,
        title: data.name,
      });
      marker.on('click', () => {
        this.#infoWindow?.close();
        this.#infoWindow = new this.#sdk.InfoWindow({
          content: createInfoContent(data),
          offset: [0, -24],
        });
        this.#infoWindow.open(this.#map, marker.getPosition());
      });
      return marker;
    });

    if (this.#markers.length > 0) {
      this.#map.add(this.#markers);
      this.#map.setFitView(this.#markers);
    }
  }

  destroy(): void {
    this.#infoWindow?.close();
    this.#infoWindow = null;
    this.#markers = [];
    this.#map.destroy();
  }
}
