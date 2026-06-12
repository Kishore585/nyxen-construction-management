import { useEffect, useState } from 'react';
import { BookOpen, Download, FileText, ChevronDown } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import MeasurementTable from '../components/MeasurementTable';
import { api } from '../services/api';
import { useApp } from '../store/appStore';
import type { Measurement } from '../store/appStore';

interface ProjectOption {
  id: string;
  name: string;
}

interface NyxenData {
  project: {
    id: string; name: string; contractor: string; engineer: string;
    location: { lat: number; lng: number; address: string }; surveyNumber: string;
    contractorDetails?: { licenseNumber: string; contactPerson: string; phone: string; };
    agreement?: { agreementNumber: string; dateOfAgreement: string; approvedMaterials: string[]; blueprintDimensions: Record<string, number> };
  };
  measurements: Array<{
    id: string; itemCode: string; description: string; category: string;
    location: string; number: number; length: number; breadth: number;
    depth: number; quantity: number; unit: string; rate: number; amount: number;
    confidenceScore: number; source: string;
    aiDimensions?: { quantity: number; }; manualDimensions?: { quantity: number; };
    materialsCheck?: { materialUsed: string; engineerVerified: boolean; constructorVerified: boolean; };
    violationWarning?: string | null;
  }>;
  summary: {
    totalMeasurements: number; totalAmount: number; verifiedCount: number;
    aiEstimatedCount: number; averageConfidence: number;
    categorySummary: Record<string, { count: number; amount: number }>;
  };
}

export default function NyxenPage() {
  const { state: appState, dispatch } = useApp();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [nyxenData, setNyxenData] = useState<NyxenData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdateEntry = async (entryId: string, field: string, value: any) => {
    if (!selectedProject) return;
    try {
      const m = nyxenData?.measurements.find((meas) => meas.id === entryId);
      if (!m) return;

      const backendField = field === 'depthOrHeight' ? 'depth' : field;
      const updatedData = { [backendField]: value };
      
      const updatedEntry = await api.updateNyxenEntry(selectedProject, entryId, updatedData);
      
      setNyxenData(prev => {
        if (!prev) return null;
        const newMeasurements = prev.measurements.map(item => item.id === entryId ? { ...item, ...updatedEntry } : item);
        
        let totalAmount = 0;
        let totalConfidence = 0;
        let verifiedCount = 0;
        let aiEstimatedCount = 0;
        const categorySummary: Record<string, { count: number; amount: number }> = {};
        
        for (const item of newMeasurements) {
          totalAmount += item.amount;
          totalConfidence += item.confidenceScore;
          if (item.source === 'verified') verifiedCount++;
          if (item.source === 'ai-estimated') aiEstimatedCount++;
          
          if (!categorySummary[item.category]) {
            categorySummary[item.category] = { count: 0, amount: 0 };
          }
          categorySummary[item.category].count++;
          categorySummary[item.category].amount += item.amount;
        }
        
        return {
          ...prev,
          measurements: newMeasurements,
          summary: {
            ...prev.summary,
            totalMeasurements: newMeasurements.length,
            totalAmount,
            verifiedCount,
            aiEstimatedCount,
            averageConfidence: newMeasurements.length > 0 ? totalConfidence / newMeasurements.length : 0,
            categorySummary,
          }
        };
      });
    } catch (err) {
      console.error('Failed to update measurement:', err);
    }
  };

  useEffect(() => {
    api.getProjects().then((data) => {
      setProjects(data.map((p: any) => ({ id: p.id, name: p.name })));
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (appState.currentProject) {
      setSelectedProject(appState.currentProject.id);
    }
  }, [appState.currentProject]);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    api.getNyxen(selectedProject)
      .then(setNyxenData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!selectedProject) return;
    try {
      const data = await api.exportNyxen(selectedProject, format);
      const blob = new Blob(
        [format === 'csv' ? data : JSON.stringify(data, null, 2)],
        { type: format === 'csv' ? 'text/csv' : 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nyxen_${nyxenData?.project.name || 'export'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatCurrency = (v: number) => '₹' + v.toLocaleString('en-IN');

  // Convert to MeasurementTable format
  const tableMeasurements: Measurement[] = (nyxenData?.measurements || []).map((m, i) => ({
    id: m.id,
    sno: i + 1,
    description: m.description,
    category: m.category.charAt(0).toUpperCase() + m.category.slice(1),
    number: m.number,
    length: m.length,
    breadth: m.breadth,
    depthOrHeight: m.depth,
    quantity: m.quantity,
    aiQuantity: m.aiDimensions?.quantity,
    manualQuantity: m.manualDimensions?.quantity,
    unit: m.unit,
    confidence: m.confidenceScore,
    rate: m.rate,
    amount: m.amount,
    materialsCheck: m.materialsCheck,
    violationWarning: m.violationWarning,
  }));

  return (
    <div className="flex-col">
      {/* Project Selector */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div className="input-group" style={{ minWidth: '300px' }}>
            <select
              className="select"
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                const proj = appState.projects.find((p) => p.id === e.target.value);
                if (proj) {
                  dispatch({ type: 'SET_CURRENT_PROJECT', payload: proj });
                }
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="export-group">
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('json')}>
            <Download size={14} /> JSON
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>
            <FileText size={14} /> CSV
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      )}

      {nyxenData && !loading && (
        <>
          {/* Nyxen Header */}
          <div className="nyxen-view">
            <div className="nyxen-header">
              <div className="nyxen-header__title">
                MEASUREMENT BOOK
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                (As per CPWD Works Manual 2019 — Form 23)
              </div>
              <div className="nyxen-header__meta" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                <div className="nyxen-header__meta-item">
                  <span className="nyxen-header__meta-label">Project:</span>
                  <span>{nyxenData.project.name}</span>
                </div>
                <div className="nyxen-header__meta-item">
                  <span className="nyxen-header__meta-label">Survey No:</span>
                  <span>{nyxenData.project.surveyNumber}</span>
                </div>
                
                {nyxenData.project.agreement && (
                  <>
                    <div className="nyxen-header__meta-item">
                      <span className="nyxen-header__meta-label">Agreement No:</span>
                      <span style={{ color: 'var(--color-accent-amber)' }}>{nyxenData.project.agreement.agreementNumber}</span>
                    </div>
                    <div className="nyxen-header__meta-item">
                      <span className="nyxen-header__meta-label">Agreement Date:</span>
                      <span>{new Date(nyxenData.project.agreement.dateOfAgreement).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
                
                <div className="nyxen-header__meta-item">
                  <span className="nyxen-header__meta-label">Engineer:</span>
                  <span>{nyxenData.project.engineer}</span>
                </div>
              </div>

              <div className="nyxen-header__meta" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                <div className="nyxen-header__meta-item" style={{ width: '100%' }}>
                  <span className="nyxen-header__meta-label">Contractor:</span>
                  <span style={{ fontWeight: 600 }}>{nyxenData.project.contractor}</span>
                </div>
                {nyxenData.project.contractorDetails && (
                  <>
                    <div className="nyxen-header__meta-item">
                      <span className="nyxen-header__meta-label">License:</span>
                      <span>{nyxenData.project.contractorDetails.licenseNumber}</span>
                    </div>
                    <div className="nyxen-header__meta-item">
                      <span className="nyxen-header__meta-label">Contact:</span>
                      <span>{nyxenData.project.contractorDetails.contactPerson}</span>
                    </div>
                    <div className="nyxen-header__meta-item">
                      <span className="nyxen-header__meta-label">Phone:</span>
                      <span>{nyxenData.project.contractorDetails.phone}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Role restriction banner */}
            {(() => {
              const role = appState.user?.role?.toLowerCase() || '';
              if (role === 'supervisor') {
                return (
                  <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'rgba(255, 171, 0, 0.1)',
                    border: '1px solid rgba(255, 171, 0, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-accent-amber)',
                    fontSize: 'var(--font-size-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                  }}>
                    🔒 Viewing as <strong>Supervisor</strong> — you can only add remarks, measurement values are read-only
                  </div>
                );
              }
              if (role === 'auditor') {
                return (
                  <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'rgba(130, 177, 255, 0.1)',
                    border: '1px solid rgba(130, 177, 255, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-accent-blue)',
                    fontSize: 'var(--font-size-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                  }}>
                    👁️ Viewing as <strong>Auditor</strong> — read-only access
                  </div>
                );
              }
              return null;
            })()}

            <MeasurementTable
              measurements={tableMeasurements}
              editable={(() => {
                const role = appState.user?.role?.toLowerCase() || '';
                if (role === 'admin' || role === 'engineer' || role === 'jr. engineer') return true;
                if (role === 'supervisor') return 'remarks-only' as const;
                return false;
              })()}
              onUpdate={handleUpdateEntry}
            />
          </div>

          {/* Summary */}
          <div className="grid-3">
            <GlassCard title="Summary" icon={BookOpen} iconColor="amber">
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Total Entries</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{nyxenData.summary.totalMeasurements}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Total Amount</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-accent-emerald)' }}>
                    {formatCurrency(nyxenData.summary.totalAmount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Verified</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{nyxenData.summary.verifiedCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>AI Estimated</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{nyxenData.summary.aiEstimatedCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Avg Confidence</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{Math.round(nyxenData.summary.averageConfidence)}%</span>
                </div>
              </div>
            </GlassCard>

            {/* Category Breakdown */}
            <GlassCard title="Category Breakdown" icon={ChevronDown} iconColor="purple" style={{ gridColumn: 'span 2' }}>
              <div className="summary-grid">
                {Object.entries(nyxenData.summary.categorySummary).map(([cat, info]) => (
                  <div key={cat} className="summary-item">
                    <div className="summary-item__label">{cat}</div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {info.count}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-emerald)', marginTop: '2px' }}>
                      {formatCurrency(info.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
