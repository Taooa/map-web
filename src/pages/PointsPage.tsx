import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import type { ExcelWorkbookData } from '@/adapters/files/excel-parser';
import { ToolIcon } from '@/components/ToolIcon';
import type { Coordinate, CoordinateSystemId, Point, PointId } from '@/domain';
import type {
  ExcelFieldMapping,
  ExcelImportCoordinateSystem,
} from '@/features/import/excel-importer';
import {
  importService,
  type ExcelImportSummary,
} from '@/features/import/import-service';
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

function formatPointSource(point: Point): { label: string; detail: string } {
  return point.source.type === 'manual'
    ? { label: '手动添加', detail: '点位管理' }
    : {
        label: '表格导入',
        detail: point.source.sourceRow ? `源文件第 ${point.source.sourceRow} 行` : '批量导入',
      };
}

export function PointsPage() {
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

  async function handleImported(summary: ExcelImportSummary) {
    setQuery('');
    await loadPoints();
    setFeedback(`表格导入完成：成功 ${summary.successCount} 条，失败 ${summary.failureCount} 条。`);
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

  function openPointDetails(point: Point) {
    const [firstTarget] = getTransformTargets(point);
    setActivePoint(point);
    setShowDeleteConfirm(false);
    setTransformError(null);
    if (firstTarget) {
      setTransformTarget(firstTarget);
    }
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
          <p>集中管理设备点位、坐标状态与地图验证入口。</p>
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
            className="button button--primary"
            onClick={() => setShowAddDialog(true)}
            type="button"
          >
            <ToolIcon name="plus" />
            新增点位
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
            {storageStatus.mode === 'indexeddb'
              ? 'IndexedDB 持久化已启用'
              : '当前使用内存数据'}
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
                  const source = formatPointSource(point);

                  return (
                    <tr key={point.id}>
                      <td>
                        <button
                          className="point-name"
                          onClick={() => openPointDetails(point)}
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
                          <strong>{source.label}</strong>
                          <small>{source.detail}</small>
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
                          onClick={() => openPointDetails(point)}
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
                    {formatPointSource(activePoint).label} · {formatDate(activePoint.updatedAt)}
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
                          <span className="status-dot">
                            {formatDate(converted.transformedAt)}
                          </span>
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
        <ExcelImportDialog
          onCancel={() => setShowImportDialog(false)}
          onImported={(summary) => void handleImported(summary)}
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

interface ExcelImportDialogProps {
  readonly onCancel: () => void;
  readonly onImported: (summary: ExcelImportSummary) => void;
}

const defaultMapping: ExcelFieldMapping = {
  nameColumn: 0,
  longitudeColumn: 1,
  latitudeColumn: 2,
};

function ExcelImportDialog({ onCancel, onImported }: ExcelImportDialogProps) {
  const [workbook, setWorkbook] = useState<ExcelWorkbookData | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [mapping, setMapping] = useState<ExcelFieldMapping>(defaultMapping);
  const [system, setSystem] = useState<ExcelImportCoordinateSystem>('WGS84');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null);

  const selectedSheet =
    workbook?.sheets.find((sheet) => sheet.name === sheetName) ?? workbook?.sheets[0] ?? null;

  async function handleFile(file: File | undefined) {
    setError(null);
    setSummary(null);
    setWorkbook(null);
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      setError('请选择 .xlsx 文件。');
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
    const result = await importService.importExcelSheet({
      sheet: selectedSheet,
      mapping,
      system,
    });
    setImporting(false);
    setSummary(result);
    onImported(result);
  }

  return (
    <div className="overlay overlay--center" onMouseDown={onCancel}>
      <section
        aria-labelledby="excel-import-title"
        aria-modal="true"
        className="point-form-dialog excel-import-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="point-form-dialog__header">
          <div>
            <p className="eyebrow">表格导入</p>
            <h2 id="excel-import-title">导入表格点位</h2>
            <p>上传 .xlsx 文件，选择工作表并映射点位字段。</p>
          </div>
          <button aria-label="关闭表格导入" className="icon-button" onClick={onCancel} type="button">
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
              <label className="form-field">
                <span>表格文件</span>
                <input
                  accept=".xlsx"
                  aria-label="表格文件"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                  type="file"
                />
                <small>{fileName || '第一版仅支持 .xlsx 文件。'}</small>
              </label>

              {workbook && selectedSheet && (
                <>
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
                    <small>一个文件中的当前 Sheet 统一使用同一坐标系。</small>
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
