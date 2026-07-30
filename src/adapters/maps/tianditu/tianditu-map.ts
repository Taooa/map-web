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

  constructor(container: HTMLElement, sdk: TiandituMapSdk) {
    this.#container = container;
    this.#sdk = sdk;
    this.#map = new sdk.Map(container);
    this.#map.centerAndZoom(new sdk.LngLat(121.4737, 31.2304), 11);
    this.#map.enableScrollWheelZoom();
    this.#map.enableDoubleClickZoom();
  }

  setMarkers(markerData: readonly TiandituMarkerData[]): void {
    this.#markers.forEach((marker) => this.#map.removeOverLay(marker));
    this.#markers = [];

    markerData.forEach((data) => {
      const position: TiandituLngLatInstance = new this.#sdk.LngLat(
        data.position[0],
        data.position[1],
      );
      const marker = new this.#sdk.Marker(position);
      marker.addEventListener('click', () => {
        const infoWindow = new this.#sdk.InfoWindow({ content: createInfoContent(data) });
        this.#map.openInfoWindow(infoWindow, position);
      });
      this.#map.addOverLay(marker);
      this.#markers.push(marker);
    });

    if (markerData.length === 1) {
      const [lng, lat] = markerData[0]!.position;
      this.#map.centerAndZoom(new this.#sdk.LngLat(lng, lat), 15);
    }
  }

  destroy(): void {
    this.#markers.forEach((marker) => this.#map.removeOverLay(marker));
    this.#markers = [];
    this.#container.replaceChildren();
  }
}
