import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Search, X, FileText, Trash2, Printer, Check } from 'lucide-react';

type Customer = { id: string; name: string; business_name: string; address: string; gst_number: string };
type Product = { id: string; name: string; sku: string; unit_price: number; stock_quantity: number };

type Challan = {
  id: string; challan_number: string; customer_id: string; status: string; total_quantity: number; created_at: string;
  customer: Customer;
  challan_items: { id: string; product_name: string; sku: string; unit_price: number; quantity: number }[];
};

type ItemRow = { product_id: string; product_name: string; sku: string; unit_price: number; quantity: number };

export default function Challans() {
  const [rows, setRows] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewChallan, setViewChallan] = useState<Challan | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('challans')
      .select('*, customer:customers(*), challan_items(*)')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('customers').select('id, name, business_name, address, gst_number').then(({ data }) => setCustomers(data || []));
    supabase.from('products').select('id, name, sku, unit_price, stock_quantity').then(({ data }) => setProducts(data || []));
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.challan_number.toLowerCase().includes(q) || r.customer?.name?.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setModal(true);
    setCustomerId('');
    setItems([]);
  };

  const addRow = () => {
    setItems([...items, { product_id: '', product_name: '', sku: '', unit_price: 0, quantity: 1 }]);
  };

  const updateRow = (i: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const next = [...items];
    next[i] = {
      product_id: productId,
      product_name: product?.name || '',
      sku: product?.sku || '',
      unit_price: product?.unit_price || 0,
      quantity: next[i].quantity || 1,
    };
    setItems(next);
  };

  const removeRow = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const totalQty = items.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const totalValue = items.reduce((s, x) => s + (Number(x.quantity) * Number(x.unit_price), 0), 0);

  const create = async () => {
    if (!customerId || items.length === 0) return;
    setSaving(true);
    const count = rows.length + 1;
    const challanNumber = `SCH-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const { data: challan } = await supabase
      .from('challans')
      .insert({ challan_number: challanNumber, customer_id: customerId, status: 'Draft', total_quantity: totalQty })
      .select('id')
      .maybeSingle();

    if (challan) {
      await supabase.from('challan_items').insert(
        items.filter((x) => x.product_id).map((x) => ({
          challan_id: challan.id,
          product_id: x.product_id,
          product_name: x.product_name,
          sku: x.sku,
          unit_price: x.unit_price,
          quantity: Number(x.quantity),
        }))
      );
    }

    setSaving(false);
    setModal(false);
    setToast('Challan created');
    load();
    setTimeout(() => setToast(null), 2500);
  };

  const confirmChallan = async (c: Challan) => {
    const { error } = await supabase.rpc('confirm_challan', { p_challan_id: c.id });
    if (error) {
      setToast(error.message.includes('Insufficient stock') ? 'Not enough stock to confirm this challan' : 'Could not confirm challan');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setToast('Challan confirmed and stock updated');
    setViewChallan(null);
    load();
    setTimeout(() => setToast(null), 2500);
  };

  const cancelChallan = async (c: Challan) => {
    if (!confirm(`Cancel ${c.challan_number}?`)) return;
    const { error } = await supabase.from('challans').update({ status: 'Cancelled' }).eq('id', c.id).eq('status', 'Draft');
    if (error) {
      setToast('Could not cancel challan');
    } else {
      setToast('Challan cancelled');
      setViewChallan(null);
      load();
    }
    setTimeout(() => setToast(null), 2500);
  };

  const printChallan = () => {
    window.print();
  };

  return (
    <div>
      <div className="toolbar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 38, width: 280 }} placeholder="Search challan number, customer…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} />New challan</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading"><div className="spinner" />Loading challans…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><FileText size={32} /><h3>No challans yet</h3><p>Create a sales challan to dispatch goods</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Challan no.</th><th>Customer</th><th>Items</th><th>Qty</th><th>Status</th><th>Date</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.challan_number}</td>
                    <td>{c.customer?.name || '—'}</td>
                    <td>{c.challan_items?.length || 0}</td>
                    <td>{c.total_quantity}</td>
                    <td><span className={`badge ${c.status === 'Confirmed' ? 'badge-success' : c.status === 'Cancelled' ? 'badge-error' : 'badge-neutral'}`}>{c.status}</span></td>
                    <td style={{ color: 'var(--text-3)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewChallan(c)}>View</button>
                      {c.status === 'Draft' && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => confirmChallan(c)} title="Confirm"><Check size={14} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => cancelChallan(c)} title="Cancel"><X size={14} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>New sales challan</h2><p>Select customer and add products to dispatch</p></div>
              <button className="close-btn" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Customer</label>
                <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.business_name || c.name}</option>)}
                </select>
              </div>

              <div style={{ marginTop: 18 }}>
                <label className="label">Products</label>
                {items.map((item, i) => (
                  <div className="challan-item-row" key={i}>
                    <div>
                      <select className="select" value={item.product_id} onChange={(e) => updateRow(i, e.target.value)}>
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — ₹{p.unit_price} — {p.stock_quantity} in stock</option>)}
                      </select>
                    </div>
                    <input className="input" type="number" min={1} placeholder="Qty" value={item.quantity}
                      onChange={(e) => { const n = [...items]; n[i].quantity = Number(e.target.value); setItems(n); }} />
                    <div style={{ fontSize: 13, color: 'var(--text-2)', padding: '10px 0' }}>
                      ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                    </div>
                    <button className="close-btn" onClick={() => removeRow(i)}><Trash2 size={15} /></button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={addRow}><Plus size={14} />Add product</button>
              </div>

              <div className="item-summary">
                <span>Total quantity: <strong>{totalQty}</strong></span>
                <span>Total value: <strong>₹{totalValue.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create} disabled={saving || !customerId || items.length === 0}>{saving ? 'Creating…' : 'Create challan'}</button>
            </div>
          </div>
        </div>
      )}

      {viewChallan && (
        <div className="modal-backdrop" onClick={() => setViewChallan(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{viewChallan.challan_number}</h2><p>{viewChallan.customer?.name} — {new Date(viewChallan.created_at).toLocaleDateString('en-IN')}</p></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={`badge ${viewChallan.status === 'Confirmed' ? 'badge-success' : viewChallan.status === 'Cancelled' ? 'badge-error' : 'badge-neutral'}`}>{viewChallan.status}</span>
                <button className="close-btn" onClick={() => setViewChallan(null)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Customer</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{viewChallan.customer?.name}</div>
                  {viewChallan.customer?.business_name && <div style={{ color: 'var(--text-2)' }}>{viewChallan.customer.business_name}</div>}
                  {viewChallan.customer?.address && <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>{viewChallan.customer.address}</div>}
                  {viewChallan.customer?.gst_number && <div style={{ color: 'var(--text-3)', fontSize: 12 }}>GST: {viewChallan.customer.gst_number}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Challan details</div>
                  <div style={{ fontSize: 13 }}>{viewChallan.challan_number}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{new Date(viewChallan.created_at).toLocaleString('en-IN')}</div>
                </div>
              </div>

              <table>
                <thead><tr><th>Product</th><th>SKU</th><th>Unit price</th><th>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {viewChallan.challan_items?.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600 }}>{it.product_name}</td>
                      <td style={{ color: 'var(--text-3)' }}>{it.sku}</td>
                      <td>₹{it.unit_price.toLocaleString('en-IN')}</td>
                      <td>{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{(it.unit_price * it.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="item-summary">
                <span>Total quantity: <strong>{viewChallan.total_quantity}</strong></span>
                <span>Total value: <strong>₹{viewChallan.challan_items?.reduce((s, x) => s + x.unit_price * x.quantity, 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={printChallan}><Printer size={15} />Print</button>
              {viewChallan.status === 'Draft' && (
                <>
                  <button className="btn btn-danger" onClick={() => cancelChallan(viewChallan)}>Cancel challan</button>
                  <button className="btn btn-primary" onClick={() => confirmChallan(viewChallan)}><Check size={15} />Confirm</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </div>
  );
}
