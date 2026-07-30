import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { ToolIcon } from '@/components/ToolIcon';
import { mapNavigation } from '@/config/routes';
import type { Point, PointId } from '@/domain';
import { BaiduMapService } from '@/features/map-validation/baidu-map-service';

const BAIDU_AK_STORAGE = 'coordinate-toolkit.baidu-ak';
type Dialog = 'points' | 'ak' | null;
type MapStatus = 'missing-ak' | 'loading' | 'ready' | 'error';

function hasBd09(point: Point): boolean {
  const original = point.coordinates.original;
  return (
    (original.kind === 'geographic' && original.system === 'BD09') ||
    point.coordinates.converted.BD09?.coordinate.kind === 'geographic'
  );
}

export function BaiduMapPage() {
  const [service] = useState(() => new BaiduMapService());
  const containerRef = useRef<HTMLDivElement>(null);
  const [ak, setAk] = useState(() => localStorage.getItem(BAIDU_AK_STORAGE) ?? '');
  const [status, setStatus] = useState<MapStatus>(ak ? 'loading' : 'missing-ak');
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [selected, setSelected] = useState<readonly PointId[]>([]);
  const [draft, setDraft] = useState<readonly PointId[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [markerCount, setMarkerCount] = useState(0);

  const showPoints = useCallback(
    async (ids: readonly PointId[]) => {
      const result = await service.showPoints(ids);
      if (result.status === 'failure') {
        setFeedback(result.error.message);
        return;
      }
      setMarkerCount(result.value.markers.length);
      const missing = result.value.missingCoordinatePoints.map((point) => point.name);
      setFeedback(
        missing.length ? `${missing.join('、')} 需要先在点位管理中转换为 BD09。` : null,
      );
    },
    [service],
  );

  useEffect(() => {
    if (!ak) {
      service.destroy();
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    setStatus('loading');
    setError(null);
    void service.initialize(container, ak).then(async (result) => {
      if (!active) return;
      if (result.status === 'failure') {
        setStatus('error');
        setError(result.error.message);
        return;
      }
      setStatus('ready');
      await showPoints([]);
    });
    return () => {
      active = false;
      service.destroy();
    };
  }, [ak, service, showPoints]);

  async function openPointDialog() {
    setDialog('points');
    setDraft(selected);
    setLoadingPoints(true);
    const result = await service.listPoints();
    setLoadingPoints(false);
    if (result.status === 'failure') {
      setFeedback(result.error.message);
      return;
    }
    setPoints(result.value);
  }

  function togglePoint(id: PointId) {
    setDraft((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
  }

  function confirmSelection() {
    setSelected(draft);
    setDialog(null);
    if (status === 'ready') void showPoints(draft);
  }

  function removePoint(id: PointId) {
    const next = selected.filter((candidate) => candidate !== id);
    setSelected(next);
    if (status === 'ready') void showPoints(next);
  }

  const selectedPoints = selected
    .map((id) => points.find((point) => point.id === id))
    .filter((point): point is Point => Boolean(point));

  return (
    <div className="map-workspace map-workspace--blue">
      <aside className="map-control-panel">
        <div className="map-control-panel__heading">
          <div className="map-platform-title">
            <span className="map-platform-title__mark">百</span>
            <div><p className="eyebrow">地图验证</p><h1>百度地图</h1></div>
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
              <span>地图点位</span><small>{markerCount} / {selected.length}</small>
            </div>
            <button
              className="button button--primary button--block"
              onClick={() => void openPointDialog()}
              type="button"
            >
              <ToolIcon name="target" />选择点位
            </button>
            {selectedPoints.length > 0 && (
              <div className="selected-points">
                {selectedPoints.map((point, index) => (
                  <div className="selected-point" key={point.id}>
                    <span className="selected-point__number">{index + 1}</span>
                    <div>
                      <strong>{point.name}</strong>
                      <small>{hasBd09(point) ? 'BD09 · 坐标已就绪' : '缺少 BD09 坐标'}</small>
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
            {feedback && <div className="map-inline-warning" role="alert">{feedback}</div>}
          </section>

          <section className="map-control-section">
            <div className="map-control-section__title">
              <span>地图设置</span>
              <small className={ak ? 'ready-status' : 'missing-status'}>{ak ? '已配置' : '未配置'}</small>
            </div>
            <button className="settings-card" onClick={() => setDialog('ak')} type="button">
              <span className="settings-card__icon"><ToolIcon name="key" /></span>
              <span><strong>配置访问密钥</strong><small>凭据仅保存在当前浏览器</small></span>
              <ToolIcon name="chevron" size={16} />
            </button>
          </section>

          <section className="coordinate-contract">
            <span className="coordinate-contract__icon"><ToolIcon name="compass" size={17} /></span>
            <div>
              <strong>平台坐标契约</strong>
              <p>百度地图标记明确使用 <span>BD09</span>。其他原始坐标必须先在点位管理中完成转换。</p>
            </div>
          </section>
        </div>

        <footer className="map-panel-footer">
          <span className="local-indicator"><i />本地工作区</span>
          <span>{status === 'ready' ? '地图服务已加载' : '百度地图服务'}</span>
        </footer>
      </aside>

      <section className="map-canvas" aria-label="百度地图区域">
        <div className="baidu-map-container" ref={containerRef} />
        {status !== 'ready' && (
          <div className="map-missing-card">
            <span className="map-missing-card__icon"><ToolIcon name="map" size={23} /></span>
            <div>
              <span className="status-label">
                {status === 'loading' ? '正在加载地图' : status === 'error' ? '地图加载失败' : '尚未加载地图'}
              </span>
              <h2>{ak ? '百度地图暂不可用' : '请先配置百度地图访问密钥'}</h2>
              <p>
                {status === 'error'
                  ? error
                  : ak
                    ? '正在连接百度地图服务。'
                    : '没有访问密钥时不会请求或加载百度地图服务。'}
              </p>
            </div>
            {status !== 'loading' && (
              <button className="button button--primary" onClick={() => setDialog('ak')} type="button">
                <ToolIcon name="key" />配置访问密钥
              </button>
            )}
          </div>
        )}
        <div className="map-status-bar">
          <span><i />BD09</span>
          <span>已选择 {selected.length} 个点位</span>
          <span>{status === 'ready' ? `已展示 ${markerCount} 个地图标记` : '地图尚未就绪'}</span>
        </div>
      </section>

      {dialog === 'ak' && (
        <BaiduAkDialog
          initialValue={ak}
          onCancel={() => setDialog(null)}
          onSave={(value) => {
            localStorage.setItem(BAIDU_AK_STORAGE, value);
            setAk(value);
            setDialog(null);
          }}
        />
      )}

      {dialog === 'points' && (
        <div className="overlay overlay--center" onMouseDown={() => setDialog(null)}>
          <section
            aria-labelledby="baidu-point-dialog-title"
            aria-modal="true"
            className="prototype-dialog map-dialog point-picker-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p className="eyebrow">点位选择</p>
            <h2 id="baidu-point-dialog-title">选择地图点位</h2>
            <div className="point-picker-toolbar">
              <span>共 {points.length} 个点位</span>
              <button
                disabled={points.length === 0}
                onClick={() =>
                  setDraft((current) =>
                    current.length === points.length ? [] : points.map((point) => point.id),
                  )
                }
                type="button"
              >
                {draft.length === points.length && points.length ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="point-picker-list">
              {loadingPoints && <span className="empty-value">正在读取点位…</span>}
              {!loadingPoints && points.length === 0 && <span className="empty-value">当前还没有点位</span>}
              {points.map((point) => (
                <label className="point-picker-item" key={point.id}>
                  <input checked={draft.includes(point.id)} onChange={() => togglePoint(point.id)} type="checkbox" />
                  <span>
                    <strong>{point.name}</strong>
                    <small>{hasBd09(point) ? 'BD09 坐标已就绪' : '需要先转换为 BD09'}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="prototype-dialog__actions">
              <button className="button button--quiet" onClick={() => setDialog(null)} type="button">取消</button>
              <button className="button button--primary" onClick={confirmSelection} type="button">确认选择</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

interface BaiduAkDialogProps {
  readonly initialValue: string;
  readonly onCancel: () => void;
  readonly onSave: (ak: string) => void;
}

function BaiduAkDialog({ initialValue, onCancel, onSave }: BaiduAkDialogProps) {
  const [ak, setAk] = useState(initialValue);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = ak.trim();
    if (normalized) onSave(normalized);
  }

  return (
    <div className="overlay overlay--center" onMouseDown={onCancel}>
      <section
        aria-labelledby="baidu-ak-dialog-title"
        aria-modal="true"
        className="prototype-dialog map-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <p className="eyebrow">百度地图凭据</p>
        <h2 id="baidu-ak-dialog-title">配置百度地图访问密钥</h2>
        <p>访问密钥只保存在当前浏览器中。</p>
        <form onSubmit={submit}>
          <label className="form-field">
            <span>百度地图访问密钥</span>
            <input
              autoFocus
              onChange={(event) => setAk(event.target.value)}
              placeholder="请输入浏览器端 AK"
              required
              type="password"
              value={ak}
            />
          </label>
          <div className="prototype-dialog__actions">
            <button className="button button--quiet" onClick={onCancel} type="button">取消</button>
            <button className="button button--primary" disabled={!ak.trim()} type="submit">保存并加载地图</button>
          </div>
        </form>
      </section>
    </div>
  );
}
