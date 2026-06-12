import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Menu, ChevronDown, Building2, MapPin,
  Camera, BookOpen, Shield, BarChart3, X, ArrowRight,
  FileSearch, Compass,
} from 'lucide-react';
import { useApp } from '../store/appStore';
import { api } from '../services/api';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of all projects and activities' },
  '/analysis': { title: 'Image Analysis', subtitle: 'AI-powered construction image analysis' },
  '/gps': { title: 'GPS Data', subtitle: 'Validate site coordinates and boundaries' },
  '/registry': { title: 'Land Registry', subtitle: 'Cross-reference land records and surveys' },
  '/nyxen': { title: 'Nyxen Generator', subtitle: 'Measurement book generation and management' },
  '/audit': { title: 'Audit Reports', subtitle: 'Compliance audit and verification reports' },
  '/users': { title: 'User Management', subtitle: 'Manage team members and access roles' },
};

interface SearchResult {
  id: string;
  type: 'project' | 'registry' | 'feature';
  title: string;
  subtitle: string;
  path: string;
  icon: typeof Building2;
  iconColor: string;
}

const FEATURES: SearchResult[] = [
  {
    id: 'feat-dashboard', type: 'feature', title: 'Dashboard',
    subtitle: 'Overview of all projects and activities',
    path: '/dashboard', icon: BarChart3, iconColor: 'var(--color-accent-blue)',
  },
  {
    id: 'feat-analysis', type: 'feature', title: 'Image Analysis',
    subtitle: 'AI-powered construction image analysis & photogrammetry',
    path: '/analysis', icon: Camera, iconColor: 'var(--color-accent-purple)',
  },
  {
    id: 'feat-gps', type: 'feature', title: 'GPS Verification',
    subtitle: 'Validate site coordinates, boundaries & geolocation',
    path: '/gps', icon: Compass, iconColor: 'var(--color-accent-emerald)',
  },
  {
    id: 'feat-registry', type: 'feature', title: 'Land Registry',
    subtitle: 'Cross-reference land records, surveys & ownership',
    path: '/registry', icon: FileSearch, iconColor: 'var(--color-accent-amber)',
  },
  {
    id: 'feat-nyxen', type: 'feature', title: 'Nyxen Generator',
    subtitle: 'Measurement book generation, CPWD DSR items',
    path: '/nyxen', icon: BookOpen, iconColor: 'var(--color-accent-blue)',
  },
  {
    id: 'feat-audit', type: 'feature', title: 'Audit Reports',
    subtitle: 'Compliance audit, verification & inspection reports',
    path: '/audit', icon: Shield, iconColor: 'var(--color-accent-red)',
  },
];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const pageInfo = pageTitles[location.pathname] || { title: 'Nyxen', subtitle: '' };

  // Load projects if authenticated and not loaded yet
  useEffect(() => {
    if (state.isAuthenticated && state.projects.length === 0) {
      api.getProjects()
        .then((data) => {
          dispatch({ type: 'SET_PROJECTS', payload: data });
          if (data.length > 0 && !state.currentProject) {
            dispatch({ type: 'SET_CURRENT_PROJECT', payload: data[0] });
          }
        })
        .catch(console.error);
    }
  }, [state.isAuthenticated, state.projects.length, state.currentProject, dispatch]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
    setQuery('');
  }, [location.pathname]);

  const performSearch = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const allResults: SearchResult[] = [];

    // 1. Search features
    const featureMatches = FEATURES.filter(
      (f) =>
        f.title.toLowerCase().includes(trimmed) ||
        f.subtitle.toLowerCase().includes(trimmed)
    );
    allResults.push(...featureMatches);

    // 2. Search projects from API
    try {
      const projects = await api.getProjects();
      const projectMatches = projects
        .filter(
          (p: any) =>
            p.name?.toLowerCase().includes(trimmed) ||
            p.location?.address?.toLowerCase().includes(trimmed) ||
            p.surveyNumber?.toLowerCase().includes(trimmed) ||
            p.contractor?.toLowerCase().includes(trimmed) ||
            p.description?.toLowerCase().includes(trimmed)
        )
        .map((p: any): SearchResult => ({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: p.location?.address || p.surveyNumber || '',
          path: '/nyxen',
          icon: Building2,
          iconColor: p.status === 'completed'
            ? 'var(--color-accent-emerald)'
            : p.status === 'planning'
            ? 'var(--color-accent-amber)'
            : 'var(--color-accent-blue)',
        }));
      allResults.push(...projectMatches);
    } catch {
      // silently fail
    }

    // 3. Search land registry via API (try survey number match)
    try {
      const registryResults = await api.searchRegistry(trimmed);
      if (registryResults && Array.isArray(registryResults.results)) {
        const registryMatches = registryResults.results
          .slice(0, 5)
          .map((r: any): SearchResult => ({
            id: r.ulpin || r.surveyNumber,
            type: 'registry',
            title: `${r.surveyNumber} — ${r.village}`,
            subtitle: `${r.ownerName} · ${r.district}, ${r.state} · ${r.areaHectares} ha · ${r.landUse}`,
            path: '/registry',
            icon: MapPin,
            iconColor: r.encumbrances?.length
              ? 'var(--color-accent-red)'
              : 'var(--color-accent-emerald)',
          }));
        allResults.push(...registryMatches);
      }
    } catch {
      // silently fail
    }

    setResults(allResults);
    setActiveIndex(-1);
    setIsOpen(allResults.length > 0);
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    setIsOpen(true);
    debounceTimer.current = setTimeout(() => performSearch(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    if (result.type === 'project') {
      const proj = state.projects.find(p => p.id === result.id);
      if (proj) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: proj });
      }
    }
    navigate(result.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        performSearch(query);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Group results by type for display
  const groupedResults = {
    feature: results.filter((r) => r.type === 'feature'),
    project: results.filter((r) => r.type === 'project'),
    registry: results.filter((r) => r.type === 'registry'),
  };

  const groupLabels: Record<string, string> = {
    feature: 'Features & Pages',
    project: 'Projects',
    registry: 'Land Registry',
  };

  // Flatten for keyboard index tracking
  let flatIndex = -1;

  return (
    <header className="header">
      <div className="header__left">
        <button
          className="header__hamburger"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 className="header__title">{pageInfo.title}</h1>
          <p className="header__subtitle">{pageInfo.subtitle}</p>
        </div>

        {state.isAuthenticated && state.projects.length > 0 && (
          <div style={{ marginLeft: 'var(--space-xl)', minWidth: '220px' }}>
            <select
              className="select"
              style={{
                padding: '6px 36px 6px 12px',
                fontSize: 'var(--font-size-sm)',
                height: '36px',
                backgroundPosition: 'right 8px center',
                borderColor: 'var(--color-border)',
              }}
              value={state.currentProject?.id || ''}
              onChange={(e) => {
                const proj = state.projects.find(p => p.id === e.target.value);
                if (proj) {
                  dispatch({ type: 'SET_CURRENT_PROJECT', payload: proj });
                }
              }}
            >
              <option value="" disabled>Select project...</option>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="header__right">
        <div className="header__search" ref={searchRef}>
          <Search size={16} className="header__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="header__search-input"
            placeholder="Search projects, lands, features..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
          />
          {query && (
            <button className="header__search-clear" onClick={clearSearch}>
              <X size={14} />
            </button>
          )}

          {isOpen && (
            <div className="search-dropdown">
              {loading && results.length === 0 ? (
                <div className="search-dropdown__loading">
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                  <span>Searching...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="search-dropdown__empty">
                  <Search size={24} style={{ opacity: 0.3 }} />
                  <span>No results found for "{query}"</span>
                </div>
              ) : (
                <>
                  {(['feature', 'project', 'registry'] as const).map((group) => {
                    const items = groupedResults[group];
                    if (items.length === 0) return null;
                    return (
                      <div key={group} className="search-dropdown__group">
                        <div className="search-dropdown__group-label">
                          {groupLabels[group]}
                          <span className="search-dropdown__group-count">{items.length}</span>
                        </div>
                        {items.map((result) => {
                          flatIndex++;
                          const idx = flatIndex;
                          const Icon = result.icon;
                          return (
                            <button
                              key={result.id}
                              className={`search-dropdown__item ${idx === activeIndex ? 'search-dropdown__item--active' : ''}`}
                              onClick={() => handleSelect(result)}
                              onMouseEnter={() => setActiveIndex(idx)}
                            >
                              <div
                                className="search-dropdown__item-icon"
                                style={{
                                  background: `${result.iconColor}18`,
                                  color: result.iconColor,
                                }}
                              >
                                <Icon size={16} />
                              </div>
                              <div className="search-dropdown__item-content">
                                <div className="search-dropdown__item-title">{result.title}</div>
                                <div className="search-dropdown__item-subtitle">{result.subtitle}</div>
                              </div>
                              <ArrowRight size={14} className="search-dropdown__item-arrow" />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="search-dropdown__footer">
                    <span>
                      {results.length} result{results.length !== 1 ? 's' : ''} · Use ↑↓ to navigate · Enter to select
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="header__notification" ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
          >
            <Bell size={20} />
            <span className="header__notification-dot" />
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              width: 280, background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
              overflow: 'hidden',
            }}>
              <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                Notifications
              </div>
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                <Bell size={24} style={{ opacity: 0.3, margin: '0 auto var(--space-sm)' }} />
                <div>No new notifications</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            className="header__user-btn"
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
          >
            <div className="header__user-avatar">
              {state.user?.name?.charAt(0) || 'U'}
            </div>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
              {state.user?.name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)', transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              width: 220, background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
              overflow: 'hidden',
            }}>
              <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{state.user?.name || 'User'}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{state.user?.role || '—'}</div>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); dispatch({ type: 'LOGOUT' }); navigate('/login'); }}
                style={{
                  width: '100%', padding: 'var(--space-md) var(--space-lg)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,82,82,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <X size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
