import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  MapPin,
  FileSearch,
  BookOpen,
  Shield,
  Users,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useApp } from '../store/appStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analysis', label: 'Image Analysis', icon: Camera },
  { path: '/gps', label: 'GPS Data', icon: MapPin },
  { path: '/registry', label: 'Land Registry', icon: FileSearch },
  { path: '/nyxen', label: 'Nyxen Generator', icon: BookOpen },
  { path: '/audit', label: 'Audit Reports', icon: Shield },
];

export default function Sidebar() {
  const { state, logout, dispatch } = useApp();
  const location = useLocation();

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      dispatch({ type: 'SET_SIDEBAR', payload: false });
    }
  };

  return (
    <>
      {state.sidebarOpen && (
        <div
          className="slide-panel__backdrop slide-panel__backdrop--visible"
          onClick={closeSidebar}
          style={{ zIndex: 99 }}
        />
      )}
      <aside className={`sidebar ${state.sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand" style={{ justifyContent: 'space-between', padding: 'var(--space-lg) var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="sidebar__brand-name" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>Nyxen</div>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            className="btn-icon"
            style={{ color: 'var(--color-text-tertiary)' }}
            title={state.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon size={20} className="sidebar__nav-icon" />
                {item.label}
              </NavLink>
            );
          })}
          {state.user?.role === 'Admin' && (
            <NavLink
              to="/users"
              className={`sidebar__nav-item ${location.pathname === '/users' ? 'sidebar__nav-item--active' : ''}`}
              onClick={closeSidebar}
            >
              <Users size={20} className="sidebar__nav-icon" />
              User Management
            </NavLink>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {state.user?.name?.charAt(0) || 'R'}
            </div>
            <div style={{ flex: 1 }}>
              <div className="sidebar__user-name">{state.user?.name || 'User'}</div>
              <div className="sidebar__user-role">{state.user?.role || '—'}</div>
            </div>
            <button
              onClick={logout}
              style={{ color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
