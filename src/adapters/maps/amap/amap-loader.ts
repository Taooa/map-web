export interface AMapInstance {
  add(overlays: readonly AMapMarkerInstance[]): void;
  remove(overlays: readonly AMapMarkerInstance[]): void;
  setFitView(overlays?: readonly AMapMarkerInstance[]): void;
  destroy(): void;
}

export interface AMapMarkerInstance {
  on(event: 'click', handler: () => void): void;
  off?(event: 'click', handler: () => void): void;
  getPosition(): unknown;
}

export interface AMapInfoWindowInstance {
  open(map: AMapInstance, position: unknown): void;
  close(): void;
}

export interface AMapSdk {
  readonly Map: new (
    container: HTMLElement,
    options: { zoom: number; center: readonly [number, number] },
  ) => AMapInstance;
  readonly Marker: new (options: {
    position: readonly [number, number];
    title: string;
  }) => AMapMarkerInstance;
  readonly InfoWindow: new (options: {
    content: HTMLElement;
    offset: readonly [number, number];
  }) => AMapInfoWindowInstance;
}

declare global {
  interface Window {
    AMap?: AMapSdk;
  }
}

const SCRIPT_ID = 'coordinate-toolkit-amap-sdk';

let pendingLoad: Promise<AMapSdk> | null = null;
let pendingKey: string | null = null;

export function loadAMapSdk(key: string): Promise<AMapSdk> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return Promise.reject(new Error('高德地图 Key 不能为空。'));
  }

  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }

  if (pendingLoad && pendingKey === normalizedKey) {
    return pendingLoad;
  }

  const existingScript = document.getElementById(SCRIPT_ID);
  existingScript?.remove();

  pendingKey = normalizedKey;
  pendingLoad = new Promise<AMapSdk>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(normalizedKey)}`;

    script.addEventListener('load', () => {
      if (window.AMap) {
        resolve(window.AMap);
        return;
      }

      pendingLoad = null;
      pendingKey = null;
      reject(new Error('高德地图 SDK 已加载，但全局对象不可用。'));
    });
    script.addEventListener('error', () => {
      script.remove();
      pendingLoad = null;
      pendingKey = null;
      reject(new Error('高德地图 SDK 加载失败，请检查 Key、网络或域名白名单。'));
    });

    document.head.append(script);
  });

  return pendingLoad;
}
