import type {
  MapPointActivateHandler,
  MapRenderGroup,
  MapRenderPoint,
} from '../map-adapter';
import {
  createMarkerDetailContent,
  createMarkerHoverContent,
  createMarkerIconUrl,
} from '../marker-ui';
import type {
  TiandituLngLatInstance,
  TiandituMapInstance,
  TiandituMapSdk,
  TiandituMarkerInstance,
} from './tianditu-loader';

export type TiandituMarkerData = MapRenderPoint;

type MarkerListeners = Readonly<{
  click: () => void;
  mouseover: () => void;
  mouseout: () => void;
}>;

export class TiandituMap {
  readonly #container: HTMLElement;
  readonly #map: TiandituMapInstance;
  readonly #sdk: TiandituMapSdk;
  readonly #onActivatePoint: MapPointActivateHandler;
  #markers: TiandituMarkerInstance[] = [];
  #markerListeners = new Map<TiandituMarkerInstance, MarkerListeners>();
  #positions: TiandituLngLatInstance[] = [];
  #windowMode: 'hover' | 'detail' | null = null;
  #hoverCloseTimer: number | null = null;

  constructor(
    container: HTMLElement,
    sdk: TiandituMapSdk,
    onActivatePoint: MapPointActivateHandler = () => undefined,
  ) {
    this.#container = container;
    this.#sdk = sdk;
    this.#onActivatePoint = onActivatePoint;
    this.#map = new sdk.Map(container);
    this.#map.centerAndZoom(new sdk.LngLat(121.4737, 31.2304), 11);
    this.#map.enableScrollWheelZoom();
    this.#map.enableDoubleClickZoom();
  }

  setMarkers(groups: readonly MapRenderGroup[]): void {
    this.clear();

    this.#positions = groups.map((group) => {
      const position = new this.#sdk.LngLat(group.position[0], group.position[1]);
      const icon = new this.#sdk.Icon({
        iconUrl: createMarkerIconUrl(Boolean(group.activePointId)),
        iconSize: new this.#sdk.Point(40, 46),
        iconAnchor: new this.#sdk.Point(20, 46),
      });
      const marker = new this.#sdk.Marker(position, { icon });
      const handleClick = () => this.#openDetail(group, position);
      const handleMouseOver = () => this.#openHover(group, position);
      const handleMouseOut = () => this.#scheduleHoverClose();
      marker.addEventListener('click', handleClick);
      marker.addEventListener('mouseover', handleMouseOver);
      marker.addEventListener('mouseout', handleMouseOut);
      this.#markerListeners.set(marker, {
        click: handleClick,
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
      });
      this.#map.addOverLay(marker);
      this.#markers.push(marker);
      return position;
    });
  }

  focusPoint(position: readonly [number, number]): void {
    const center = new this.#sdk.LngLat(position[0], position[1]);
    if (this.#map.panTo) {
      this.#map.panTo(center);
      return;
    }
    this.#map.centerAndZoom(center, this.#map.getZoom());
  }

  fitView(): void {
    if (this.#positions.length > 0) this.#map.centerAndZoom(this.#positions[0]!, 15);
  }

  clear(): void {
    this.#clearHoverCloseTimer();
    this.#closeWindow();
    this.#markers.forEach((marker) => {
      const listeners = this.#markerListeners.get(marker);
      if (listeners) {
        marker.removeEventListener?.('click', listeners.click);
        marker.removeEventListener?.('mouseover', listeners.mouseover);
        marker.removeEventListener?.('mouseout', listeners.mouseout);
      }
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

  #openDetail(group: MapRenderGroup, position: TiandituLngLatInstance): void {
    const point =
      group.points.find((candidate) => candidate.id === group.activePointId) ?? group.points[0];
    if (!point) return;
    this.#clearHoverCloseTimer();
    this.#closeWindow();
    const infoWindow = new this.#sdk.InfoWindow({
      content: createMarkerDetailContent(point, 'tianditu-info-window'),
    });
    this.#windowMode = 'detail';
    this.#map.openInfoWindow(infoWindow, position);
  }

  #openHover(group: MapRenderGroup, position: TiandituLngLatInstance): void {
    this.#clearHoverCloseTimer();
    if (this.#windowMode === 'detail') return;
    this.#closeWindow();
    const content = createMarkerHoverContent(
      group,
      this.#onActivatePoint,
      () => this.#clearHoverCloseTimer(),
      () => this.#scheduleHoverClose(),
    );
    this.#windowMode = 'hover';
    this.#map.openInfoWindow(new this.#sdk.InfoWindow({ content }), position);
  }

  #scheduleHoverClose(): void {
    if (this.#windowMode !== 'hover') return;
    this.#clearHoverCloseTimer();
    this.#hoverCloseTimer = window.setTimeout(() => this.#closeWindow(), 150);
  }

  #clearHoverCloseTimer(): void {
    if (this.#hoverCloseTimer === null) return;
    window.clearTimeout(this.#hoverCloseTimer);
    this.#hoverCloseTimer = null;
  }

  #closeWindow(): void {
    this.#map.closeInfoWindow?.();
    this.#windowMode = null;
  }
}
