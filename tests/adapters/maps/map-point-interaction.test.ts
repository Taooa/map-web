import { describe, expect, it, vi } from 'vitest';
import { AMapMap } from '@/adapters/maps/amap/amap-map';
import type { BaiduMapSdk } from '@/adapters/maps/baidu/baidu-loader';
import { BaiduMap } from '@/adapters/maps/baidu/baidu-map';
import type { MapRenderGroup, MapRenderPoint } from '@/adapters/maps/map-adapter';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';
import type { TiandituMapSdk } from '@/adapters/maps/tianditu/tianditu-loader';
import { TiandituMap } from '@/adapters/maps/tianditu/tianditu-map';

function overlapGroup(displaySystem: string): MapRenderGroup {
  const points: MapRenderPoint[] = ['a', 'b', 'c'].map((id) => ({
    id,
    name: `点位 ${id.toUpperCase()}`,
    position: [121.473701, 31.230416],
    originalCoordinate: `WGS84 ${id}`,
    displaySystem,
  }));
  return groupMapRenderPoints(points, 'b')[0]!;
}

describe('three map marker interactions', () => {
  it('AMap centers without fitting, highlights an overlap group, and keeps hover separate from detail', () => {
    vi.useFakeTimers();
    try {
      const setCenter = vi.fn();
      const setFitView = vi.fn();
      const markers: FakeAMapMarker[] = [];
      const windows: FakeAMapInfoWindow[] = [];

      class FakeAMap {
        add = vi.fn();
        remove = vi.fn();
        setCenter = setCenter;
        setFitView = setFitView;
        destroy = vi.fn();
      }
      class FakeAMapMarker {
        readonly handlers = new Map<string, () => void>();
        constructor(readonly options: { icon: string; position: readonly [number, number] }) {
          markers.push(this);
        }
        on(event: string, handler: () => void) { this.handlers.set(event, handler); }
        off(event: string) { this.handlers.delete(event); }
        getPosition() { return this.options.position; }
        trigger(event: string) { this.handlers.get(event)?.(); }
      }
      class FakeAMapInfoWindow {
        closed = false;
        constructor(readonly options: { content: HTMLElement }) { windows.push(this); }
        open = vi.fn();
        close = vi.fn(() => { this.closed = true; });
      }

      const activate = vi.fn();
      const map = new AMapMap(
        document.createElement('div'),
        { Map: FakeAMap, Marker: FakeAMapMarker, InfoWindow: FakeAMapInfoWindow },
        activate,
      );
      map.setMarkers([overlapGroup('GCJ02')]);

      expect(markers).toHaveLength(1);
      expect(markers[0]!.options.icon).toContain('%23fa8c16');
      map.focusPoint([120, 30]);
      expect(setCenter).toHaveBeenCalledWith([120, 30]);
      expect(setFitView).not.toHaveBeenCalled();

      markers[0]!.trigger('mouseover');
      expect(activate).not.toHaveBeenCalled();
      expect(windows[0]!.options.content.textContent).toContain('该位置共 3 个点位');
      expect(windows[0]!.options.content.querySelector('[aria-current="true"]')).toHaveTextContent(
        '点位 B',
      );
      (windows[0]!.options.content.querySelectorAll('button')[2] as HTMLButtonElement).click();
      expect(activate).toHaveBeenCalledWith('c');

      markers[0]!.trigger('mouseout');
      vi.advanceTimersByTime(149);
      expect(windows[0]!.closed).toBe(false);
      vi.advanceTimersByTime(1);
      expect(windows[0]!.closed).toBe(true);

      markers[0]!.trigger('mouseover');
      markers[0]!.trigger('click');
      expect(windows.at(-1)!.options.content).toHaveClass('amap-info-window');
      expect(windows.at(-1)!.options.content.textContent).toContain('展示坐标系：GCJ02');
    } finally {
      vi.useRealTimers();
    }
  });

  it('Baidu pans without changing zoom and supports the same overlap hover/detail behavior', () => {
    const centerAndZoom = vi.fn();
    const panTo = vi.fn();
    const markers: FakeBaiduMarker[] = [];
    const opened: FakeBaiduInfoWindow[] = [];

    class FakePoint {
      constructor(readonly lng: number, readonly lat: number) {}
    }
    class FakeSize {
      constructor(readonly width: number, readonly height: number) {}
    }
    class FakeIcon {
      constructor(readonly url: string) {}
    }
    class FakeBaiduMarker {
      readonly handlers = new Map<string, () => void>();
      constructor(readonly point: FakePoint, readonly options: { icon: FakeIcon }) {
        markers.push(this);
      }
      setTitle = vi.fn();
      addEventListener(event: string, handler: () => void) { this.handlers.set(event, handler); }
      removeEventListener(event: string) { this.handlers.delete(event); }
      getPosition() { return this.point; }
      trigger(event: string) { this.handlers.get(event)?.(); }
    }
    class FakeBaiduInfoWindow {
      constructor(readonly content: string | HTMLElement) {}
    }
    class FakeBaiduMap {
      centerAndZoom = centerAndZoom;
      panTo = panTo;
      enableScrollWheelZoom = vi.fn();
      addOverlay = vi.fn();
      removeOverlay = vi.fn();
      openInfoWindow = vi.fn((info: FakeBaiduInfoWindow) => opened.push(info));
      closeInfoWindow = vi.fn();
      setViewport = vi.fn();
      getContainer = vi.fn(() => document.createElement('div'));
    }

    const activate = vi.fn();
    const map = new BaiduMap(
      document.createElement('div'),
      {
        Map: FakeBaiduMap,
        Point: FakePoint,
        Size: FakeSize,
        Icon: FakeIcon,
        Marker: FakeBaiduMarker,
        InfoWindow: FakeBaiduInfoWindow,
      } as unknown as BaiduMapSdk,
      activate,
    );
    map.setMarkers([overlapGroup('BD09')]);

    expect(markers).toHaveLength(1);
    expect(markers[0]!.options.icon.url).toContain('%23fa8c16');
    map.focusPoint([120, 30]);
    expect(panTo).toHaveBeenCalledWith(expect.objectContaining({ lng: 120, lat: 30 }));
    expect(centerAndZoom).toHaveBeenCalledTimes(1);

    markers[0]!.trigger('mouseover');
    const hover = opened[0]!.content as HTMLElement;
    expect(hover.textContent).toContain('点位 A');
    (hover.querySelectorAll('button')[1] as HTMLButtonElement).click();
    expect(activate).toHaveBeenCalledWith('b');
    markers[0]!.trigger('click');
    const detail = opened.at(-1)!.content as HTMLElement;
    expect(detail).toHaveClass('baidu-info-window');
    expect(detail.textContent).toContain('展示坐标系：BD09');
  });

  it('Tianditu pans without changing zoom and supports the same overlap hover/detail behavior', () => {
    const centerAndZoom = vi.fn();
    const panTo = vi.fn();
    const markers: FakeTiandituMarker[] = [];
    const opened: FakeTiandituInfoWindow[] = [];

    class FakeLngLat {
      constructor(readonly lng: number, readonly lat: number) {}
    }
    class FakePoint {
      constructor(readonly x: number, readonly y: number) {}
    }
    class FakeIcon {
      constructor(readonly options: { iconUrl: string }) {}
    }
    class FakeTiandituMarker {
      readonly handlers = new Map<string, () => void>();
      constructor(readonly position: FakeLngLat, readonly options: { icon: FakeIcon }) {
        markers.push(this);
      }
      addEventListener(event: string, handler: () => void) { this.handlers.set(event, handler); }
      removeEventListener(event: string) { this.handlers.delete(event); }
      trigger(event: string) { this.handlers.get(event)?.(); }
    }
    class FakeTiandituInfoWindow {
      constructor(readonly options: { content: string | HTMLElement }) {}
    }
    class FakeTiandituMap {
      centerAndZoom = centerAndZoom;
      panTo = panTo;
      getZoom = vi.fn(() => 18);
      enableScrollWheelZoom = vi.fn();
      enableDoubleClickZoom = vi.fn();
      addOverLay = vi.fn();
      removeOverLay = vi.fn();
      openInfoWindow = vi.fn((info: FakeTiandituInfoWindow) => opened.push(info));
      closeInfoWindow = vi.fn();
    }

    const activate = vi.fn();
    const map = new TiandituMap(
      document.createElement('div'),
      {
        Map: FakeTiandituMap,
        LngLat: FakeLngLat,
        Point: FakePoint,
        Icon: FakeIcon,
        Marker: FakeTiandituMarker,
        InfoWindow: FakeTiandituInfoWindow,
      } as unknown as TiandituMapSdk,
      activate,
    );
    map.setMarkers([overlapGroup('WGS84')]);

    expect(markers).toHaveLength(1);
    expect(markers[0]!.options.icon.options.iconUrl).toContain('%23fa8c16');
    map.focusPoint([120, 30]);
    expect(panTo).toHaveBeenCalledWith(expect.objectContaining({ lng: 120, lat: 30 }));
    expect(centerAndZoom).toHaveBeenCalledTimes(1);

    markers[0]!.trigger('mouseover');
    const hover = opened[0]!.options.content as HTMLElement;
    expect(hover.textContent).toContain('点位 C');
    (hover.querySelectorAll('button')[0] as HTMLButtonElement).click();
    expect(activate).toHaveBeenCalledWith('a');
    markers[0]!.trigger('click');
    const detail = opened.at(-1)!.options.content as HTMLElement;
    expect(detail).toHaveClass('tianditu-info-window');
    expect(detail.textContent).toContain('展示坐标系：WGS84');
  });
});
