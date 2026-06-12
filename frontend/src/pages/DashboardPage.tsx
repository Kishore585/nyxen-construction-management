import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Camera, MapPin, BookOpen, Shield, TrendingUp,
  ArrowRight, DollarSign, CheckCircle, BarChart3, Plus, X,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import GlassCard from '../components/GlassCard';
import { api } from '../services/api';
import { useApp } from '../store/appStore';

interface DashboardData {
  projects: { total: number; active: number; completed: number; planning: number };
  financial: { totalBudget: number; totalSpent: number; utilizationPercent: number };
  measurements: { total: number; verified: number; aiEstimated: number; averageConfidence: number };
  projectSummaries: Array<{
    id: string; name: string; location: string; status: string;
    budget: number; spent: number; progress: number; complianceScore: number;
    measurementCount: number;
  }>;
  recentActivity: Array<{
    id: string; type: string; title: string; project: string;
    amount: number; timestamp: string;
  }>;
  categoryDistribution: Record<string, { count: number; amount: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const navigate = useNavigate();
  const { state: appState, dispatch } = useApp();

  const [projectForm, setProjectForm] = useState({
    name: '', description: '', surveyNumber: '', contractor: '', engineer: '',
    address: '', lat: '', lng: '', status: 'planning' as const,
    totalBudget: '', startDate: '', expectedCompletion: '',
  });

  const loadDashboard = () => {
    api.getDashboardStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!projectForm.name || !projectForm.surveyNumber || !projectForm.contractor || !projectForm.engineer) {
      setAddError('Name, Survey Number, Contractor, and Engineer are required');
      return;
    }
    setSaving(true);
    try {
      await api.createProject({
        name: projectForm.name,
        description: projectForm.description || `${projectForm.name} project`,
        surveyNumber: projectForm.surveyNumber,
        location: {
          lat: parseFloat(projectForm.lat) || 12.9716,
          lng: parseFloat(projectForm.lng) || 77.5946,
          address: projectForm.address || 'India',
        },
        contractor: projectForm.contractor,
        engineer: projectForm.engineer,
        status: projectForm.status,
        totalBudget: parseFloat(projectForm.totalBudget) || 5000000,
        startDate: projectForm.startDate || new Date().toISOString(),
        expectedCompletion: projectForm.expectedCompletion || new Date(Date.now() + 365 * 86400000).toISOString(),
      });
      setShowAddProject(false);
      setProjectForm({ name: '', description: '', surveyNumber: '', contractor: '', engineer: '', address: '', lat: '', lng: '', status: 'planning', totalBudget: '', startDate: '', expectedCompletion: '' });
      setLoading(true);
      loadDashboard();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (v: number) => {
    if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + ' Cr';
    if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + ' L';
    return '₹' + v.toLocaleString('en-IN');
  };

  const quickActions = [
    { label: 'Image Analysis', icon: Camera, path: '/analysis' },
    { label: 'GPS Data', icon: MapPin, path: '/gps' },
    { label: 'Nyxen Generator', icon: BookOpen, path: '/nyxen' },
    { label: 'Audit Report', icon: Shield, path: '/audit' },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'in-progress': 'badge--info',
      'completed': 'badge--compliant',
      'planning': 'badge--pending',
      'on-hold': 'badge--warning',
    };
    return map[status] || 'badge--pending';
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return Math.floor(days / 30) + ' months ago';
    if (days > 0) return days + ' days ago';
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return hours + ' hours ago';
    return 'Just now';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!data) {
    return <div className="empty-state"><p>Failed to load dashboard data.</p></div>;
  }

  return (
    <div className="flex-col">
      {/* Header with Add Project */}
      <div className="section-header">
        <div />
        {appState.user?.role === 'Admin' && (
          <button className="btn btn-primary" onClick={() => { setShowAddProject(true); setAddError(''); }}>
            <Plus size={18} /> New Project
          </button>
        )}
      </div>
      {/* Metric Cards */}
      <div className="grid-4">
        <MetricCard
          label="Active Projects"
          value={data.projects.active}
          icon={Building2}
          color="blue"
          trend="up"
          trendValue={`${data.projects.total} total`}
        />
        <MetricCard
          label="Avg Confidence"
          value={data.measurements.averageConfidence}
          unit="%"
          icon={TrendingUp}
          color="emerald"
          trend={data.measurements.averageConfidence >= 80 ? 'up' : 'neutral'}
          trendValue={`${data.measurements.verified} verified`}
        />
        <MetricCard
          label="Measurements"
          value={data.measurements.total}
          icon={BarChart3}
          color="purple"
          trend="neutral"
          trendValue={`${data.measurements.aiEstimated} AI`}
        />
        <MetricCard
          label="Total Spent"
          value={data.financial.totalSpent}
          icon={DollarSign}
          color="amber"
          trend="neutral"
          trendValue={`${data.financial.utilizationPercent}% utilized`}
        />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        {quickActions.map((qa) => {
          const Icon = qa.icon;
          return (
            <button key={qa.path} className="quick-action" onClick={() => navigate(qa.path)}>
              <Icon size={18} />
              {qa.label}
              <ArrowRight size={14} style={{ opacity: 0.5 }} />
            </button>
          );
        })}
      </div>

      {/* Projects + Activity */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Projects List */}
        <GlassCard title="Projects" subtitle={`${data.projects.total} total`} icon={Building2} iconColor="blue">
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            {data.projectSummaries.map((p) => (
              <div
                key={p.id}
                className="project-card glass-card"
                style={{ padding: 'var(--space-md)' }}
                onClick={() => {
                  const proj = appState.projects.find((pr) => pr.id === p.id);
                  if (proj) {
                    dispatch({ type: 'SET_CURRENT_PROJECT', payload: proj });
                  }
                  navigate('/nyxen');
                }}
              >
                <div className="project-card__info">
                  <div className="project-card__name">{p.name}</div>
                  <div className="project-card__location">{p.location.substring(0, 50)}...</div>
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div
                        className={`progress-bar__fill progress-bar__fill--${p.progress >= 80 ? 'emerald' : p.progress >= 40 ? 'blue' : 'amber'}`}
                        style={{ width: `${Math.min(100, p.progress)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="project-card__meta">
                  <span className={`badge ${getStatusBadge(p.status)}`}>
                    {p.status.replace('-', ' ')}
                  </span>
                  <div className="project-card__score" style={{
                    color: p.complianceScore >= 80 ? 'var(--color-accent-emerald)' :
                           p.complianceScore >= 60 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)',
                  }}>
                    {p.complianceScore}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard title="Recent Activity" subtitle="Latest updates" icon={CheckCircle} iconColor="emerald">
          <div className="activity-feed">
            {data.recentActivity.map((a) => (
              <div key={a.id} className="activity-item">
                <div
                  className="activity-item__icon"
                  style={{
                    background: a.type === 'ai-analysis' ? 'var(--color-accent-purple-dim)' : 'var(--color-accent-blue-dim)',
                    color: a.type === 'ai-analysis' ? 'var(--color-accent-purple)' : 'var(--color-accent-blue)',
                  }}
                >
                  {a.type === 'ai-analysis' ? <Camera size={16} /> : <CheckCircle size={16} />}
                </div>
                <div className="activity-item__content">
                  <div className="activity-item__title">{a.title}</div>
                  <div className="activity-item__time">
                    {a.project} · {formatCurrency(a.amount)} · {timeAgo(a.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Category Distribution */}
      <GlassCard title="Category Distribution" subtitle="By work type" icon={BarChart3} iconColor="purple">
        <div className="summary-grid">
          {Object.entries(data.categoryDistribution).map(([cat, info]) => (
            <div key={cat} className="summary-item">
              <div className="summary-item__label">{cat}</div>
              <div className="summary-item__value" style={{ fontSize: 'var(--font-size-xl)' }}>
                {info.count}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                {formatCurrency(info.amount)}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Add Project Modal */}
      {showAddProject && (
        <>
          <div className="slide-panel__backdrop slide-panel__backdrop--visible" onClick={() => setShowAddProject(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 200, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto',
          }}>
            <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Building2 size={20} style={{ color: 'var(--color-accent-blue)' }} /> New Project
                </h2>
                <button onClick={() => setShowAddProject(false)} style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {addError && (
                <div style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', background: 'var(--color-accent-red-dim)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddProject} className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Project Name *</label>
                  <input className="input" type="text" placeholder="e.g. Metro Station Phase-2" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <input className="input" type="text" placeholder="Brief project description" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label className="input-label">Survey Number *</label>
                    <input className="input" type="text" placeholder="e.g. SY-200/B" value={projectForm.surveyNumber} onChange={e => setProjectForm({ ...projectForm, surveyNumber: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Status</label>
                    <select className="select" value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value as any })}>
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label className="input-label">Contractor *</label>
                    <input className="input" type="text" placeholder="Contractor name" value={projectForm.contractor} onChange={e => setProjectForm({ ...projectForm, contractor: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Engineer *</label>
                    <input className="input" type="text" placeholder="Engineer name" value={projectForm.engineer} onChange={e => setProjectForm({ ...projectForm, engineer: e.target.value })} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Location Address</label>
                  <input className="input" type="text" placeholder="e.g. MG Road, Bangalore" value={projectForm.address} onChange={e => setProjectForm({ ...projectForm, address: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label className="input-label">Latitude</label>
                    <input className="input" type="number" step="any" placeholder="12.9716" value={projectForm.lat} onChange={e => setProjectForm({ ...projectForm, lat: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Longitude</label>
                    <input className="input" type="number" step="any" placeholder="77.5946" value={projectForm.lng} onChange={e => setProjectForm({ ...projectForm, lng: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Budget (₹)</label>
                    <input className="input" type="number" placeholder="5000000" value={projectForm.totalBudget} onChange={e => setProjectForm({ ...projectForm, totalBudget: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
                  {saving ? <><div className="spinner" /> Creating...</> : <><Plus size={18} /> Create Project</>}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
