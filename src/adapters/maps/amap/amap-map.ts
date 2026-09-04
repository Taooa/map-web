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
  AMapInfoWindowInstance,
  AMapInstance,
  AMapMarkerInstance,
  AMapSdk,
} from './amap-loader';

export type AMapMarkerData = MapRenderPoint;

type MarkerListeners = Readonly<{
  click: () => void;
  mouseover: () => void;
  mouseout: () => void;
}>;

export class AMapMap {
  readonly #map: AMapInstance;
  readonly #sdk: AMapSdk;
  readonly #onActivatePoint: MapPointActivateHandler;
  #markers: AMapMarkerInstance[] = [];
  #markerListeners = new Map<AMapMarkerInstance, MarkerListeners>();
  #infoWindow: AMapInfoWindowInstance | null = null;
  #windowMode: 'hover' | 'detail' | null = null;
  #hoverCloseTimer: number | null = null;

  constructor(
    container: HTMLElement,
    sdk: AMapSdk,
    onActivatePoint: MapPointActivateHandler = () => undefined,
  ) {
    this.#sdk = sdk;
    this.#onActivatePoint = onActivatePoint;
    this.#map = new sdk.Map(container, {
      zoom: 11,
      center: [121.4737, 31.2304],
    });
  }

  setMarkers(groups: readonly MapRenderGroup[]): void {
    this.clear();

    this.#markers = groups.map((group) => {
      const marker = new this.#sdk.Marker({
        anchor: 'bottom-center',
        icon: createMarkerIconUrl(Boolean(group.activePointId)),
        position: group.position,
        title:
          group.points.length === 1
            ? group.points[0]!.name
            : `该位置共 ${group.points.length} 个点位`,
      });
      const handleClick = () => this.#openDetail(group, marker);
      const handleMouseOver = () => this.#openHover(group, marker);
      const handleMouseOut = () => this.#scheduleHoverClose();
      marker.on('click', handleClick);
      marker.on('mouseover', handleMouseOver);
      marker.on('mouseout', handleMouseOut);
      this.#markerListeners.set(marker, {
        click: handleClick,
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
      });
      return marker;
    });

    if (this.#markers.length > 0) this.#map.add(this.#markers);
  }

  focusPoint(position: readonly [number, number]): void {
    this.#map.setCenter(position);
  }

  fitView(): void {
    if (this.#markers.length > 0) this.#map.setFitView(this.#markers);
  }

  clear(): void {
    this.#clearHoverCloseTimer();
    this.#markers.forEach((marker) => {
      const listeners = this.#markerListeners.get(marker);
      if (!listeners) return;
      marker.off?.('click', listeners.click);
      marker.off?.('mouseover', listeners.mouseover);
      marker.off?.('mouseout', listeners.mouseout);
    });
    if (this.#markers.length > 0) this.#map.remove(this.#markers);
    this.#markers = [];
    this.#markerListeners.clear();
    this.#closeWindow();
  }

  destroy(): void {
    this.clear();
    this.#map.destroy();
  }

  #openDetail(group: MapRenderGroup, marker: AMapMarkerInstance): void {
    const point =
      group.points.find((candidate) => candidate.id === group.activePointId) ?? group.points[0];
    if (!point) return;
    this.#clearHoverCloseTimer();
    this.#closeWindow();
    this.#infoWindow = new this.#sdk.InfoWindow({
      content: createMarkerDetailContent(point, 'amap-info-window'),
      offset: [0, -24],
    });
    this.#windowMode = 'detail';
    this.#infoWindow.open(this.#map, marker.getPosition());
  }

  #openHover(group: MapRenderGroup, marker: AMapMarkerInstance): void {
    this.#clearHoverCloseTimer();
    if (this.#windowMode === 'detail') return;
    this.#closeWindow();
    const content = createMarkerHoverContent(
      group,
      this.#onActivatePoint,
      () => this.#clearHoverCloseTimer(),
      () => this.#scheduleHoverClose(),
    );
    this.#infoWindow = new this.#sdk.InfoWindow({ content, offset: [0, -24] });
    this.#windowMode = 'hover';
    this.#infoWindow.open(this.#map, marker.getPosition());
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
    this.#infoWindow?.close();
    this.#infoWindow = null;
    this.#windowMode = null;
  }
}
