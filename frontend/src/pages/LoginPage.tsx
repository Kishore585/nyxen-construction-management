import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/appStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" />

      <div className="glass-card login-card">
        <div className="login-card__logo">
          <div style={{ width: 80, height: 80, margin: '0 auto var(--space-md)' }}>
            <img src="/logo.png" alt="Nyxen" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="login-card__logo-text">Nyxen</div>
        </div>

        <form className="login-card__form" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: 'var(--space-md)',
              background: 'var(--color-accent-red-dim)',
              border: '1px solid rgba(255, 82, 82, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent-red)',
              fontSize: 'var(--font-size-sm)',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 'var(--space-sm)' }}
          >
            {loading ? (
              <><div className="spinner" /> Signing in...</>
            ) : (
              <><LogIn size={18} /> Sign In</>
            )}
          </button>
        </form>

        <div className="login-card__hint" style={{ marginTop: 'var(--space-lg)' }}>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Demo Credentials</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 'var(--font-size-xs)' }}>
            <span><strong>admin</strong> / admin123 — <em>Full access</em></span>
            <span><strong>jrengineer</strong> / jre123 — <em>Edit Nyxen, no audit</em></span>
            <span><strong>supervisor</strong> / super123 — <em>Remarks only</em></span>
            <span><strong>auditor</strong> / audit123 — <em>Read-only</em></span>
          </div>
        </div>
      </div>
    </div>
  );
}
