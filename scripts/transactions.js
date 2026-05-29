/**
 * CashGuard – Transactions Module (Firestore)
 */

import { dbAdd, dbGetAll, dbUpdate, dbDelete, tsToISO } from './db.js';
import { getCurrentUser }                                from './auth.js';

function uid() {
  const u = getCurrentUser();
  if (!u) throw new Error('No hay sesión activa.');
  return u.uid;
}

export async function addTransaction({ date, amount, type, categoryId, accountId, notes }) {
  return await dbAdd(uid(), 'transactions', {
    date,
    amount:     parseFloat(amount),
    type,
    categoryId: categoryId || null,
    accountId:  accountId  || null,
    notes:      notes      || '',
  });
}

export async function updateTransaction(id, data) {
  await dbUpdate(uid(), 'transactions', id, data);
}

export async function deleteTransaction(id) {
  await dbDelete(uid(), 'transactions', id);
}

export async function getTransactions() {
  const all = await dbGetAll(uid(), 'transactions');
  return all.sort((a, b) => {
    // Compare calendar dates (e.g. '2026-05-29')
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Descending order
    }
    // If calendar dates are identical, compare exact creation time (createdAt)
    const timeA = a.createdAt ? (a.createdAt.seconds || new Date(tsToISO(a.createdAt)).getTime()) : 0;
    const timeB = b.createdAt ? (b.createdAt.seconds || new Date(tsToISO(b.createdAt)).getTime()) : 0;
    return timeB - timeA; // Descending order
  });
}

export async function getTransactionsByRange(startDate, endDate) {
  const all = await getTransactions();
  return all.filter(t => {
    const d = new Date(t.date);
    return d >= new Date(startDate) && d <= new Date(endDate);
  });
}

export async function getSummary() {
  const transactions = await getTransactions();
  const now          = new Date();
  const currentMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const ingresos = currentMonth.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const gastos   = currentMonth.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);

  return { ingresos, gastos, balance: ingresos - gastos, total: transactions.length };
}
