import { useState, useEffect } from 'react';
import { FileSearch, Search, MapPin, User, AlertTriangle, CheckCircle, Scale, Map } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import GlassCard from '../components/GlassCard';
import { api } from '../services/api';
import { useApp } from '../store/appStore';

interface RegistryResult {
  surveyNumber: string; state: string; district: string; taluk: string; village: string;
  ownerName: string; areaHectares: number; areaSqm: number; landUse: string;
  encumbrances: string[]; registrationDate: string; ulpin: string;
  hasDisputes: boolean;
  boundaryPolygon?: [number, number][];
}

/** Helper: calculate center of a polygon */
function getPolygonCenter(polygon: [number, number][]): [number, number] {
  const len = polygon.length;
  const lat = polygon.reduce((sum, p) => sum + p[0], 0) / len;
  const lng = polygon.reduce((sum, p) => sum + p[1], 0) / len;
  return [lat, lng];
}

/** Helper component to fit the map to the polygon bounds */
function FitBounds({ polygon }: { polygon: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (polygon.length > 0) {
      const latLngs = polygon.map(([lat, lng]) => [lat, lng] as [number, number]);
      map.fitBounds(latLngs, { padding: [40, 40], maxZoom: 17 });
    }
  }, [polygon, map]);
  return null;
}

export default function RegistryPage() {
  const { state: appState } = useApp();
  const [surveyNumber, setSurveyNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [results, setResults] = useState<RegistryResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMapFor, setShowMapFor] = useState<string | null>(null);

  const loadActiveProjectRegistry = () => {
    if (appState.currentProject) {
      setSurveyNumber(appState.currentProject.surveyNumber || '');
    }
  };

  useEffect(() => {
    loadActiveProjectRegistry();
  }, [appState.currentProject]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyNumber.trim()) return;

    setLoading(true);
    try {
      const data = await api.searchRegistry(surveyNumber, district || undefined, state || undefined);
      setResults(data.results || []);
      setSearched(true);
      setShowMapFor(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const quickSearches = [
    { label: 'SY-45/1 (Jayanagar)', value: 'SY-45/1' },
    { label: 'SY-112/A (Hebbal)', value: 'SY-112/A' },
    { label: 'GT-300/A (Baner)', value: 'GT-300/A' },
    { label: 'KH-1024/1 (Gomti Nagar)', value: 'KH-1024/1' },
    { label: 'SY-780/A (Koramangala)', value: 'SY-780/A' },
  ];

  const landUseColors: Record<string, string> = {
    residential: 'var(--color-accent-blue)',
    commercial: 'var(--color-accent-purple)',
    industrial: 'var(--color-accent-amber)',
    agricultural: 'var(--color-accent-emerald)',
    mixed: '#ff80ab',
    institutional: '#80d8ff',
  };

  const polygonColors: Record<string, string> = {
    residential: '#00d4ff',
    commercial: '#a855f7',
    industrial: '#fbbf24',
    agricultural: '#10b981',
    mixed: '#ff80ab',
    institutional: '#80d8ff',
  };

  return (
    <div className="flex-col">
      {/* Search */}
      <GlassCard title="Land Registry Search" subtitle="Cross-reference survey numbers with official records" icon={FileSearch} iconColor="purple">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 2, minWidth: '200px' }}>
            <label className="input-label">Survey Number</label>
            <input className="input" type="text" value={surveyNumber} onChange={(e) => setSurveyNumber(e.target.value)} placeholder="e.g. SY-45/1, GT-300/A, KH-1024/1" required />
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="input-label">District (optional)</label>
            <input className="input" type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Pune" />
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="input-label">State (optional)</label>
            <select className="select" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">All States</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '42px' }}>
            {loading ? <div className="spinner" /> : <><Search size={18} /> Search</>}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
          {appState.currentProject && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={loadActiveProjectRegistry}
              style={{ fontSize: 'var(--font-size-xs)', border: '1px dashed rgba(255,255,255,0.15)' }}
            >
              Autofill Active Project ({appState.currentProject.surveyNumber})
            </button>
          )}
          {quickSearches.map((q) => (
            <button key={q.value} className="btn btn-ghost btn-sm" onClick={() => setSurveyNumber(q.value)} style={{ fontSize: 'var(--font-size-xs)' }}>
              {q.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Results */}
      {searched && results.length === 0 && (
        <div className="empty-state">
          <FileSearch size={48} className="empty-state__icon" />
          <p className="empty-state__text">No records found</p>
          <p className="empty-state__hint">Try a different survey number or adjust filters</p>
        </div>
      )}

      {results.map((r) => (
        <GlassCard key={r.surveyNumber} glowColor={r.hasDisputes ? 'red' : 'emerald'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{r.surveyNumber}</h3>
                <span className={`badge ${r.hasDisputes ? 'badge--non-compliant' : 'badge--compliant'}`}>
                  {r.hasDisputes ? '⚠ Disputed' : '✓ Clear'}
                </span>
                <span className="badge badge--info" style={{ borderColor: landUseColors[r.landUse] + '33', color: landUseColors[r.landUse], background: landUseColors[r.landUse] + '1a' }}>
                  {r.landUse}
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {r.village}, {r.taluk}, {r.district} — {r.state}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              {r.boundaryPolygon && r.boundaryPolygon.length > 0 && (
                <button
                  className={`btn btn-sm ${showMapFor === r.surveyNumber ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setShowMapFor(showMapFor === r.surveyNumber ? null : r.surveyNumber)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Map size={14} />
                  {showMapFor === r.surveyNumber ? 'Hide Map' : 'View on Map'}
                </button>
              )}
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                ULPIN: {r.ulpin}
              </div>
            </div>
          </div>

          {/* Map View */}
          {showMapFor === r.surveyNumber && r.boundaryPolygon && r.boundaryPolygon.length > 0 && (
            <div className="map-container" style={{ height: 350, marginTop: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <MapContainer
                center={getPolygonCenter(r.boundaryPolygon)}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds polygon={r.boundaryPolygon} />
                <Polygon
                  positions={r.boundaryPolygon}
                  pathOptions={{
                    color: polygonColors[r.landUse] || '#00d4ff',
                    fillColor: polygonColors[r.landUse] || '#00d4ff',
                    fillOpacity: 0.2,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div style={{ color: '#333', fontSize: '13px' }}>
                      <strong>{r.surveyNumber}</strong> — {r.village}<br />
                      Owner: {r.ownerName}<br />
                      Area: {r.areaHectares} hectares<br />
                      Land Use: {r.landUse}
                    </div>
                  </Popup>
                </Polygon>
              </MapContainer>
            </div>
          )}

          <div className="summary-grid" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="summary-item">
              <div className="summary-item__label"><User size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />Owner</div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{r.ownerName}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item__label"><Scale size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />Area</div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{r.areaHectares} hectares ({r.areaSqm.toLocaleString()} sqm)</div>
            </div>
            <div className="summary-item">
              <div className="summary-item__label"><MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />Registration</div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{new Date(r.registrationDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>

          {/* Encumbrances */}
          {r.encumbrances.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--color-accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> Encumbrances / Restrictions
              </div>
              {r.encumbrances.map((enc, i) => (
                <div key={i} className="finding-card finding-card--warning" style={{ marginBottom: 'var(--space-sm)' }}>
                  <p className="finding-card__desc">{enc}</p>
                </div>
              ))}
            </div>
          )}

          {r.encumbrances.length === 0 && (
            <div style={{ marginTop: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-emerald)', fontSize: 'var(--font-size-sm)' }}>
              <CheckCircle size={16} /> No encumbrances or restrictions on record
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}
