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
  getPageCount,
  hasPointFilters,
  validatePointFilters,
  type PointFilters,
  type PointOperationScope,
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
  const [matchingIds, setMatchingIds] = useState<readonly PointId[]>([]);
  const [total, setTotal] = useState(0);
  const [sourceOptions, setSourceOptions] = useState<readonly string[]>([]);
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
  const [exportPoints, setExportPoints] = useState<readonly Point[]>([]);
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
    const toIso = (value: string) => value ? new Date(value).toISOString() : undefined;
    const createdFrom = toIso(appliedFilters.createdFrom);
    const createdTo = toIso(appliedFilters.createdTo);
    const updatedFrom = toIso(appliedFilters.updatedFrom);
    const updatedTo = toIso(appliedFilters.updatedTo);
    const result = await pointService.listPointPage({
      search: appliedFilters.name,
      source: appliedFilters.source,
      ...(createdFrom ? { createdFrom } : {}),
      ...(createdTo ? { createdTo } : {}),
      ...(updatedFrom ? { updatedFrom } : {}),
      ...(updatedTo ? { updatedTo } : {}),
      sortField: sort.field,
      sortDirection: sort.direction,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });
    setLoading(false);
    if (result.status === 'failure') {
      setLoadError(result.error.message);
      return;
    }
    setPoints(result.value.points);
    setMatchingIds(result.value.pointIds);
    setTotal(result.value.total);
    setSourceOptions(result.value.sourceOptions);
    const existing = new Set(result.value.pointIds);
    setSelectedIds((current) => new Set([...current].filter((id) => existing.has(id))));
  }, [appliedFilters, page, pageSize, sort]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pageCount = getPageCount(total, pageSize);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const scope = useMemo(
    (): PointOperationScope => {
      const selected = [...selectedIds];
      if (selected.length > 0) {
        return { type: 'selected', pointIds: selected, total: selected.length, label: '已选择' };
      }
      return {
        type: hasAppliedQuery ? 'filtered' : 'all',
        pointIds: matchingIds,
        total: matchingIds.length,
        label: hasAppliedQuery ? '当前查询结果' : '全部数据',
      };
    },
    [hasAppliedQuery, matchingIds, selectedIds],
  );

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
  async function prepareExport() {
    setLoading(true);
    const result = await pointService.listPoints();
    setLoading(false);
    if (result.status === 'failure') { void message.error(result.error.message); return; }
    const ids = new Set(scope.pointIds);
    setExportPoints(result.value.filter((point) => ids.has(point.id)));
    setExporting(true);
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
        onExport={() => void prepareExport()}
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
        points={points}
        selectedIds={selectedIds}
        sort={sort}
        sourceName={sourceName}
        total={total}
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
        points={exportPoints}
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
