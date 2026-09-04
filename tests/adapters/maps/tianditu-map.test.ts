import { TiandituMap } from '@/adapters/maps/tianditu/tianditu-map';
import type {
  TiandituInfoWindowInstance,
  TiandituLngLatInstance,
  TiandituMapInstance,
  TiandituMapSdk,
  TiandituMarkerInstance,
} from '@/adapters/maps/tianditu/tianditu-loader';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';

describe('TiandituMap', () => {
  it('creates markers, opens an InfoWindow, replaces markers and cleans up', () => {
    const addOverLay = vi.fn();
    const removeOverLay = vi.fn();
    const openInfoWindow = vi.fn();
    const centerAndZoom = vi.fn();
    const getViewport = vi.fn();
    const setViewport = vi.fn();
    const handlers: Array<() => void> = [];

    class FakeLngLat {
      constructor(
        readonly lng: number,
        readonly lat: number,
      ) {}
    }
    class FakePoint {}
    class FakeIcon {}
    class FakeLngLatBounds {
      readonly positions: TiandituLngLatInstance[];
      constructor(southwest: TiandituLngLatInstance, northeast: TiandituLngLatInstance) {
        this.positions = [southwest, northeast];
      }
      extend(position: TiandituLngLatInstance) {
        this.positions.push(position);
      }
    }
    class FakeMarker {
      constructor(readonly position: TiandituLngLatInstance) {}
      addEventListener(_event: 'click', handler: () => void) {
        handlers.push(handler);
      }
    }
    class FakeInfoWindow {
      constructor(readonly options: { readonly content: string | HTMLElement }) {}
    }
    class FakeMap {
      centerAndZoom = centerAndZoom;
      getZoom = vi.fn(() => 11);
      getViewport = getViewport;
      setViewport = setViewport;
      enableScrollWheelZoom = vi.fn();
      enableDoubleClickZoom = vi.fn();
      addOverLay = addOverLay;
      removeOverLay = removeOverLay;
      openInfoWindow = openInfoWindow;
    }

    const sdk = {
      Map: FakeMap,
      LngLat: FakeLngLat,
      LngLatBounds: FakeLngLatBounds,
      Point: FakePoint,
      Icon: FakeIcon,
      Marker: FakeMarker,
      InfoWindow: FakeInfoWindow,
    } as unknown as TiandituMapSdk;
    const container = document.createElement('div');
    container.append(document.createElement('span'));
    const map = new TiandituMap(container, sdk);
    const markerData = {
      id: 'point-1',
      name: '<设备 A>',
      position: [121.4737, 31.2304] as const,
      originalCoordinate: 'WGS84 121.4737, 31.2304',
      displaySystem: 'WGS84' as const,
    };

    map.setMarkers(groupMapRenderPoints([markerData], null));
    expect(addOverLay).toHaveBeenCalledTimes(1);
    map.fitView();
    expect(centerAndZoom).toHaveBeenLastCalledWith(
      expect.objectContaining({ lng: 121.4737, lat: 31.2304 }),
      15,
    );
    expect(setViewport).not.toHaveBeenCalled();

    handlers[0]!();
    expect(openInfoWindow).toHaveBeenCalledTimes(1);
    const infoWindow = openInfoWindow.mock.calls[0]![0] as FakeInfoWindow;
    expect((infoWindow.options.content as HTMLElement).textContent).toContain('<设备 A>');
    expect((infoWindow.options.content as HTMLElement).textContent).toContain('展示坐标系：WGS84');

    map.setMarkers([]);
    expect(removeOverLay).toHaveBeenCalledTimes(1);

    map.setMarkers(groupMapRenderPoints([markerData], null));
    map.destroy();
    expect(removeOverLay).toHaveBeenCalledTimes(2);
    expect(container).toBeEmptyDOMElement();

    void ({} as TiandituMapInstance);
    void ({} as TiandituMarkerInstance);
    void ({} as TiandituInfoWindowInstance);
  });

  it('fits multiple marker positions into one viewport', () => {
    const viewport = { center: { lng: 121, lat: 31 }, zoom: 9 };
    const getViewport = vi.fn<(bounds: unknown) => typeof viewport>(() => viewport);
    const setViewport = vi.fn();

    class FakeLngLat {
      constructor(
        readonly lng: number,
        readonly lat: number,
      ) {}
    }
    class FakeLngLatBounds {
      readonly positions: FakeLngLat[];
      constructor(southwest: FakeLngLat, northeast: FakeLngLat) {
        this.positions = [southwest, northeast];
      }
      extend(position: FakeLngLat) {
        this.positions.push(position);
      }
    }
    class FakeMarker {
      addEventListener() {}
    }
    class FakeMap {
      centerAndZoom = vi.fn();
      getZoom = vi.fn(() => 11);
      getViewport = getViewport;
      setViewport = setViewport;
      enableScrollWheelZoom = vi.fn();
      enableDoubleClickZoom = vi.fn();
      addOverLay = vi.fn();
      removeOverLay = vi.fn();
      openInfoWindow = vi.fn();
    }

    const map = new TiandituMap(document.createElement('div'), {
      Map: FakeMap,
      LngLat: FakeLngLat,
      LngLatBounds: FakeLngLatBounds,
      Point: class {},
      Icon: class {},
      Marker: FakeMarker,
      InfoWindow: class {},
    } as unknown as TiandituMapSdk);
    const points = [
      {
        id: 'point-1',
        name: '上海',
        position: [121.4737, 31.2304] as const,
        originalCoordinate: 'WGS84 121.4737, 31.2304',
        displaySystem: 'WGS84',
      },
      {
        id: 'point-2',
        name: '北京',
        position: [116.4074, 39.9042] as const,
        originalCoordinate: 'WGS84 116.4074, 39.9042',
        displaySystem: 'WGS84',
      },
    ];

    map.setMarkers(groupMapRenderPoints(points, null));
    map.fitView();

    const bounds = getViewport.mock.calls[0]![0] as FakeLngLatBounds;
    expect(bounds.positions).toEqual([
      expect.objectContaining({ lng: 121.4737, lat: 31.2304 }),
      expect.objectContaining({ lng: 121.4737, lat: 31.2304 }),
      expect.objectContaining({ lng: 116.4074, lat: 39.9042 }),
    ]);
    expect(setViewport).toHaveBeenCalledWith(viewport);
  });
});
