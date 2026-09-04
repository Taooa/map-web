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
  BaiduMapInstance,
  BaiduMapSdk,
  BaiduMarkerInstance,
  BaiduPointInstance,
} from './baidu-loader';

export type BaiduMarkerData = MapRenderPoint;

type MarkerListeners = Readonly<{
  click: () => void;
  mouseover: () => void;
  mouseout: () => void;
}>;

export class BaiduMap {
  readonly #container: HTMLElement;
  readonly #map: BaiduMapInstance;
  readonly #sdk: BaiduMapSdk;
  readonly #onActivatePoint: MapPointActivateHandler;
  #markers: BaiduMarkerInstance[] = [];
  #markerListeners = new Map<BaiduMarkerInstance, MarkerListeners>();
  #viewportPoints: BaiduPointInstance[] = [];
  #windowMode: 'hover' | 'detail' | null = null;
  #hoverCloseTimer: number | null = null;

  constructor(
    container: HTMLElement,
    sdk: BaiduMapSdk,
    onActivatePoint: MapPointActivateHandler = () => undefined,
  ) {
    this.#container = container;
    this.#sdk = sdk;
    this.#onActivatePoint = onActivatePoint;
    this.#map = new sdk.Map(container);
    this.#map.centerAndZoom(new sdk.Point(121.4737, 31.2304), 11);
    this.#map.enableScrollWheelZoom();
  }

  setMarkers(groups: readonly MapRenderGroup[]): void {
    this.clear();

    this.#viewportPoints = groups.map((group) => {
      const point = new this.#sdk.Point(group.position[0], group.position[1]);
      const size = new this.#sdk.Size(40, 46);
      const icon = new this.#sdk.Icon(createMarkerIconUrl(Boolean(group.activePointId)), size, {
        anchor: new this.#sdk.Size(20, 46),
        imageSize: size,
      });
      const marker = new this.#sdk.Marker(point, { icon });
      marker.setTitle(
        group.points.length === 1
          ? group.points[0]!.name
          : `该位置共 ${group.points.length} 个点位`,
      );
      const handleClick = () => this.#openDetail(group, marker);
      const handleMouseOver = () => this.#openHover(group, marker);
      const handleMouseOut = () => this.#scheduleHoverClose();
      marker.addEventListener('click', handleClick);
      marker.addEventListener('mouseover', handleMouseOver);
      marker.addEventListener('mouseout', handleMouseOut);
      this.#markerListeners.set(marker, {
        click: handleClick,
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
      });
      this.#map.addOverlay(marker);
      this.#markers.push(marker);
      return point;
    });
  }

  focusPoint(position: readonly [number, number]): void {
    this.#map.panTo(new this.#sdk.Point(position[0], position[1]));
  }

  fitView(): void {
    if (this.#viewportPoints.length > 0) this.#map.setViewport(this.#viewportPoints);
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

  #openDetail(group: MapRenderGroup, marker: BaiduMarkerInstance): void {
    const point =
      group.points.find((candidate) => candidate.id === group.activePointId) ?? group.points[0];
    if (!point) return;
    this.#clearHoverCloseTimer();
    this.#closeWindow();
    const infoWindow = new this.#sdk.InfoWindow(
      createMarkerDetailContent(point, 'baidu-info-window'),
    );
    this.#windowMode = 'detail';
    this.#map.openInfoWindow(infoWindow, marker.getPosition());
  }

  #openHover(group: MapRenderGroup, marker: BaiduMarkerInstance): void {
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
    this.#map.openInfoWindow(new this.#sdk.InfoWindow(content), marker.getPosition());
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
