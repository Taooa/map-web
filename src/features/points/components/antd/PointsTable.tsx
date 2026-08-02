import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Empty, Pagination, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import { useEffect, useMemo, useRef, useState, type Key } from 'react';
import type { Point, PointId } from '@/domain';
import { fullCoordinateText, type DisplayCoordinateSystem } from '../../point-coordinate-display';
import {
  formatPointDate,
  pointPageSizes,
  type PointPageSize,
  type PointSort,
} from '../../point-list-model';

const coordinateSystems: readonly DisplayCoordinateSystem[] = [
  'WGS84',
  'GCJ02',
  'BD09',
  'SHANGHAI2000',
];

function CoordinateCell({
  point,
  system,
}: {
  readonly point: Point;
  readonly system: DisplayCoordinateSystem;
}) {
  const value = fullCoordinateText(point, system);
  if (!value) return <span className="points-antd-empty-coordinate">—</span>;
  const original = point.coordinates.original.system === system;
  return (
    <Tooltip title={original ? '原始输入，禁止被转换结果覆盖' : '转换结果或手动维护值'}>
      <span className="points-antd-coordinate">
        {value}
        {original && <Tag color="cyan">原始</Tag>}
      </span>
    </Tooltip>
  );
}

export function PointsTable({
  points,
  total,
  page,
  pageSize,
  selectedIds,
  sort,
  loading,
  emptyDescription,
  sourceName,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onSelectionChange,
  onEdit,
  onDelete,
}: {
  readonly points: readonly Point[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: PointPageSize;
  readonly selectedIds: ReadonlySet<PointId>;
  readonly sort: PointSort;
  readonly loading: boolean;
  readonly emptyDescription: string;
  readonly sourceName: (point: Point) => string;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: PointPageSize) => void;
  readonly onSortChange: (sort: PointSort) => void;
  readonly onSelectionChange: (ids: ReadonlySet<PointId>) => void;
  readonly onEdit: (point: Point) => void;
  readonly onDelete: (point: Point) => Promise<void>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(360);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setBodyHeight(Math.max(220, host.clientHeight - 58));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo<TableColumnsType<Point>>(
    () => [
      {
        title: '点位名称',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 180,
        ellipsis: true,
      },
      {
        title: '来源',
        key: 'source',
        width: 130,
        ellipsis: true,
        render: (_, point) => sourceName(point),
      },
      ...coordinateSystems.map((system) => ({
        title: system === 'SHANGHAI2000' ? '上海2000' : system,
        key: system,
        align: 'center' as const,
        width: 210,
        render: (_: unknown, point: Point) => <CoordinateCell point={point} system={system} />,
      })),
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        align: 'center',
        key: 'createdAt',
        width: 174,
        sorter: true,
        sortDirections: ['ascend', 'descend', 'ascend'],
        sortOrder: sort.field === 'createdAt' ? `${sort.direction}end` : null,
        render: (value: string) => formatPointDate(value),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 174,
        align: 'center',
        sorter: true,
        sortDirections: ['ascend', 'descend', 'ascend'],
        sortOrder: sort.field === 'updatedAt' ? `${sort.direction}end` : null,
        render: (value: string) => formatPointDate(value),
      },
      {
        title: '操作',
        key: 'actions',
        align: 'center',
        fixed: 'right',
        width: 88,
        render: (_, point) => (
          <Space className="points-antd-row-actions" size={2}>
            <Tooltip title="编辑">
              <Button
                aria-label="编辑"
                icon={<EditOutlined />}
                onClick={() => onEdit(point)}
                shape="circle"
                size="small"
                type="text"
              />
            </Tooltip>
            <Popconfirm
              cancelText="取消"
              description="删除后无法恢复。"
              okButtonProps={{ danger: true }}
              okText="确认删除"
              onConfirm={() => void onDelete(point)}
              title={`确认删除“${point.name}”？`}
            >
              <Tooltip title="删除">
                <Button
                  aria-label="删除"
                  danger
                  icon={<DeleteOutlined />}
                  shape="circle"
                  size="small"
                  type="text"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onDelete, onEdit, sort.direction, sort.field, sourceName],
  );

  const handleChange: TableProps<Point>['onChange'] = (_, __, sorter) => {
    const active = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = active?.columnKey;
    if (active && (field === 'createdAt' || field === 'updatedAt') && active.order) {
      onSortChange({ field, direction: active.order === 'ascend' ? 'asc' : 'desc' });
    }
  };

  return (
    <section className="points-antd-list" aria-label="点位列表">
      <div className="points-antd-table-host" ref={hostRef}>
        <Table<Point>
          columns={columns}
          dataSource={[...points]}
          locale={{
            emptyText: (
              <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          }}
          loading={loading}
          onChange={handleChange}
          pagination={false}
          tableLayout="fixed"
          rowKey="id"
          rowSelection={{
            preserveSelectedRowKeys: true,
            selectedRowKeys: [...selectedIds] as Key[],
            getCheckboxProps: (point) => ({ 'aria-label': `选择 ${point.name}` }),
            getTitleCheckboxProps: () => ({
              'aria-label': '选择当前页',
            }),
            onSelect: (point, selected) => {
              const next = new Set(selectedIds);
              if (selected) next.add(point.id);
              else next.delete(point.id);
              onSelectionChange(next);
            },
            onSelectAll: (selected) => {
              const next = new Set(selectedIds);
              points.forEach((point) => {
                if (selected) next.add(point.id);
                else next.delete(point.id);
              });
              onSelectionChange(next);
            },
          }}
          scroll={{ x: 1618, y: bodyHeight }}
          size="middle"
          sticky
        />
      </div>
      <div className="points-antd-pagination">
        <span>
          共 {total} 条，已选择 {selectedIds.size} 条
        </span>
        <Pagination
          current={page}
          onChange={(nextPage, nextSize) => {
            if (nextSize !== pageSize) onPageSizeChange(nextSize as PointPageSize);
            else onPageChange(nextPage);
          }}
          pageSize={pageSize}
          pageSizeOptions={pointPageSizes.map(String)}
          showQuickJumper
          showSizeChanger
          total={total}
        />
      </div>
    </section>
  );
}
