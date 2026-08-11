import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Search, Pencil, Trash2, X, Users, Phone, Mail, Building2, MapPin, Eye } from 'lucide-react';

type Customer = {
  id: string; name: string; mobile: string; email: string; business_name: string;
  gst_number: string; customer_type: string; address: string; status: string;
  follow_up_date: string | null; notes: string; created_at: string;
};

const empty: Omit<Customer, 'id' | 'created_at'> = {
  name: '', mobile: '', email: '', business_name: '', gst_number: '',
  customer_type: 'Wholesale', address: '', status: 'Lead', follow_up_date: null, notes: '',
};

export default function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState<{ open: boolean; edit: Customer | null }>({ open: false, edit: null });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const match = !q || r.name.toLowerCase().includes(q) || r.mobile.includes(q) || r.business_name.toLowerCase().includes(q);
    const stat = filter === 'all' || r.status === filter;
    return match && stat;
  });

  const openAdd = () => { setForm(empty); setModal({ open: true, edit: null }); };
  const openEdit = (c: Customer) => { setForm({ ...c }); setModal({ open: true, edit: c }); };

  const save = async () => {
    setSaving(true);
    try {
      let result;
      if (modal.edit) {
        result = await supabase.from('customers').update(form).eq('id', modal.edit.id);
      } else {
        result = await supabase.from('customers').insert(form);
      }
      
      // Check for errors
      if (result.error) {
        console.error('Supabase error:', result.error);
        setToast(`Error: ${result.error.message}`);
        setSaving(false);
        setTimeout(() => setToast(null), 5000);
        return;
      }
      
      console.log('Customer saved successfully:', result.data);
      setSaving(false);
      setModal({ open: false, edit: null });
      setToast(modal.edit ? 'Customer updated' : 'Customer added');
      load();
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error('Unexpected error saving customer:', err);
      setToast(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSaving(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    await supabase.from('customers').delete().eq('id', c.id);
    setToast('Customer deleted');
    load();
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div>
      <div className="toolbar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 38, width: 280 }} placeholder="Search name, phone, business…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 140 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="Lead">Lead</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <div className="toolbar-spacer" />
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} />Add customer</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading"><div className="spinner" />Loading customers…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Users size={32} /><h3>No customers found</h3><p>Add your first customer to get started</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Business</th><th>Mobile</th><th>Type</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-2)' }}>{c.business_name || '—'}</td>
                    <td>{c.mobile || '—'}</td>
                    <td><span className="badge badge-neutral">{c.customer_type}</span></td>
                    <td><span className={`badge ${c.status === 'Active' ? 'badge-success' : c.status === 'Lead' ? 'badge-primary' : 'badge-neutral'}`}>{c.status}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="close-btn" style={{ display: 'inline-flex' }} onClick={() => setViewCustomer(c)} title="View"><Eye size={15} /></button>
                      <button className="close-btn" style={{ display: 'inline-flex' }} onClick={() => openEdit(c)} title="Edit"><Pencil size={15} /></button>
                      <button className="close-btn" style={{ display: 'inline-flex' }} onClick={() => remove(c)} title="Delete"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal.open && (
        <div className="modal-backdrop" onClick={() => setModal({ open: false, edit: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{modal.edit ? 'Edit customer' : 'Add customer'}</h2><p>{modal.edit ? 'Update contact details' : 'Create a new customer record'}</p></div>
              <button className="close-btn" onClick={() => setModal({ open: false, edit: null })}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="label">Contact name</label>
                <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Mobile</label>
                  <input className="input" placeholder="Phone number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Business name</label>
                  <input className="input" placeholder="Company / shop" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">GST number</label>
                  <input className="input" placeholder="GSTIN" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Customer type</label>
                  <select className="select" value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
                    <option>Retail</option><option>Wholesale</option><option>Distributor</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Lead</option><option>Active</option><option>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">Address</label>
                <textarea className="textarea" rows={2} placeholder="Delivery address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="label">Follow-up date</label>
                  <input className="input" type="date" value={form.follow_up_date || ''} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value || null })} />
                </div>
                <div className="field">
                  <label className="label">Notes</label>
                  <input className="input" placeholder="Internal notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal({ open: false, edit: null })}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save customer'}</button>
            </div>
          </div>
        </div>
      )}

      {viewCustomer && (
        <div className="modal-backdrop" onClick={() => setViewCustomer(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{viewCustomer.name}</h2><p>{viewCustomer.business_name || 'Individual customer'}</p></div>
              <button className="close-btn" onClick={() => setViewCustomer(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                <span className={`badge ${viewCustomer.status === 'Active' ? 'badge-success' : viewCustomer.status === 'Lead' ? 'badge-primary' : 'badge-neutral'}`}>{viewCustomer.status}</span>
                <span className="badge badge-neutral">{viewCustomer.customer_type}</span>
              </div>
              <div className="detail-row">
                <div><div className="label">Mobile</div><div style={{ fontSize: 14 }}>{viewCustomer.mobile || '—'}</div></div>
                <div><div className="label">Email</div><div style={{ fontSize: 14 }}>{viewCustomer.email || '—'}</div></div>
              </div>
              <div className="detail-row">
                <div><div className="label">Business</div><div style={{ fontSize: 14 }}>{viewCustomer.business_name || '—'}</div></div>
                <div><div className="label">GST number</div><div style={{ fontSize: 14 }}>{viewCustomer.gst_number || '—'}</div></div>
              </div>
              <div className="detail-row">
                <div><div className="label">Follow-up date</div><div style={{ fontSize: 14 }}>{viewCustomer.follow_up_date ? new Date(viewCustomer.follow_up_date).toLocaleDateString('en-IN') : '—'}</div></div>
                <div><div className="label">Customer since</div><div style={{ fontSize: 14 }}>{new Date(viewCustomer.created_at).toLocaleDateString('en-IN')}</div></div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <div className="label">Address</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{viewCustomer.address || '—'}</div>
              </div>
              {viewCustomer.notes && (
                <div className="field" style={{ marginBottom: 0, marginTop: 12 }}>
                  <div className="label">Notes</div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{viewCustomer.notes}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewCustomer(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { openEdit(viewCustomer); setViewCustomer(null); }}>Edit customer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </div>
  );
}
