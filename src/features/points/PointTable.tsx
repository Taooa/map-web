import type { Point, PointId } from '@/domain';
import {
  coordinateFor,
  type DisplayCoordinateSystem,
} from './point-coordinate-display';
import type { PaginatedResult } from './point-list-model';

const displaySystems: readonly DisplayCoordinateSystem[] = [
  'WGS84',
  'GCJ02',
  'BD09',
  'SHANGHAI2000',
];

function CoordinateCell({
  point,
  system,
  onCopy,
}: {
  point: Point;
  system: DisplayCoordinateSystem;
  onCopy: (point: Point, system: DisplayCoordinateSystem) => void;
}) {
  const coordinate = coordinateFor(point, system);
  if (!coordinate) return <span className="coordinate-empty">—</span>;
  return (
    <button
      aria-label={`复制 ${point.name} ${system} 坐标`}
      className="coordinate-table-value"
      onClick={() => onCopy(point, system)}
      type="button"
    >
      {coordinate.kind === 'geographic' ? (
        <>
          <span>Lng: {coordinate.lng.toFixed(6)}</span>
          <span>Lat: {coordinate.lat.toFixed(6)}</span>
        </>
      ) : (
        <>
          <span>X: {coordinate.x.toFixed(3)}</span>
          <span>Y: {coordinate.y.toFixed(3)}</span>
        </>
      )}
    </button>
  );
}

export function PointTable({
  result,
  selectedIds,
  sourceName,
  formatDate,
  onToggle,
  onTogglePage,
  onCopy,
  onEdit,
  onDelete,
}: {
  result: PaginatedResult<Point>;
  selectedIds: ReadonlySet<PointId>;
  sourceName: (point: Point) => string;
  formatDate: (value: string) => string;
  onToggle: (id: PointId) => void;
  onTogglePage: (selected: boolean) => void;
  onCopy: (point: Point, system: DisplayCoordinateSystem) => void;
  onEdit: (point: Point) => void;
  onDelete: (point: Point) => void;
}) {
  const currentIds = result.items.map((point) => point.id);
  const selectedOnPage = currentIds.filter((id) => selectedIds.has(id)).length;
  const allCurrentSelected = currentIds.length > 0 && selectedOnPage === currentIds.length;

  return (
    <table className="point-table point-table--coordinates">
      <thead>
        <tr>
          <th className="checkbox-cell sticky-select">
            <input
              aria-label="选择当前页"
              checked={allCurrentSelected}
              onChange={(event) => onTogglePage(event.target.checked)}
              ref={(input) => {
                if (input) input.indeterminate = selectedOnPage > 0 && !allCurrentSelected;
              }}
              type="checkbox"
            />
          </th>
          <th className="sticky-name">点位名称</th>
          <th>来源</th>
          <th>WGS84</th>
          <th>GCJ02</th>
          <th>BD09</th>
          <th>SH2000</th>
          <th>更新时间</th>
          <th className="sticky-actions" aria-label="操作" />
        </tr>
      </thead>
      <tbody>
        {result.items.map((point) => (
          <tr className={selectedIds.has(point.id) ? 'is-selected' : ''} key={point.id}>
            <td className="checkbox-cell sticky-select">
              <input
                aria-label={`选择 ${point.name}`}
                checked={selectedIds.has(point.id)}
                onChange={() => onToggle(point.id)}
                type="checkbox"
              />
            </td>
            <td className="sticky-name">
              <strong className="point-table-name">{point.name}</strong>
            </td>
            <td>
              <span className="source-name">{sourceName(point)}</span>
            </td>
            {displaySystems.map((system) => (
              <td className="coordinate-table-cell" key={system}>
                <CoordinateCell onCopy={onCopy} point={point} system={system} />
              </td>
            ))}
            <td>
              <span className="updated-cell">{formatDate(point.updatedAt)}</span>
            </td>
            <td className="sticky-actions">
              <div className="row-actions">
                <button onClick={() => onEdit(point)} type="button">编辑</button>
                <button onClick={() => onDelete(point)} type="button">删除</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
