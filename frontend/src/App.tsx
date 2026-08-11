import { useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import AuthScreen from './AuthScreen';
import Sidebar, { View } from './Sidebar';
import Dashboard from './Dashboard';
import Customers from './Customers';
import Inventory from './Inventory';
import Challans from './Challans';
import { debugSupabase } from './debug-supabase';

const titles: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your wholesale operations' },
  customers: { title: 'Customers', subtitle: 'Manage your CRM contacts and leads' },
  inventory: { title: 'Inventory', subtitle: 'Track products, stock levels, and warehouse locations' },
  challans: { title: 'Sales Challans', subtitle: 'Create and manage delivery challans' },
};

function Shell() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  if (loading) return <div className="loading"><div className="spinner" />Loading…</div>;
  if (!session) return <AuthScreen />;

  const t = titles[view];

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={setView} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title"><h1>{t.title}</h1><p>{t.subtitle}</p></div>
          <button 
            className="btn btn-ghost" 
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => debugSupabase()}
            title="Run database diagnostics (check console)"
          >
            🔍 Debug DB
          </button>
        </div>
        <div className="content">
          {view === 'dashboard' && <Dashboard onNavigate={setView} />}
          {view === 'customers' && <Customers />}
          {view === 'inventory' && <Inventory />}
          {view === 'challans' && <Challans />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
