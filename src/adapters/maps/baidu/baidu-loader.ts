export type BaiduPointInstance = object;

export interface BaiduMarkerInstance {
  setTitle(title: string): void;
  addEventListener(event: 'click', handler: () => void): void;
  getPosition(): BaiduPointInstance;
}

export type BaiduInfoWindowInstance = object;

export interface BaiduMapInstance {
  centerAndZoom(point: BaiduPointInstance, zoom: number): void;
  enableScrollWheelZoom(): void;
  addOverlay(marker: BaiduMarkerInstance): void;
  removeOverlay(marker: BaiduMarkerInstance): void;
  openInfoWindow(infoWindow: BaiduInfoWindowInstance, point: BaiduPointInstance): void;
  setViewport(points: readonly BaiduPointInstance[]): void;
  getContainer(): HTMLElement;
}

export interface BaiduMapSdk {
  readonly Map: new (container: HTMLElement) => BaiduMapInstance;
  readonly Point: new (lng: number, lat: number) => BaiduPointInstance;
  readonly Marker: new (point: BaiduPointInstance) => BaiduMarkerInstance;
  readonly InfoWindow: new (content: string) => BaiduInfoWindowInstance;
}

declare global {
  interface Window {
    BMap?: BaiduMapSdk;
    CoordinateToolkitBaiduCallback?: () => void;
  }
}

const SCRIPT_ID = 'coordinate-toolkit-baidu-sdk';
const CALLBACK_NAME = 'CoordinateToolkitBaiduCallback';

let pendingLoad: Promise<BaiduMapSdk> | null = null;
let pendingAk: string | null = null;

export function loadBaiduMapSdk(ak: string): Promise<BaiduMapSdk> {
  const normalizedAk = ak.trim();
  if (!normalizedAk) {
    return Promise.reject(new Error('百度地图 AK 不能为空。'));
  }

  if (window.BMap) {
    return Promise.resolve(window.BMap);
  }

  if (pendingLoad && pendingAk === normalizedAk) {
    return pendingLoad;
  }

  document.getElementById(SCRIPT_ID)?.remove();
  pendingAk = normalizedAk;
  pendingLoad = new Promise<BaiduMapSdk>((resolve, reject) => {
    const clearPending = () => {
      pendingLoad = null;
      pendingAk = null;
      delete window.CoordinateToolkitBaiduCallback;
    };
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src =
      `https://api.map.baidu.com/api?v=3.0&ak=${encodeURIComponent(normalizedAk)}` +
      `&callback=${CALLBACK_NAME}`;

    window.CoordinateToolkitBaiduCallback = () => {
      if (window.BMap) {
        const sdk = window.BMap;
        clearPending();
        resolve(sdk);
        return;
      }
      clearPending();
      reject(new Error('百度地图 SDK 已加载，但全局对象不可用。'));
    };
    script.addEventListener('error', () => {
      script.remove();
      clearPending();
      reject(new Error('百度地图 SDK 加载失败，请检查 AK、网络或Referer白名单。'));
    });

    document.head.append(script);
  });

  return pendingLoad;
}
