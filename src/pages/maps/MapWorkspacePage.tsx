import { useEffect, useMemo, useRef, useState, type FormEvent, type UIEvent } from 'react';
import {
  AimOutlined,
  AppstoreOutlined,
  CloseOutlined,
  DeleteOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Popover,
  Select,
  Table,
  Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { AMapToolbar } from '@/adapters/maps/amap/AMapToolbar';
import { BaiduToolbar } from '@/adapters/maps/baidu/BaiduToolbar';
import { createMapAdapter, type MapPlatform } from '@/adapters/maps/map-adapter-factory';
import type {
  MapAdapter,
  MapPointActivateHandler,
  MapRenderPoint,
} from '@/adapters/maps/map-adapter';
import { groupMapRenderPoints } from '@/adapters/maps/marker-groups';
import { createMapRenderPoint } from '@/adapters/maps/map-render-point';
import { TiandituToolbar } from '@/adapters/maps/tianditu/TiandituToolbar';
import type { CoordinateSystemId, GeographicCoordinateSystemId, Point, PointId } from '@/domain';
import { pointService } from '@/features/points';

type Platform = MapPlatform;
type Status = 'missing-credential' | 'loading' | 'ready' | 'error';
const MAP_POINT_PAGE_SIZE = 20;
const MAP_VISIBLE_POINT_BATCH_SIZE = 50;
const POINT_FETCH_BATCH_SIZE = 100;
const pointPickerCoordinateSystems = ['WGS84', 'GCJ02', 'BD09'] as const;
const credentialFields: ReadonlyArray<{
  platform: Platform;
  label: string;
  placeholder: string;
}> = [
  { platform: 'amap', label: '高德地图 Key', placeholder: '请输入高德地图 Key' },
  { platform: 'baidu', label: '百度地图 AK', placeholder: '请输入百度地图 AK' },
  { platform: 'tianditu', label: '天地图 Token', placeholder: '请输入天地图 Token' },
];

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
} as const satisfies Record<
  Platform,
  {
    name: string;
    coordinate: GeographicCoordinateSystemId;
    credential: string;
    storage: string;
  }
>;

function isPlatform(value: string | null): value is Platform {
  return value === 'amap' || value === 'baidu' || value === 'tianditu';
}

function pointSourceName(point: Point): string {
  if (point.source.type === 'manual') return '手动输入';
  return (
    point.source.sourceName ||
    (
      {
        excel: 'Excel 导入',
        csv: 'CSV 导入',
        'json-file': 'JSON 文件导入',
        'json-paste': 'JSON 粘贴',
      } as const
    )[point.source.format]
  );
}

function originalCoordinateText(point: Point): string {
  const coordinate = point.coordinates.original;
  return coordinate.kind === 'geographic'
    ? `${coordinate.lng}, ${coordinate.lat}`
    : `${coordinate.x}, ${coordinate.y}`;
}

function hasCoordinate(point: Point, system: CoordinateSystemId): boolean {
  return (
    point.coordinates.original.system === system || Boolean(point.coordinates.converted[system])
  );
}

async function loadPointsByIds(
  pointIds: readonly PointId[],
  cache: ReadonlyMap<PointId, Point> = new Map(),
): Promise<{ points: Point[]; missingCount: number }> {
  const points: Point[] = [];
  let missingCount = 0;
  for (let offset = 0; offset < pointIds.length; offset += POINT_FETCH_BATCH_SIZE) {
    const batchIds = pointIds.slice(offset, offset + POINT_FETCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batchIds.map(async (pointId) => {
        const cached = cache.get(pointId);
        if (cached) return cached;
        const result = await pointService.getPoint(pointId);
        return result.status === 'success' ? result.value : null;
      }),
    );
    batchResults.forEach((point) => {
      if (point) points.push(point);
      else missingCount += 1;
    });
  }
  return { points, missingCount };
}

export function MapWorkspacePage() {
  const [params, setParams] = useSearchParams();
  const requestedPlatform = params.get('platform');
  const platform: Platform = isPlatform(requestedPlatform) ? requestedPlatform : 'amap';
  const config = platforms[platform];
  const containerRef = useRef<HTMLDivElement>(null);
  const pointListRef = useRef<HTMLDivElement>(null);
  const pointRowRefs = useRef(new Map<PointId, HTMLDivElement>());
  const adapterRef = useRef<MapAdapter | null>(null);
  const activatePointFromMapRef = useRef<MapPointActivateHandler>(() => undefined);
  const pendingScrollPointIdRef = useRef<PointId | null>(null);
  const pendingFocusPointIdRef = useRef<PointId | null>(null);
  const pendingFitViewRef = useRef(false);
  const [workspacePointIds, setWorkspacePointIds] = useState<ReadonlySet<PointId>>(new Set());
  const [visiblePointIds, setVisiblePointIds] = useState<ReadonlySet<PointId>>(new Set());
  const [activePointId, setActivePointId] = useState<PointId | null>(null);
  const [pointCache, setPointCache] = useState<ReadonlyMap<PointId, Point>>(new Map());
  const [query, setQuery] = useState('');
  const [visiblePointCount, setVisiblePointCount] = useState(MAP_VISIBLE_POINT_BATCH_SIZE);
  const [pointPickerOpen, setPointPickerOpen] = useState(false);
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
    const container = containerRef.current;
    if (!container || !credential) return;
    const adapter = createMapAdapter(platform, {
      onPointActivate: (pointId) => activatePointFromMapRef.current(pointId),
    });
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
        pendingFitViewRef.current = true;
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

  const workspacePoints = useMemo(
    () =>
      [...workspacePointIds].flatMap((pointId) => {
        const point = pointCache.get(pointId);
        return point ? [point] : [];
      }),
    [pointCache, workspacePointIds],
  );
  const filteredWorkspacePoints = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? workspacePoints.filter((point) => point.name.toLocaleLowerCase().includes(normalizedQuery))
      : workspacePoints;
  }, [query, workspacePoints]);
  const renderedWorkspacePoints = filteredWorkspacePoints.slice(0, visiblePointCount);
  const hasMorePoints = renderedWorkspacePoints.length < filteredWorkspacePoints.length;

  useEffect(() => {
    activatePointFromMapRef.current = (rawPointId) => {
      const pointId = rawPointId as PointId;
      if (!workspacePointIds.has(pointId)) return;
      setActivePointId(pointId);
      const pointIndex = filteredWorkspacePoints.findIndex((point) => point.id === pointId);
      if (pointIndex < 0) return;
      pendingScrollPointIdRef.current = pointId;
      setVisiblePointCount((current) =>
        Math.max(
          current,
          Math.ceil((pointIndex + 1) / MAP_VISIBLE_POINT_BATCH_SIZE) * MAP_VISIBLE_POINT_BATCH_SIZE,
        ),
      );
    };
  }, [filteredWorkspacePoints, workspacePointIds]);

  const display = useMemo(() => {
    const markers: MapRenderPoint[] = [];
    const missing: Point[] = [];
    visiblePointIds.forEach((pointId) => {
      const point = pointCache.get(pointId);
      if (!point) return;
      const marker = createMapRenderPoint(point, config.coordinate);
      if (marker) markers.push(marker);
      else missing.push(point);
    });
    return { markers, missing };
  }, [config.coordinate, pointCache, visiblePointIds]);

  const missingCoordinateMessage = display.missing.length
    ? `${display.missing.map((point) => point.name).join('、')} 需要先转换为 ${config.coordinate}。`
    : null;

  const markerGroups = useMemo(
    () => groupMapRenderPoints(display.markers, activePointId),
    [activePointId, display.markers],
  );

  useEffect(() => {
    if (status !== 'ready') return;
    const adapter = adapterRef.current;
    adapter?.setPoints(markerGroups);
    const pendingFocusPointId = pendingFocusPointIdRef.current;
    if (pendingFocusPointId) {
      const point = pointCache.get(pendingFocusPointId);
      const marker = point ? createMapRenderPoint(point, config.coordinate) : null;
      if (marker) adapter?.focusPoint(marker.position);
      pendingFocusPointIdRef.current = null;
      pendingFitViewRef.current = false;
    } else if (pendingFitViewRef.current) {
      adapter?.fitView();
      pendingFitViewRef.current = false;
    }
  }, [config.coordinate, markerGroups, pointCache, status]);

  useEffect(() => {
    const pointId = pendingScrollPointIdRef.current;
    if (!pointId) return;
    const row = pointRowRefs.current.get(pointId);
    if (!row) return;
    row.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    pendingScrollPointIdRef.current = null;
  }, [activePointId, renderedWorkspacePoints]);

  function switchPlatform(next: Platform) {
    if (next !== platform) {
      setStatus(credentials[next] ? 'loading' : 'missing-credential');
      setMessage(null);
      setParams({ platform: next });
    }
  }

  function clearVisiblePoints() {
    adapterRef.current?.clear();
    setVisiblePointIds(new Set());
    setMessage(null);
  }

  async function addWorkspacePoints(pointIds: readonly PointId[]) {
    const result = await loadPointsByIds(pointIds, pointCache);
    const addedIds = result.points.map((point) => point.id);
    pendingFitViewRef.current = true;
    setPointCache((current) => {
      const next = new Map(current);
      result.points.forEach((point) => next.set(point.id, point));
      return next;
    });
    setWorkspacePointIds((current) => new Set([...current, ...addedIds]));
    setVisiblePointIds((current) => new Set([...current, ...addedIds]));
    setMessage(
      result.missingCount > 0 ? `${result.missingCount} 个点位已不存在，未加入当前地图。` : null,
    );
    setVisiblePointCount(MAP_VISIBLE_POINT_BATCH_SIZE);
    setPointPickerOpen(false);
  }

  function togglePointVisibility(pointId: PointId) {
    pendingFitViewRef.current = true;
    setVisiblePointIds((current) => {
      const next = new Set(current);
      if (next.has(pointId)) next.delete(pointId);
      else if (workspacePointIds.has(pointId)) next.add(pointId);
      return next;
    });
  }

  function removeWorkspacePoint(pointId: PointId) {
    pendingFitViewRef.current = true;
    setActivePointId((current) => (current === pointId ? null : current));
    setWorkspacePointIds((current) => {
      const next = new Set(current);
      next.delete(pointId);
      return next;
    });
    setVisiblePointIds((current) => {
      const next = new Set(current);
      next.delete(pointId);
      return next;
    });
  }

  function showAllWorkspacePoints() {
    pendingFitViewRef.current = true;
    setVisiblePointIds(new Set(workspacePointIds));
  }

  function activateWorkspacePoint(point: Point) {
    pendingFocusPointIdRef.current = point.id;
    setActivePointId(point.id);
    setVisiblePointIds((current) =>
      current.has(point.id) ? current : new Set([...current, point.id]),
    );
  }

  function clearWorkspace() {
    adapterRef.current?.clear();
    setWorkspacePointIds(new Set());
    setVisiblePointIds(new Set());
    setActivePointId(null);
    setPointCache(new Map());
    setMessage(null);
  }

  function loadMorePoints() {
    if (!hasMorePoints) return;
    setVisiblePointCount((current) => current + MAP_VISIBLE_POINT_BATCH_SIZE);
  }

  function handlePointListScroll(event: UIEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    if (list.scrollHeight - list.scrollTop - list.clientHeight <= 48) {
      loadMorePoints();
    }
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
          <Tooltip title="地图 Key 配置">
            <Button
              aria-label="地图 Key 配置"
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
            <strong>点位 {workspacePointIds.size}</strong>
            <small>已显示 {visiblePointIds.size}</small>
          </div>
          <div className="unified-map-panel__header-actions">
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
          </div>
        </header>

        <section className="unified-point-tools">
          <Button
            aria-label="添加点位"
            block
            icon={<PlusOutlined />}
            onClick={() => setPointPickerOpen(true)}
            type="primary"
          >
            添加点位
          </Button>
          <div className="unified-point-workspace-actions">
            <Button
              disabled={
                workspacePointIds.size === 0 || visiblePointIds.size === workspacePointIds.size
              }
              onClick={showAllWorkspacePoints}
              size="small"
            >
              全部显示
            </Button>
            <Button disabled={visiblePointIds.size === 0} onClick={clearVisiblePoints} size="small">
              清空显示
            </Button>
            <Popconfirm
              cancelText="取消"
              description={`将移除当前列表中的 ${workspacePointIds.size} 个点位，不会删除原始点位数据。`}
              disabled={workspacePointIds.size === 0}
              okButtonProps={{ danger: true }}
              okText="确认清空"
              onConfirm={clearWorkspace}
              title="确定清空当前点位列表？"
            >
              <Button danger disabled={workspacePointIds.size === 0} size="small">
                清空列表
              </Button>
            </Popconfirm>
          </div>
          <Input.Search
            allowClear
            aria-label="搜索点位"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisiblePointCount(MAP_VISIBLE_POINT_BATCH_SIZE);
              if (pointListRef.current) pointListRef.current.scrollTop = 0;
            }}
            placeholder="搜索已添加点位"
            value={query}
          />
          <div
            aria-label="点位滚动列表"
            className="unified-point-list"
            onScroll={handlePointListScroll}
            ref={pointListRef}
          >
            {renderedWorkspacePoints.map((point) => (
              <div
                className={`unified-point-list__item${activePointId === point.id ? ' is-active' : ''}`}
                key={point.id}
                onClick={() => activateWorkspacePoint(point)}
                ref={(element) => {
                  if (element) pointRowRefs.current.set(point.id, element);
                  else pointRowRefs.current.delete(point.id);
                }}
              >
                <Checkbox
                  aria-label={`显示 ${point.name}`}
                  checked={visiblePointIds.has(point.id)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => togglePointVisibility(point.id)}
                />
                <span className="unified-point-list__content">
                  <strong>{point.name}</strong>
                  <small>
                    {pointSourceName(point)} · {originalCoordinateText(point)}
                  </small>
                </span>
                <Tooltip title="从当前地图移除">
                  <Button
                    aria-label={`从当前地图移除 ${point.name}`}
                    className="unified-point-list__remove"
                    icon={<CloseOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeWorkspacePoint(point.id);
                    }}
                    shape="circle"
                    size="small"
                    type="text"
                  />
                </Tooltip>
              </div>
            ))}
            {filteredWorkspacePoints.length === 0 && (
              <span className="empty-value">
                {workspacePointIds.size === 0 ? '尚未添加点位' : '没有匹配的点位'}
              </span>
            )}
            {renderedWorkspacePoints.length > 0 && (
              <span className="unified-point-list__status">
                {hasMorePoints
                  ? `向下滚动加载更多（已加载 ${renderedWorkspacePoints.length} / ${filteredWorkspacePoints.length}）`
                  : `已加载全部 ${filteredWorkspacePoints.length} 条`}
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
            onClick={clearVisiblePoints}
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
          initialValues={credentials}
          onCancel={() => setCredentialDialog(false)}
          onSave={(values) => {
            (Object.keys(platforms) as Platform[]).forEach((item) => {
              const value = values[item].trim();
              if (value) localStorage.setItem(platforms[item].storage, value);
              else localStorage.removeItem(platforms[item].storage);
            });
            setCredentials(values);
            setCredentialDialog(false);
          }}
        />
      )}

      {pointPickerOpen && (
        <MapPointPickerModal
          onAdd={addWorkspacePoints}
          onCancel={() => setPointPickerOpen(false)}
          workspacePointIds={workspacePointIds}
        />
      )}
    </div>
  );
}

const pointPickerColumns: TableColumnsType<Point> = [
  {
    title: '点位名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    width: 180,
  },
  {
    title: '来源',
    key: 'source',
    ellipsis: true,
    width: 130,
    render: (_, point) => pointSourceName(point),
  },
  ...pointPickerCoordinateSystems.map((system) => ({
    title: system,
    align: 'center' as const,
    key: system,
    width: 100,
    render: (_: unknown, point: Point) => {
      const available = hasCoordinate(point, system);
      return (
        <span
          className={`map-point-coordinate-status ${available ? 'is-available' : 'is-missing'}`}
        >
          {available ? '有' : '无'}
        </span>
      );
    },
  })),
];

function MapPointPickerModal({
  onAdd,
  onCancel,
  workspacePointIds,
}: {
  onAdd: (pointIds: readonly PointId[]) => Promise<void>;
  onCancel: () => void;
  workspacePointIds: ReadonlySet<PointId>;
}) {
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [candidatePointIds, setCandidatePointIds] = useState<readonly PointId[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(MAP_POINT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [appliedSource, setAppliedSource] = useState('');
  const [sourceOptions, setSourceOptions] = useState<readonly string[]>([]);
  const [addModalSelectedIds, setAddModalSelectedIds] = useState<ReadonlySet<PointId>>(new Set());

  useEffect(() => {
    let active = true;
    void pointService
      .listPointPage({
        ...(appliedQuery ? { search: appliedQuery } : {}),
        ...(appliedSource ? { source: appliedSource } : {}),
        offset: 0,
        limit: 1,
        sortField: 'updatedAt',
        sortDirection: 'desc',
        includePointIds: true,
      })
      .then(async (result) => {
        if (!active) return;
        if (result.status === 'failure') {
          setLoading(false);
          setError(result.error.message);
          return;
        }
        const candidateIds = result.value.pointIds.filter(
          (pointId) => !workspacePointIds.has(pointId),
        );
        const pageIds = candidateIds.slice((page - 1) * pageSize, page * pageSize);
        const pageResult = await loadPointsByIds(pageIds);
        if (!active) return;
        setCandidatePointIds(candidateIds);
        setPoints(pageResult.points);
        setTotal(candidateIds.length);
        setSourceOptions(result.value.sourceOptions);
        setError(
          pageResult.missingCount > 0
            ? `${pageResult.missingCount} 个候选点位已不存在，请重新查询。`
            : null,
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedQuery, appliedSource, page, pageSize, workspacePointIds]);

  function changePage(nextPage: number, nextPageSize: number) {
    setLoading(true);
    setError(null);
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
    } else {
      setPage(nextPage);
    }
  }

  function searchCandidates(value: string) {
    setLoading(true);
    setError(null);
    setPage(1);
    setAppliedQuery(value.trim());
  }

  function filterBySource(source: string) {
    setLoading(true);
    setError(null);
    setPage(1);
    setAppliedSource(source);
  }

  function toggleSelectedPoint(point: Point, selected: boolean) {
    setAddModalSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(point.id);
      else next.delete(point.id);
      return next;
    });
  }

  function toggleCurrentPage(selected: boolean, changedPoints: readonly Point[]) {
    setAddModalSelectedIds((current) => {
      const next = new Set(current);
      changedPoints.forEach((point) => {
        if (selected) next.add(point.id);
        else next.delete(point.id);
      });
      return next;
    });
  }

  const allCurrentQuerySelected =
    candidatePointIds.length > 0 &&
    candidatePointIds.every((pointId) => addModalSelectedIds.has(pointId));

  function toggleAllCandidatePoints() {
    setAddModalSelectedIds((current) => {
      const next = new Set(current);
      candidatePointIds.forEach((pointId) => {
        if (allCurrentQuerySelected) next.delete(pointId);
        else next.add(pointId);
      });
      return next;
    });
  }

  async function confirmAdd() {
    if (addModalSelectedIds.size === 0) return;
    setAdding(true);
    await onAdd([...addModalSelectedIds]);
  }

  return (
    <Modal
      centered
      className="map-point-picker-modal"
      footer={
        <div className="map-point-picker-footer">
          <span>已选择 {addModalSelectedIds.size} 个</span>
          <div>
            <Button disabled={adding} onClick={onCancel}>
              取消
            </Button>
            <Button
              disabled={addModalSelectedIds.size === 0}
              loading={adding}
              onClick={() => void confirmAdd()}
              type="primary"
            >
              {addModalSelectedIds.size > 0
                ? `添加 ${addModalSelectedIds.size} 个点位`
                : '添加点位'}
            </Button>
          </div>
        </div>
      }
      onCancel={() => {
        if (!adding) onCancel();
      }}
      open
      title="添加点位"
      width={820}
    >
      <div className="map-point-picker-search">
        <Input.Search
          allowClear
          aria-label="搜索可添加点位"
          enterButton="查询"
          onChange={(event) => setQueryDraft(event.target.value)}
          onSearch={searchCandidates}
          placeholder="按点位名称查询"
          value={queryDraft}
        />
        <Select
          aria-label="来源筛选"
          onChange={filterBySource}
          options={[
            { label: '全部来源', value: '' },
            ...sourceOptions.map((source) => ({ label: source, value: source })),
          ]}
          value={appliedSource}
        />
      </div>
      <div className="map-point-picker-summary">
        <span>当前查询可添加 {total} 条</span>
        <span>已选择 {addModalSelectedIds.size} 条</span>
      </div>
      {error && (
        <div className="map-inline-warning" role="alert">
          {error}
        </div>
      )}
      <Table<Point>
        columns={pointPickerColumns}
        dataSource={[...points]}
        loading={loading}
        locale={{ emptyText: '没有可添加的点位' }}
        pagination={false}
        rowKey="id"
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: [...addModalSelectedIds],
          getCheckboxProps: (point) => ({ 'aria-label': `选择 ${point.name}` }),
          getTitleCheckboxProps: () => ({ 'aria-label': '选择当前页' }),
          onSelect: toggleSelectedPoint,
          onSelectAll: (selected, _, changedPoints) => toggleCurrentPage(selected, changedPoints),
        }}
        scroll={{ y: 360 }}
        size="middle"
        tableLayout="fixed"
      />
      <div className="map-point-picker-pagination">
        <Button disabled={total === 0} onClick={toggleAllCandidatePoints} size="small" type="link">
          {allCurrentQuerySelected ? `取消全选全部 ${total} 个结果` : `全选全部 ${total} 个结果`}
        </Button>
        <Pagination
          current={page}
          onChange={changePage}
          pageSize={pageSize}
          pageSizeOptions={['10', '20', '50']}
          showQuickJumper
          showSizeChanger
          total={total}
        />
      </div>
    </Modal>
  );
}

function CredentialDialog({
  initialValues,
  onCancel,
  onSave,
}: {
  initialValues: Record<Platform, string>;
  onCancel: () => void;
  onSave: (values: Record<Platform, string>) => void;
}) {
  const [values, setValues] = useState(initialValues);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      amap: values.amap.trim(),
      baidu: values.baidu.trim(),
      tianditu: values.tianditu.trim(),
    });
  }
  return (
    <Modal
      centered
      className="map-credential-modal"
      footer={null}
      onCancel={onCancel}
      open
      title="地图 Key 配置"
      width={520}
    >
      <form className="map-credential-form" onSubmit={submit}>
        <p>统一维护三个地图平台的访问凭据，保存后当前平台会按需重新加载。</p>
        <div className="map-credential-form__fields">
          {credentialFields.map((field, index) => (
            <label className="map-credential-field" key={field.platform}>
              <span>{field.label}</span>
              <Input.Password
                aria-label={field.label}
                autoFocus={index === 0}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.platform]: event.target.value,
                  }))
                }
                placeholder={field.placeholder}
                value={values[field.platform]}
              />
            </label>
          ))}
        </div>
        <div className="map-credential-form__actions">
          <Button onClick={onCancel}>取消</Button>
          <Button htmlType="submit" type="primary">
            保存配置
          </Button>
        </div>
      </form>
    </Modal>
  );
}
