/**
 * CashGuard – Configuration Module (Firestore)
 * Accounts and Categories management
 */

import { dbAdd, dbGetAll, dbUpdate, dbDelete } from './db.js';
import { getCurrentUser }                       from './auth.js';

function uid() {
  const u = getCurrentUser();
  if (!u) throw new Error('No hay sesión activa.');
  return u.uid;
}

// ── ACCOUNTS ─────────────────────────────────────────────────────────────────

export async function addAccount({ type, name, description, balance }) {
  return await dbAdd(uid(), 'accounts', {
    type,
    name,
    description: description || '',
    balance:     parseFloat(balance) || 0,
  });
}

export async function updateAccount(id, data) {
  await dbUpdate(uid(), 'accounts', id, data);
}

export async function deleteAccount(id) {
  await dbDelete(uid(), 'accounts', id);
}

export async function getAccounts() {
  return await dbGetAll(uid(), 'accounts');
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────

export async function addCategory({ name, icon, description, subcategories }) {
  return await dbAdd(uid(), 'categories', {
    name,
    icon:          icon          || '📂',
    description:   description   || '',
    subcategories: subcategories || [],
  });
}

export async function updateCategory(id, data) {
  await dbUpdate(uid(), 'categories', id, data);
}

export async function deleteCategory(id) {
  await dbDelete(uid(), 'categories', id);
}

export async function getCategories() {
  return await dbGetAll(uid(), 'categories');
}
