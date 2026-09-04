import { describe, expect, it } from 'vitest';
import type {
  AMapInfoWindowInstance,
  AMapInstance,
  AMapMarkerInstance,
  AMapSdk,
} from '@/adapters/maps/amap/amap-loader';
import { AMapMap, type AMapMarkerData } from '@/adapters/maps/amap/amap-map';
import { AMapAdapter } from '@/adapters/maps/amap/amap-adapter';
import type {
  BaiduInfoWindowInstance,
  BaiduMapInstance,
  BaiduMapSdk,
  BaiduMarkerInstance,
  BaiduPointInstance,
} from '@/adapters/maps/baidu/baidu-loader';
import { BaiduMap, type BaiduMarkerData } from '@/adapters/maps/baidu/baidu-map';
import { BaiduAdapter } from '@/adapters/maps/baidu/baidu-adapter';
import type {
  TiandituInfoWindowInstance,
  TiandituMapInstance,
  TiandituMapSdk,
  TiandituMarkerInstance,
} from '@/adapters/maps/tianditu/tianditu-loader';
import { TiandituMap, type TiandituMarkerData } from '@/adapters/maps/tianditu/tianditu-map';
import { TiandituAdapter } from '@/adapters/maps/tianditu/tianditu-adapter';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';

interface Counters {
  activeMaps: number;
  overlays: number;
  listeners: number;
}

function counters(): Counters {
  return { activeMaps: 0, overlays: 0, listeners: 0 };
}

function positions(size: number): readonly [number, number][] {
  return Array.from({ length: size }, (_, index) => [
    121.4 + (index % 100) * 0.0001,
    31.2 + Math.floor(index / 100) * 0.0001,
  ]);
}

function amapData(size: number): AMapMarkerData[] {
  return positions(size).map((position, index) => ({
    id: `amap-${index}`,
    name: `点位 ${index}`,
    position,
    originalCoordinate: `${position[0]}, ${position[1]}`,
    displaySystem: 'GCJ02',
  }));
}

function baiduData(size: number): BaiduMarkerData[] {
  return positions(size).map((position, index) => ({
    id: `baidu-${index}`,
    name: `点位 ${index}`,
    position,
    originalCoordinate: `${position[0]}, ${position[1]}`,
    displaySystem: 'BD09',
  }));
}

function tiandituData(size: number): TiandituMarkerData[] {
  return positions(size).map((position, index) => ({
    id: `tianditu-${index}`,
    name: `点位 ${index}`,
    position,
    originalCoordinate: `${position[0]}, ${position[1]}`,
    displaySystem: 'WGS84',
  }));
}

function createAMapSdk(state: Counters): AMapSdk {
  class MapInstance implements AMapInstance {
    readonly #root: HTMLElement;
    constructor(container: HTMLElement) {
      this.#root = document.createElement('div');
      this.#root.className = 'fake-amap-root';
      container.append(this.#root);
      state.activeMaps += 1;
    }
    add(overlays: readonly AMapMarkerInstance[]): void { state.overlays += overlays.length; }
    remove(overlays: readonly AMapMarkerInstance[]): void { state.overlays -= overlays.length; }
    setCenter(): void {}
    setFitView(): void {}
    destroy(): void {
      this.#root.remove();
      state.activeMaps -= 1;
    }
  }
  class Marker implements AMapMarkerInstance {
    readonly #position: unknown;
    constructor(options: { position: readonly [number, number] }) { this.#position = options.position; }
    on(): void { state.listeners += 1; }
    off(): void { state.listeners -= 1; }
    getPosition(): unknown { return this.#position; }
  }
  class InfoWindow implements AMapInfoWindowInstance {
    open(): void {}
    close(): void {}
  }
  return { Map: MapInstance, Marker, InfoWindow };
}

function createBaiduSdk(state: Counters): BaiduMapSdk {
  class Point {}
  class Size {}
  class Icon {}
  class Marker implements BaiduMarkerInstance {
    readonly #point: BaiduPointInstance;
    constructor(point: BaiduPointInstance) { this.#point = point; }
    setTitle(): void {}
    addEventListener(): void { state.listeners += 1; }
    removeEventListener(): void { state.listeners -= 1; }
    getPosition(): BaiduPointInstance { return this.#point; }
  }
  class InfoWindow implements BaiduInfoWindowInstance {}
  class MapInstance implements BaiduMapInstance {
    readonly #container: HTMLElement;
    constructor(container: HTMLElement) {
      this.#container = container;
      container.append(document.createElement('div'));
      state.activeMaps += 1;
    }
    centerAndZoom(): void {}
    panTo(): void {}
    enableScrollWheelZoom(): void {}
    addOverlay(): void { state.overlays += 1; }
    removeOverlay(): void { state.overlays -= 1; }
    openInfoWindow(): void {}
    closeInfoWindow(): void {}
    setViewport(): void {}
    getContainer(): HTMLElement { return this.#container; }
  }
  return { Map: MapInstance, Point, Size, Icon, Marker, InfoWindow };
}

function createTiandituSdk(state: Counters): TiandituMapSdk {
  class LngLat {}
  class LngLatBounds {
    extend(): void {}
  }
  class Point {}
  class Icon {}
  class Marker implements TiandituMarkerInstance {
    addEventListener(): void { state.listeners += 1; }
    removeEventListener(): void { state.listeners -= 1; }
  }
  class InfoWindow implements TiandituInfoWindowInstance {}
  class MapInstance implements TiandituMapInstance {
    constructor(container: HTMLElement) {
      container.append(document.createElement('div'));
      state.activeMaps += 1;
    }
    centerAndZoom(): void {}
    getZoom(): number { return 11; }
    getViewport(): object { return {}; }
    setViewport(): void {}
    enableScrollWheelZoom(): void {}
    enableDoubleClickZoom(): void {}
    addOverLay(): void { state.overlays += 1; }
    removeOverLay(): void { state.overlays -= 1; }
    openInfoWindow(): void {}
    closeInfoWindow(): void {}
  }
  return { Map: MapInstance, LngLat, LngLatBounds, Point, Icon, Marker, InfoWindow };
}

describe.each([100, 1000, 5000])('地图覆盖物生命周期：%i 个点', (size) => {
  it('高德重复 setPoints 和 clear 不残留覆盖物或监听', () => {
    const state = counters();
    const container = document.createElement('div');
    const map = new AMapMap(container, createAMapSdk(state));
    map.setMarkers(groupMapRenderPoints(amapData(size), null));
    map.setMarkers(groupMapRenderPoints(amapData(size), null));
    expect(state).toMatchObject({ activeMaps: 1, overlays: size, listeners: size * 3 });
    map.clear();
    expect(state).toMatchObject({ overlays: 0, listeners: 0 });
    expect(() => map.fitView()).not.toThrow();
    map.setMarkers(groupMapRenderPoints(amapData(1), null));
    expect(() => map.fitView()).not.toThrow();
    map.destroy();
    expect(state).toEqual({ activeMaps: 0, overlays: 0, listeners: 0 });
    expect(container.childElementCount).toBe(0);
  });

  it('百度重复 setPoints 和 clear 不残留覆盖物或监听', () => {
    const state = counters();
    const container = document.createElement('div');
    const map = new BaiduMap(container, createBaiduSdk(state));
    map.setMarkers(groupMapRenderPoints(baiduData(size), null));
    map.setMarkers(groupMapRenderPoints(baiduData(size), null));
    expect(state).toMatchObject({ activeMaps: 1, overlays: size, listeners: size * 3 });
    map.clear();
    expect(state).toMatchObject({ overlays: 0, listeners: 0 });
    expect(() => map.fitView()).not.toThrow();
    map.setMarkers(groupMapRenderPoints(baiduData(1), null));
    expect(() => map.fitView()).not.toThrow();
    map.destroy();
    expect(state.overlays).toBe(0);
    expect(state.listeners).toBe(0);
    expect(container.childElementCount).toBe(0);
  });

  it('天地图重复 setPoints 和 clear 不残留覆盖物或监听', () => {
    const state = counters();
    const container = document.createElement('div');
    const map = new TiandituMap(container, createTiandituSdk(state));
    map.setMarkers(groupMapRenderPoints(tiandituData(size), null));
    map.setMarkers(groupMapRenderPoints(tiandituData(size), null));
    expect(state).toMatchObject({ activeMaps: 1, overlays: size, listeners: size * 3 });
    map.clear();
    expect(state).toMatchObject({ overlays: 0, listeners: 0 });
    expect(() => map.fitView()).not.toThrow();
    map.setMarkers(groupMapRenderPoints(tiandituData(1), null));
    expect(() => map.fitView()).not.toThrow();
    map.destroy();
    expect(state.overlays).toBe(0);
    expect(state.listeners).toBe(0);
    expect(container.childElementCount).toBe(0);
  });
});

describe('连续创建和销毁地图实例', () => {
  it('30 次循环后没有高德实例或 DOM 残留', () => {
    const state = counters();
    const container = document.createElement('div');
    const sdk = createAMapSdk(state);
    for (let index = 0; index < 30; index += 1) {
      const map = new AMapMap(container, sdk);
      map.setMarkers(groupMapRenderPoints(amapData(100), null));
      map.destroy();
    }
    expect(state).toEqual({ activeMaps: 0, overlays: 0, listeners: 0 });
    expect(container.childElementCount).toBe(0);
  });

  it('异步加载失效后三个 Adapter 都不会创建幽灵实例', async () => {
    const container = document.createElement('div');
    const amapState = counters();
    const baiduState = counters();
    const tiandituState = counters();
    let resolveAMap!: (sdk: AMapSdk) => void;
    let resolveBaidu!: (sdk: BaiduMapSdk) => void;
    let resolveTianditu!: (sdk: TiandituMapSdk) => void;
    const amapLoad = new Promise<AMapSdk>((resolve) => { resolveAMap = resolve; });
    const baiduLoad = new Promise<BaiduMapSdk>((resolve) => { resolveBaidu = resolve; });
    const tiandituLoad = new Promise<TiandituMapSdk>((resolve) => { resolveTianditu = resolve; });
    const adapters = [
      {
        adapter: new AMapAdapter({}, () => amapLoad),
        resolve: () => resolveAMap(createAMapSdk(amapState)),
      },
      {
        adapter: new BaiduAdapter({}, () => baiduLoad),
        resolve: () => resolveBaidu(createBaiduSdk(baiduState)),
      },
      {
        adapter: new TiandituAdapter({}, () => tiandituLoad),
        resolve: () => resolveTianditu(createTiandituSdk(tiandituState)),
      },
    ];

    for (const item of adapters) {
      const mounting = item.adapter.mount(container, 'credential');
      item.adapter.destroy();
      item.resolve();
      await mounting;
      expect(container.childElementCount).toBe(0);
    }
    expect(amapState.activeMaps + baiduState.activeMaps + tiandituState.activeMaps).toBe(0);
  });
});
