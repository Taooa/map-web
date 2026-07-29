import { NavLink, Outlet } from 'react-router-dom';
import { appNavigation } from '@/config/routes';

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="app-brand" to="/" aria-label="Coordinate Toolkit 首页">
          <span className="app-brand__mark" aria-hidden="true">
            CT
          </span>
          <span>Coordinate Toolkit</span>
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
