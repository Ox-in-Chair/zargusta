/** ZARyder Cup — API helper & formatters */

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

export const fmt = {
  zar: (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  btc: (n) => Number(n).toFixed(8),
  btcShort: (n) => Number(n).toFixed(6),
  pct: (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`,
  date: (d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
  dateShort: (d) => new Date(d).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }),
  monthLabel: (yyyymm) => { const [y, m] = yyyymm.split('-'); const d = new Date(+y, +m - 1); return d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }); },
  number: (n) => Number(n).toLocaleString('en-ZA'),
};

export async function api(path) {
  const res = await fetch(`/api${path}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

/** Admin API call — includes X-Admin-Key header from sessionStorage */
export async function adminApi(path, options = {}) {
  const key = sessionStorage.getItem('zargusta-admin-key');
  if (!key) throw new Error('Not authenticated');
  const headers = { 'Content-Type': 'application/json', 'X-Admin-Key': key, ...(options.headers || {}) };
  const res = await fetch(`/api${path}`, { ...options, headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}
