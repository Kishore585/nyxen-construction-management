import { useState, useEffect } from 'react';
import { MapPin, Search, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import GlassCard from '../components/GlassCard';
import ConfidenceGauge from '../components/ConfidenceGauge';
import { api } from '../services/api';

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Helper component to recenter the map when coordinates change */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

interface GPSResult {
  coordinates: { latitude: number; longitude: number };
  location: { address: string; city: string; state: string; area: string };
  parcelValidation: { isValid: boolean; distanceToBoundary: number; message: string; confidence: number };
  spoofingDetection: { isSuspicious: boolean; riskLevel: string; indicators: string[]; score: number };
  registryMatch: { surveyNumber: string; ownerName: string; area: number; district: string; state: string } | null;
}

export default function GPSPage() {
  const [lat, setLat] = useState('12.9250');
  const [lng, setLng] = useState('77.5838');
  const [surveyNumber, setSurveyNumber] = useState('SY-45/1');
  const [result, setResult] = useState<GPSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.verifyGPS(parseFloat(lat), parseFloat(lng), surveyNumber || undefined);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: 'Jayanagar (SY-45/1)', lat: '12.9250', lng: '77.5838', survey: 'SY-45/1' },
    { label: 'Hebbal (SY-112/A)', lat: '13.0358', lng: '77.5970', survey: 'SY-112/A' },
    { label: 'Baner (GT-300/A)', lat: '18.5596', lng: '73.7868', survey: 'GT-300/A' },
    { label: 'Gomti Nagar (KH-1024/1)', lat: '26.8467', lng: '80.9810', survey: 'KH-1024/1' },
    { label: 'Outside Parcel', lat: '12.9500', lng: '77.6200', survey: 'SY-45/1' },
  ];

  return (
    <div className="flex-col">
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Input Form */}
        <GlassCard title="GPS Verification" subtitle="Validate coordinates against land parcels" icon={MapPin} iconColor="emerald">
          <form onSubmit={handleVerify} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <div className="grid-2" style={{ gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label">Latitude</label>
                <input className="input" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 12.9250" required />
              </div>
              <div className="input-group">
                <label className="input-label">Longitude</label>
                <input className="input" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 77.5838" required />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Survey Number (optional)</label>
              <input className="input" type="text" value={surveyNumber} onChange={(e) => setSurveyNumber(e.target.value)} placeholder="e.g. SY-45/1" />
            </div>

            <button type="submit" className="btn btn-emerald" disabled={loading} style={{ width: '100%' }}>
              {loading ? <><div className="spinner" /> Verifying...</> : <><Search size={18} /> Verify Coordinates</>}
            </button>
          </form>

          {/* Quick Presets */}
          <div style={{ marginTop: 'var(--space-xl)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setLat(p.lat); setLng(p.lng); setSurveyNumber(p.survey); }}
                  style={{ fontSize: 'var(--font-size-xs)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-accent-red-dim)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
              {error}
            </div>
          )}
        </GlassCard>

        {/* Real Map */}
        <GlassCard title="Location Map" subtitle={result ? result.location.address : 'Enter coordinates to view'} icon={MapPin} iconColor="blue">
          <div className="map-container" style={{ height: 350 }}>
            <MapContainer
              center={[parseFloat(lat) || 12.925, parseFloat(lng) || 77.5838]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {result && (
                <>
                  <RecenterMap lat={result.coordinates.latitude} lng={result.coordinates.longitude} />
                  <Marker position={[result.coordinates.latitude, result.coordinates.longitude]}>
                    <Popup>
                      <div style={{ color: '#333', fontSize: '13px' }}>
                        <strong>{result.location.address}</strong><br />
                        {result.coordinates.latitude.toFixed(6)}°N, {result.coordinates.longitude.toFixed(6)}°E<br />
                        <em>{result.location.city}, {result.location.state}</em>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </div>
        </GlassCard>
      </div>

      {/* Results */}
      {result && (
        <div className="grid-3" style={{ alignItems: 'start' }}>
          {/* Parcel Validation */}
          <GlassCard
            title="Parcel Validation"
            icon={result.parcelValidation.isValid ? CheckCircle : XCircle}
            iconColor={result.parcelValidation.isValid ? 'emerald' : 'red'}
          >
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <ConfidenceGauge score={result.parcelValidation.confidence} size={120} label="Validation Score" />
            </div>
            <div className={`badge ${result.parcelValidation.isValid ? 'badge--compliant' : 'badge--non-compliant'}`} style={{ margin: '0 auto var(--space-md)', display: 'flex', justifyContent: 'center' }}>
              {result.parcelValidation.isValid ? 'Within Boundary' : 'Outside Boundary'}
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              {result.parcelValidation.message}
            </p>
            {result.parcelValidation.distanceToBoundary >= 0 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-sm)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                Distance: {result.parcelValidation.distanceToBoundary}m
              </div>
            )}
          </GlassCard>

          {/* Spoofing Detection */}
          <GlassCard title="Spoofing Detection" icon={Shield} iconColor={result.spoofingDetection.isSuspicious ? 'red' : 'emerald'}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <ConfidenceGauge score={100 - result.spoofingDetection.score} size={120} label="Trust Score" />
            </div>
            <div className={`badge ${result.spoofingDetection.riskLevel === 'none' ? 'badge--compliant' : result.spoofingDetection.riskLevel === 'low' ? 'badge--warning' : 'badge--non-compliant'}`} style={{ margin: '0 auto var(--space-md)', display: 'flex', justifyContent: 'center', textTransform: 'capitalize' }}>
              Risk: {result.spoofingDetection.riskLevel}
            </div>
            {result.spoofingDetection.indicators.length > 0 ? (
              <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                {result.spoofingDetection.indicators.map((ind, i) => (
                  <div key={i} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-amber)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                    {ind}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-emerald)', textAlign: 'center' }}>
                No spoofing indicators detected
              </p>
            )}
          </GlassCard>

          {/* Registry Match */}
          <GlassCard title="Registry Match" icon={result.registryMatch ? CheckCircle : XCircle} iconColor={result.registryMatch ? 'emerald' : 'red'}>
            {result.registryMatch ? (
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                {[
                  { label: 'Survey Number', value: result.registryMatch.surveyNumber },
                  { label: 'Owner', value: result.registryMatch.ownerName },
                  { label: 'Area', value: `${result.registryMatch.area} hectares` },
                  { label: 'District', value: result.registryMatch.district },
                  { label: 'State', value: result.registryMatch.state },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                <XCircle size={36} style={{ color: 'var(--color-accent-red)', opacity: 0.5, margin: '0 auto var(--space-md)' }} />
                <p style={{ fontSize: 'var(--font-size-sm)' }}>No registry record found</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
