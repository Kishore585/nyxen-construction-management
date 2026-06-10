import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, MapPin, FileSearch, BarChart3, Info } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import ConfidenceGauge from '../components/ConfidenceGauge';
import { api } from '../services/api';
import { useApp } from '../store/appStore';

interface AuditData {
  id: string;
  projectId: string;
  overallScore: number;
  gpsValidation: { status: string; score: number; details: string };
  registryVerification: { status: string; score: number; details: string };
  measurementAccuracy: { status: string; score: number; details: string };
  findings: Array<{ severity: string; title: string; description: string; recommendation: string }>;
  recommendations: string[];
  generatedAt: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

export default function AuditPage() {
  const { state: appState } = useApp();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);

  const userRole = appState.user?.role?.toLowerCase() || '';
  const canGenerate = userRole !== 'jr. engineer';

  useEffect(() => {
    api.getProjects().then((data) => {
      setProjects(data.map((p: any) => ({ id: p.id, name: p.name })));
      if (data.length > 0) setSelectedProject(data[0].id);
    }).catch(console.error);
  }, []);

  const handleGenerate = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const data = await api.getAuditReport(selectedProject);
      setAuditData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pass') return 'badge--compliant';
    if (status === 'partial') return 'badge--warning';
    return 'badge--non-compliant';
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical') return <AlertTriangle size={16} style={{ color: 'var(--color-accent-red)' }} />;
    if (severity === 'warning') return <AlertTriangle size={16} style={{ color: 'var(--color-accent-amber)' }} />;
    return <Info size={16} style={{ color: 'var(--color-accent-blue)' }} />;
  };

  return (
    <div className="flex-col">
      {/* Controls */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <select className="select" style={{ minWidth: '300px' }} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {canGenerate ? (
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? <><div className="spinner" /> Generating...</> : <><Shield size={18} /> Generate Audit Report</>}
          </button>
        ) : (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: 'rgba(255, 171, 0, 0.1)',
            border: '1px solid rgba(255, 171, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-accent-amber)',
            fontSize: 'var(--font-size-sm)',
          }}>
            🔒 Jr. Engineers cannot generate audit reports — contact your Supervisor
          </div>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ width: 48, height: 48 }} />
        </div>
      )}

      {!auditData && !loading && (
        <div className="empty-state">
          <Shield size={64} className="empty-state__icon" />
          <p className="empty-state__text">No audit report generated</p>
          <p className="empty-state__hint">Select a project and click "Generate Audit Report"</p>
        </div>
      )}

      {auditData && !loading && (
        <>
          {/* Overall Score */}
          <div className="grid-4" style={{ alignItems: 'center' }}>
            <GlassCard style={{ gridColumn: 'span 1' }}>
              <div style={{ textAlign: 'center' }}>
                <ConfidenceGauge score={auditData.overallScore} size={160} label="Overall Score" />
              </div>
            </GlassCard>

            {/* Validation Cards */}
            <GlassCard title="GPS Validation" icon={MapPin} iconColor={auditData.gpsValidation.status === 'pass' ? 'emerald' : auditData.gpsValidation.status === 'partial' ? 'amber' : 'red'}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: auditData.gpsValidation.score >= 70 ? 'var(--color-accent-emerald)' : auditData.gpsValidation.score >= 40 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)' }}>
                  {auditData.gpsValidation.score}
                </div>
              </div>
              <span className={`badge ${getStatusBadge(auditData.gpsValidation.status)}`} style={{ display: 'flex', justifyContent: 'center', textTransform: 'capitalize' }}>
                {auditData.gpsValidation.status}
              </span>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
                {auditData.gpsValidation.details}
              </p>
            </GlassCard>

            <GlassCard title="Registry Check" icon={FileSearch} iconColor={auditData.registryVerification.status === 'pass' ? 'emerald' : auditData.registryVerification.status === 'partial' ? 'amber' : 'red'}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: auditData.registryVerification.score >= 70 ? 'var(--color-accent-emerald)' : auditData.registryVerification.score >= 40 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)' }}>
                  {auditData.registryVerification.score}
                </div>
              </div>
              <span className={`badge ${getStatusBadge(auditData.registryVerification.status)}`} style={{ display: 'flex', justifyContent: 'center', textTransform: 'capitalize' }}>
                {auditData.registryVerification.status}
              </span>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
                {auditData.registryVerification.details}
              </p>
            </GlassCard>

            <GlassCard title="Measurement" icon={BarChart3} iconColor={auditData.measurementAccuracy.status === 'pass' ? 'emerald' : auditData.measurementAccuracy.status === 'partial' ? 'amber' : 'red'}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: auditData.measurementAccuracy.score >= 70 ? 'var(--color-accent-emerald)' : auditData.measurementAccuracy.score >= 40 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)' }}>
                  {auditData.measurementAccuracy.score}
                </div>
              </div>
              <span className={`badge ${getStatusBadge(auditData.measurementAccuracy.status)}`} style={{ display: 'flex', justifyContent: 'center', textTransform: 'capitalize' }}>
                {auditData.measurementAccuracy.status}
              </span>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
                {auditData.measurementAccuracy.details}
              </p>
            </GlassCard>
          </div>

          {/* Findings */}
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <GlassCard title="Audit Findings" subtitle={`${auditData.findings.length} finding${auditData.findings.length !== 1 ? 's' : ''}`} icon={AlertTriangle} iconColor="amber">
              {auditData.findings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-accent-emerald)' }}>
                  <CheckCircle size={36} style={{ margin: '0 auto var(--space-md)' }} />
                  <p>No issues found</p>
                </div>
              ) : (
                <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                  {auditData.findings.map((f, i) => (
                    <div key={i} className={`finding-card finding-card--${f.severity}`}>
                      <div className="finding-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getSeverityIcon(f.severity)}
                        {f.title}
                      </div>
                      <p className="finding-card__desc">{f.description}</p>
                      <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-blue)' }}>
                        💡 {f.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard title="Recommendations" icon={CheckCircle} iconColor="emerald">
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                {auditData.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start', padding: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', background: 'var(--color-accent-blue-dim)', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {rec}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                Report ID: {auditData.id}<br />
                Generated: {new Date(auditData.generatedAt).toLocaleString('en-IN')}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
