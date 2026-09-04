export type TiandituLngLatInstance = object;
export interface TiandituLngLatBoundsInstance {
  extend(position: TiandituLngLatInstance): void;
}
export type TiandituInfoWindowInstance = object;
export type TiandituViewport = object;

export interface TiandituMarkerInstance {
  addEventListener(event: 'click' | 'mouseover' | 'mouseout', handler: () => void): void;
  removeEventListener?(event: 'click' | 'mouseover' | 'mouseout', handler: () => void): void;
}

export interface TiandituMapInstance {
  centerAndZoom(position: TiandituLngLatInstance, zoom: number): void;
  panTo?(position: TiandituLngLatInstance): void;
  getZoom(): number;
  getViewport(bounds: TiandituLngLatBoundsInstance): TiandituViewport;
  setViewport(viewport: TiandituViewport): void;
  enableScrollWheelZoom(): void;
  enableDoubleClickZoom(): void;
  addOverLay(marker: TiandituMarkerInstance): void;
  removeOverLay(marker: TiandituMarkerInstance): void;
  openInfoWindow(infoWindow: TiandituInfoWindowInstance, position: TiandituLngLatInstance): void;
  closeInfoWindow?(): void;
}

export interface TiandituMapSdk {
  readonly Point: new (x: number, y: number) => object;
  readonly Icon: new (options: {
    readonly iconUrl: string;
    readonly iconSize: object;
    readonly iconAnchor: object;
  }) => object;
  readonly Map: new (container: HTMLElement) => TiandituMapInstance;
  readonly LngLat: new (lng: number, lat: number) => TiandituLngLatInstance;
  readonly LngLatBounds: new (
    southwest: TiandituLngLatInstance,
    northeast: TiandituLngLatInstance,
  ) => TiandituLngLatBoundsInstance;
  readonly Marker: new (
    position: TiandituLngLatInstance,
    options?: { readonly icon: object },
  ) => TiandituMarkerInstance;
  readonly InfoWindow: new (options: {
    readonly content: string | HTMLElement;
  }) => TiandituInfoWindowInstance;
}

declare global {
  interface Window {
    T?: TiandituMapSdk;
  }
}

export const TIANDITU_SCRIPT_ID = 'coordinate-toolkit-tianditu-sdk';
const READY_TIMEOUT_MS = 1_500;
const READY_POLL_MS = 25;

let pendingLoad: Promise<TiandituMapSdk> | null = null;
let pendingToken: string | null = null;

function isSdkReady(sdk: TiandituMapSdk | undefined): sdk is TiandituMapSdk {
  return Boolean(
    sdk &&
      typeof sdk.Map === 'function' &&
      typeof sdk.LngLat === 'function' &&
      typeof sdk.LngLatBounds === 'function' &&
      typeof sdk.Marker === 'function' &&
      typeof sdk.InfoWindow === 'function',
  );
}

function waitForSdkReady(): Promise<TiandituMapSdk> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (isSdkReady(window.T)) {
        resolve(window.T);
        return;
      }
      if (Date.now() - startedAt >= READY_TIMEOUT_MS) {
        reject(new Error('天地图 SDK 已加载，但 window.T 未在限定时间内就绪。'));
        return;
      }
      window.setTimeout(check, READY_POLL_MS);
    };
    check();
  });
}

export function loadTiandituSdk(token: string): Promise<TiandituMapSdk> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return Promise.reject(new Error('天地图 Token 不能为空。'));
  }
  if (isSdkReady(window.T)) {
    return Promise.resolve(window.T);
  }
  if (pendingLoad && pendingToken === normalizedToken) {
    return pendingLoad;
  }

  document.getElementById(TIANDITU_SCRIPT_ID)?.remove();
  pendingToken = normalizedToken;
  pendingLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = TIANDITU_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${encodeURIComponent(normalizedToken)}`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        script.remove();
        reject(new Error('天地图 SDK 加载失败，请检查 Token、网络或域名限制。'));
      },
      { once: true },
    );
    document.head.append(script);
  })
    .then(waitForSdkReady)
    .finally(() => {
      pendingLoad = null;
      pendingToken = null;
    });

  return pendingLoad;
}
