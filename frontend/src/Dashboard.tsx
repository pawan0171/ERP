import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Users, Package, FileText, AlertTriangle, TrendingUp } from 'lucide-react';

type Stats = {
  customerCount: number;
  activeCustomers: number;
  productCount: number;
  lowStockCount: number;
  challanCount: number;
  confirmedChallans: number;
  totalStockValue: number;
};

export default function Dashboard({ onNavigate }: { onNavigate: (v: any) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentChallans, setRecentChallans] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, p, ch, ci, ls] = await Promise.all([
        supabase.from('customers').select('id, status'),
        supabase.from('products').select('id, name, stock_quantity, min_stock_quantity, unit_price'),
        supabase.from('challans').select('id, challan_number, status, created_at, total_quantity'),
        supabase.from('challans').select('id, challan_number, status, created_at, customer:customers(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('id, name, sku, stock_quantity, min_stock_quantity').lt('stock_quantity', 5).order('stock_quantity', { ascending: true }).limit(5),
      ]);

      const products = p.data || [];
      setStats({
        customerCount: c.data?.length || 0,
        activeCustomers: c.data?.filter((x: any) => x.status === 'Active').length || 0,
        productCount: products.length,
        lowStockCount: products.filter((x: any) => x.stock_quantity < x.min_stock_quantity).length,
        challanCount: ch.data?.length || 0,
        confirmedChallans: ch.data?.filter((x: any) => x.status === 'Confirmed').length || 0,
        totalStockValue: products.reduce((s: number, x: any) => s + x.unit_price * x.stock_quantity, 0),
      });
      setRecentChallans(ci.data || []);
      setLowStock(ls.data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading dashboard…</div>;

  const cards = [
    { label: 'Total customers', value: stats!.customerCount, sub: `${stats!.activeCustomers} active`, icon: <Users size={20} />, cls: 'blue' },
    { label: 'Products in catalog', value: stats!.productCount, sub: `${stats!.lowStockCount} low on stock`, icon: <Package size={20} />, cls: 'teal' },
    { label: 'Sales challans', value: stats!.challanCount, sub: `${stats!.confirmedChallans} confirmed`, icon: <FileText size={20} />, cls: 'amber' },
    { label: 'Inventory value', value: `₹${stats!.totalStockValue.toLocaleString('en-IN')}`, sub: 'At current prices', icon: <TrendingUp size={20} />, cls: 'green' },
  ];

  return (
    <div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <div className={`stat-icon ${c.cls}`}>{c.icon}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-trend">{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div><h2>Recent challans</h2><p>Latest sales documents</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('challans')}>View all</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentChallans.length === 0 ? (
              <div className="empty-state"><FileText size={32} /><h3>No challans yet</h3><p>Create your first sales challan</p></div>
            ) : (
              <table>
                <tbody>
                  {recentChallans.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.challan_number}</td>
                      <td>{c.customer?.name || '—'}</td>
                      <td><span className={`badge ${c.status === 'Confirmed' ? 'badge-success' : c.status === 'Cancelled' ? 'badge-error' : 'badge-neutral'}`}>{c.status}</span></td>
                      <td style={{ color: 'var(--text-3)', textAlign: 'right' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><h2>Low stock alerts</h2><p>Products below reorder threshold</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('inventory')}>Manage</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {lowStock.length === 0 ? (
              <div className="empty-state"><AlertTriangle size={32} /><h3>All stocked up</h3><p>No products need reordering</p></div>
            ) : (
              <table>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: 'var(--text-3)' }}>{p.sku}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-error">{p.stock_quantity} left</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
