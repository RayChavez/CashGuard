/**
 * CashGuard – Statistics Module
 * Renders Chart.js visualizations from Firestore data
 */

import { getTransactions } from './transactions.js';
import { getCategories }   from './config.js';

let chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

const CATEGORY_COLORS = [
  '#8b5cf6','#06b6d4','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#ec4899','#14b8a6','#f97316','#84cc16',
];

const CHART_DEFAULTS = {
  plugins: {
    legend: { labels: { color: '#c4b5fd', font: { family: 'Inter', size: 12 } } }
  },
  scales: {
    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: {
      ticks: { color: '#9ca3af', callback: v => `$${v.toLocaleString('es-MX')}` },
      grid:  { color: 'rgba(255,255,255,0.05)' }
    }
  }
};

const mxFmt = v => ` $${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export async function renderStats(rangeMonths = 6) {
  const [transactions, categories] = await Promise.all([getTransactions(), getCategories()]);

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const now    = new Date();

  // Build month buckets
  const months = Array.from({ length: rangeMonths }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }) };
  });

  const rangeStart   = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1), 1);
  const filtered     = transactions.filter(t => new Date(t.date) >= rangeStart);

  const incomeByMonth  = months.map(m =>
    filtered.filter(t => t.type === 'ingreso' && matchMonth(t.date, m)).reduce((s, t) => s + t.amount, 0));
  const expenseByMonth = months.map(m =>
    filtered.filter(t => t.type === 'gasto'   && matchMonth(t.date, m)).reduce((s, t) => s + t.amount, 0));

  const cumulativeBalance = incomeByMonth.map((v, i) => {
    const net = incomeByMonth.slice(0, i + 1).reduce((s, v) => s + v, 0) -
                expenseByMonth.slice(0, i + 1).reduce((s, v) => s + v, 0);
    return net;
  });

  // Expenses by category – current month
  const thisMonthExp = filtered.filter(t => {
    const d = new Date(t.date);
    return t.type === 'gasto' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const expByCategory = thisMonthExp.reduce((acc, t) => {
    const name = catMap[t.categoryId]?.name || 'Sin categoría';
    acc[name]  = (acc[name] || 0) + t.amount;
    return acc;
  }, {});

  renderBarChart(months.map(m => m.label), incomeByMonth, expenseByMonth);
  renderLineChart(months.map(m => m.label), cumulativeBalance);
  renderDonutChart(expByCategory);
  renderSummaryCards(filtered, now);
}

function matchMonth(dateStr, { year, month }) {
  const d = new Date(dateStr);
  return d.getMonth() === month && d.getFullYear() === year;
}

function renderBarChart(labels, income, expenses) {
  destroyChart('barChart');
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  chartInstances['barChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Ingresos', data: income,   backgroundColor: 'rgba(52,211,153,0.8)',  borderColor: 'rgba(52,211,153,0.8)',  borderRadius: 6, borderSkipped: false },
        { label: 'Gastos',   data: expenses, backgroundColor: 'rgba(248,113,113,0.8)', borderColor: 'rgba(248,113,113,0.8)', borderRadius: 6, borderSkipped: false },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { ...CHART_DEFAULTS.plugins, tooltip: { callbacks: { label: ctx => mxFmt(ctx.parsed.y) } } },
      scales:  CHART_DEFAULTS.scales
    }
  });
}

function renderLineChart(labels, balance) {
  destroyChart('lineChart');
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  chartInstances['lineChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Balance acumulado',
        data:  balance,
        borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.15)',
        fill: true, tension: 0.4, pointBackgroundColor: '#8b5cf6', pointRadius: 5, pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { ...CHART_DEFAULTS.plugins, tooltip: { callbacks: { label: ctx => mxFmt(ctx.parsed.y) } } },
      scales:  CHART_DEFAULTS.scales
    }
  });
}

function renderDonutChart(expByCategory) {
  destroyChart('donutChart');
  const noData = document.getElementById('donutNoData');
  const ctx    = document.getElementById('donutChart');
  if (!ctx) return;

  const labels = Object.keys(expByCategory);
  const data   = Object.values(expByCategory);

  if (!labels.length) {
    if (noData) noData.style.display = 'flex';
    ctx.style.display = 'none';
    return;
  }
  if (noData) noData.style.display = 'none';
  ctx.style.display = 'block';

  chartInstances['donutChart'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data, backgroundColor: CATEGORY_COLORS.slice(0, labels.length),
        borderColor: 'rgba(15,10,30,0.8)', borderWidth: 3, hoverOffset: 12
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { color: '#c4b5fd', font: { family: 'Inter', size: 11 }, padding: 16, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => mxFmt(ctx.parsed) } }
      }
    }
  });
}

function renderSummaryCards(filtered, now) {
  const currentMonth = filtered.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const ingresos = currentMonth.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const gastos   = currentMonth.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const balance  = ingresos - gastos;
  const fmt      = v => `$${Math.abs(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const el = id => document.getElementById(id);
  if (el('stat-income'))  el('stat-income').textContent  = fmt(ingresos);
  if (el('stat-expense')) el('stat-expense').textContent = fmt(gastos);
  if (el('stat-balance')) {
    el('stat-balance').textContent = (balance < 0 ? '-' : '') + fmt(balance);
    el('stat-balance').className   = 'stat-value ' + (balance >= 0 ? 'positive' : 'negative');
  }
}
