import {
  loadTiandituSdk,
  TIANDITU_SCRIPT_ID,
  type TiandituMapSdk,
} from '@/adapters/maps/tianditu/tianditu-loader';

function createSdk(): TiandituMapSdk {
  return {
    Map: class {},
    LngLat: class {},
    Marker: class {},
    InfoWindow: class {},
  } as unknown as TiandituMapSdk;
}

describe('loadTiandituSdk', () => {
  it('rejects an empty Token without creating a script', async () => {
    await expect(loadTiandituSdk('   ')).rejects.toThrow('天地图 Token 不能为空');
    expect(document.getElementById(TIANDITU_SCRIPT_ID)).toBeNull();
  });

  it('resolves after the API 4.0 script exposes a ready SDK', async () => {
    const sdk = createSdk();
    const load = loadTiandituSdk('test token');
    const script = document.getElementById(TIANDITU_SCRIPT_ID) as HTMLScriptElement;

    expect(script.src).toContain('api.tianditu.gov.cn/api?v=4.0');
    expect(script.src).toContain('tk=test%20token');
    window.T = sdk;
    script.dispatchEvent(new Event('load'));

    await expect(load).resolves.toBe(sdk);
  });

  it('rejects when the script loads but window.T never becomes ready', async () => {
    vi.useFakeTimers();
    const load = loadTiandituSdk('missing-sdk-token');
    const script = document.getElementById(TIANDITU_SCRIPT_ID) as HTMLScriptElement;
    script.dispatchEvent(new Event('load'));

    const assertion = expect(load).rejects.toThrow('window.T 未在限定时间内就绪');
    await vi.advanceTimersByTimeAsync(1_600);
    await assertion;
    vi.useRealTimers();
  });

  it('reuses the pending load for the same Token', () => {
    const first = loadTiandituSdk('same-token');
    const second = loadTiandituSdk('same-token');

    expect(second).toBe(first);
    document.getElementById(TIANDITU_SCRIPT_ID)?.dispatchEvent(new Event('error'));
    return expect(first).rejects.toThrow('天地图 SDK 加载失败');
  });
});
