import { useEffect, useState } from 'react';
import { Users, UserPlus, Shield, X, Check, AlertTriangle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { api } from '../services/api';
import { useApp } from '../store/appStore';

interface UserRow {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

const ROLES = ['Admin', 'Engineer', 'Jr. Engineer', 'Supervisor', 'Auditor'];

const roleColors: Record<string, string> = {
  Admin: 'var(--color-accent-red)',
  Engineer: 'var(--color-accent-blue)',
  'Jr. Engineer': 'var(--color-accent-purple)',
  Supervisor: 'var(--color-accent-amber)',
  Auditor: 'var(--color-accent-emerald)',
};

export default function UsersPage() {
  const { state } = useApp();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '', username: '', password: '', email: '', role: 'Engineer',
  });

  const isAdmin = state.user?.role === 'Admin';

  useEffect(() => {
    if (!isAdmin) return;
    api.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.username || !form.password || !form.email || !form.role) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    try {
      const newUser = await api.registerUser(form);
      setUsers(prev => [...prev, newUser]);
      setSuccess(`User "${newUser.name}" created successfully`);
      setForm({ name: '', username: '', password: '', email: '', role: 'Engineer' });
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <Shield size={64} className="empty-state__icon" />
        <p className="empty-state__text">Access Denied</p>
        <p className="empty-state__hint">Only administrators can manage users</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="flex-col">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); setSuccess(''); }}>
          <UserPlus size={18} /> Add User
        </button>
      </div>

      {/* Users Table */}
      <GlassCard title="Team Members" subtitle="Manage system access and roles" icon={Users} iconColor="blue">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Username', 'Email', 'Role'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: 'var(--space-md)',
                    fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-full)',
                      background: `${roleColors[u.role] || 'var(--color-accent-blue)'}22`,
                      color: roleColors[u.role] || 'var(--color-accent-blue)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 'var(--font-size-sm)',
                    }}>
                      {u.name.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                  </td>
                  <td style={{ padding: 'var(--space-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {u.username}
                  </td>
                  <td style={{ padding: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: 'var(--space-md)' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 12px', borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--font-size-xs)', fontWeight: 600,
                      background: `${roleColors[u.role] || 'var(--color-accent-blue)'}18`,
                      color: roleColors[u.role] || 'var(--color-accent-blue)',
                      border: `1px solid ${roleColors[u.role] || 'var(--color-accent-blue)'}33`,
                    }}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add User Modal */}
      {showModal && (
        <>
          <div
            className="slide-panel__backdrop slide-panel__backdrop--visible"
            onClick={() => setShowModal(false)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 200, width: '100%', maxWidth: 480,
          }}>
            <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <UserPlus size={20} style={{ color: 'var(--color-accent-blue)' }} /> Add New User
                </h2>
                <button onClick={() => setShowModal(false)} style={{ color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)',
                  background: 'var(--color-accent-red-dim)', border: '1px solid rgba(255,82,82,0.3)',
                  borderRadius: 'var(--radius-md)', color: 'var(--color-accent-red)',
                  fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)',
                  background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)', color: 'var(--color-accent-emerald)',
                  fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <Check size={14} /> {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input className="input" type="text" placeholder="e.g. Rahul Verma" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="input-group">
                    <label className="input-label">Username</label>
                    <input className="input" type="text" placeholder="e.g. rahulv" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input className="input" type="password" placeholder="••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input className="input" type="email" placeholder="e.g. rahul@nyxen.ai" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
                  {saving ? <><div className="spinner" /> Creating...</> : <><UserPlus size={18} /> Create User</>}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
