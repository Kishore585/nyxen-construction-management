import { useState } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import type { Measurement } from '../store/appStore';

interface MeasurementTableProps {
  measurements: Measurement[];
  editable?: boolean | 'remarks-only';
  onUpdate?: (id: string, field: string, value: number | string) => void;
}

const categoryColors: Record<string, string> = {
  Earthwork: 'var(--color-accent-amber)',
  Concrete: 'var(--color-accent-blue)',
  Masonry: 'var(--color-accent-purple)',
  Plastering: 'var(--color-accent-emerald)',
  Steelwork: 'var(--color-accent-red)',
  Flooring: '#ff80ab',
  Painting: '#80d8ff',
  Plumbing: '#b9f6ca',
  Electrical: '#ffe57f',
};

export default function MeasurementTable({
  measurements,
  editable = false,
  onUpdate,
}: MeasurementTableProps) {
  const [sortField, setSortField] = useState<string>('sno');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const canEditDimensions = editable === true;
  const canEditRemarks = editable === true || editable === 'remarks-only';

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...measurements].sort((a, b) => {
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalQuantity = measurements.reduce((s, m) => s + m.quantity, 0);
  const totalAmount = measurements.reduce((s, m) => s + (m.amount || 0), 0);

  const getConfidenceColor = (c: number) => {
    if (c >= 85) return 'var(--color-accent-emerald)';
    if (c >= 60) return 'var(--color-accent-amber)';
    return 'var(--color-accent-red)';
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const handleCellChange = (id: string, field: string, val: string) => {
    if (!onUpdate) return;
    const num = parseFloat(val);
    onUpdate(id, field, isNaN(num) ? val : num);
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    width: '70px',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-mono)',
    background: 'transparent',
    border: '1px solid transparent',
  };

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th onClick={() => handleSort('sno')} style={{ cursor: 'pointer' }}>
              S.No <SortIcon field="sno" />
            </th>
            <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>
              Description <SortIcon field="description" />
            </th>
            <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
              Category <SortIcon field="category" />
            </th>
            <th>No.</th>
            <th>L (m)</th>
            <th>B (m)</th>
            <th>D/H (m)</th>
            <th onClick={() => handleSort('aiQuantity')} style={{ cursor: 'pointer' }}>
              AI Qty <SortIcon field="aiQuantity" />
            </th>
            <th onClick={() => handleSort('manualQuantity')} style={{ cursor: 'pointer' }}>
              Manual Qty <SortIcon field="manualQuantity" />
            </th>
            <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
              Final Qty <SortIcon field="quantity" />
            </th>
            <th>Unit</th>
            <th>Materials</th>
            {measurements.some(m => m.rate) && <th>Rate (₹)</th>}
            {measurements.some(m => m.amount) && <th>Amount (₹)</th>}
            <th onClick={() => handleSort('confidence')} style={{ cursor: 'pointer' }}>
              Confidence <SortIcon field="confidence" />
            </th>
            {canEditRemarks && <th>Remarks</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
          <>
            <tr
              key={m.id}
              style={{
                borderLeft: `3px solid ${getConfidenceColor(m.confidence)}`,
              }}
            >
              <td className="measurement-value">{m.sno}</td>
              <td>
                {canEditDimensions ? (
                  <input
                    className="input"
                    style={{ padding: '4px 8px', fontSize: 'var(--font-size-sm)', background: 'transparent', border: '1px solid transparent' }}
                    defaultValue={m.description}
                    onBlur={(e) => handleCellChange(m.id, 'description', e.target.value)}
                  />
                ) : (
                  m.description
                )}
              </td>
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: categoryColors[m.category] || 'var(--color-text-tertiary)',
                    }}
                  />
                  {m.category}
                </span>
              </td>
              <td className="measurement-value">{m.number}</td>
              <td className="measurement-value">
                {canEditDimensions ? (
                  <input
                    className="input"
                    type="number"
                    style={inputStyle}
                    defaultValue={m.length}
                    onBlur={(e) => handleCellChange(m.id, 'length', e.target.value)}
                  />
                ) : (
                  m.length.toFixed(2)
                )}
              </td>
              <td className="measurement-value">
                {canEditDimensions ? (
                  <input
                    className="input"
                    type="number"
                    style={inputStyle}
                    defaultValue={m.breadth}
                    onBlur={(e) => handleCellChange(m.id, 'breadth', e.target.value)}
                  />
                ) : (
                  m.breadth.toFixed(2)
                )}
              </td>
              <td className="measurement-value">
                {canEditDimensions ? (
                  <input
                    className="input"
                    type="number"
                    style={inputStyle}
                    defaultValue={m.depthOrHeight}
                    onBlur={(e) => handleCellChange(m.id, 'depthOrHeight', e.target.value)}
                  />
                ) : (
                  m.depthOrHeight.toFixed(2)
                )}
              </td>
              <td className="measurement-value">
                {m.aiQuantity ? m.aiQuantity.toFixed(2) : '—'}
              </td>
              <td className="measurement-value">
                {editable ? (
                  <input
                    className="input"
                    type="number"
                    style={{ padding: '4px 8px', width: '70px', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid transparent' }}
                    defaultValue={m.manualQuantity || m.quantity}
                    onBlur={(e) => handleCellChange(m.id, 'manualQuantity', e.target.value)}
                  />
                ) : (
                  (m.manualQuantity || m.quantity).toFixed(2)
                )}
              </td>
              <td className="measurement-value" style={{ fontWeight: 600 }}>
                {m.quantity.toFixed(2)}
              </td>
              <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {m.unit}
              </td>
              <td style={{ fontSize: 'var(--font-size-xs)' }}>
                {m.materialsCheck ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>{m.materialsCheck.materialUsed}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ color: m.materialsCheck.engineerVerified ? 'var(--color-accent-emerald)' : 'var(--color-text-tertiary)' }}>Eng: {m.materialsCheck.engineerVerified ? '✓' : '✗'}</span>
                      <span style={{ color: m.materialsCheck.constructorVerified ? 'var(--color-accent-emerald)' : 'var(--color-text-tertiary)' }}>Con: {m.materialsCheck.constructorVerified ? '✓' : '✗'}</span>
                    </div>
                  </div>
                ) : (
                  '—'
                )}
              </td>
              {measurements.some(x => x.rate) && (
                <td className="measurement-value">
                  {m.rate ? '₹' + m.rate.toLocaleString('en-IN') : '—'}
                </td>
              )}
              {measurements.some(x => x.amount) && (
                <td className="measurement-value" style={{ fontWeight: 600 }}>
                  {m.amount ? '₹' + m.amount.toLocaleString('en-IN') : '—'}
                </td>
              )}
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '4px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${m.confidence}%`,
                        height: '100%',
                        background: getConfidenceColor(m.confidence),
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span
                    className="measurement-value"
                    style={{ color: getConfidenceColor(m.confidence), fontSize: 'var(--font-size-xs)' }}
                  >
                    {m.confidence}%
                  </span>
                </div>
              </td>
              {canEditRemarks && (
                <td>
                  <input
                    className="input"
                    style={{
                      padding: '4px 8px',
                      width: '120px',
                      fontSize: 'var(--font-size-sm)',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '4px',
                    }}
                    placeholder="Add remark…"
                    defaultValue={(m as any).remarks || ''}
                    onBlur={(e) => handleCellChange(m.id, 'remarks', e.target.value)}
                  />
                </td>
              )}
            </tr>
            {m.violationWarning && (
              <tr key={`${m.id}-warning`}>
                <td colSpan={14} style={{ padding: '8px 16px', background: 'rgba(255, 68, 68, 0.1)', color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>
                  ⚠️ <strong>Contract Violation:</strong> {m.violationWarning}
                </td>
              </tr>
            )}
          </>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={7} style={{ textAlign: 'right' }}>Total</td>
            <td className="measurement-value">{totalQuantity.toFixed(2)}</td>
            <td></td>
            {measurements.some(m => m.rate) && <td></td>}
            {measurements.some(m => m.amount) && (
              <td className="measurement-value" style={{ color: 'var(--color-accent-emerald)' }}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </td>
            )}
            <td></td>
            {canEditRemarks && <td></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
