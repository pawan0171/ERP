import { ReactNode } from 'react';
import { useAuth } from './auth';
import { Truck, LayoutDashboard, Users, Package, FileText, LogOut } from 'lucide-react';

export type View = 'dashboard' | 'customers' | 'inventory' | 'challans';

export default function Sidebar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const { profile, signOut } = useAuth();
  const initials = (profile?.full_name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const role = profile?.role || 'admin';
  const allowed: Record<string, View[]> = {
    admin: ['dashboard', 'customers', 'inventory', 'challans'],
    sales: ['dashboard', 'customers', 'challans'],
    warehouse: ['dashboard', 'inventory'],
    accounts: ['dashboard', 'customers', 'challans'],
  };
  const items: { id: View; label: string; icon: ReactNode }[] = ([
    { id: 'dashboard' as View, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'customers' as View, label: 'Customers', icon: <Users size={18} /> },
    { id: 'inventory' as View, label: 'Inventory', icon: <Package size={18} /> },
    { id: 'challans' as View, label: 'Sales Challans', icon: <FileText size={18} /> },
  ]).filter((item) => allowed[role]?.includes(item.id));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark"><Truck size={18} /></div>
        <div className="sidebar-logo-text">
          <strong>Northstar</strong>
          <span>Operations</span>
        </div>
      </div>

      <div className="nav-section-label">Menu</div>
      {items.map((it) => (
        <button key={it.id} className={`nav-item ${view === it.id ? 'active' : ''}`} onClick={() => onNavigate(it.id)}>
          {it.icon}{it.label}
        </button>
      ))}

      <div className="sidebar-footer">
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || 'User'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{profile?.role || 'admin'}</div>
        </div>
        <button className="close-btn" onClick={signOut} title="Sign out"><LogOut size={16} /></button>
      </div>
    </aside>
  );
}
