'use client';
import { useState, useEffect } from 'react';
import API from '../../../lib/api';

const EMPTY = {
  name: '', description: '', category: '', price: '', salePrice: '',
  costPrice: '', stockQuantity: 0, unit: 'piece', sku: '', tags: '',
  variants: [], isAvailable: true, trackInventory: true
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [variantInput, setVariantInput] = useState({ name: '', options: '' });
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (filterCat) params.set('category', filterCat);
      if (filterAvail) params.set('available', filterAvail);
      const r = await API.get(`/api/products?${params}`);
      setProducts(r.data.products);
      setTotal(r.data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, filterCat, filterAvail]);
  useEffect(() => {
    API.get('/api/products/meta/categories').then(r => setCategories(r.data));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setVariantInput({ name: '', options: '' }); setShowForm(true); };
  const openEdit = (p) => {
    setEditing(p._id);
    setForm({ ...p, tags: (p.tags || []).join(', '), salePrice: p.salePrice || '', costPrice: p.costPrice || '' });
    setVariantInput({ name: '', options: '' });
    setShowForm(true);
  };

  const addVariant = () => {
    if (!variantInput.name || !variantInput.options) return;
    setForm(f => ({ ...f, variants: [...(f.variants || []), { name: variantInput.name, options: variantInput.options.split(',').map(s => s.trim()).filter(Boolean) }] }));
    setVariantInput({ name: '', options: '' });
  };

  const removeVariant = (i) => setForm(f => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        stockQuantity: parseInt(form.stockQuantity) || 0,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (editing) await API.put(`/api/products/${editing}`, payload);
      else await API.post('/api/products', payload);
      setShowForm(false);
      load();
      API.get('/api/products/meta/categories').then(r => setCategories(r.data));
    } catch (err) { alert(err.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Archive this product? It will be hidden from AI catalogue.')) return;
    await API.delete(`/api/products/${id}`);
    load();
  };

  const updateStock = async (id, qty) => {
    await API.patch(`/api/products/${id}/stock`, { stockQuantity: qty });
    setProducts(ps => ps.map(p => p._id === id ? { ...p, stockQuantity: qty, isAvailable: qty > 0 } : p));
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Product Catalogue</h1>
          <p className="text-muted mt-1" style={{ fontSize: '13px' }}>
            {total} items · AI uses this to answer customer questions
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setBulkMode(!bulkMode)}>
            {bulkMode ? '✕ Exit Bulk' : '📋 Bulk Stock'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} className="flex gap-2" style={{ flex: 1, minWidth: '200px' }}>
          <input className="input" placeholder="Search products..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: '280px' }} />
          <button className="btn btn-secondary" type="submit">Search</button>
        </form>
        <select className="select" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }} style={{ width: '160px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={filterAvail} onChange={e => { setFilterAvail(e.target.value); setPage(1); }} style={{ width: '140px' }}>
          <option value="">All Stock</option>
          <option value="true">In Stock</option>
          <option value="false">Out of Stock</option>
        </select>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex-center" style={{ height: '200px' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>No products yet</p>
          <p style={{ fontSize: '13px' }}>Add your products so the AI can answer customer questions about them.</p>
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: '16px' }}>+ Add First Product</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
          {products.map(p => (
            <div key={p._id} className="card fade-in" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                <span className={`badge ${p.isAvailable ? 'badge-green' : 'badge-red'}`}>
                  {p.isAvailable ? '● In Stock' : '○ Out of Stock'}
                </span>
              </div>

              <div style={{ marginBottom: '10px', paddingRight: '80px' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>{p.name}</div>
                {p.category && <span className="badge badge-purple" style={{ fontSize: '10px' }}>{p.category}</span>}
              </div>

              {p.description && (
                <p className="text-muted" style={{ fontSize: '12px', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.description}
                </p>
              )}

              <div className="flex gap-2" style={{ marginBottom: '10px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>
                  ₹{p.salePrice || p.price}
                </span>
                {p.salePrice && <span className="text-faint" style={{ textDecoration: 'line-through', fontSize: '13px' }}>₹{p.price}</span>}
                {p.costPrice && <span className="text-faint text-xs">margin: {(((( p.salePrice || p.price) - p.costPrice) / (p.salePrice || p.price)) * 100).toFixed(0)}%</span>}
              </div>

              {/* Variants */}
              {p.variants?.length > 0 && (
                <div className="flex gap-1" style={{ flexWrap: 'wrap', marginBottom: '8px' }}>
                  {p.variants.map(v => (
                    <span key={v.name} style={{ fontSize: '11px', color: 'var(--text-2)', background: 'var(--surface-3)', padding: '2px 7px', borderRadius: '4px' }}>
                      {v.name}: {v.options.join('/')}
                    </span>
                  ))}
                </div>
              )}

              {/* Tags */}
              {p.tags?.length > 0 && (
                <div className="flex gap-1" style={{ flexWrap: 'wrap', marginBottom: '10px' }}>
                  {p.tags.slice(0, 4).map(t => <span key={t} className="badge badge-gray text-xs">#{t}</span>)}
                </div>
              )}

              {/* Stock control */}
              {bulkMode ? (
                <div className="flex gap-2" style={{ marginBottom: '12px', alignItems: 'center', background: 'var(--surface-2)', padding: '8px 10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-2)', flex: 1 }}>Stock: {p.unit}</span>
                  <button onClick={() => updateStock(p._id, Math.max(0, p.stockQuantity - 1))}
                    style={{ background: 'var(--surface-3)', border: 'none', borderRadius: '5px', color: 'white', width: 26, height: 26, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: '700', minWidth: '32px', textAlign: 'center', fontSize: '15px' }}>{p.stockQuantity}</span>
                  <button onClick={() => updateStock(p._id, p.stockQuantity + 1)}
                    style={{ background: 'var(--primary)', border: 'none', borderRadius: '5px', color: 'white', width: 26, height: 26, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px' }}>
                  Stock: <span style={{ fontWeight: '600', color: p.stockQuantity <= 5 ? 'var(--warning)' : 'var(--text)' }}>{p.stockQuantity} {p.unit}s</span>
                  {p.sku && <span style={{ marginLeft: '8px' }}>· SKU: {p.sku}</span>}
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)} style={{ flex: 1 }}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex-center gap-2" style={{ marginTop: '24px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-muted text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{editing ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name + Category */}
              <div className="grid-2">
                <div>
                  <label className="label">Product / Service Name *</label>
                  <input className="input" value={form.name} onChange={e => f('name', e.target.value)} required placeholder="Silk Saree - Blue" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" value={form.category} onChange={e => f('category', e.target.value)} placeholder="Sarees, Burgers, Laptops..." list="cat-list" />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description (AI uses this to answer questions)</label>
                <textarea className="textarea" value={form.description} onChange={e => f('description', e.target.value)} rows={2} placeholder="Describe the product — material, style, use case, special features..." />
              </div>

              {/* Pricing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Price (₹) *</label>
                  <input className="input" type="number" step="0.01" value={form.price} onChange={e => f('price', e.target.value)} required placeholder="1500" />
                </div>
                <div>
                  <label className="label">Sale Price (₹)</label>
                  <input className="input" type="number" step="0.01" value={form.salePrice} onChange={e => f('salePrice', e.target.value)} placeholder="1200" />
                </div>
                <div>
                  <label className="label">Cost Price (₹)</label>
                  <input className="input" type="number" step="0.01" value={form.costPrice} onChange={e => f('costPrice', e.target.value)} placeholder="800" />
                </div>
              </div>

              {/* Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Stock Quantity</label>
                  <input className="input" type="number" value={form.stockQuantity} onChange={e => f('stockQuantity', e.target.value)} placeholder="50" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="select" value={form.unit} onChange={e => f('unit', e.target.value)}>
                    {['piece', 'kg', 'gram', 'litre', 'ml', 'metre', 'set', 'box', 'pair', 'pack', 'plate', 'portion'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">SKU / Code</label>
                  <input className="input" value={form.sku} onChange={e => f('sku', e.target.value)} placeholder="SILK-BLU-001" />
                </div>
              </div>

              {/* Variants */}
              <div>
                <label className="label">Variants (Size, Color, Storage, Spice level, etc.)</label>
                <div className="flex gap-2" style={{ marginBottom: '8px' }}>
                  <input className="input" placeholder="Variant name (e.g. Size)" value={variantInput.name}
                    onChange={e => setVariantInput(v => ({ ...v, name: e.target.value }))} style={{ flex: 1 }} />
                  <input className="input" placeholder="Options: S, M, L, XL" value={variantInput.options}
                    onChange={e => setVariantInput(v => ({ ...v, options: e.target.value }))} style={{ flex: 2 }} />
                  <button type="button" className="btn btn-secondary" onClick={addVariant}>+ Add</button>
                </div>
                {form.variants?.length > 0 && (
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {form.variants.map((v, i) => (
                      <span key={i} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{v.name}:</strong> {v.options.join(', ')}
                        <button type="button" onClick={() => removeVariant(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="label">Tags (helps AI find this product, comma separated)</label>
                <input className="input" value={form.tags} onChange={e => f('tags', e.target.value)} placeholder="ethnic, wedding, summer, bestseller" />
              </div>

              {/* Availability toggle */}
              <div className="flex gap-3" style={{ alignItems: 'center' }}>
                <input type="checkbox" id="avail" checked={form.isAvailable} onChange={e => f('isAvailable', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                <label htmlFor="avail" style={{ cursor: 'pointer', fontSize: '13px' }}>Mark as available (uncheck if out of season or discontinued)</label>
              </div>

              {/* Actions */}
              <div className="flex gap-3" style={{ marginTop: '8px' }}>
                <button className="btn btn-primary" type="submit" disabled={saving} style={{ flex: 1, padding: '11px' }}>
                  {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : (editing ? '✅ Update Product' : '+ Add Product')}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)} style={{ padding: '11px 20px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
