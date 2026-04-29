// ── STATE ────────────────────────────────────────────────────────────────
let token = localStorage.getItem('pms_token') || '';
let currentUser = localStorage.getItem('pms_user') || '';
let currentPage = 'dashboard';
let posCart = [];
let posProducts = [];
let posCustomers = [];

const API = '/api';
const fmt = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── INIT ─────────────────────────────────────────────────────────────────
window.onload = () => {
  if (token) { showApp(); }
  setInterval(updateClock, 1000);
  updateClock();
  document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
};

function updateClock() {
  const d = document.getElementById('topbarDate');
  if (d) d.textContent = new Date().toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── AUTH ─────────────────────────────────────────────────────────────────
async function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!u || !p) { errEl.textContent = 'Please enter username and password.'; errEl.style.display = 'block'; return; }
  const btn = document.querySelector('.btn-login');
  btn.innerHTML = '<span class="spinner"></span> Signing in...';
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    token = data.token; currentUser = data.username;
    localStorage.setItem('pms_token', token);
    localStorage.setItem('pms_user', currentUser);
    showApp();
  } catch (e) {
    errEl.textContent = e.message || 'Login failed. Check credentials.';
    errEl.style.display = 'block';
    btn.innerHTML = '<span>Sign In</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    btn.disabled = false;
  }
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('userName').textContent = currentUser;
  document.getElementById('userAvatar').textContent = currentUser.charAt(0).toUpperCase();
  navigate('dashboard');
}

function doLogout() {
  token = ''; localStorage.removeItem('pms_token'); localStorage.removeItem('pms_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

// ── API HELPER ────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (res.status === 401) { doLogout(); return null; }
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = { dashboard: 'Dashboard', pos: 'Point of Sale', medicines: 'Medicines', suppliers: 'Suppliers', stock: 'Stock Management', customers: 'Customers', employees: 'Employees', sales: 'Sales History', users: 'User Accounts' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const pages = { dashboard: renderDashboard, pos: renderPOS, medicines: renderMedicines, suppliers: renderSuppliers, stock: renderStock, customers: renderCustomers, employees: renderEmployees, sales: renderSales, users: renderUsers };
  if (pages[page]) pages[page]();
  return false;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modal').classList.add('open');
}
function closeModal(e) { if (e.target === e.currentTarget) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modal').classList.remove('open'); }
function closeReceipt(e) { if (e.target === e.currentTarget) closeReceiptDirect(); }
function closeReceiptDirect() { document.getElementById('receiptModal').classList.remove('open'); }

function showReceipt(html) {
  document.getElementById('receiptContent').innerHTML = html;
  document.getElementById('receiptModal').classList.add('open');
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
async function renderDashboard() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div> Loading dashboard...</div>`;
  const r = await api('GET', '/dashboard');
  if (!r || !r.ok) return;
  const d = r.data;

  // Update alert bell
  const alertBell = document.getElementById('alertBell');
  const alertCount = document.getElementById('alertCount');
  if (d.lowStock > 0) {
    alertCount.textContent = d.lowStock;
    alertCount.style.display = 'flex';
  } else {
    alertCount.style.display = 'none';
  }

  const maxSale = Math.max(...(d.monthlySales.map(s => s.total)), 1);
  const chartBars = d.monthlySales.slice(-6).map(s => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `<div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${Math.max(4, (s.total/maxSale)*96)}px" title="${fmt(s.total)}"></div>
      <div class="chart-bar-label">${months[s.month-1]}</div>
    </div>`;
  }).join('');

  const recentRows = d.recentSales.map(s => `
    <tr>
      <td><span class="mono">${s.receiptNumber}</span></td>
      <td>${s.customerName}</td>
      <td>${fmt(s.total)}</td>
      <td><span class="badge ${s.status==='completed'?'badge-green':'badge-gray'}">${s.status}</span></td>
      <td>${fmtDateTime(s.createdAt)}</td>
    </tr>`).join('') || `<tr><td colspan="5"><div class="empty"><div class="empty-icon">📋</div><p>No sales today yet</p></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Dashboard</h1><p>Welcome back, ${currentUser}! Here's what's happening today.</p></div>
      <button class="btn-primary" onclick="navigate('pos')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Sale
      </button>
    </div>
    ${d.lowStock > 0 ? `<div class="alert alert-warning">⚠️ <strong>${d.lowStock} medicine(s)</strong> are running low on stock. <a href="#" onclick="navigate('stock')" style="font-weight:600;text-decoration:underline">View Stock</a></div>` : ''}
    ${d.expiringSoon > 0 ? `<div class="alert alert-danger">🗓️ <strong>${d.expiringSoon} medicine(s)</strong> are expiring within 30 days.</div>` : ''}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">💰</div>
        <div><div class="stat-label">Today's Sales</div><div class="stat-value">${fmt(d.todaySales)}</div><div class="stat-sub">${d.totalSalesToday} transaction(s)</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">💊</div>
        <div><div class="stat-label">Total Medicines</div><div class="stat-value">${d.totalMedicines}</div><div class="stat-sub">Active in inventory</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⚠️</div>
        <div><div class="stat-label">Low Stock</div><div class="stat-value">${d.lowStock}</div><div class="stat-sub">Need reordering</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">👥</div>
        <div><div class="stat-label">Customers</div><div class="stat-value">${d.totalCustomers}</div><div class="stat-sub">Registered</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">📅</div>
        <div><div class="stat-label">Expiring Soon</div><div class="stat-value">${d.expiringSoon}</div><div class="stat-sub">Within 30 days</div></div>
      </div>
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><span class="card-title">Recent Sales</span><button class="btn-outline btn-sm" onclick="navigate('sales')">View All</button></div>
        <div class="card-body" style="padding:0">
          <div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Customer</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead><tbody>${recentRows}</tbody></table></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Sales (6 months)</span></div>
        <div class="card-body">
          ${d.monthlySales.length > 0 ? `<div class="chart-bars">${chartBars}</div>` : '<div class="empty" style="padding:20px"><p>No sales data yet</p></div>'}
        </div>
      </div>
    </div>`;
}

// ── POS ───────────────────────────────────────────────────────────────────
async function renderPOS() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div> Loading POS...</div>`;
  const [medsR, custsR] = await Promise.all([api('GET', '/medicines?status=active'), api('GET', '/customers')]);
  posProducts = medsR?.data?.filter(m => m.stock > 0) || [];
  posCustomers = custsR?.data || [];
  renderPOSLayout();
}

function renderPOSLayout(search = '') {
  const filtered = search ? posProducts.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.genericName.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase())) : posProducts;

  const catIcons = { 'Analgesic': '💊', 'Cold & Flu': '🤧', 'Antibiotic': '🦠', 'Cardiovascular': '❤️', 'Diabetes': '🩸', 'Gastrointestinal': '🫀', 'Vitamins': '🌟', 'Antihistamine': '🤧' };

  const productCards = filtered.map(m => `
    <div class="product-card ${m.stock <= m.reorderLevel ? 'low-stock' : ''}" onclick="addToCart(${m.id})">
      <div class="product-emoji">${catIcons[m.category] || '💊'}</div>
      <div class="product-name">${m.name}</div>
      <div class="product-generic">${m.genericName}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="product-price">${fmt(m.price)}</div>
        <div class="product-stock ${m.stock <= m.reorderLevel ? 'badge badge-orange' : ''}">${m.stock} ${m.unit}</div>
      </div>
    </div>`).join('') || `<div class="empty"><div class="empty-icon">🔍</div><p>No medicines found</p></div>`;

  const cartItemsHtml = posCart.length === 0 ? `<div class="cart-empty">🛒<br>Cart is empty<br><small>Click a medicine to add</small></div>` :
    posCart.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-name">${item.name}<br><span class="cart-item-price">${fmt(item.price)} each</span></div>
        <div class="cart-qty">
          <button onclick="updateCartQty(${idx}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updateCartQty(${idx}, 1)">+</button>
        </div>
        <div class="cart-subtotal">${fmt(item.price * item.qty)}</div>
        <button class="btn-icon danger" style="margin-left:4px" onclick="removeFromCart(${idx})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`).join('');

  const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = parseFloat(document.getElementById('posDiscount')?.value || 0) || 0;
  const total = Math.max(0, subtotal - discount);
  const amtPaid = parseFloat(document.getElementById('posAmtPaid')?.value || 0) || 0;
  const change = Math.max(0, amtPaid - total);

  document.getElementById('pageContent').innerHTML = `
    <div class="pos-layout">
      <div class="pos-products">
        <div class="filter-bar" style="margin-bottom:12px">
          <div class="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search medicines..." onInput="renderPOSLayout(this.value)" style="min-width:240px" value="${search}"/>
          </div>
        </div>
        <div class="product-grid">${productCards}</div>
      </div>
      <div class="pos-cart">
        <div class="cart-header">
          <h3>🛒 Shopping Cart</h3>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${posCart.length} item(s)</div>
        </div>
        <div class="cart-items">${cartItemsHtml}</div>
        <div class="cart-summary">
          <div class="cart-row"><span>Customer</span>
            <select id="posCustomer" style="width:160px;padding:5px 8px;font-size:12px">
              <option value="">Walk-in</option>
              ${posCustomers.map(c => `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`).join('')}
            </select>
          </div>
          <div class="cart-row"><span>Payment</span>
            <select id="posPayment" style="width:120px;padding:5px 8px;font-size:12px">
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="card">Card</option>
              <option value="maya">Maya</option>
            </select>
          </div>
          <div class="cart-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
          <div class="cart-row">
            <span>Discount (₱)</span>
            <input type="number" id="posDiscount" value="${discount}" min="0" style="width:90px;text-align:right;padding:4px 8px" onInput="updatePOSTotals()" />
          </div>
          <div class="cart-row total"><span>TOTAL</span><span>${fmt(total)}</span></div>
          <div class="cart-row">
            <span>Amount Paid</span>
            <input type="number" id="posAmtPaid" value="${amtPaid}" min="0" style="width:100px;text-align:right;padding:4px 8px" onInput="updatePOSTotals()" />
          </div>
          <div class="cart-row" style="color:var(--green);font-weight:600"><span>Change</span><span>${fmt(change)}</span></div>
          <button class="checkout-btn" onclick="checkoutPOS()" ${posCart.length === 0 ? 'disabled' : ''}>
            ✓ Checkout — ${fmt(total)}
          </button>
          <button class="btn-outline" style="width:100%;margin-top:8px;justify-content:center" onclick="posCart=[];renderPOSLayout()">Clear Cart</button>
        </div>
      </div>
    </div>`;
}

function addToCart(id) {
  const med = posProducts.find(m => m.id === id);
  if (!med) return;
  const existing = posCart.find(i => i.id === id);
  if (existing) {
    if (existing.qty >= med.stock) { alert(`Only ${med.stock} ${med.unit}(s) available`); return; }
    existing.qty++;
  } else {
    posCart.push({ id: med.id, name: med.name, price: med.price, qty: 1, stock: med.stock, unit: med.unit });
  }
  renderPOSLayout(document.querySelector('.pos-products input')?.value || '');
}

function updateCartQty(idx, delta) {
  const item = posCart[idx];
  const newQty = item.qty + delta;
  if (newQty <= 0) { posCart.splice(idx, 1); }
  else if (newQty > item.stock) { alert(`Only ${item.stock} available`); return; }
  else { item.qty = newQty; }
  renderPOSLayout(document.querySelector('.pos-products input')?.value || '');
}

function removeFromCart(idx) { posCart.splice(idx, 1); renderPOSLayout(); }

function updatePOSTotals() {
  const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = parseFloat(document.getElementById('posDiscount')?.value || 0) || 0;
  const total = Math.max(0, subtotal - discount);
  const amtPaid = parseFloat(document.getElementById('posAmtPaid')?.value || 0) || 0;
  const change = Math.max(0, amtPaid - total);
  document.querySelectorAll('.cart-row.total span:last-child').forEach(el => el.textContent = fmt(total));
  document.querySelectorAll('.cart-row span:last-child').forEach((el, i) => { /* handled by re-render */ });
  document.querySelector('.checkout-btn').textContent = `✓ Checkout — ${fmt(total)}`;
  document.querySelectorAll('.cart-row').forEach(row => {
    if (row.querySelector('span')?.textContent === 'Change') row.querySelectorAll('span')[1].textContent = fmt(change);
  });
}

async function checkoutPOS() {
  if (posCart.length === 0) return;
  const discount = parseFloat(document.getElementById('posDiscount')?.value || 0) || 0;
  const amtPaid = parseFloat(document.getElementById('posAmtPaid')?.value || 0) || 0;
  const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(0, subtotal - discount);
  if (amtPaid < total) { alert('Amount paid is less than total!'); return; }

  const payload = {
    customerId: document.getElementById('posCustomer')?.value ? parseInt(document.getElementById('posCustomer').value) : null,
    items: posCart.map(i => ({ medicineId: i.id, quantity: i.qty })),
    discount,
    paymentMethod: document.getElementById('posPayment')?.value || 'cash',
    amountPaid: amtPaid,
    notes: null
  };

  const r = await api('POST', '/sales', payload);
  if (!r?.ok) { alert('Checkout failed: ' + (r?.data?.error || 'Unknown error')); return; }

  const sale = r.data;
  posCart = [];
  // Refresh products
  const medsR = await api('GET', '/medicines?status=active');
  posProducts = medsR?.data?.filter(m => m.stock > 0) || [];

  const receiptHtml = `
    <div class="receipt-content">
      <div class="receipt-header">
        <div class="receipt-logo">💊 MediCare PMS</div>
        <div class="receipt-sub">Official Receipt</div>
        <div class="receipt-sub">${new Date().toLocaleString('en-PH')}</div>
      </div>
      <hr class="receipt-divider"/>
      <div class="receipt-row bold"><span>Receipt #:</span><span>${sale.receiptNumber}</span></div>
      <hr class="receipt-divider"/>
      <div class="receipt-items">
        ${payload.items.map(item => {
          const med = posProducts.find(m => m.id === item.medicineId) || { name: `Med #${item.medicineId}`, price: 0 };
          return `<div class="receipt-item"><div class="receipt-item-name">${posCart.find ? '' : ''}${item.medicineId}</div></div>`;
        }).join('')}
        ${sale.receiptNumber ? payload.items.map((item, i) => {
          const cartItem = JSON.parse(localStorage.getItem('lastCart') || '[]')[i];
          return '';
        }).join('') : ''}
      </div>
      <hr class="receipt-divider"/>
      <div class="receipt-row"><span>Subtotal:</span><span>${fmt(subtotal)}</span></div>
      <div class="receipt-row"><span>Discount:</span><span>−${fmt(discount)}</span></div>
      <div class="receipt-row bold"><span>TOTAL:</span><span>${fmt(sale.total || total)}</span></div>
      <div class="receipt-row"><span>Paid:</span><span>${fmt(amtPaid)}</span></div>
      <div class="receipt-row"><span>Change:</span><span>${fmt(sale.change || (amtPaid - total))}</span></div>
      <hr class="receipt-divider"/>
      <div style="text-align:center;font-size:11px;color:var(--text3)">Thank you for your purchase!<br>Please keep this receipt.</div>
    </div>`;

  renderPOSLayout();
  showReceipt(receiptHtml);
}

// ── MEDICINES ─────────────────────────────────────────────────────────────
async function renderMedicines() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const [medsR, supR] = await Promise.all([api('GET', '/medicines'), api('GET', '/suppliers')]);
  const meds = medsR?.data || [];
  const suppliers = supR?.data || [];

  const rows = meds.map(m => `
    <tr>
      <td><div style="font-weight:600">${m.name}</div><div style="font-size:11px;color:var(--text3)">${m.genericName}</div></td>
      <td><span class="badge badge-blue">${m.category}</span></td>
      <td>${fmt(m.price)}</td>
      <td>
        <span class="${m.stock <= m.reorderLevel ? 'badge badge-orange' : 'badge badge-green'}">${m.stock} ${m.unit}</span>
      </td>
      <td>${m.supplierName || '—'}</td>
      <td>${fmtDate(m.expiryDate)}</td>
      <td><span class="badge ${m.status === 'active' ? 'badge-green' : 'badge-gray'}">${m.status}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" onclick="editMedicine(${m.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteMedicine(${m.id}, '${m.name}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="8"><div class="empty"><div class="empty-icon">💊</div><h3>No medicines yet</h3><p>Click "Add Medicine" to get started</p></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Medicines</h1><p>${meds.length} medicine(s) in inventory</p></div>
      <div class="header-actions">
        <button class="btn-primary" onclick="openAddMedicine()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Medicine
        </button>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Supplier</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  window._suppliers = suppliers;
}

function medicineForm(m = null, suppliers = window._suppliers || []) {
  const supOptions = suppliers.map(s => `<option value="${s.id}" ${m?.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
  const expiry = m?.expiryDate ? m.expiryDate.substring(0, 10) : '';
  return `
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group-modal form-col-2"><label>Medicine Name *</label><input type="text" id="mName" value="${m?.name || ''}" placeholder="e.g. Biogesic"/></div>
        <div class="form-group-modal"><label>Generic Name *</label><input type="text" id="mGeneric" value="${m?.genericName || ''}" placeholder="e.g. Paracetamol 500mg"/></div>
        <div class="form-group-modal"><label>Category</label>
          <select id="mCategory">
            ${['Analgesic','Antibiotic','Antihistamine','Cardiovascular','Cold & Flu','Diabetes','Gastrointestinal','Vitamins','Other'].map(c => `<option ${m?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group-modal"><label>Price (₱) *</label><input type="number" id="mPrice" value="${m?.price || ''}" min="0" step="0.01" placeholder="0.00"/></div>
        <div class="form-group-modal"><label>Stock</label><input type="number" id="mStock" value="${m?.stock || 0}" min="0"/></div>
        <div class="form-group-modal"><label>Reorder Level</label><input type="number" id="mReorder" value="${m?.reorderLevel || 10}" min="0"/></div>
        <div class="form-group-modal"><label>Unit</label>
          <select id="mUnit">${['tablet','capsule','bottle','sachet','pcs','ml','mg'].map(u => `<option ${m?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
        </div>
        <div class="form-group-modal"><label>Expiry Date *</label><input type="date" id="mExpiry" value="${expiry}"/></div>
        <div class="form-group-modal"><label>Supplier</label>
          <select id="mSupplier"><option value="">— None —</option>${supOptions}</select>
        </div>
        <div class="form-group-modal"><label>Barcode</label><input type="text" id="mBarcode" value="${m?.barcode || ''}"/></div>
        <div class="form-group-modal form-col-2"><label>Description</label><input type="text" id="mDesc" value="${m?.description || ''}"/></div>
        ${m ? `<div class="form-group-modal"><label>Status</label><select id="mStatus"><option value="active" ${m.status==='active'?'selected':''}>Active</option><option value="inactive" ${m.status==='inactive'?'selected':''}>Inactive</option></select></div>` : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="${m ? `saveMedicine(${m.id})` : 'addMedicine()'}">
        ${m ? 'Save Changes' : 'Add Medicine'}
      </button>
    </div>`;
}

function openAddMedicine() { openModal('Add Medicine', medicineForm()); }

async function editMedicine(id) {
  const r = await api('GET', `/medicines/${id}`);
  if (!r?.ok) { alert('Failed to load medicine. ID: ' + id); return; }
  openModal('Edit Medicine', medicineForm(r.data, window._suppliers || []));
}

async function addMedicine() {
  const payload = buildMedicinePayload();
  if (!payload) return;
  const r = await api('POST', '/medicines', payload);
  if (!r?.ok) { alert('Failed: ' + (r?.data?.error || JSON.stringify(r?.data))); return; }
  closeModalDirect(); renderMedicines();
}

async function saveMedicine(id) {
  const payload = buildMedicinePayload();
  if (!payload) return;
  const r = await api('PUT', `/medicines/${id}`, payload);
  if (!r?.ok) { alert('Failed: ' + JSON.stringify(r?.data)); return; }
  closeModalDirect(); renderMedicines();
}

function buildMedicinePayload() {
  const name = document.getElementById('mName')?.value.trim();
  const generic = document.getElementById('mGeneric')?.value.trim();
  const price = parseFloat(document.getElementById('mPrice')?.value);
  const expiry = document.getElementById('mExpiry')?.value;
  if (!name || !generic || isNaN(price) || !expiry) { alert('Please fill in all required fields.'); return null; }
  return {
    name, genericName: generic,
    category: document.getElementById('mCategory')?.value,
    description: document.getElementById('mDesc')?.value || '',
    price, stock: parseInt(document.getElementById('mStock')?.value || 0),
    reorderLevel: parseInt(document.getElementById('mReorder')?.value || 10),
    unit: document.getElementById('mUnit')?.value,
    expiryDate: new Date(expiry).toISOString(),
    supplierId: document.getElementById('mSupplier')?.value ? parseInt(document.getElementById('mSupplier').value) : null,
    barcode: document.getElementById('mBarcode')?.value || null,
    status: document.getElementById('mStatus')?.value || 'active'
  };
}

async function deleteMedicine(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  await api('DELETE', `/medicines/${id}`); renderMedicines();
}

// ── SUPPLIERS ─────────────────────────────────────────────────────────────
async function renderSuppliers() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await api('GET', '/suppliers');
  const sups = r?.data || [];
  const rows = sups.map(s => `
    <tr>
      <td><div style="font-weight:600">${s.name}</div></td>
      <td>${s.contactPerson || '—'}</td>
      <td>${s.phone || '—'}</td>
      <td>${s.email || '—'}</td>
      <td>${s.address || '—'}</td>
      <td><span class="badge badge-blue">${s.medicineCount} medicines</span></td>
      <td><span class="badge ${s.status==='active'?'badge-green':'badge-gray'}">${s.status}</span></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="editSupplier(${s.id})">✏️</button>
        <button class="btn-icon danger" onclick="deleteSupplier(${s.id},'${s.name}')">🗑️</button>
      </div></td>
    </tr>`).join('') || `<tr><td colspan="8"><div class="empty"><div class="empty-icon">🏢</div><h3>No suppliers yet</h3></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Suppliers</h1><p>${sups.length} supplier(s)</p></div>
      <button class="btn-primary" onclick="openAddSupplier()">+ Add Supplier</button>
    </div>
    <div class="card"><div class="card-body" style="padding:0">
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th>Medicines</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>`;
  window._suppliers_data = sups;
}

function supplierForm(s = null) {
  return `
    <div class="modal-body"><div class="form-grid">
      <div class="form-group-modal form-col-2"><label>Company Name *</label><input type="text" id="sName" value="${s?.name || ''}"/></div>
      <div class="form-group-modal"><label>Contact Person</label><input type="text" id="sContact" value="${s?.contactPerson || ''}"/></div>
      <div class="form-group-modal"><label>Phone</label><input type="tel" id="sPhone" value="${s?.phone || ''}"/></div>
      <div class="form-group-modal"><label>Email</label><input type="email" id="sEmail" value="${s?.email || ''}"/></div>
      <div class="form-group-modal"><label>Address</label><input type="text" id="sAddress" value="${s?.address || ''}"/></div>
      ${s ? `<div class="form-group-modal"><label>Status</label><select id="sStatus"><option ${s.status==='active'?'selected':''}>active</option><option ${s.status==='inactive'?'selected':''}>inactive</option></select></div>` : ''}
    </div></div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="${s ? `saveSupplier(${s.id})` : 'addSupplier()'}">${s ? 'Save' : 'Add Supplier'}</button>
    </div>`;
}

function openAddSupplier() { openModal('Add Supplier', supplierForm()); }
async function editSupplier(id) {
  const s = window._suppliers_data?.find(x => x.id === id);
  if (s) openModal('Edit Supplier', supplierForm(s));
}
async function addSupplier() {
  const name = document.getElementById('sName')?.value.trim();
  if (!name) { alert('Name required'); return; }
  const r = await api('POST', '/suppliers', { name, contactPerson: document.getElementById('sContact').value, phone: document.getElementById('sPhone').value, email: document.getElementById('sEmail').value, address: document.getElementById('sAddress').value, status: 'active' });
  if (!r?.ok) { alert('Failed'); return; }
  closeModalDirect(); renderSuppliers();
}
async function saveSupplier(id) {
  const name = document.getElementById('sName')?.value.trim();
  if (!name) { alert('Name required'); return; }
  const r = await api('PUT', `/suppliers/${id}`, { name, contactPerson: document.getElementById('sContact').value, phone: document.getElementById('sPhone').value, email: document.getElementById('sEmail').value, address: document.getElementById('sAddress').value, status: document.getElementById('sStatus')?.value || 'active' });
  if (!r?.ok) { alert('Failed'); return; }
  closeModalDirect(); renderSuppliers();
}
async function deleteSupplier(id, name) {
  if (!confirm(`Delete supplier "${name}"?`)) return;
  await api('DELETE', `/suppliers/${id}`); renderSuppliers();
}

// ── STOCK ─────────────────────────────────────────────────────────────────
async function renderStock() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const [medsR, movR] = await Promise.all([api('GET', '/medicines'), api('GET', '/stock/movements')]);
  const meds = medsR?.data || [];
  const movements = movR?.data || [];
  const lowStock = meds.filter(m => m.stock <= m.reorderLevel && m.status === 'active');

  const lowRows = lowStock.map(m => `
    <tr>
      <td><div style="font-weight:600">${m.name}</div><div style="font-size:11px;color:var(--text3)">${m.genericName}</div></td>
      <td><span class="badge badge-orange">${m.stock} ${m.unit}</span></td>
      <td>${m.reorderLevel}</td>
      <td>${m.supplierName || '—'}</td>
      <td><button class="btn-primary btn-sm" onclick="openStockAdjust(${m.id},'${m.name}',${m.stock})">+ Restock</button></td>
    </tr>`).join('') || `<tr><td colspan="5"><div class="empty" style="padding:20px"><p>✅ All medicines are well-stocked</p></div></td></tr>`;

  const movRows = movements.slice(0, 20).map(mv => `
    <tr>
      <td>${mv.medicineName}</td>
      <td><span class="badge ${mv.type==='in'?'badge-green':'badge-red'}">${mv.type === 'in' ? '↑ IN' : '↓ OUT'}</span></td>
      <td>${mv.quantity}</td>
      <td>${mv.reason}</td>
      <td>${fmtDateTime(mv.createdAt)}</td>
    </tr>`).join('') || `<tr><td colspan="5"><div class="empty"><p>No movements yet</p></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Stock Management</h1><p>${lowStock.length} item(s) need restocking</p></div>
      <button class="btn-primary" onclick="openStockAdjust()">+ Adjust Stock</button>
    </div>
    ${lowStock.length > 0 ? `<div class="alert alert-warning">⚠️ ${lowStock.length} medicine(s) are below reorder level</div>` : ''}
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">🔴 Low Stock Alert</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap"><table><thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Supplier</th><th>Action</th></tr></thead><tbody>${lowRows}</tbody></table></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">📦 Recent Stock Movements</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap"><table><thead><tr><th>Medicine</th><th>Type</th><th>Quantity</th><th>Reason</th><th>Date</th></tr></thead><tbody>${movRows}</tbody></table></div>
      </div>
    </div>`;
  window._meds_list = meds;
}

async function openStockAdjust(medId = null, medName = '', current = 0) {
  const meds = window._meds_list || (await api('GET', '/medicines'))?.data || [];
  window._meds_list = meds;
  const options = meds.map(m => `<option value="${m.id}" ${m.id === medId ? 'selected' : ''}>${m.name} (${m.stock})</option>`).join('');
  openModal('Adjust Stock', `
    <div class="modal-body"><div class="form-grid">
      <div class="form-group-modal form-col-2"><label>Medicine *</label><select id="adjMed">${options}</select></div>
      <div class="form-group-modal"><label>Type</label>
        <select id="adjType"><option value="in">Stock In (+)</option><option value="out">Stock Out (−)</option></select>
      </div>
      <div class="form-group-modal"><label>Quantity *</label><input type="number" id="adjQty" min="1" value="1"/></div>
      <div class="form-group-modal form-col-2"><label>Reason *</label><input type="text" id="adjReason" placeholder="e.g. Received from supplier"/></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="saveStockAdjust()">Save Adjustment</button>
    </div>`);
}

async function saveStockAdjust() {
  const medId = parseInt(document.getElementById('adjMed')?.value);
  const type = document.getElementById('adjType')?.value;
  const qty = parseInt(document.getElementById('adjQty')?.value);
  const reason = document.getElementById('adjReason')?.value.trim();
  if (!medId || !qty || !reason) { alert('Fill all fields'); return; }
  const r = await api('POST', '/stock/adjust', { medicineId: medId, type, quantity: qty, reason });
  if (!r?.ok) { alert(r?.data?.error || 'Failed'); return; }
  closeModalDirect(); renderStock();
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────
async function renderCustomers() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await api('GET', '/customers');
  const custs = r?.data || [];
  const rows = custs.map(c => `
    <tr>
      <td><div style="font-weight:600">${c.fullName}</div></td>
      <td>${c.phone || '—'}</td>
      <td>${c.email || '—'}</td>
      <td>${c.address || '—'}</td>
      <td>${c.purchaseCount} purchases</td>
      <td>${fmt(c.totalPurchases)}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="editCustomer(${c.id})">✏️</button>
        <button class="btn-icon danger" onclick="deleteCustomer(${c.id},'${c.fullName}')">🗑️</button>
      </div></td>
    </tr>`).join('') || `<tr><td colspan="7"><div class="empty"><div class="empty-icon">👥</div><h3>No customers yet</h3></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Customers</h1><p>${custs.length} registered customer(s)</p></div>
      <button class="btn-primary" onclick="openAddCustomer()">+ Add Customer</button>
    </div>
    <div class="card"><div class="card-body" style="padding:0">
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Purchases</th><th>Total Spent</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>`;
  window._customers_data = custs;
}

function customerForm(c = null) {
  return `
    <div class="modal-body"><div class="form-grid">
      <div class="form-group-modal"><label>First Name *</label><input type="text" id="cFirst" value="${c?.firstName || ''}"/></div>
      <div class="form-group-modal"><label>Last Name *</label><input type="text" id="cLast" value="${c?.lastName || ''}"/></div>
      <div class="form-group-modal"><label>Phone</label><input type="tel" id="cPhone" value="${c?.phone || ''}"/></div>
      <div class="form-group-modal"><label>Email</label><input type="email" id="cEmail" value="${c?.email || ''}"/></div>
      <div class="form-group-modal form-col-2"><label>Address</label><input type="text" id="cAddress" value="${c?.address || ''}"/></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="${c ? `saveCustomer(${c.id})` : 'addCustomer()'}">${c ? 'Save' : 'Add Customer'}</button>
    </div>`;
}
function openAddCustomer() { openModal('Add Customer', customerForm()); }
async function editCustomer(id) { const c = window._customers_data?.find(x => x.id === id); if (c) openModal('Edit Customer', customerForm(c)); }
async function addCustomer() {
  const fn = document.getElementById('cFirst')?.value.trim();
  const ln = document.getElementById('cLast')?.value.trim();
  if (!fn || !ln) { alert('First and Last name required'); return; }
  const r = await api('POST', '/customers', { firstName: fn, lastName: ln, phone: document.getElementById('cPhone').value, email: document.getElementById('cEmail').value, address: document.getElementById('cAddress').value });
  if (!r?.ok) { alert('Failed'); return; }
  closeModalDirect(); renderCustomers();
}
async function saveCustomer(id) {
  const fn = document.getElementById('cFirst')?.value.trim();
  const ln = document.getElementById('cLast')?.value.trim();
  if (!fn || !ln) { alert('Name required'); return; }
  await api('PUT', `/customers/${id}`, { firstName: fn, lastName: ln, phone: document.getElementById('cPhone').value, email: document.getElementById('cEmail').value, address: document.getElementById('cAddress').value });
  closeModalDirect(); renderCustomers();
}
async function deleteCustomer(id, name) {
  if (!confirm(`Delete customer "${name}"?`)) return;
  await api('DELETE', `/customers/${id}`); renderCustomers();
}

// ── EMPLOYEES ─────────────────────────────────────────────────────────────
async function renderEmployees() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await api('GET', '/employees');
  const emps = r?.data || [];
  const rows = emps.map(e => `
    <tr>
      <td><div style="font-weight:600">${e.firstName} ${e.lastName}</div></td>
      <td>${e.position}</td>
      <td>${e.phone || '—'}</td>
      <td>${e.email || '—'}</td>
      <td>${fmtDate(e.hiredAt)}</td>
      <td><span class="badge ${e.status==='active'?'badge-green':'badge-gray'}">${e.status}</span></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="editEmployee(${e.id})">✏️</button>
        <button class="btn-icon danger" onclick="deleteEmployee(${e.id},'${e.firstName} ${e.lastName}')">🗑️</button>
      </div></td>
    </tr>`).join('') || `<tr><td colspan="7"><div class="empty"><div class="empty-icon">👨‍⚕️</div><h3>No employees yet</h3></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Employees</h1><p>${emps.length} employee(s)</p></div>
      <button class="btn-primary" onclick="openAddEmployee()">+ Add Employee</button>
    </div>
    <div class="card"><div class="card-body" style="padding:0">
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Position</th><th>Phone</th><th>Email</th><th>Hired</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>`;
  window._employees_data = emps;
}
function employeeForm(e = null) {
  const hiredVal = e?.hiredAt ? e.hiredAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
  return `
    <div class="modal-body"><div class="form-grid">
      <div class="form-group-modal"><label>First Name *</label><input type="text" id="eFirst" value="${e?.firstName || ''}"/></div>
      <div class="form-group-modal"><label>Last Name *</label><input type="text" id="eLast" value="${e?.lastName || ''}"/></div>
      <div class="form-group-modal"><label>Position *</label>
        <select id="ePos">${['Pharmacist','Pharmacy Aide','Cashier','Store Manager','Delivery Staff','Other'].map(p => `<option ${e?.position===p?'selected':''}>${p}</option>`).join('')}</select>
      </div>
      <div class="form-group-modal"><label>Hired Date</label><input type="date" id="eHired" value="${hiredVal}"/></div>
      <div class="form-group-modal"><label>Phone</label><input type="tel" id="ePhone" value="${e?.phone || ''}"/></div>
      <div class="form-group-modal"><label>Email</label><input type="email" id="eEmail" value="${e?.email || ''}"/></div>
      ${e ? `<div class="form-group-modal"><label>Status</label><select id="eStatus"><option ${e.status==='active'?'selected':''}>active</option><option ${e.status==='inactive'?'selected':''}>inactive</option></select></div>` : ''}
    </div></div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="${e ? `saveEmployee(${e.id})` : 'addEmployee()'}">${e ? 'Save' : 'Add Employee'}</button>
    </div>`;
}
function openAddEmployee() { openModal('Add Employee', employeeForm()); }
async function editEmployee(id) { const e = window._employees_data?.find(x => x.id === id); if (e) openModal('Edit Employee', employeeForm(e)); }
async function addEmployee() {
  const fn = document.getElementById('eFirst')?.value.trim(), ln = document.getElementById('eLast')?.value.trim();
  if (!fn || !ln) { alert('Name required'); return; }
  const r = await api('POST', '/employees', { firstName: fn, lastName: ln, position: document.getElementById('ePos').value, phone: document.getElementById('ePhone').value, email: document.getElementById('eEmail').value, hiredAt: document.getElementById('eHired').value, status: 'active' });
  if (!r?.ok) { alert('Failed'); return; }
  closeModalDirect(); renderEmployees();
}
async function saveEmployee(id) {
  const fn = document.getElementById('eFirst')?.value.trim(), ln = document.getElementById('eLast')?.value.trim();
  if (!fn || !ln) { alert('Name required'); return; }
  await api('PUT', `/employees/${id}`, { firstName: fn, lastName: ln, position: document.getElementById('ePos').value, phone: document.getElementById('ePhone').value, email: document.getElementById('eEmail').value, hiredAt: document.getElementById('eHired').value, status: document.getElementById('eStatus')?.value || 'active' });
  closeModalDirect(); renderEmployees();
}
async function deleteEmployee(id, name) {
  if (!confirm(`Delete employee "${name}"?`)) return;
  await api('DELETE', `/employees/${id}`); renderEmployees();
}

// ── SALES HISTORY ─────────────────────────────────────────────────────────
async function renderSales() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await api('GET', '/sales');
  const sales = r?.data || [];
  const total = sales.reduce((s, x) => s + x.total, 0);
  const rows = sales.map(s => `
    <tr>
      <td><span style="font-family:'DM Mono',monospace;font-size:12px">${s.receiptNumber}</span></td>
      <td>${s.customerName}</td>
      <td>${s.items?.length || 0} item(s)</td>
      <td>${fmt(s.total)}</td>
      <td><span class="badge badge-blue">${s.paymentMethod}</span></td>
      <td><span class="badge ${s.status==='completed'?'badge-green':'badge-gray'}">${s.status}</span></td>
      <td>${fmtDateTime(s.createdAt)}</td>
      <td><button class="btn-icon" onclick="viewSale(${s.id})">👁️</button></td>
    </tr>`).join('') || `<tr><td colspan="8"><div class="empty"><div class="empty-icon">📋</div><h3>No sales yet</h3><p>Start selling from POS</p></div></td></tr>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>Sales History</h1><p>${sales.length} transaction(s) — Total: ${fmt(total)}</p></div>
    </div>
    <div class="card"><div class="card-body" style="padding:0">
      <div class="table-wrap"><table><thead><tr><th>Receipt #</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>`;
}

async function viewSale(id) {
  const r = await api('GET', `/sales/${id}`);
  if (!r?.ok) return;
  const s = r.data;
  const itemRows = (s.items || []).map(i => `
    <tr><td>${i.medicineName}</td><td>${i.genericName || ''}</td><td>${i.quantity}</td><td>${fmt(i.unitPrice)}</td><td>${fmt(i.subtotal)}</td></tr>`).join('');
  openModal(`Receipt: ${s.receiptNumber}`, `
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:13px">
        <div><label style="font-size:11px;color:var(--text3)">CUSTOMER</label><div style="font-weight:600">${s.customerName}</div></div>
        <div><label style="font-size:11px;color:var(--text3)">PAYMENT</label><div style="font-weight:600;text-transform:capitalize">${s.paymentMethod}</div></div>
        <div><label style="font-size:11px;color:var(--text3)">DATE</label><div>${fmtDateTime(s.createdAt)}</div></div>
        <div><label style="font-size:11px;color:var(--text3)">STATUS</label><span class="badge badge-green">${s.status}</span></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Medicine</th><th>Generic</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table></div>
      <div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Subtotal</span><span>${fmt(s.subTotal)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Discount</span><span>−${fmt(s.discount)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;margin-top:8px"><span>TOTAL</span><span>${fmt(s.total)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text3)"><span>Paid / Change</span><span>${fmt(s.amountPaid)} / ${fmt(s.change)}</span></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn-outline" onclick="closeModalDirect()">Close</button></div>`);
}

// ── USER ACCOUNTS ──────────────────────────────────────────────────────────
async function renderUsers() {
  document.getElementById('pageContent').innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await api('GET', '/auth/users');
  const users = r?.data || [];
  const rows = users.map(u => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <div class="user-avatar" style="width:32px;height:32px;font-size:12px">${u.username.charAt(0).toUpperCase()}</div>
        <span style="font-weight:600">${u.username}</span>
      </div></td>
      <td><span class="badge ${u.role==='admin'?'badge-purple':'badge-blue'}">${u.role}</span></td>
      <td>${fmtDate(u.createdAt)}</td>
      <td>${u.username === 'admin' ? '<span class="badge badge-gray">Protected</span>' : `<button class="btn-icon danger" onclick="deleteUser(${u.id},'${u.username}')">🗑️</button>`}</td>
    </tr>`).join('');

  document.getElementById('pageContent').innerHTML = `
    <div class="page-header">
      <div><h1>User Accounts</h1><p>Manage system access</p></div>
      <button class="btn-primary" onclick="openCreateUser()">+ Create User</button>
    </div>
    <div class="card" style="max-width:600px"><div class="card-body" style="padding:0">
      <div class="table-wrap"><table><thead><tr><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>
    <div class="card" style="max-width:600px;margin-top:16px">
      <div class="card-header"><span class="card-title">⚠️ Security Note</span></div>
      <div class="card-body"><p style="font-size:13px;color:var(--text2)">Only administrators can create new user accounts. Keep credentials secure. The default admin account cannot be deleted.</p></div>
    </div>`;
}

function openCreateUser() {
  openModal('Create User Account', `
    <div class="modal-body"><div class="form-grid">
      <div class="form-group-modal"><label>Username *</label><input type="text" id="uUser"/></div>
      <div class="form-group-modal"><label>Password *</label><input type="password" id="uPass"/></div>
      <div class="form-group-modal form-col-2"><label>Role</label>
        <select id="uRole"><option value="admin">Admin</option><option value="staff" selected>Staff</option></select>
      </div>
    </div></div>
    <div class="modal-footer">
      <button class="btn-outline" onclick="closeModalDirect()">Cancel</button>
      <button class="btn-primary" onclick="createUser()">Create Account</button>
    </div>`);
}

async function createUser() {
  const username = document.getElementById('uUser')?.value.trim();
  const password = document.getElementById('uPass')?.value;
  const role = document.getElementById('uRole')?.value;
  if (!username || !password) { alert('Username and password required'); return; }
  if (password.length < 6) { alert('Password must be at least 6 characters'); return; }
  const r = await api('POST', '/auth/create-user', { username, password, role });
  if (!r?.ok) { alert(r?.data?.error || 'Failed'); return; }
  closeModalDirect(); renderUsers();
}

async function deleteUser(id, name) {
  if (!confirm(`Delete user "${name}"?`)) return;
  await api('DELETE', `/auth/users/${id}`); renderUsers();
}
