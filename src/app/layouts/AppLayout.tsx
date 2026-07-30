import { NavLink, Outlet } from 'react-router-dom';
import { appNavigation } from '@/config/routes';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="app-brand" to="/" aria-label="地图工具首页">
          <img className="app-brand__logo" src="/brand/logo-192.png" alt="地图工具" />
          <span className="app-brand__text">
            <span className="app-brand__name">地图工具</span>
            <small>点位坐标转换与地图验证</small>
          </span>
        </NavLink>

        <nav className="app-navigation" aria-label="主导航">
          {appNavigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'app-navigation__link is-active' : 'app-navigation__link'
              }
              end={item.path === '/'}
              key={item.path}
              to={item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
