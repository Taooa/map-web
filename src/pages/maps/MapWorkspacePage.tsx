import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AMapAdapter } from '@/adapters/maps/amap/amap-adapter';
import { AMapToolbar } from '@/adapters/maps/amap/AMapToolbar';
import { BaiduAdapter } from '@/adapters/maps/baidu/baidu-adapter';
import { BaiduToolbar } from '@/adapters/maps/baidu/BaiduToolbar';
import type { MapAdapter, MapRenderPoint } from '@/adapters/maps/map-adapter';
import { TiandituAdapter } from '@/adapters/maps/tianditu/tianditu-adapter';
import { TiandituToolbar } from '@/adapters/maps/tianditu/TiandituToolbar';
import type { Point, PointId } from '@/domain';
import { createAMapMarkerData } from '@/features/map-validation/amap-map-service';
import { createBaiduMarkerData } from '@/features/map-validation/baidu-map-service';
import { createTiandituMarkerData } from '@/features/map-validation/tianditu-map-service';
import { pointService } from '@/features/points';

type Platform = 'amap' | 'baidu' | 'tianditu';
type Status = 'missing-credential' | 'loading' | 'ready' | 'error';

const platforms = {
  amap: {
    name: '高德地图',
    coordinate: 'GCJ02',
    credential: '密钥',
    storage: 'coordinate-toolkit.amap-key',
  },
  baidu: {
    name: '百度地图',
    coordinate: 'BD09',
    credential: '访问密钥',
    storage: 'coordinate-toolkit.baidu-ak',
  },
  tianditu: {
    name: '天地图',
    coordinate: 'WGS84',
    credential: '访问令牌',
    storage: 'coordinate-toolkit.tianditu-token',
  },
} as const;

function isPlatform(value: string | null): value is Platform {
  return value === 'amap' || value === 'baidu' || value === 'tianditu';
}

function createAdapter(platform: Platform): MapAdapter {
  if (platform === 'amap') return new AMapAdapter();
  if (platform === 'baidu') return new BaiduAdapter();
  return new TiandituAdapter();
}

function toRenderPoint(platform: Platform, point: Point): MapRenderPoint | null {
  if (platform === 'amap') return createAMapMarkerData(point);
  if (platform === 'baidu') return createBaiduMarkerData(point);
  return createTiandituMarkerData(point);
}

export function MapWorkspacePage() {
  const [params, setParams] = useSearchParams();
  const requestedPlatform = params.get('platform');
  const platform: Platform = isPlatform(requestedPlatform) ? requestedPlatform : 'amap';
  const config = platforms[platform];
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly PointId[]>([]);
  const [query, setQuery] = useState('');
  const [credentials, setCredentials] = useState<Record<Platform, string>>(() => ({
    amap: localStorage.getItem(platforms.amap.storage) ?? '',
    baidu: localStorage.getItem(platforms.baidu.storage) ?? '',
    tianditu: localStorage.getItem(platforms.tianditu.storage) ?? '',
  }));
  const credential = credentials[platform];
  const [status, setStatus] = useState<Status>(credential ? 'loading' : 'missing-credential');
  const [message, setMessage] = useState<string | null>(null);
  const [credentialDialog, setCredentialDialog] = useState(false);
  const displayedStatus: Status = credential ? status : 'missing-credential';

  useEffect(() => {
    void pointService.listPoints().then((result) => {
      if (result.status === 'success') setPoints(result.value);
      else setMessage(result.error.message);
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !credential) return;
    const adapter = createAdapter(platform);
    adapterRef.current?.destroy();
    adapterRef.current = adapter;
    let active = true;
    setStatus('loading');
    void adapter.mount(container, credential).then(
      () => {
        if (!active) {
          adapter.destroy();
          return;
        }
        setStatus('ready');
      },
      (error: unknown) => {
        if (!active) return;
        adapter.destroy();
        setStatus('error');
        setMessage(error instanceof Error ? error.message : '地图加载失败。');
      },
    );
    return () => {
      active = false;
      if (adapterRef.current === adapter) adapterRef.current = null;
      adapter.destroy();
    };
  }, [credential, platform]);

  const filteredPoints = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? points.filter((point) => point.name.toLowerCase().includes(normalized))
      : points;
  }, [points, query]);

  const display = useMemo(() => {
    const selected = new Set(selectedIds);
    const markers: MapRenderPoint[] = [];
    const missing: Point[] = [];
    points
      .filter((point) => selected.has(point.id))
      .forEach((point) => {
        const marker = toRenderPoint(platform, point);
        if (marker) markers.push(marker);
        else missing.push(point);
      });
    return { markers, missing };
  }, [platform, points, selectedIds]);

  const missingCoordinateMessage = display.missing.length
    ? `${display.missing.map((point) => point.name).join('、')} 需要先转换为 ${config.coordinate}。`
    : null;

  useEffect(() => {
    if (status !== 'ready') return;
    adapterRef.current?.setPoints(display.markers);
  }, [display.markers, status]);

  function switchPlatform(next: Platform) {
    if (next !== platform) {
      setStatus(credentials[next] ? 'loading' : 'missing-credential');
      setMessage(null);
      setParams({ platform: next });
    }
  }

  function clearMap() {
    adapterRef.current?.clear();
    setSelectedIds([]);
    setMessage(null);
  }

  return (
    <div className={`unified-map-workspace unified-map-workspace--${platform}`}>
      <aside className="unified-map-panel">
        <header>
          <div className="unified-platform-switch" role="tablist" aria-label="地图平台切换">
            {(Object.keys(platforms) as Platform[]).map((item) => (
              <button
                aria-selected={item === platform}
                className={item === platform ? 'is-active' : ''}
                key={item}
                onClick={() => switchPlatform(item)}
                role="tab"
                type="button"
              >
                {platforms[item].name}
              </button>
            ))}
          </div>
        </header>

        <section className="unified-point-tools">
          <div className="map-control-section__title">
            <span>点位选择</span>
            <small>
              {selectedIds.length} / {points.length}
            </small>
          </div>
          <input
            aria-label="搜索点位"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索点位名称"
            type="search"
            value={query}
          />
          <div className="unified-point-actions">
            <button onClick={() => setSelectedIds(points.map((point) => point.id))} type="button">
              显示全部点位
            </button>
            <button onClick={clearMap} type="button">
              清空地图
            </button>
            <button onClick={() => adapterRef.current?.fitView()} type="button">
              查看全部标记
            </button>
          </div>
          <div className="unified-point-list">
            {filteredPoints.map((point) => (
              <label key={point.id}>
                <input
                  checked={selectedIds.includes(point.id)}
                  onChange={() =>
                    setSelectedIds((current) =>
                      current.includes(point.id)
                        ? current.filter((id) => id !== point.id)
                        : [...current, point.id],
                    )
                  }
                  type="checkbox"
                />
                <span>{point.name}</span>
              </label>
            ))}
            {filteredPoints.length === 0 && <span className="empty-value">没有匹配的点位</span>}
          </div>
        </section>

        <section className="unified-credential">
          <span>{credential ? `${config.credential}已配置` : `${config.credential}未配置`}</span>
          <button onClick={() => setCredentialDialog(true)} type="button">
            配置{config.credential}
          </button>
        </section>

        {platform === 'amap' && <AMapToolbar />}
        {platform === 'baidu' && <BaiduToolbar />}
        {platform === 'tianditu' && <TiandituToolbar />}
        {(message ?? missingCoordinateMessage) && (
          <div className="map-inline-warning" role="alert">
            {message ?? missingCoordinateMessage}
          </div>
        )}
      </aside>

      <section className="unified-map-canvas" aria-label={`${config.name}区域`}>
        <div className="unified-map-container" ref={containerRef} />
        {displayedStatus !== 'ready' && (
          <div className="map-missing-card">
            <div>
              <span className="status-label">
                {displayedStatus === 'loading'
                  ? '正在加载地图'
                  : displayedStatus === 'error'
                    ? '地图加载失败'
                    : '尚未加载地图'}
              </span>
              <h2>{credential ? `${config.name}暂不可用` : `请先配置${config.credential}`}</h2>
              <p>{message ?? `配置${config.credential}后只加载当前地图平台。`}</p>
            </div>
          </div>
        )}
      </section>

      {credentialDialog && (
        <CredentialDialog
          label={config.credential}
          initialValue={credential}
          onCancel={() => setCredentialDialog(false)}
          onSave={(value) => {
            localStorage.setItem(config.storage, value);
            setCredentials((current) => ({ ...current, [platform]: value }));
            setCredentialDialog(false);
          }}
        />
      )}
    </div>
  );
}

function CredentialDialog({
  label,
  initialValue,
  onCancel,
  onSave,
}: {
  label: string;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) onSave(value.trim());
  }
  return (
    <div className="overlay overlay--center" onMouseDown={onCancel}>
      <section
        aria-label={`配置${label}`}
        aria-modal="true"
        className="prototype-dialog map-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2>配置{label}</h2>
        <form onSubmit={submit}>
          <label className="form-field">
            <span>{label}</span>
            <input
              autoFocus
              onChange={(event) => setValue(event.target.value)}
              required
              type="password"
              value={value}
            />
          </label>
          <div className="prototype-dialog__actions">
            <button onClick={onCancel} type="button">
              取消
            </button>
            <button disabled={!value.trim()} type="submit">
              保存并加载
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
