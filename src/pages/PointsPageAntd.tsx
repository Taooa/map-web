/* eslint-disable react-hooks/set-state-in-effect */
import { ReloadOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Button } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point, PointId } from '@/domain';
import { pointService } from '@/features/points';
import '@/features/points/points-antd.css';
import { AddPointModal } from '@/features/points/components/antd/AddPointModal';
import { EditPointDrawer } from '@/features/points/components/antd/EditPointDrawer';
import {
  DeletePointsModal,
  ExportPointsModal,
  TransformPointsModal,
} from '@/features/points/components/antd/PointOperationModals';
import { PointsTable } from '@/features/points/components/antd/PointsTable';
import { PointsToolbar } from '@/features/points/components/antd/PointsToolbar';
import {
  defaultPointSort,
  emptyPointFilters,
  filterPoints,
  getPageCount,
  hasPointFilters,
  resolvePointOperationScope,
  sortPoints,
  validatePointFilters,
  type PointFilters,
  type PointPageSize,
  type PointSort,
} from '@/features/points/point-list-model';

function sourceName(point: Point): string {
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

export function PointsPageAntd() {
  const { message } = AntdApp.useApp();
  const pageRef = useRef<HTMLElement>(null);
  const [availableHeight, setAvailableHeight] = useState<number>();
  const [points, setPoints] = useState<readonly Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<PointFilters>(emptyPointFilters);
  const [appliedFilters, setAppliedFilters] = useState<PointFilters>(emptyPointFilters);
  const [hasAppliedQuery, setHasAppliedQuery] = useState(false);
  const [sort, setSort] = useState<PointSort>(defaultPointSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PointPageSize>(20);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<PointId>>(new Set());
  const [adding, setAdding] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);

  useEffect(() => {
    const element = pageRef.current;
    if (!element) return;
    const measure = () =>
      setAvailableHeight(Math.max(560, window.innerHeight - element.getBoundingClientRect().top));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await pointService.listPoints();
    setLoading(false);
    if (result.status === 'failure') {
      setLoadError(result.error.message);
      return;
    }
    setPoints(result.value);
    const existing = new Set(result.value.map((point) => point.id));
    setSelectedIds((current) => new Set([...current].filter((id) => existing.has(id))));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sourceOptions = useMemo(
    () => [...new Set(points.map(sourceName))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [points],
  );
  const filteredPoints = useMemo(
    () => filterPoints(points, appliedFilters, sourceName),
    [appliedFilters, points],
  );
  const sortedPoints = useMemo(() => sortPoints(filteredPoints, sort), [filteredPoints, sort]);
  const pageCount = getPageCount(sortedPoints.length, pageSize);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pagePoints = useMemo(
    () => sortedPoints.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, sortedPoints],
  );
  const scope = useMemo(
    () => resolvePointOperationScope({ points, filteredPoints, selectedIds, hasAppliedQuery }),
    [filteredPoints, hasAppliedQuery, points, selectedIds],
  );
  const scopedPoints = useMemo(() => {
    const ids = new Set(scope.pointIds);
    return points.filter((point) => ids.has(point.id));
  }, [points, scope.pointIds]);

  function applySearch() {
    const error = validatePointFilters(draftFilters);
    if (error) {
      void message.error(error);
      return;
    }
    setAppliedFilters({ ...draftFilters });
    setHasAppliedQuery(hasPointFilters(draftFilters));
    setPage(1);
  }
  function resetSearch() {
    setDraftFilters(emptyPointFilters);
    setAppliedFilters(emptyPointFilters);
    setHasAppliedQuery(false);
    setSort(defaultPointSort);
    setPage(1);
  }
  async function changed(text: string) {
    void message.success(text);
    await refresh();
  }
  async function deleteOne(point: Point) {
    const result = await pointService.deletePoint(point.id);
    if (result.status === 'failure') {
      void message.error(result.error.message);
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(point.id);
      return next;
    });
    await changed(`已删除“${point.name}”。`);
  }

  return (
    <main
      className="points-antd-page"
      ref={pageRef}
      style={availableHeight ? { height: availableHeight } : undefined}
    >
      <PointsToolbar
        canReset={hasPointFilters(draftFilters) || hasAppliedQuery}
        draft={draftFilters}
        hasPoints={scope.total > 0}
        onAdd={() => setAdding(true)}
        onDelete={() => setDeleting(true)}
        onDraftChange={setDraftFilters}
        onExport={() => setExporting(true)}
        onReset={resetSearch}
        onSearch={applySearch}
        onTransform={() => setTransforming(true)}
        sourceOptions={sourceOptions}
      />
      {loadError && (
        <Alert
          action={
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()} size="small">
              重试
            </Button>
          }
          title={loadError}
          showIcon
          type="error"
        />
      )}
      <PointsTable
        emptyDescription={
          points.length === 0 ? '暂无点位，请先新增或导入。' : '没有符合筛选条件的点位。'
        }
        loading={loading}
        onDelete={deleteOne}
        onEdit={setEditingPoint}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSelectionChange={setSelectedIds}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        page={page}
        pageSize={pageSize}
        points={pagePoints}
        selectedIds={selectedIds}
        sort={sort}
        sourceName={sourceName}
        total={sortedPoints.length}
      />
      <AddPointModal
        onChanged={(text) => void changed(text)}
        onClose={() => setAdding(false)}
        open={adding}
      />
      <TransformPointsModal
        onChanged={(text) => void changed(text)}
        onClose={() => setTransforming(false)}
        open={transforming}
        scope={scope}
      />
      <ExportPointsModal
        onClose={() => setExporting(false)}
        open={exporting}
        points={scopedPoints}
        scope={scope}
      />
      <DeletePointsModal
        onClose={() => setDeleting(false)}
        onDeleted={(successIds, text) => {
          setSelectedIds((current) => {
            const next = new Set(current);
            successIds.forEach((id) => next.delete(id as PointId));
            return next;
          });
          void changed(text);
        }}
        open={deleting}
        scope={scope}
      />
      {editingPoint && (
        <EditPointDrawer
          key={editingPoint.id}
          onClose={() => setEditingPoint(null)}
          onSaved={(point) => {
            setEditingPoint(null);
            void changed(`已保存“${point.name}”。`);
          }}
          point={editingPoint}
          sourceName={sourceName}
        />
      )}
    </main>
  );
}
