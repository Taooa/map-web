import { TiandituMap } from '@/adapters/maps/tianditu/tianditu-map';
import type {
  TiandituInfoWindowInstance,
  TiandituLngLatInstance,
  TiandituMapInstance,
  TiandituMapSdk,
  TiandituMarkerInstance,
} from '@/adapters/maps/tianditu/tianditu-loader';

describe('TiandituMap', () => {
  it('creates markers, opens an InfoWindow, replaces markers and cleans up', () => {
    const addOverLay = vi.fn();
    const removeOverLay = vi.fn();
    const openInfoWindow = vi.fn();
    const centerAndZoom = vi.fn();
    const handlers: Array<() => void> = [];

    class FakeLngLat {
      constructor(
        readonly lng: number,
        readonly lat: number,
      ) {}
    }
    class FakeMarker {
      constructor(readonly position: TiandituLngLatInstance) {}
      addEventListener(_event: 'click', handler: () => void) {
        handlers.push(handler);
      }
    }
    class FakeInfoWindow {
      constructor(readonly options: { readonly content: string }) {}
    }
    class FakeMap {
      centerAndZoom = centerAndZoom;
      enableScrollWheelZoom = vi.fn();
      enableDoubleClickZoom = vi.fn();
      addOverLay = addOverLay;
      removeOverLay = removeOverLay;
      openInfoWindow = openInfoWindow;
    }

    const sdk = {
      Map: FakeMap,
      LngLat: FakeLngLat,
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

    map.setMarkers([markerData]);
    expect(addOverLay).toHaveBeenCalledTimes(1);
    expect(centerAndZoom).toHaveBeenLastCalledWith(
      expect.objectContaining({ lng: 121.4737, lat: 31.2304 }),
      15,
    );

    handlers[0]!();
    expect(openInfoWindow).toHaveBeenCalledTimes(1);
    const infoWindow = openInfoWindow.mock.calls[0]![0] as FakeInfoWindow;
    expect(infoWindow.options.content).toContain('&lt;设备 A&gt;');
    expect(infoWindow.options.content).toContain('展示坐标系：WGS84');

    map.setMarkers([]);
    expect(removeOverLay).toHaveBeenCalledTimes(1);

    map.setMarkers([markerData]);
    map.destroy();
    expect(removeOverLay).toHaveBeenCalledTimes(2);
    expect(container).toBeEmptyDOMElement();

    void ({} as TiandituMapInstance);
    void ({} as TiandituMarkerInstance);
    void ({} as TiandituInfoWindowInstance);
  });
});
