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
    const handlers: Array<() => void> = [];

    class FakeLngLat {
      constructor(
        readonly lng: number,
        readonly lat: number,
      ) {}
    }
    class FakePoint {}
    class FakeIcon {}
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
      enableScrollWheelZoom = vi.fn();
      enableDoubleClickZoom = vi.fn();
      addOverLay = addOverLay;
      removeOverLay = removeOverLay;
      openInfoWindow = openInfoWindow;
    }

    const sdk = {
      Map: FakeMap,
      LngLat: FakeLngLat,
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
});
