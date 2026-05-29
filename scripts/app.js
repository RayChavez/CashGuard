/**
 * CashGuard – Main Application Controller (Firebase version)
 * Uses onAuthStateChanged as the single source of truth for auth state.
 */

import {
  onAuthChange, getCurrentUser,
  registerWithEmail, loginWithEmail,
  loginWithGoogle, loginWithFacebook, loginWithApple,
  sendRecoveryEmail, logout
}                                  from './auth.js';
import { addTransaction, getTransactions, deleteTransaction, updateTransaction } from './transactions.js';
import { addAccount, getAccounts, deleteAccount,
         addCategory, getCategories, deleteCategory }         from './config.js';
import { renderStats }             from './stats.js';

// ══════════════════════════════════════════════════════════════════════════════
//  BOOTSTRAP — Firebase auth state drives everything
// ══════════════════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Set today's date as default
  const dateInput = document.getElementById('txDate');
  if (dateInput) dateInput.value = todayISO();

  onAuthChange(async (user) => {
    if (user) {
      hideAuthModal();
      await showApp(user);
    } else {
      hideApp();
      showAuthModal('login');
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH MODAL
// ══════════════════════════════════════════════════════════════════════════════
function showAuthModal(view = 'login') {
  document.getElementById('authModal').classList.add('active');
  switchAuthView(view);
}
function hideAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}
function hideApp() {
  document.getElementById('appShell').style.display = 'none';
}

window.switchAuthView = function (view) {
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`auth-${view}`);
  if (el) el.classList.add('active');
  // Clear all error messages on view change
  document.querySelectorAll('.auth-msg').forEach(m => { m.style.display = 'none'; m.textContent = ''; });
};

// ── Login form ────────────────────────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormBusy('loginForm', true);
    await loginWithEmail({
      email:    document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    // onAuthChange will fire and call showApp
  } catch (err) {
    showAuthMsg('loginError', friendlyError(err));
  } finally {
    setFormBusy('loginForm', false);
  }
});

// ── Register form ─────────────────────────────────────────────────────────────
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pwd  = document.getElementById('regPassword').value;
  const pwd2 = document.getElementById('regPassword2').value;
  if (pwd !== pwd2) { showAuthMsg('registerError', 'Las contraseñas no coinciden.'); return; }
  if (pwd.length < 6) { showAuthMsg('registerError', 'La contraseña debe tener al menos 6 caracteres.'); return; }

  try {
    setFormBusy('registerForm', true);
    await registerWithEmail({
      name:     document.getElementById('regName').value.trim(),
      email:    document.getElementById('regEmail').value.trim(),
      password: pwd,
    });
    // onAuthChange fires automatically
  } catch (err) {
    showAuthMsg('registerError', friendlyError(err));
  } finally {
    setFormBusy('registerForm', false);
  }
});

// ── Password Recovery form ────────────────────────────────────────────────────
document.getElementById('recoveryForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('recEmail').value.trim();
  try {
    setFormBusy('recoveryForm', true);
    await sendRecoveryEmail(email);
    showAuthMsg('recoveryMsg', `✅ Correo enviado a ${email}. Revisa tu bandeja de entrada.`, 'success');
    document.getElementById('recoveryForm').reset();
  } catch (err) {
    showAuthMsg('recoveryMsg', friendlyError(err));
  } finally {
    setFormBusy('recoveryForm', false);
  }
});

// ── Social login buttons ───────────────────────────────────────────────────────
document.getElementById('btnGoogle')?.addEventListener('click', async () => {
  try { await loginWithGoogle(); } catch (err) { showAuthMsg('loginError', friendlyError(err)); }
});
document.getElementById('btnFacebook')?.addEventListener('click', async () => {
  try { await loginWithFacebook(); } catch (err) { showAuthMsg('loginError', friendlyError(err)); }
});
document.getElementById('btnApple')?.addEventListener('click', async () => {
  try { await loginWithApple(); } catch (err) { showAuthMsg('loginError', friendlyError(err)); }
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await logout();
  // onAuthChange fires and calls hideApp + showAuthModal
});

// ══════════════════════════════════════════════════════════════════════════════
//  APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
async function showApp(user) {
  document.getElementById('appShell').style.display = 'flex';
  // Display name: prefer displayName, else email prefix
  const displayName = user.displayName || user.email?.split('@')[0] || 'Usuario';
  document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
  document.getElementById('userName').textContent   = displayName;

  // Show avatar photo if available (social login)
  if (user.photoURL) {
    const avatar = document.getElementById('userAvatar');
    avatar.style.backgroundImage = `url(${user.photoURL})`;
    avatar.style.backgroundSize  = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.textContent = '';
  }

  switchTab('gastos');
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════
window.switchTab = async function (tab) {
  showLoading('Cargando datos...');
  try {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));

    if (tab === 'gastos') await loadGastosTab();
    if (tab === 'config') await loadConfigTab();
    if (tab === 'stats')  await renderStats(parseInt(document.getElementById('statsRange')?.value || '6'));
  } catch (err) {
    showToast('Error al cargar datos: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
};

document.getElementById('statsRange')?.addEventListener('change', async (e) => {
  await renderStats(parseInt(e.target.value));
});

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 1 — GASTOS
// ══════════════════════════════════════════════════════════════════════════════
async function loadGastosTab() {
  await Promise.all([populateSelects(), renderDashboardSummary()]);
  await renderTransactionList();
}

async function populateSelects() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  const accountSel  = document.getElementById('txAccount');
  const categorySel = document.getElementById('txCategory');

  if (accountSel) {
    accountSel.innerHTML = '<option value="">— Selecciona cuenta —</option>' +
      accounts.map(a => `<option value="${a.id}">${accountTypeIcon(a.type)} ${a.name}</option>`).join('');
  }
  if (categorySel) {
    categorySel.innerHTML = '<option value="">— Sin categoría —</option>';
    categories.forEach(c => {
      categorySel.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
      (c.subcategories || []).forEach(s => {
        categorySel.innerHTML += `<option value="${c.id}__${s.name}">　↳ ${s.icon} ${s.name}</option>`;
      });
    });
  }
}

// Transaction form
let editTransactionId = null;

document.getElementById('txForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormBusy('txForm', true, '💾 Guardando...');
    showLoading(editTransactionId ? 'Actualizando transacción...' : 'Guardando transacción...');
    
    const txData = {
      date:       document.getElementById('txDate').value,
      amount:     document.getElementById('txAmount').value,
      type:       document.getElementById('txType').value,
      categoryId: document.getElementById('txCategory').value.split('__')[0] || null,
      accountId:  document.getElementById('txAccount').value || null,
      notes:      document.getElementById('txNotes').value,
    };

    if (editTransactionId) {
      await updateTransaction(editTransactionId, txData);
      showToast('Transacción actualizada ✅');
      cancelEditTx();
    } else {
      await addTransaction(txData);
      showToast('Transacción guardada ✅');
      e.target.reset();
      document.getElementById('txDate').value = todayISO();
      // Reset radio to "gasto"
      document.getElementById('typeGasto').checked = true;
      document.getElementById('txType').value      = 'gasto';
    }

    await renderTransactionList();
    await renderDashboardSummary();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
    setFormBusy('txForm', false, '💾 Guardar Transacción');
  }
});

async function renderTransactionList() {
  const list = document.getElementById('transactionList');
  if (!list) return;

  const [transactions, categories, accounts] = await Promise.all([
    getTransactions(), getCategories(), getAccounts()
  ]);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  const typeConfig = {
    ingreso:      { color: '#34d399', sign: '+', label: 'Ingreso' },
    gasto:        { color: '#f87171', sign: '-', label: 'Gasto' },
    transferencia:{ color: '#a78bfa', sign: '⇄', label: 'Transferencia' },
  };

  if (!transactions.length) {
    list.innerHTML = `<div class="empty-state"><span>💸</span><p>Sin transacciones aún.<br>¡Agrega tu primera!</p></div>`;
    return;
  }

  list.innerHTML = transactions.slice(0, 50).map(t => {
    const tc   = typeConfig[t.type] || typeConfig.gasto;
    const cat  = catMap[t.categoryId];
    const acc  = accMap[t.accountId];
    const date = t.date
      ? new Date(t.date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      : '—';
    return `
      <div class="tx-item" data-id="${t.id}">
        <div class="tx-icon" style="background:${tc.color}22; color:${tc.color}">
          ${cat?.icon || (t.type === 'ingreso' ? '💰' : t.type === 'transferencia' ? '⇄' : '💸')}
        </div>
        <div class="tx-info">
          <div class="tx-title">${cat?.name || tc.label}</div>
          <div class="tx-meta">${acc?.name || 'Sin cuenta'} · ${date}</div>
          ${t.notes ? `<div class="tx-notes">${escapeHtml(t.notes)}</div>` : ''}
        </div>
        <div class="tx-amount" style="color:${tc.color}">
          ${tc.sign !== '⇄' ? tc.sign : ''}$${t.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
        <div class="tx-actions">
          <button class="tx-action-btn edit" onclick="editTx('${t.id}')" title="Editar">✏️</button>
          <button class="tx-action-btn delete" onclick="deleteTx('${t.id}')" title="Eliminar">×</button>
        </div>
      </div>`;
  }).join('');
}

window.deleteTx = async function (id) {
  if (!confirm('¿Eliminar esta transacción?')) return;
  showLoading('Eliminando transacción...');
  try {
    await deleteTransaction(id);
    await renderTransactionList();
    await renderDashboardSummary();
    showToast('Transacción eliminada');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
};

async function renderDashboardSummary() {
  const transactions = await getTransactions();
  const now          = new Date();
  const currentMonth = transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const ingresos = currentMonth.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const gastos   = currentMonth.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const balance  = ingresos - gastos;
  const fmt      = v => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const el = id => document.getElementById(id);
  if (el('dash-income'))  el('dash-income').textContent  = fmt(ingresos);
  if (el('dash-expense')) el('dash-expense').textContent = fmt(gastos);
  if (el('dash-balance')) {
    el('dash-balance').textContent  = (balance < 0 ? '-' : '') + fmt(Math.abs(balance));
    el('dash-balance').style.color  = balance >= 0 ? '#34d399' : '#f87171';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 2 — CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════════════════════
async function loadConfigTab() {
  await Promise.all([renderAccountsList(), renderCategoriesList()]);
}

// Account form
document.getElementById('accountForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormBusy('accountForm', true, '🏦 Guardando...');
    showLoading('Guardando cuenta...');
    await addAccount({
      type:        document.getElementById('accType').value,
      name:        document.getElementById('accName').value.trim(),
      description: document.getElementById('accDesc').value.trim(),
      balance:     document.getElementById('accBalance').value || 0,
    });
    e.target.reset();
    await renderAccountsList();
    showToast('Cuenta creada ✅');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
    setFormBusy('accountForm', false, '🏦 Crear Cuenta');
  }
});

async function renderAccountsList() {
  const list     = document.getElementById('accountsList');
  if (!list) return;
  const accounts = await getAccounts();

  if (!accounts.length) {
    list.innerHTML = `<div class="empty-state"><span>🏦</span><p>Sin cuentas registradas</p></div>`;
    return;
  }
  list.innerHTML = accounts.map(a => `
    <div class="config-item">
      <div class="config-item-icon">${accountTypeIcon(a.type)}</div>
      <div class="config-item-info">
        <div class="config-item-name">${escapeHtml(a.name)}</div>
        <div class="config-item-meta">${accountTypeLabel(a.type)}${a.description ? ' · ' + escapeHtml(a.description) : ''}</div>
      </div>
      <div class="config-item-actions">
        <button class="btn-icon danger" onclick="deleteAcc('${a.id}')" title="Eliminar">🗑️</button>
      </div>
    </div>`).join('');
}

window.deleteAcc = async function (id) {
  if (!confirm('¿Eliminar esta cuenta?')) return;
  showLoading('Eliminando cuenta...');
  try {
    await deleteAccount(id);
    await renderAccountsList();
    showToast('Cuenta eliminada');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
};

// Subcategories
let pendingSubcategories = [];

window.addSubcategory = function () {
  const name = document.getElementById('subName').value.trim();
  const icon = document.getElementById('subIcon').value.trim() || '📌';
  const desc = document.getElementById('subDesc').value.trim();
  if (!name) { showToast('Nombre de subcategoría requerido', 'error'); return; }
  pendingSubcategories.push({ name, icon, description: desc });
  document.getElementById('subName').value = '';
  document.getElementById('subIcon').value = '';
  document.getElementById('subDesc').value = '';
  renderPendingSubcategories();
};

function renderPendingSubcategories() {
  const list = document.getElementById('pendingSubcats');
  if (!list) return;
  list.innerHTML = pendingSubcategories.map((s, i) =>
    `<span class="subcat-tag">${s.icon} ${escapeHtml(s.name)}
      <button type="button" onclick="removeSubcat(${i})">×</button>
    </span>`
  ).join('');
}

window.removeSubcat = function (i) {
  pendingSubcategories.splice(i, 1);
  renderPendingSubcategories();
};

// Category form
document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    setFormBusy('categoryForm', true, '🏷️ Guardando...');
    showLoading('Guardando categoría...');
    await addCategory({
      name:          document.getElementById('catName').value.trim(),
      icon:          document.getElementById('catIcon').value.trim() || '📂',
      description:   document.getElementById('catDesc').value.trim(),
      subcategories: [...pendingSubcategories],
    });
    e.target.reset();
    pendingSubcategories = [];
    renderPendingSubcategories();
    await renderCategoriesList();
    showToast('Categoría creada ✅');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
    setFormBusy('categoryForm', false, '🏷️ Crear Categoría');
  }
});

async function renderCategoriesList() {
  const list       = document.getElementById('categoriesList');
  if (!list) return;
  const categories = await getCategories();

  if (!categories.length) {
    list.innerHTML = `<div class="empty-state"><span>🏷️</span><p>Sin categorías registradas</p></div>`;
    return;
  }
  list.innerHTML = categories.map(c => `
    <div class="config-item">
      <div class="config-item-icon">${c.icon}</div>
      <div class="config-item-info">
        <div class="config-item-name">${escapeHtml(c.name)}</div>
        ${c.description ? `<div class="config-item-meta">${escapeHtml(c.description)}</div>` : ''}
        ${(c.subcategories || []).length ? `
          <div class="subcats-list">
            ${c.subcategories.map(s => `<span class="subcat-badge">${s.icon} ${escapeHtml(s.name)}</span>`).join('')}
          </div>` : ''}
      </div>
      <div class="config-item-actions">
        <button class="btn-icon danger" onclick="deleteCat('${c.id}')" title="Eliminar">🗑️</button>
      </div>
    </div>`).join('');
}

window.deleteCat = async function (id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  showLoading('Eliminando categoría...');
  try {
    await deleteCategory(id);
    await renderCategoriesList();
    showToast('Categoría eliminada');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function accountTypeIcon(type) {
  return { cash: '💵', debit: '💳', credit: '💰', savings: '🏦', investment: '📈', other: '📦' }[type] || '💳';
}
function accountTypeLabel(type) {
  return { cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', savings: 'Ahorro', investment: 'Inversión', other: 'Otro' }[type] || type;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function showAuthMsg(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className   = `auth-msg ${type}`;
  el.style.display = 'block';
}

function setFormBusy(formId, busy, busyText) {
  const form = document.getElementById(formId);
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled    = busy;
  if (busyText && busy)   btn.textContent = busyText;
  if (!busy && busyText)  btn.textContent = btn.dataset.label || busyText;
}

window.togglePassword = function (inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const hidden = input.type === 'password';
  input.type      = hidden ? 'text' : 'password';
  btn.textContent = hidden ? '🙈' : '👁️';
};

window.toggleConfigSection = function (section) {
  const el = document.getElementById(`config-${section}`);
  if (el) {
    const isCollapsed = el.classList.toggle('collapsed');
    const header = el.previousElementSibling;
    if (header && header.classList.contains('config-section-header')) {
      const icon = header.querySelector('span');
      if (icon) {
        icon.textContent = isCollapsed ? '＋' : '－';
        icon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    }
  }
};

window.editTx = async function (id) {
  try {
    const transactions = await getTransactions();
    const t = transactions.find(x => x.id === id);
    if (!t) throw new Error('No se encontró la transacción.');

    editTransactionId = id;

    // Change title and button text
    const formTitle = document.querySelector('#txForm').previousElementSibling;
    if (formTitle) formTitle.innerHTML = '<span class="section-icon">✏️</span> Editar Transacción';

    const submitBtn = document.getElementById('txForm').querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '💾 Actualizar Transacción';
      submitBtn.dataset.label = '💾 Actualizar Transacción';
    }

    // Show cancel button
    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    // Populate inputs
    document.getElementById('txDate').value = t.date;
    document.getElementById('txAmount').value = t.amount;
    document.getElementById('txNotes').value = t.notes || '';
    
    // Select type radio
    document.getElementById('txType').value = t.type;
    const radio = document.getElementById(`type${t.type.charAt(0).toUpperCase() + t.type.slice(1)}`);
    if (radio) radio.checked = true;

    // Populates selects
    await populateSelects();
    
    // Set selects values
    document.getElementById('txAccount').value = t.accountId || '';
    document.getElementById('txCategory').value = t.categoryId || '';

    // Scroll smoothly to form (especially useful on mobile!)
    document.getElementById('txForm').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

window.cancelEditTx = function () {
  editTransactionId = null;

  // Reset form title and button text
  const formTitle = document.querySelector('#txForm').previousElementSibling;
  if (formTitle) formTitle.innerHTML = '<span class="section-icon">➕</span> Nueva Transacción';

  const submitBtn = document.getElementById('txForm').querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = '💾 Guardar Transacción';
    submitBtn.dataset.label = '💾 Guardar Transacción';
  }

  // Hide cancel button
  const cancelBtn = document.getElementById('btnCancelEdit');
  if (cancelBtn) cancelBtn.style.display = 'none';

  // Reset form inputs
  document.getElementById('txForm').reset();
  document.getElementById('txDate').value = todayISO();
  document.getElementById('typeGasto').checked = true;
  document.getElementById('txType').value = 'gasto';
};

window.showLoading = function (msg = 'Cargando...') {
  const overlay = document.getElementById('globalLoading');
  const text = document.getElementById('globalLoadingText');
  if (overlay) {
    if (text) text.textContent = msg;
    overlay.classList.add('active');
  }
};

window.hideLoading = function () {
  const overlay = document.getElementById('globalLoading');
  if (overlay) overlay.classList.remove('active');
};

// Translate Firebase error codes to Spanish
function friendlyError(err) {
  const code = err.code || '';
  const map  = {
    'auth/user-not-found':          'Usuario no encontrado.',
    'auth/wrong-password':          'Contraseña incorrecta.',
    'auth/email-already-in-use':    'El correo ya está registrado.',
    'auth/weak-password':           'La contraseña es muy débil (mín. 6 caracteres).',
    'auth/invalid-email':           'Correo electrónico inválido.',
    'auth/popup-closed-by-user':    'Ventana cerrada. Intenta de nuevo.',
    'auth/cancelled-popup-request': 'Operación cancelada.',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese correo usando otro proveedor.',
    'auth/network-request-failed':  'Error de red. Verifica tu conexión.',
    'auth/too-many-requests':       'Demasiados intentos. Espera un momento.',
    'auth/invalid-credential':      'Credenciales inválidas. Verifica tu correo y contraseña.',
    'auth/operation-not-allowed':   'Método de login no habilitado en Firebase Console.',
  };
  return map[code] || err.message || 'Error desconocido.';
}
