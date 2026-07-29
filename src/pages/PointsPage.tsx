import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ToolIcon } from '@/components/ToolIcon';
import type { CoordinateSystemId, Point, PointId } from '@/domain';
import { pointService } from '@/features/points';

type EntrySystem = Extract<CoordinateSystemId, 'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'>;

const systemLabels: Readonly<Record<EntrySystem, string>> = {
  WGS84: 'WGS84',
  GCJ02: 'GCJ02',
  BD09: 'BD09',
  SHANGHAI2000: '上海2000',
};

function formatCoordinate(point: Point): string {
  const coordinate = point.coordinates.original;
  return coordinate.kind === 'geographic'
    ? `${coordinate.lng}, ${coordinate.lat}`
    : `X ${coordinate.x} · Y ${coordinate.y}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function PointsPage() {
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadPoints = useCallback(async (search = '') => {
    setLoading(true);
    const result = await pointService.listPoints(search);
    if (result.status === 'success') {
      setPoints(result.value);
    } else {
      setFeedback(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void pointService.listPoints().then((result) => {
      if (!active) return;
      if (result.status === 'success') {
        setPoints(result.value);
      } else {
        setFeedback(result.error.message);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleCreated(point: Point) {
    setShowAddDialog(false);
    setQuery('');
    await loadPoints();
    setFeedback(`已添加“${point.name}”。`);
  }

  async function handleDelete(id: PointId) {
    const result = await pointService.deletePoint(id);
    if (result.status === 'failure') {
      setFeedback(result.error.message);
      return;
    }

    setActivePoint(null);
    setShowDeleteConfirm(false);
    await loadPoints(query);
    setFeedback('点位已删除。');
  }

  return (
    <div className="points-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">POINT WORKSPACE</p>
          <h1>Point Manager</h1>
          <p>集中管理设备点位、坐标状态与地图验证入口。</p>
        </div>
        <div className="workspace-header__actions">
          <button className="button button--secondary" disabled type="button">
            <ToolIcon name="upload" />
            导入点位
          </button>
          <button
            className="button button--primary"
            onClick={() => setShowAddDialog(true)}
            type="button"
          >
            <ToolIcon name="plus" />
            新增点位
          </button>
        </div>
      </header>

      <div className="memory-notice" role="note">
        <ToolIcon name="database" size={17} />
        <span>
          <strong>当前使用内存数据</strong>
          页面刷新后点位会丢失；浏览器持久化将在后续阶段接入。
        </span>
      </div>

      {feedback && <div className="inline-feedback">{feedback}</div>}

      <section className="data-workspace" aria-label="点位列表工作区">
        <div className="data-toolbar">
          <label className="search-field">
            <ToolIcon name="search" />
            <input
              aria-label="搜索点位"
              onChange={(event) => {
                const search = event.target.value;
                setQuery(search);
                void loadPoints(search);
              }}
              placeholder="搜索点位名称"
              type="search"
              value={query}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="data-toolbar__summary">
            <span>
              当前结果 <strong>{points.length}</strong> 个点位
            </span>
          </div>
          <div className="data-toolbar__actions">
            <button className="button button--small button--quiet" disabled>
              <ToolIcon name="transform" size={16} />
              坐标转换
            </button>
            <button className="button button--small button--quiet" disabled>
              <ToolIcon name="map" size={16} />
              地图查看
            </button>
          </div>
        </div>

        <div className="table-scroll">
          {points.length > 0 && (
            <table className="point-table">
              <thead>
                <tr>
                  <th>点位名称</th>
                  <th>来源</th>
                  <th>原始坐标</th>
                  <th>转换结果</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {points.map((point) => {
                  const label = systemLabels[point.coordinates.original.system as EntrySystem];
                  const convertedSystems = Object.keys(point.coordinates.converted);

                  return (
                    <tr key={point.id}>
                      <td>
                        <button
                          className="point-name"
                          onClick={() => {
                            setActivePoint(point);
                            setShowDeleteConfirm(false);
                          }}
                          type="button"
                        >
                          <span className="point-name__marker">
                            <ToolIcon name="target" size={15} />
                          </span>
                          <span>
                            <strong>{point.name}</strong>
                            <small>{point.id}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="source-cell">
                          <strong>手动添加</strong>
                          <small>Point Manager</small>
                        </span>
                      </td>
                      <td>
                        <span className={`coordinate-badge coordinate-badge--${label}`}>
                          {label}
                          <small>原始</small>
                        </span>
                        <code className="coordinate-value">{formatCoordinate(point)}</code>
                      </td>
                      <td>
                        {convertedSystems.length ? (
                          <div className="badge-row">
                            {convertedSystems.map((system) => (
                              <span
                                className={`coordinate-badge coordinate-badge--${system}`}
                                key={system}
                              >
                                {system}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="empty-value">尚未生成</span>
                        )}
                      </td>
                      <td>
                        <span className="updated-cell">{formatDate(point.updatedAt)}</span>
                      </td>
                      <td>
                        <button
                          aria-label={`查看 ${point.name} 详情`}
                          className="row-action"
                          onClick={() => {
                            setActivePoint(point);
                            setShowDeleteConfirm(false);
                          }}
                          type="button"
                        >
                          查看
                          <ToolIcon name="chevron" size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && points.length === 0 && (
            <div className="table-empty">
              <ToolIcon name={query ? 'search' : 'target'} size={25} />
              <strong>{query ? '没有匹配的点位' : '还没有点位'}</strong>
              <span>
                {query ? '尝试使用其他名称搜索。' : '点击“新增点位”，建立第一个设备点位。'}
              </span>
              {!query && (
                <button
                  className="button button--primary button--small"
                  onClick={() => setShowAddDialog(true)}
                  type="button"
                >
                  <ToolIcon name="plus" size={15} />
                  创建第一个点位
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="table-empty">
              <span>正在读取点位…</span>
            </div>
          )}
        </div>

        <footer className="table-pagination">
          <span>当前显示 {points.length} 条内存数据</span>
          <div>
            <button disabled type="button">
              上一页
            </button>
            <button className="is-current" type="button">
              1
            </button>
            <button disabled type="button">
              下一页
            </button>
          </div>
          <span className="pagination-placeholder">分页将在数据量增加后启用</span>
        </footer>
      </section>

      {activePoint && (
        <div className="overlay" onMouseDown={() => setActivePoint(null)}>
          <aside
            aria-labelledby="point-detail-title"
            aria-modal="true"
            className="detail-drawer"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="drawer-header">
              <div>
                <p className="eyebrow">POINT DETAILS</p>
                <h2 id="point-detail-title">{activePoint.name}</h2>
              </div>
              <button
                aria-label="关闭点位详情"
                className="icon-button"
                onClick={() => setActivePoint(null)}
                type="button"
              >
                <ToolIcon name="close" />
              </button>
            </header>
            <div className="drawer-body">
              <div className="detail-status">
                <span className="point-name__marker">
                  <ToolIcon name="target" />
                </span>
                <div>
                  <strong>{activePoint.id}</strong>
                  <small>手动添加 · {formatDate(activePoint.updatedAt)}</small>
                </div>
              </div>
              <section className="detail-section">
                <span className="detail-section__label">原始坐标</span>
                <div className="coordinate-detail-card is-original">
                  <div>
                    <span
                      className={`coordinate-badge coordinate-badge--${
                        systemLabels[activePoint.coordinates.original.system as EntrySystem]
                      }`}
                    >
                      {systemLabels[activePoint.coordinates.original.system as EntrySystem]}
                      <small>原始</small>
                    </span>
                    <span className="status-dot">已保存</span>
                  </div>
                  <code>{formatCoordinate(activePoint)}</code>
                </div>
              </section>
              <section className="detail-section">
                <span className="detail-section__label">转换结果</span>
                <div className="detail-empty">
                  <ToolIcon name="transform" />
                  <span>这个点位还没有转换结果</span>
                </div>
              </section>
              <div className="prototype-note">
                <ToolIcon name="database" size={17} />
                当前点位保存在内存中，刷新页面后会丢失。
              </div>
              {showDeleteConfirm && (
                <div className="delete-confirm" role="alert">
                  <strong>确认删除“{activePoint.name}”？</strong>
                  <span>删除后无法在当前会话中恢复。</span>
                  <div>
                    <button
                      className="button button--small button--quiet"
                      onClick={() => setShowDeleteConfirm(false)}
                      type="button"
                    >
                      取消
                    </button>
                    <button
                      className="button button--small button--danger"
                      onClick={() => void handleDelete(activePoint.id)}
                      type="button"
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              )}
            </div>
            <footer className="drawer-footer">
              <button
                className="button button--danger"
                onClick={() => setShowDeleteConfirm(true)}
                type="button"
              >
                删除点位
              </button>
              <button className="button button--primary" disabled type="button">
                <ToolIcon name="transform" />
                转换坐标
              </button>
            </footer>
          </aside>
        </div>
      )}

      {showAddDialog && (
        <AddPointDialog
          onCancel={() => setShowAddDialog(false)}
          onCreated={(point) => void handleCreated(point)}
        />
      )}
    </div>
  );
}

interface AddPointDialogProps {
  readonly onCancel: () => void;
  readonly onCreated: (point: Point) => void;
}

function AddPointDialog({ onCancel, onCreated }: AddPointDialogProps) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState<EntrySystem>('WGS84');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const projected = system === 'SHANGHAI2000';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await pointService.createPoint({
      name,
      system,
      first: Number(first),
      second: Number(second),
    });
    setSubmitting(false);

    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }

    onCreated(result.value);
  }

  return (
    <div className="overlay overlay--center" onMouseDown={onCancel}>
      <section
        aria-labelledby="add-point-title"
        aria-modal="true"
        className="point-form-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="point-form-dialog__header">
          <div>
            <p className="eyebrow">NEW POINT</p>
            <h2 id="add-point-title">新增点位</h2>
            <p>坐标将作为原始值保存，创建后不会被转换操作覆盖。</p>
          </div>
          <button
            aria-label="关闭新增点位"
            className="icon-button"
            onClick={onCancel}
            type="button"
          >
            <ToolIcon name="close" />
          </button>
        </header>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="point-form-dialog__body">
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <label className="form-field">
              <span>点位名称</span>
              <input
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：浦东机房 A-01"
                required
                value={name}
              />
            </label>
            <label className="form-field">
              <span>坐标系</span>
              <select
                onChange={(event) => {
                  setSystem(event.target.value as EntrySystem);
                  setFirst('');
                  setSecond('');
                }}
                value={system}
              >
                <option value="WGS84">WGS84（默认）</option>
                <option value="GCJ02">GCJ02</option>
                <option value="BD09">BD09</option>
                <option value="SHANGHAI2000">上海2000（仅保存）</option>
              </select>
              {projected && <small>上海2000本阶段仅支持录入和保存，不参与坐标转换。</small>}
            </label>
            <div className="coordinate-input-grid">
              <label className="form-field">
                <span>{projected ? 'X 坐标（米）' : '经度'}</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setFirst(event.target.value)}
                  placeholder={projected ? '例如：506842.31' : '例如：121.4737'}
                  required
                  step="any"
                  type="number"
                  value={first}
                />
              </label>
              <label className="form-field">
                <span>{projected ? 'Y 坐标（米）' : '纬度'}</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setSecond(event.target.value)}
                  placeholder={projected ? '例如：3459278.64' : '例如：31.2304'}
                  required
                  step="any"
                  type="number"
                  value={second}
                />
              </label>
            </div>
          </div>
          <footer className="point-form-dialog__footer">
            <button className="button button--quiet" onClick={onCancel} type="button">
              取消
            </button>
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? '正在保存…' : '保存点位'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
