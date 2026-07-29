import { NavLink, Outlet } from 'react-router-dom';
import { mapNavigation } from '@/config/routes';

export function MapPageLayout() {
  return (
    <div className="map-shell">
      <aside className="map-sidebar">
        <div>
          <p className="eyebrow">地图验证</p>
          <h1 className="map-sidebar__title">选择地图平台</h1>
          <p className="map-sidebar__description">
            Phase 1 只提供页面结构，不加载地图 SDK 或读取平台凭据。
          </p>
        </div>

        <nav className="map-navigation" aria-label="地图平台">
          {mapNavigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'map-navigation__link is-active' : 'map-navigation__link'
              }
              key={item.path}
              to={item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="map-content">
        <Outlet />
      </section>
    </div>
  );
}
