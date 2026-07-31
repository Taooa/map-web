import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExcelWorkbookData } from '@/adapters/files/excel-parser';
import { ToolIcon } from '@/components/ToolIcon';
import type { Coordinate, CoordinateSystemId, ImportFormat, Point, PointId } from '@/domain';
import type {
  ExcelFieldMapping,
  ExcelImportCoordinateSystem,
} from '@/features/import/excel-importer';
import { importService, type ExcelImportSummary } from '@/features/import/import-service';
import { fullCoordinateText } from '@/features/points/point-coordinate-display';
import { PointTable } from '@/features/points/PointTable';
import {
  getPageCount,
  paginateItems,
  pointPageSizes,
  type PointPageSize,
} from '@/features/points/point-list-model';
import {
  getPointStorageStatus,
  pointService,
  subscribePointStorageStatus,
} from '@/features/points';

type EntrySystem = Extract<CoordinateSystemId, 'WGS84' | 'GCJ02' | 'BD09' | 'SHANGHAI2000'>;
type TransformSystem = Extract<CoordinateSystemId, 'WGS84' | 'GCJ02' | 'BD09'>;

const transformSystems: readonly TransformSystem[] = ['WGS84', 'GCJ02', 'BD09'];

const systemLabels: Readonly<Record<EntrySystem, string>> = {
  WGS84: 'WGS84',
  GCJ02: 'GCJ02',
  BD09: 'BD09',
  SHANGHAI2000: '上海2000',
};

function formatCoordinate(point: Point): string {
  return formatCoordinateValue(point.coordinates.original);
}

function formatCoordinateValue(coordinate: Coordinate): string {
  return coordinate.kind === 'geographic'
    ? `${coordinate.lng}, ${coordinate.lat}`
    : `X ${coordinate.x} · Y ${coordinate.y}`;
}

function getTransformTargets(point: Point): readonly TransformSystem[] {
  const source = point.coordinates.original.system;
  return transformSystems.includes(source as TransformSystem)
    ? transformSystems.filter((system) => system !== source)
    : [];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPointSource(point: Point): string {
  if (point.source.type === 'manual') return '手动新增';
  if (point.source.format === 'json-paste') return 'JSON 粘贴';
  if (point.source.sourceName) return point.source.sourceName;
  const labels: Record<ImportFormat, string> = {
    excel: 'Excel 文件',
    csv: 'CSV 文件',
    'json-file': 'JSON 文件',
    'json-paste': 'JSON 粘贴',
  };
  return labels[point.source.format];
}

export function PointsPage() {
  const navigate = useNavigate();
  const storageStatus = useSyncExternalStore(
    subscribePointStorageStatus,
    getPointStorageStatus,
    getPointStorageStatus,
  );
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transformTarget, setTransformTarget] = useState<TransformSystem>('GCJ02');
  const [transformError, setTransformError] = useState<string | null>(null);
  const [transforming, setTransforming] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PointPageSize>(20);
  const [selectedIds, setSelectedIds] = useState<Set<PointId>>(() => new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchTransform, setShowBatchTransform] = useState(false);
  const [batchTarget, setBatchTarget] = useState<TransformSystem>('GCJ02');
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);

  const paginated = useMemo(() => paginateItems(points, page, pageSize), [page, pageSize, points]);

  const loadPoints = useCallback(async (search = '') => {
    setLoading(true);
    const result = await pointService.listPoints(search);
    if (result.status === 'success') {
      setPoints(result.value);
      setPage((current) =>
        Math.min(current, getPageCount(result.value.length, pageSize)),
      );
      if (!search) {
        const existing = new Set(result.value.map((point) => point.id));
        setSelectedIds((current) => new Set([...current].filter((id) => existing.has(id))));
      }
    } else {
      setFeedback(result.error.message);
    }
    setLoading(false);
  }, [pageSize]);

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

  async function handleImported(summary: ExcelImportSummary) {
    setQuery('');
    await loadPoints();
    setFeedback(`导入完成：成功 ${summary.successCount} 条，失败 ${summary.failureCount} 条。`);
  }

  async function handleDelete(id: PointId) {
    const result = await pointService.deletePoint(id);
    if (result.status === 'failure') {
      setFeedback(result.error.message);
      return;
    }

    setActivePoint(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setShowDeleteConfirm(false);
    await loadPoints(query);
    setFeedback('点位已删除。');
  }

  function togglePoint(id: PointId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCurrentPage(selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      paginated.items.forEach((point) => {
        if (selected) next.add(point.id);
        else next.delete(point.id);
      });
      return next;
    });
  }

  async function copyCoordinate(point: Point, system: EntrySystem) {
    const text = fullCoordinateText(point, system);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setFeedback(`已复制 ${point.name} 的 ${system === 'SHANGHAI2000' ? 'SH2000' : system} 坐标。`);
  }

  async function handleBatchDelete() {
    for (const id of selectedIds) await pointService.deletePoint(id);
    setSelectedIds(new Set());
    setShowBatchDeleteConfirm(false);
    await loadPoints(query);
    setFeedback('已删除所选点位。');
  }

  async function handleBatchTransform() {
    let successCount = 0;
    let skippedCount = 0;
    let failureCount = 0;
    for (const id of selectedIds) {
      const pointResult = await pointService.getPoint(id);
      if (pointResult.status === 'failure' || !pointResult.value) {
        failureCount += 1;
        continue;
      }
      const point = pointResult.value;
      if (
        point.coordinates.original.system === batchTarget ||
        point.coordinates.converted[batchTarget]
      ) {
        skippedCount += 1;
        continue;
      }
      const result = await pointService.transformPoint(point.id, batchTarget);
      if (result.status === 'success') successCount += 1;
      else failureCount += 1;
    }
    setShowBatchTransform(false);
    await loadPoints(query);
    setFeedback(`坐标转换完成：新增 ${successCount}，跳过 ${skippedCount}，失败 ${failureCount}。`);
  }

  function viewSelectedOnMap() {
    const params = new URLSearchParams({
      platform: 'amap',
      pointIds: [...selectedIds].join(','),
    });
    void navigate(`/map?${params.toString()}`);
  }

  async function exportSelected() {
    const selected: Point[] = [];
    for (const id of selectedIds) {
      const result = await pointService.getPoint(id);
      if (result.status === 'success' && result.value) selected.push(result.value);
    }
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '点位导出.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleTransform() {
    if (!activePoint) return;

    setTransforming(true);
    setTransformError(null);
    const result = await pointService.transformPoint(activePoint.id, transformTarget);
    setTransforming(false);

    if (result.status === 'failure') {
      setTransformError(result.error.message);
      return;
    }

    setActivePoint(result.value);
    await loadPoints(query);
    setFeedback(`已生成 ${transformTarget} 坐标。`);
  }

  return (
    <div className="points-page">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">点位工作台</p>
          <h1>点位管理</h1>
          <p>集中管理设备点位、坐标状态与地图展示入口。</p>
        </div>
        <div className="workspace-header__actions">
          <button
            className="button button--secondary"
            onClick={() => setShowImportDialog(true)}
            type="button"
          >
            <ToolIcon name="upload" />
            导入点位
          </button>
          <button
            className="button button--secondary"
            onClick={() => setShowAddDialog(true)}
            type="button"
          >
            <ToolIcon name="plus" />
            新增点位
          </button>
          <button
            className="button button--primary"
            disabled={selectedIds.size === 0}
            onClick={() => setShowBatchTransform(true)}
            type="button"
          >
            <ToolIcon name="transform" />
            坐标转换
          </button>
        </div>
      </header>

      <div
        className={`memory-notice ${
          storageStatus.mode === 'indexeddb' ? 'memory-notice--persistent' : ''
        }`}
        role="note"
      >
        <ToolIcon name="database" size={17} />
        <span>
          <strong>
            {storageStatus.mode === 'indexeddb' ? 'IndexedDB 持久化已启用' : '当前使用内存数据'}
          </strong>
          {storageStatus.message}
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
                setPage(1);
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
              点位总数 <strong>{paginated.total}</strong>
            </span>
            <span className={selectedIds.size ? 'selection-count is-active' : 'selection-count'}>
              已选择 {selectedIds.size} 个点位
            </span>
          </div>
          <div className="data-toolbar__actions">
            <button
              className="button button--small button--quiet"
              disabled={selectedIds.size === 0}
              onClick={viewSelectedOnMap}
              type="button"
            >
              <ToolIcon name="map" size={16} />
              在地图中查看
            </button>
            <button
              className="button button--small button--quiet"
              disabled={selectedIds.size === 0}
              onClick={() => void exportSelected()}
              type="button"
            >
              批量导出
            </button>
            <button
              className="button button--small button--danger"
              disabled={selectedIds.size === 0}
              onClick={() => setShowBatchDeleteConfirm(true)}
              type="button"
            >
              批量删除
            </button>
          </div>
        </div>

        <div className="table-scroll">
          {points.length > 0 && (
            <PointTable
              formatDate={formatDate}
              onCopy={(point, system) => void copyCoordinate(point, system)}
              onDelete={(point) => {
                setActivePoint(point);
                setShowDeleteConfirm(true);
              }}
              onEdit={setEditingPoint}
              onToggle={togglePoint}
              onTogglePage={toggleCurrentPage}
              result={paginated}
              selectedIds={selectedIds}
              sourceName={formatPointSource}
            />
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
          <span>
            共 {paginated.total} 条，第 {paginated.page} / {getPageCount(paginated.total, pageSize)} 页
          </span>
          <div>
            <button
              disabled={paginated.page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              上一页
            </button>
            {Array.from(
              { length: getPageCount(paginated.total, pageSize) },
              (_, index) => index + 1,
            ).map((pageNumber) => (
              <button
                aria-label={`第 ${pageNumber} 页`}
                className={pageNumber === paginated.page ? 'is-current' : ''}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              disabled={paginated.page >= getPageCount(paginated.total, pageSize)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              下一页
            </button>
          </div>
          <label>
            每页
            <select
              aria-label="每页条数"
              onChange={(event) => {
                setPageSize(Number(event.target.value) as PointPageSize);
                setPage(1);
              }}
              value={pageSize}
            >
              {pointPageSizes.map((size) => (
                <option key={size} value={size}>{size} 条</option>
              ))}
            </select>
          </label>
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
                <p className="eyebrow">点位详情</p>
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
                  <small>
                    {formatPointSource(activePoint)} · {formatDate(activePoint.updatedAt)}
                  </small>
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
                {transformSystems
                  .filter((system) => activePoint.coordinates.converted[system])
                  .map((system) => {
                    const converted = activePoint.coordinates.converted[system];
                    if (!converted) return null;

                    return (
                      <div className="coordinate-detail-card" key={system}>
                        <div>
                          <span className={`coordinate-badge coordinate-badge--${system}`}>
                            {system}
                            <small>转换</small>
                          </span>
                          <span className="status-dot">{formatDate(converted.transformedAt)}</span>
                        </div>
                        <code>{formatCoordinateValue(converted.coordinate)}</code>
                        <small className="algorithm-version">
                          算法版本 {converted.algorithmVersion}
                        </small>
                      </div>
                    );
                  })}
                {Object.keys(activePoint.coordinates.converted).length === 0 && (
                  <div className="detail-empty">
                    <ToolIcon name="transform" />
                    <span>这个点位还没有转换结果</span>
                  </div>
                )}
              </section>
              <section className="detail-section">
                <span className="detail-section__label">生成坐标</span>
                {getTransformTargets(activePoint).length > 0 ? (
                  <div className="transform-panel">
                    <label className="form-field">
                      <span>目标坐标系</span>
                      <select
                        onChange={(event) =>
                          setTransformTarget(event.target.value as TransformSystem)
                        }
                        value={transformTarget}
                      >
                        {getTransformTargets(activePoint).map((system) => (
                          <option key={system} value={system}>
                            {system}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>转换结果会单独保存，原始坐标不会改变。</p>
                    {transformError && (
                      <div className="form-error" role="alert">
                        {transformError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="detail-empty">
                    <ToolIcon name="transform" />
                    <span>上海2000暂不支持坐标转换</span>
                  </div>
                )}
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
              <button
                className="button button--primary"
                disabled={transforming || getTransformTargets(activePoint).length === 0}
                onClick={() => void handleTransform()}
                type="button"
              >
                <ToolIcon name="transform" />
                {transforming ? '正在转换…' : '转换坐标'}
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

      {showImportDialog && (
        <PointImportDialog
          onCancel={() => setShowImportDialog(false)}
          onImported={(summary) => void handleImported(summary)}
        />
      )}

      {editingPoint && (
        <EditPointDialog
          point={editingPoint}
          onCancel={() => setEditingPoint(null)}
          onSaved={(point) => {
            setEditingPoint(null);
            void loadPoints(query).then(() => {
              setFeedback(`已更新“${point.name}”。`);
            });
          }}
        />
      )}

      {showBatchTransform && (
        <div className="overlay overlay--center">
          <section aria-label="批量坐标转换" aria-modal="true" className="point-form-dialog compact-dialog" role="dialog">
            <header className="point-form-dialog__header">
              <div><p className="eyebrow">批量操作</p><h2>批量坐标转换</h2></div>
            </header>
            <div className="point-form-dialog__body">
              <p>将为已选择的 {selectedIds.size} 个点位补齐缺失结果，已有结果不会覆盖。</p>
              <label className="form-field">
                <span>目标坐标系</span>
                <select aria-label="批量转换目标坐标系" onChange={(event) => setBatchTarget(event.target.value as TransformSystem)} value={batchTarget}>
                  {transformSystems.map((system) => <option key={system} value={system}>{system}</option>)}
                </select>
              </label>
            </div>
            <footer className="point-form-dialog__footer">
              <button className="button button--quiet" onClick={() => setShowBatchTransform(false)} type="button">取消</button>
              <button className="button button--primary" onClick={() => void handleBatchTransform()} type="button">开始转换</button>
            </footer>
          </section>
        </div>
      )}

      {showBatchDeleteConfirm && (
        <div className="overlay overlay--center">
          <section aria-label="确认批量删除" aria-modal="true" className="point-form-dialog compact-dialog" role="dialog">
            <header className="point-form-dialog__header">
              <div><p className="eyebrow">危险操作</p><h2>确认删除 {selectedIds.size} 个点位？</h2></div>
            </header>
            <div className="point-form-dialog__body"><p>删除后无法恢复，请确认选择范围。</p></div>
            <footer className="point-form-dialog__footer">
              <button className="button button--quiet" onClick={() => setShowBatchDeleteConfirm(false)} type="button">取消</button>
              <button className="button button--danger" onClick={() => void handleBatchDelete()} type="button">确认批量删除</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function EditPointDialog({
  point,
  onCancel,
  onSaved,
}: {
  point: Point;
  onCancel: () => void;
  onSaved: (point: Point) => void;
}) {
  const [name, setName] = useState(point.name);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await pointService.updatePointName(point.id, name);
    if (result.status === 'failure') setError(result.error.message);
    else onSaved(result.value);
  }
  return (
    <div className="overlay overlay--center">
      <section aria-label="编辑点位" aria-modal="true" className="point-form-dialog compact-dialog" role="dialog">
        <header className="point-form-dialog__header"><div><p className="eyebrow">点位操作</p><h2>编辑点位</h2></div></header>
        <form onSubmit={(event) => void submit(event)}>
          <div className="point-form-dialog__body">
            {error && <div className="form-error" role="alert">{error}</div>}
            <label className="form-field"><span>点位名称</span><input aria-label="编辑点位名称" onChange={(event) => setName(event.target.value)} value={name} /></label>
            <small>本轮编辑只修改名称，原始坐标和转换缓存保持不变。</small>
          </div>
          <footer className="point-form-dialog__footer">
            <button className="button button--quiet" onClick={onCancel} type="button">取消</button>
            <button className="button button--primary" disabled={!name.trim()} type="submit">保存修改</button>
          </footer>
        </form>
      </section>
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
            <p className="eyebrow">新增点位</p>
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
                placeholder="例如：设备点位 01"
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

interface PointImportDialogProps {
  readonly onCancel: () => void;
  readonly onImported: (summary: ExcelImportSummary) => void;
}

const defaultMapping: ExcelFieldMapping = {
  nameColumn: 0,
  longitudeColumn: 1,
  latitudeColumn: 2,
};

type ImportMode = 'excel' | 'csv' | 'json-file' | 'json-paste';

function PointImportDialog({ onCancel, onImported }: PointImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>('excel');
  const [workbook, setWorkbook] = useState<ExcelWorkbookData | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [mapping, setMapping] = useState<ExcelFieldMapping>(defaultMapping);
  const [system, setSystem] = useState<ExcelImportCoordinateSystem>('WGS84');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);
  const [jsonText, setJsonText] = useState('');

  const selectedSheet =
    workbook?.sheets.find((sheet) => sheet.name === sheetName) ?? workbook?.sheets[0] ?? null;

  function loadSingleSheet(sheet: ExcelWorkbookData['sheets'][number], name: string) {
    setFileName(name);
    setWorkbook({ sheets: [sheet] });
    setSheetName(sheet.name);
    setMapping(defaultMapping);
  }

  async function handleFile(file: File | undefined) {
    setError(null);
    setSummary(null);
    setWorkbook(null);
    if (!file) return;
    const lowerName = file.name.toLocaleLowerCase();
    if (mode === 'excel' && !lowerName.endsWith('.xlsx')) {
      setError('请选择 .xlsx 文件。');
      return;
    }
    if (mode === 'csv' && !lowerName.endsWith('.csv')) {
      setError('请选择 .csv 文件。');
      return;
    }
    if (mode === 'json-file' && !lowerName.endsWith('.json')) {
      setError('请选择 .json 文件。');
      return;
    }

    if (mode === 'csv') {
      const { parseCsv } = await import('@/adapters/files/csv-parser');
      const result = parseCsv(await file.text(), file.name);
      if (result.status === 'failure') return setError(result.error.message);
      loadSingleSheet(result.value, file.name);
      return;
    }
    if (mode === 'json-file') {
      const { parseJsonPoints } = await import('@/adapters/files/json-parser');
      const result = parseJsonPoints(await file.text(), file.name);
      if (result.status === 'failure') return setError(result.error.message);
      loadSingleSheet(result.value, file.name);
      return;
    }

    const { parseExcelWorkbook } = await import('@/adapters/files/excel-parser');
    const result = parseExcelWorkbook(await file.arrayBuffer());
    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }

    const [firstSheet] = result.value.sheets;
    setFileName(file.name);
    setWorkbook(result.value);
    setSheetName(firstSheet?.name ?? '');
    setMapping(defaultMapping);
  }

  async function handleJsonPaste() {
    setError(null);
    setSummary(null);
    const { parseJsonPoints } = await import('@/adapters/files/json-parser');
    const result = parseJsonPoints(jsonText, '粘贴的JSON');
    if (result.status === 'failure') {
      setError(result.error.message);
      return;
    }
    loadSingleSheet(result.value, '粘贴的JSON');
  }

  function changeMode(next: ImportMode) {
    setMode(next);
    setWorkbook(null);
    setSheetName('');
    setFileName('');
    setError(null);
    setSummary(null);
  }

  function updateMapping(field: keyof ExcelFieldMapping, value: number) {
    setMapping((current) => ({ ...current, [field]: value }));
  }

  async function handleImport() {
    if (!selectedSheet) {
      setError('请先选择包含数据的 Sheet。');
      return;
    }
    if (selectedSheet.columns.length < 3) {
      setError('当前 Sheet 至少需要三列数据。');
      return;
    }
    if (new Set(Object.values(mapping)).size !== 3) {
      setError('名称、经度和纬度必须映射到不同列。');
      return;
    }

    setImporting(true);
    setError(null);
    const result = await importService.importTable({
      sheet: selectedSheet,
      mapping,
      system,
      format: mode,
      ...(mode !== 'json-paste' && fileName ? { sourceName: fileName } : {}),
    });
    setImporting(false);
    setSummary(result);
    onImported(result);
  }

  return (
    <div className="overlay overlay--center" onMouseDown={onCancel}>
      <section
        aria-labelledby="point-import-title"
        aria-modal="true"
        className="point-form-dialog excel-import-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="point-form-dialog__header">
          <div>
            <p className="eyebrow">批量导入</p>
            <h2 id="point-import-title">导入点位</h2>
            <p>支持 Excel、CSV、JSON 文件和 JSON 粘贴，确认字段后再写入点位列表。</p>
          </div>
          <button
            aria-label="关闭点位导入"
            className="icon-button"
            onClick={onCancel}
            type="button"
          >
            <ToolIcon name="close" />
          </button>
        </header>

        <div className="point-form-dialog__body">
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          {!summary && (
            <>
              <div className="unified-platform-switch" role="tablist" aria-label="导入方式">
                {(
                  [
                    ['excel', 'Excel'],
                    ['csv', 'CSV'],
                    ['json-file', 'JSON文件'],
                    ['json-paste', 'JSON粘贴'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-selected={mode === value}
                    className={mode === value ? 'is-active' : ''}
                    key={value}
                    onClick={() => changeMode(value)}
                    role="tab"
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'json-paste' ? (
                <label className="form-field">
                  <span>JSON内容</span>
                  <textarea
                    aria-label="JSON内容"
                    onChange={(event) => setJsonText(event.target.value)}
                    placeholder={'[{"name":"设备1","lng":121.4,"lat":31.2}]'}
                    rows={7}
                    value={jsonText}
                  />
                  <button
                    className="button button--secondary button--small"
                    disabled={!jsonText.trim()}
                    onClick={() => void handleJsonPaste()}
                    type="button"
                  >
                    解析JSON
                  </button>
                </label>
              ) : (
                <label className="form-field">
                  <span>
                    {mode === 'excel' ? 'Excel文件' : mode === 'csv' ? 'CSV文件' : 'JSON文件'}
                  </span>
                  <input
                    accept={
                      mode === 'excel'
                        ? '.xlsx'
                        : mode === 'csv'
                          ? '.csv,text/csv'
                          : '.json,application/json'
                    }
                    aria-label="导入文件"
                    onChange={(event) => void handleFile(event.target.files?.[0])}
                    type="file"
                  />
                  <small>{fileName || '请选择对应格式的本地文件。'}</small>
                </label>
              )}

              {workbook && selectedSheet && (
                <>
                  {mode === 'excel' && (
                    <label className="form-field">
                      <span>Sheet</span>
                      <select
                        onChange={(event) => {
                          setSheetName(event.target.value);
                          setMapping(defaultMapping);
                        }}
                        value={selectedSheet.name}
                      >
                        {workbook.sheets.map((sheet) => (
                          <option key={sheet.name} value={sheet.name}>
                            {sheet.name}（{sheet.rows.length} 行）
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="excel-mapping-grid">
                    {[
                      ['nameColumn', '点位名称列'],
                      ['longitudeColumn', system === 'SHANGHAI2000' ? 'X 坐标列' : '经度列'],
                      ['latitudeColumn', system === 'SHANGHAI2000' ? 'Y 坐标列' : '纬度列'],
                    ].map(([field, label]) => (
                      <label className="form-field" key={field}>
                        <span>{label}</span>
                        <select
                          onChange={(event) =>
                            updateMapping(
                              field as keyof ExcelFieldMapping,
                              Number(event.target.value),
                            )
                          }
                          value={mapping[field as keyof ExcelFieldMapping]}
                        >
                          {selectedSheet.columns.map((column) => (
                            <option key={column.index} value={column.index}>
                              {column.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <label className="form-field">
                    <span>文件坐标系</span>
                    <select
                      onChange={(event) =>
                        setSystem(event.target.value as ExcelImportCoordinateSystem)
                      }
                      value={system}
                    >
                      <option value="WGS84">WGS84（默认）</option>
                      <option value="GCJ02">GCJ02</option>
                      <option value="BD09">BD09</option>
                      <option value="SHANGHAI2000">上海2000（仅导入，不参与转换）</option>
                    </select>
                    <small>当前导入批次统一使用同一坐标系。</small>
                  </label>
                </>
              )}
            </>
          )}

          {summary && (
            <div className="import-summary">
              <div className="import-summary__metrics">
                <span>
                  <strong>{summary.successCount}</strong>
                  成功
                </span>
                <span className={summary.failureCount ? 'has-failures' : ''}>
                  <strong>{summary.failureCount}</strong>
                  失败
                </span>
              </div>
              {summary.failures.length > 0 ? (
                <div className="import-failure-list">
                  {summary.failures.map((failure) => (
                    <div key={`${failure.row}-${failure.reason}`}>
                      <strong>第 {failure.row} 行</strong>
                      <span>{failure.reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inline-feedback">全部点位已成功导入。</div>
              )}
            </div>
          )}
        </div>

        <footer className="point-form-dialog__footer">
          {!summary ? (
            <>
              <button className="button button--quiet" onClick={onCancel} type="button">
                取消
              </button>
              <button
                className="button button--primary"
                disabled={!selectedSheet || importing}
                onClick={() => void handleImport()}
                type="button"
              >
                {importing ? '正在导入…' : '开始导入'}
              </button>
            </>
          ) : (
            <button className="button button--primary" onClick={onCancel} type="button">
              完成
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
