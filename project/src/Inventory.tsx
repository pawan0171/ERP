import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Search, Pencil, Trash2, X, Package, ArrowDownUp } from 'lucide-react';

type Product = {
  id: string; name: string; sku: string; category: string; unit_price: number;
  stock_quantity: number; min_stock_quantity: number; location: string; created_at: string;
};

const empty: Omit<Product, 'id' | 'created_at'> = {
  name: '', sku: '', category: 'General', unit_price: 0, stock_quantity: 0, min_stock_quantity: 5, location: 'Main warehouse',
};

export default function Inventory() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; edit: Product | null }>({ open: false, edit: null });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustReason, setAdjustReason] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });

  const openAdd = () => { setForm(empty); setModal({ open: true, edit: null }); };
  const openEdit = (p: Product) => { setForm({ ...p }); setModal({ open: true, edit: p }); };

  const save = async () => {
    setSaving(true);
    if (modal.edit) {
      await supabase.from('products').update({
        name: form.name, sku: form.sku, category: form.category, unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity), min_stock_quantity: Number(form.min_stock_quantity), location: form.location,
      }).eq('id', modal.edit.id);
    } else {
      await supabase.from('products').insert({
        name: form.name, sku: form.sku, category: form.category, unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity), min_stock_quantity: Number(form.min_stock_quantity), location: form.location,
      });
    }
    setSaving(false);
    setModal({ open: false, edit: null });
    setToast(modal.edit ? 'Product updated' : 'Product added');
    load();
    setTimeout(() => setToast(null), 2500);
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    setToast('Product deleted');
    load();
    setTimeout(() => setToast(null), 2500);
  };

  const openAdjust = (p: Product) => {
    setAdjustModal({ open: true, product: p });
    setAdjustQty(0); setAdjustType('IN'); setAdjustReason('');
  };

  const doAdjust = async () => {
    if (!adjustModal.product || adjustQty <= 0) return;
    const p = adjustModal.product;
    const delta = adjustType === 'IN' ? adjustQty : -adjustQty;
    const newStock = Math.max(0, p.stock_quantity + delta);
    await supabase.from('products').update({ stock_quantity: newStock }).eq('id', p.id);
    await supabase.from('stock_movements').insert({
      product_id: p.id, quantity: adjustQty, movement_type: adjustType, reason: adjustReason || (adjustType === 'IN' ? 'Stock received' : 'Stock issued'),
    });
    setAdjustModal({ open: false, product: null });
    setToast('Stock adjusted');
    load();
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div>
      <div className="toolbar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 38, width: 280 }} placeholder="Search products, SKU, category…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-spacer" />
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} />Add product</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading"><div className="spinner" />Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Package size={32} /><h3>No products yet</h3><p>Add products to start tracking stock</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Location</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.stock_quantity < p.min_stock_quantity;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ color: 'var(--text-3)' }}>{p.sku}</td>
                      <td>{p.category}</td>
                      <td>₹{p.unit_price.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${low ? 'badge-error' : p.stock_quantity < p.min_stock_quantity * 2 ? 'badge-warning' : 'badge-success'}`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{p.location}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="close-btn" style={{ display: 'inline-flex' }} onClick={() => openAdjust(p)} title="Adjust stock"><ArrowDownUp size={15} /></button>
                        <button className="close-btn" style={{ display: 'inline-flex' }} onClick={() => openEdit(p)} title="Edit"><Pencil size={15} /></button>
                        <button className="close-btn" style={{ display: 'inline-flex' }} onClick={() => remove(p)} title="Delete"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="modal-backdrop" onClick={() => setModal({ open: false, edit: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{modal.edit ? 'Edit product' : 'Add product'}</h2><p>{modal.edit ? 'Update product details' : 'Create a new product record'}</p></div>
              <button className="close-btn" onClick={() => setModal({ open: false, edit: null })}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label className="label">Product name</label>
                  <input className="input" placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="label">SKU</label>
                  <input className="input" placeholder="Stock keeping unit" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Category</label>
                  <input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Unit price (₹)</label>
                  <input className="input" type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Stock quantity</label>
                  <input className="input" type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label className="label">Min stock (reorder level)</label>
                  <input className="input" type="number" min={0} value={form.min_stock_quantity} onChange={(e) => setForm({ ...form, min_stock_quantity: Number(e.target.value) })} />
                </div>
              </div>
              <div className="field">
                <label className="label">Warehouse location</label>
                <input className="input" placeholder="Storage location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal({ open: false, edit: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name || !form.sku}>{saving ? 'Saving…' : 'Save product'}</button>
            </div>
          </div>
        </div>
      )}

      {adjustModal.open && adjustModal.product && (
        <div className="modal-backdrop" onClick={() => setAdjustModal({ open: false, product: null })}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Adjust stock</h2><p>{adjustModal.product.name} — current: {adjustModal.product.stock_quantity}</p></div>
              <button className="close-btn" onClick={() => setAdjustModal({ open: false, product: null })}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label className="label">Movement</label>
                  <select className="select" value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'IN' | 'OUT')}>
                    <option value="IN">Stock in (+)</option>
                    <option value="OUT">Stock out (−)</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Quantity</label>
                  <input className="input" type="number" min={1} value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))} />
                </div>
              </div>
              <div className="field">
                <label className="label">Reason</label>
                <input className="input" placeholder="Reason for adjustment" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAdjustModal({ open: false, product: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={doAdjust} disabled={adjustQty <= 0}>Apply adjustment</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </div>
  );
}
