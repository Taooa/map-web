import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { ToolIcon } from '@/components/ToolIcon';
import { mapNavigation } from '@/config/routes';
import type { Point, PointId } from '@/domain';
import { AMapMapService } from '@/features/map-validation/amap-map-service';

const AMAP_KEY_STORAGE = 'coordinate-toolkit.amap-key';

type Dialog = 'points' | 'key' | null;
type MapStatus = 'missing-key' | 'loading' | 'ready' | 'error';

function hasGcj02Coordinate(point: Point): boolean {
  const original = point.coordinates.original;
  return (
    (original.kind === 'geographic' && original.system === 'GCJ02') ||
    point.coordinates.converted.GCJ02?.coordinate.kind === 'geographic'
  );
}

export function AMapPage() {
  const [mapService] = useState(() => new AMapMapService());
  const mapContainer = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(AMAP_KEY_STORAGE) ?? '');
  const [mapStatus, setMapStatus] = useState<MapStatus>(apiKey ? 'loading' : 'missing-key');
  const [mapError, setMapError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly PointId[]>([]);
  const [draftSelectedIds, setDraftSelectedIds] = useState<readonly PointId[]>([]);
  const [pointListLoading, setPointListLoading] = useState(false);
  const [selectionFeedback, setSelectionFeedback] = useState<string | null>(null);
  const [markerCount, setMarkerCount] = useState(0);

  const showSelectedPoints = useCallback(
    async (ids: readonly PointId[]) => {
      const result = await mapService.showPoints(ids);
      if (result.status === 'failure') {
        setSelectionFeedback(result.error.message);
        return;
      }

      setMarkerCount(result.value.markers.length);
      const missingNames = result.value.missingCoordinatePoints.map((point) => point.name);
      setSelectionFeedback(
        missingNames.length > 0
          ? `${missingNames.join('、')} 需要先在点位管理中转换为 GCJ02。`
          : null,
      );
    },
    [mapService],
  );

  useEffect(() => {
    if (!apiKey) {
      mapService.destroy();
      return;
    }

    const container = mapContainer.current;
    if (!container) return;

    let active = true;
    setMapStatus('loading');
    setMapError(null);
    void mapService.initialize(container, apiKey).then(async (result) => {
      if (!active) return;
      if (result.status === 'failure') {
        setMapStatus('error');
        setMapError(result.error.message);
        return;
      }
      setMapStatus('ready');
      await showSelectedPoints([]);
    });

    return () => {
      active = false;
      mapService.destroy();
    };
  }, [apiKey, mapService, showSelectedPoints]);

  async function openPointDialog() {
    setDialog('points');
    setDraftSelectedIds(selectedIds);
    setPointListLoading(true);
    const result = await mapService.listPoints();
    setPointListLoading(false);
    if (result.status === 'failure') {
      setSelectionFeedback(result.error.message);
      return;
    }
    setPoints(result.value);
  }

  function togglePoint(id: PointId) {
    setDraftSelectedIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
  }

  function toggleAll() {
    setDraftSelectedIds((current) =>
      current.length === points.length ? [] : points.map((point) => point.id),
    );
  }

  function confirmPointSelection() {
    setSelectedIds(draftSelectedIds);
    setDialog(null);
    if (mapStatus === 'ready') {
      void showSelectedPoints(draftSelectedIds);
    }
  }

  function removePoint(id: PointId) {
    const nextIds = selectedIds.filter((candidate) => candidate !== id);
    setSelectedIds(nextIds);
    if (mapStatus === 'ready') {
      void showSelectedPoints(nextIds);
    }
  }

  const selectedPoints = selectedIds
    .map((id) => points.find((point) => point.id === id))
    .filter((point): point is Point => Boolean(point));

  return (
    <div className="map-workspace map-workspace--amber">
      <aside className="map-control-panel">
        <div className="map-control-panel__heading">
          <div className="map-platform-title">
            <span className="map-platform-title__mark">高</span>
            <div>
              <p className="eyebrow">地图验证</p>
              <h1>高德地图</h1>
            </div>
          </div>
          <nav className="map-tabs" aria-label="地图平台">
            {mapNavigation.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'is-active' : '')}
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="map-control-panel__body">
          <section className="map-control-section">
            <div className="map-control-section__title">
              <span>地图点位</span>
              <small>
                {markerCount} / {selectedIds.length}
              </small>
            </div>
            <button
              className="button button--primary button--block"
              onClick={() => void openPointDialog()}
              type="button"
            >
              <ToolIcon name="target" />
              选择点位
            </button>
            {selectedPoints.length > 0 && (
              <div className="selected-points">
                {selectedPoints.map((point, index) => (
                  <div className="selected-point" key={point.id}>
                    <span className="selected-point__number">{index + 1}</span>
                    <div>
                      <strong>{point.name}</strong>
                      <small>
                        {hasGcj02Coordinate(point) ? 'GCJ02 · 坐标已就绪' : '缺少 GCJ02 坐标'}
                      </small>
                    </div>
                    <button
                      aria-label={`移除 ${point.name}`}
                      onClick={() => removePoint(point.id)}
                      type="button"
                    >
                      <ToolIcon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectionFeedback && (
              <div className="map-inline-warning" role="alert">
                {selectionFeedback}
              </div>
            )}
          </section>

          <section className="map-control-section">
            <div className="map-control-section__title">
              <span>地图设置</span>
              <small className={apiKey ? 'ready-status' : 'missing-status'}>
                {apiKey ? '已配置' : '未配置'}
              </small>
            </div>
            <button className="settings-card" onClick={() => setDialog('key')} type="button">
              <span className="settings-card__icon">
                <ToolIcon name="key" />
              </span>
              <span>
                <strong>配置密钥</strong>
                <small>凭据仅保存在当前浏览器</small>
              </span>
              <ToolIcon name="chevron" size={16} />
            </button>
          </section>

          <section className="coordinate-contract">
            <span className="coordinate-contract__icon">
              <ToolIcon name="compass" size={17} />
            </span>
            <div>
              <strong>平台坐标契约</strong>
              <p>
                高德地图标记明确使用 <span>GCJ02</span>。其他原始坐标必须先在点位管理中完成转换。
              </p>
            </div>
          </section>
        </div>

        <footer className="map-panel-footer">
          <span className="local-indicator">
            <i />
            本地工作区
          </span>
          <span>{mapStatus === 'ready' ? '地图服务已加载' : '高德地图服务'}</span>
        </footer>
      </aside>

      <section className="map-canvas" aria-label="高德地图区域">
        <div className="amap-container" ref={mapContainer} />
        {mapStatus !== 'ready' && (
          <div className="map-missing-card">
            <span className="map-missing-card__icon">
              <ToolIcon name="map" size={23} />
            </span>
            <div>
              <span className="status-label">
                {mapStatus === 'loading'
                  ? '正在加载地图'
                  : mapStatus === 'error'
                    ? '地图加载失败'
                    : '尚未加载地图'}
              </span>
              <h2>{apiKey ? '高德地图暂不可用' : '请先配置高德地图密钥'}</h2>
              <p>
                {mapStatus === 'error'
                  ? mapError
                  : apiKey
                    ? '正在连接高德地图服务。'
                    : '没有密钥时不会请求或加载高德地图服务。'}
              </p>
            </div>
            {mapStatus !== 'loading' && (
              <button
                className="button button--primary"
                onClick={() => setDialog('key')}
                type="button"
              >
                <ToolIcon name="key" />
                配置密钥
              </button>
            )}
          </div>
        )}
        <div className="map-status-bar">
          <span>
            <i />
            GCJ02
          </span>
          <span>已选择 {selectedIds.length} 个点位</span>
          <span>
            {mapStatus === 'ready' ? `已展示 ${markerCount} 个地图标记` : '地图尚未就绪'}
          </span>
        </div>
      </section>

      {dialog === 'key' && (
        <AMapKeyDialog
          initialValue={apiKey}
          onCancel={() => setDialog(null)}
          onSave={(key) => {
            localStorage.setItem(AMAP_KEY_STORAGE, key);
            setApiKey(key);
            setDialog(null);
          }}
        />
      )}

      {dialog === 'points' && (
        <div className="overlay overlay--center" onMouseDown={() => setDialog(null)}>
          <section
            aria-labelledby="amap-point-dialog-title"
            aria-modal="true"
            className="prototype-dialog map-dialog point-picker-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p className="eyebrow">点位选择</p>
            <h2 id="amap-point-dialog-title">选择地图点位</h2>
            <div className="point-picker-toolbar">
              <span>共 {points.length} 个点位</span>
              <button disabled={points.length === 0} onClick={toggleAll} type="button">
                {draftSelectedIds.length === points.length && points.length > 0 ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="point-picker-list">
              {pointListLoading && <span className="empty-value">正在读取点位…</span>}
              {!pointListLoading && points.length === 0 && (
                <span className="empty-value">当前还没有点位</span>
              )}
              {points.map((point) => (
                <label className="point-picker-item" key={point.id}>
                  <input
                    checked={draftSelectedIds.includes(point.id)}
                    onChange={() => togglePoint(point.id)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{point.name}</strong>
                    <small>
                      {hasGcj02Coordinate(point) ? 'GCJ02 坐标已就绪' : '需要先转换为 GCJ02'}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <div className="prototype-dialog__actions">
              <button className="button button--quiet" onClick={() => setDialog(null)} type="button">
                取消
              </button>
              <button
                className="button button--primary"
                onClick={confirmPointSelection}
                type="button"
              >
                确认选择
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

interface AMapKeyDialogProps {
  readonly initialValue: string;
  readonly onCancel: () => void;
  readonly onSave: (key: string) => void;
}

function AMapKeyDialog({ initialValue, onCancel, onSave }: AMapKeyDialogProps) {
  const [key, setKey] = useState(initialValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = key.trim();
    if (normalized) {
      onSave(normalized);
    }
  }

  return (
    <div className="overlay overlay--center" onMouseDown={onCancel}>
      <section
        aria-labelledby="amap-key-dialog-title"
        aria-modal="true"
        className="prototype-dialog map-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <p className="eyebrow">高德地图凭据</p>
        <h2 id="amap-key-dialog-title">配置高德地图密钥</h2>
        <p>密钥只保存在当前浏览器中。</p>
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>高德地图密钥</span>
            <input
              autoFocus
              onChange={(event) => setKey(event.target.value)}
              placeholder="请输入浏览器端密钥"
              required
              type="password"
              value={key}
            />
          </label>
          <div className="prototype-dialog__actions">
            <button className="button button--quiet" onClick={onCancel} type="button">
              取消
            </button>
            <button className="button button--primary" disabled={!key.trim()} type="submit">
              保存并加载地图
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
