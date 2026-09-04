import type { MapPointActivateHandler, MapRenderGroup, MapRenderPoint } from './map-adapter';

export function createMarkerDetailContent(
  point: MapRenderPoint,
  className: string,
): HTMLElement {
  const content = document.createElement('article');
  content.className = className;

  const title = document.createElement('strong');
  title.textContent = point.name;
  const original = document.createElement('span');
  original.textContent = `原始坐标：${point.originalCoordinate}`;
  const system = document.createElement('span');
  system.textContent = `展示坐标系：${point.displaySystem}`;
  const coordinate = document.createElement('code');
  coordinate.textContent = `${point.position[0]}, ${point.position[1]}`;

  content.append(title, original, system, coordinate);
  return content;
}

export function createMarkerHoverContent(
  group: MapRenderGroup,
  onActivatePoint: MapPointActivateHandler,
  onPointerEnter: () => void,
  onPointerLeave: () => void,
): HTMLElement {
  const content = document.createElement('article');
  content.className = 'map-marker-hover';
  content.addEventListener('mouseenter', onPointerEnter);
  content.addEventListener('mouseleave', onPointerLeave);

  if (group.points.length > 1) {
    const title = document.createElement('strong');
    title.className = 'map-marker-hover__title';
    title.textContent = `该位置共 ${group.points.length} 个点位`;
    content.append(title);
  }

  const list = document.createElement('div');
  list.className = 'map-marker-hover__list';
  group.points.forEach((point) => {
    const item = document.createElement('button');
    item.className = 'map-marker-hover__item';
    item.type = 'button';
    item.textContent = point.name;
    item.title = point.name;
    if (point.id === group.activePointId) {
      item.classList.add('is-active');
      item.setAttribute('aria-current', 'true');
    }
    item.addEventListener('click', () => onActivatePoint(point.id));
    list.append(item);
  });
  content.append(list);
  return content;
}

export function createMarkerIconUrl(active: boolean): string {
  const accent = active ? '#fa8c16' : '#1677ff';
  const halo = active
    ? '<circle cx="20" cy="18" r="17" fill="#fa8c16" fill-opacity="0.2"/>'
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">${halo}<path d="M20 3C10.61 3 3 10.61 3 20c0 12.15 17 23 17 23s17-10.85 17-23C37 10.61 29.39 3 20 3Z" fill="${accent}" stroke="#fff" stroke-width="3"/><circle cx="20" cy="20" r="6" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
