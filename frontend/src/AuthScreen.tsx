import { useState, FormEvent } from 'react';
import { useAuth } from './auth';
import { Truck, Mail, Lock, User as UserIcon, Shield, ShoppingCart, Package, Calculator } from 'lucide-react';

type Role = 'admin' | 'sales' | 'warehouse' | 'accounts';

const ROLES: { value: Role; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to all modules',
    icon: <Shield size={15} />,
    color: '#3b82f6',
  },
  {
    value: 'sales',
    label: 'Sales',
    description: 'Customers & challans',
    icon: <ShoppingCart size={15} />,
    color: '#14b8a6',
  },
  {
    value: 'warehouse',
    label: 'Warehouse',
    description: 'Inventory & stock',
    icon: <Package size={15} />,
    color: '#f59e0b',
  },
  {
    value: 'accounts',
    label: 'Accounts',
    description: 'Customers & challans',
    icon: <Calculator size={15} />,
    color: '#22c55e',
  },
];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('sales');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setBusy(true);

    if (mode === 'signin') {
      const res = await signIn(email.trim(), password);
      setBusy(false);
      if (res.error) setError(res.error);
    } else {
      const res = await signUp(email.trim(), password, fullName.trim(), role);
      setBusy(false);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo"><Truck size={26} /></div>
        <h1>Northstar Operations</h1>
        <p className="subtitle">Wholesale distribution control center</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
          >
            Create account
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {successMsg && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            color: 'var(--success)', padding: '10px 14px', borderRadius: 10,
            fontSize: 13, marginBottom: 16,
          }}>
            {successMsg}
          </div>
        )}

        {/* ── SIGN UP FIELDS ───────────────────────────── */}
        {mode === 'signup' && (
          <>
            <div className="field">
              <label className="label">Full name</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-3)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Aisha Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Role selector */}
            <div className="field">
              <label className="label">Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1.5px solid ${role === r.value ? r.color : 'var(--border-2)'}`,
                      background: role === r.value ? `${r.color}18` : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: role === r.value ? `${r.color}28` : 'var(--panel-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: role === r.value ? r.color : 'var(--text-3)',
                      flexShrink: 0,
                    }}>
                      {r.icon}
                    </span>
                    <span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: role === r.value ? r.color : 'var(--text)' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                        {r.description}
                      </div>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SIGN IN — role hint panel ─────────────────── */}
        {mode === 'signin' && (
          <div style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 18,
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Access by role
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ROLES.map((r) => (
                <span key={r.value} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: 11, fontWeight: 600,
                  background: `${r.color}18`, color: r.color,
                  border: `1px solid ${r.color}33`,
                }}>
                  {r.icon} {r.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── COMMON FIELDS ────────────────────────────── */}
        <div className="field">
          <label className="label">Email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-3)' }} />
            <input
              className="input"
              type="email"
              style={{ paddingLeft: 38 }}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-3)' }} />
            <input
              className="input"
              type="password"
              style={{ paddingLeft: 38 }}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          disabled={busy}
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : `Create ${role} account`}
        </button>

        <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 18 }}>
          {mode === 'signin'
            ? 'New here? Use the Create account tab.'
            : 'Already have an account? Switch to Sign in.'}
        </p>
      </form>
    </div>
  );
}
