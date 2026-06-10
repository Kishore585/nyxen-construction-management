import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Camera, MapPin, BookOpen, Shield, TrendingUp,
  ArrowRight, DollarSign, CheckCircle, BarChart3,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import GlassCard from '../components/GlassCard';
import { api } from '../services/api';

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
  const navigate = useNavigate();

  useEffect(() => {
    api.getDashboardStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
              <div key={p.id} className="project-card glass-card" style={{ padding: 'var(--space-md)' }} onClick={() => navigate('/nyxen')}>
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
    </div>
  );
}
