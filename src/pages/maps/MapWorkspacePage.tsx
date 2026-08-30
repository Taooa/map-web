import { useEffect, useMemo, useRef, useState, type FormEvent, type UIEvent } from 'react';
import {
  AimOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Popover, Select, Tooltip } from 'antd';
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
const MAP_POINT_PAGE_SIZE = 50;

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
  const pointListRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const pointRequestIdRef = useRef(0);
  const pointLoadingRef = useRef(true);
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<ReadonlyMap<PointId, Point>>(new Map());
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pointTotal, setPointTotal] = useState(0);
  const [pointLoading, setPointLoading] = useState(true);
  const [credentials, setCredentials] = useState<Record<Platform, string>>(() => ({
    amap: localStorage.getItem(platforms.amap.storage) ?? '',
    baidu: localStorage.getItem(platforms.baidu.storage) ?? '',
    tianditu: localStorage.getItem(platforms.tianditu.storage) ?? '',
  }));
  const credential = credentials[platform];
  const [status, setStatus] = useState<Status>(credential ? 'loading' : 'missing-credential');
  const [message, setMessage] = useState<string | null>(null);
  const [credentialDialog, setCredentialDialog] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const displayedStatus: Status = credential ? status : 'missing-credential';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim();
      if (nextQuery === debouncedQuery) return;
      pointRequestIdRef.current += 1;
      pointLoadingRef.current = true;
      setPoints([]);
      setPointTotal(0);
      setPointLoading(true);
      if (pointListRef.current) pointListRef.current.scrollTop = 0;
      setDebouncedQuery(nextQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debouncedQuery, query]);

  useEffect(() => {
    const requestId = ++pointRequestIdRef.current;
    let active = true;
    void pointService.listPointPage({
      ...(debouncedQuery ? { search: debouncedQuery } : {}),
      offset: 0,
      limit: MAP_POINT_PAGE_SIZE,
      sortField: 'updatedAt',
      sortDirection: 'desc',
      includePointIds: false,
    }).then((result) => {
      if (!active || requestId !== pointRequestIdRef.current) return;
      pointLoadingRef.current = false;
      setPointLoading(false);
      if (result.status === 'success') {
        setPoints(result.value.points);
        setPointTotal(result.value.total);
      } else {
        setMessage(result.error.message);
      }
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

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

  const selectedIds = useMemo(() => [...selectedPoints.keys()], [selectedPoints]);
  const hasMorePoints = points.length < pointTotal;

  const display = useMemo(() => {
    const markers: MapRenderPoint[] = [];
    const missing: Point[] = [];
    selectedPoints.forEach((point) => {
      const marker = toRenderPoint(platform, point);
      if (marker) markers.push(marker);
      else missing.push(point);
    });
    return { markers, missing };
  }, [platform, selectedPoints]);

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
    setSelectedPoints(new Map());
    setMessage(null);
  }

  function selectLoadedPoints() {
    setSelectedPoints((current) => {
      const next = new Map(current);
      points.forEach((point) => next.set(point.id, point));
      return next;
    });
  }

  function loadMorePoints() {
    if (pointLoadingRef.current || !hasMorePoints) return;
    const requestId = pointRequestIdRef.current;
    const offset = points.length;
    pointLoadingRef.current = true;
    setPointLoading(true);
    void pointService.listPointPage({
      ...(debouncedQuery ? { search: debouncedQuery } : {}),
      offset,
      limit: MAP_POINT_PAGE_SIZE,
      sortField: 'updatedAt',
      sortDirection: 'desc',
      includePointIds: false,
    }).then((result) => {
      if (requestId !== pointRequestIdRef.current) return;
      pointLoadingRef.current = false;
      setPointLoading(false);
      if (result.status === 'success') {
        setPoints((current) => {
          const pointIds = new Set(current.map((point) => point.id));
          return [...current, ...result.value.points.filter((point) => !pointIds.has(point.id))];
        });
        setPointTotal(result.value.total);
      } else {
        setMessage(result.error.message);
      }
    });
  }

  function handlePointListScroll(event: UIEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    if (list.scrollHeight - list.scrollTop - list.clientHeight <= 48) {
      loadMorePoints();
    }
  }

  function togglePoint(point: Point) {
    setSelectedPoints((current) => {
      const next = new Map(current);
      if (next.has(point.id)) next.delete(point.id);
      else next.set(point.id, point);
      return next;
    });
  }

  return (
    <div className={`unified-map-workspace unified-map-workspace--${platform}`}>
      <section className="unified-map-canvas" aria-label={`${config.name}区域`}>
        <div className="unified-map-container" ref={containerRef} />
        <div className="unified-map-tools-top" aria-label="地图工具">
          <Select
            aria-label="地图平台切换"
            className="unified-map-platform-select"
            onChange={(value) => {
              if (isPlatform(value)) switchPlatform(value);
            }}
            options={(Object.keys(platforms) as Platform[]).map((item) => ({
              label: platforms[item].name,
              value: item,
            }))}
            value={platform}
          />
          <Popover
            content={
              <div className="unified-map-layer-popover">
                {platform === 'amap' && <AMapToolbar />}
                {platform === 'baidu' && <BaiduToolbar />}
                {platform === 'tianditu' && <TiandituToolbar />}
              </div>
            }
            placement="bottomRight"
            title={`${config.name}图层设置`}
            trigger="click"
          >
            <Button aria-label="图层设置" icon={<AppstoreOutlined />} shape="circle" />
          </Popover>
          <Tooltip title={credential ? `修改${config.credential}` : `配置${config.credential}`}>
            <Button
              aria-label={`配置${config.credential}`}
              className={credential ? 'is-configured' : ''}
              icon={<SettingOutlined />}
              onClick={() => setCredentialDialog(true)}
              shape="circle"
            />
          </Tooltip>
        </div>
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

      <aside
        aria-hidden={panelCollapsed}
        aria-label="点位面板"
        className={`unified-map-panel${panelCollapsed ? ' is-collapsed' : ''}`}
      >
        <header className="unified-map-panel__header">
          <div>
            <strong>点位</strong>
            <small>当前 {pointTotal} 个点位</small>
          </div>
          <Tooltip title="收起点位面板">
            <Button
              aria-label="收起点位面板"
              icon={<LeftOutlined />}
              onClick={() => setPanelCollapsed(true)}
              shape="circle"
              size="small"
              type="text"
            />
          </Tooltip>
        </header>

        <section className="unified-point-tools">
          <input
            aria-label="搜索点位"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索点位名称"
            type="search"
            value={query}
          />
          <div className="unified-point-actions">
            <button disabled={points.length === 0} onClick={selectLoadedPoints} type="button">
              显示已加载点位
            </button>
          </div>
          <div
            aria-label="点位滚动列表"
            aria-busy={pointLoading}
            className="unified-point-list"
            onScroll={handlePointListScroll}
            ref={pointListRef}
          >
            {pointLoading && points.length === 0 && (
              <span className="empty-value">正在加载点位…</span>
            )}
            {points.map((point) => (
              <label key={point.id}>
                <input
                  checked={selectedIds.includes(point.id)}
                  onChange={() => togglePoint(point)}
                  type="checkbox"
                />
                <span>{point.name}</span>
              </label>
            ))}
            {!pointLoading && points.length === 0 && <span className="empty-value">没有匹配的点位</span>}
            {points.length > 0 && (
              <span className="unified-point-list__status">
                {pointLoading
                  ? '正在加载更多…'
                  : hasMorePoints
                    ? `向下滚动加载更多（已加载 ${points.length} / ${pointTotal}）`
                    : `已加载全部 ${pointTotal} 条`}
              </span>
            )}
          </div>
        </section>

        {(message ?? missingCoordinateMessage) && (
          <div className="map-inline-warning" role="alert">
            {message ?? missingCoordinateMessage}
          </div>
        )}
      </aside>

      <div className="unified-map-tools-bottom" aria-label="基础地图控制">
        <Tooltip placement="left" title="查看全部点位">
          <Button
            aria-label="查看全部点位"
            icon={<AimOutlined />}
            onClick={() => adapterRef.current?.fitView()}
            shape="circle"
          />
        </Tooltip>
        <Tooltip placement="left" title="清空地图">
          <Button
            aria-label="清空地图"
            danger
            icon={<DeleteOutlined />}
            onClick={clearMap}
            shape="circle"
          />
        </Tooltip>
      </div>

      {panelCollapsed && (
        <Tooltip title="展开点位面板" placement="right">
          <Button
            aria-label="展开点位面板"
            className="unified-map-panel-expand"
            icon={<RightOutlined />}
            onClick={() => setPanelCollapsed(false)}
            shape="circle"
          />
        </Tooltip>
      )}

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
