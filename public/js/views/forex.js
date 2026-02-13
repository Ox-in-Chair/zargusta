/** ZARyder Cup — Forex view */
import { $, api, fmt } from '../api.js';
import { drawSparkline } from '../charts.js';

export async function loadForex() {
  const container = $('#forex-content');
  if (!container) return;

  try {
    const [data, historyRes] = await Promise.all([
      api('/market/forex'),
      fetch('/api/market/forex/history').then(r => r.json()).catch(() => null),
    ]);
    const history = historyRes?.data || [];
    const currencies = data.currencies || [];

    const heroPairs = [
      { code: 'USD', name: 'US Dollar', rate: data.zarPerUsd, key: 'zarPerUsd', color: '#FFD700' },
      { code: 'EUR', name: 'Euro', rate: data.zarPerEur, key: 'zarPerEur', color: '#FFFFFF' },
      { code: 'GBP', name: 'British Pound', rate: data.zarPerGbp, key: 'zarPerGbp', color: '#3B82F6' },
      { code: 'CHF', name: 'Swiss Franc', rate: data.zarPerChf, key: 'zarPerChf', color: '#A855F7' },
    ];

    container.innerHTML = `
      <div class="stats-grid stats-grid-4">
        ${heroPairs.map(p => `
          <div class="stat-card">
            <div class="stat-label">ZAR / ${p.code}</div>
            <div class="stat-value" style="font-size:20px;">${p.rate ? `R${Number(p.rate).toFixed(2)}` : '—'}</div>
            <div class="text-muted" style="font-size:12px;">${p.name}</div>
            <canvas class="forex-spark" data-key="${p.key}" data-color="${p.color}" width="200" height="40" style="width:100%;height:40px;margin-top:8px;"></canvas>
            ${history.length < 2 ? '<div class="text-muted" style="font-size:10px;margin-top:4px;">Collecting trend data…</div>' : ''}
          </div>
        `).join('')}
      </div>

      <div class="card" style="margin-top:20px;padding:24px;">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div class="card-title">World Currencies — ZAR Rates</div>
          <input type="text" id="forex-search" placeholder="Search currency…"
            style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-input);color:var(--text);font-size:14px;width:220px;">
        </div>
        <div style="margin-top:16px;overflow-x:auto;">
          <table id="forex-table" style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="border-bottom:2px solid var(--border);text-align:left;">
                <th class="fx-sort" data-col="0" style="padding:10px 8px;cursor:pointer;white-space:nowrap;">Currency ⇅</th>
                <th class="fx-sort" data-col="1" style="padding:10px 8px;cursor:pointer;white-space:nowrap;">Name ⇅</th>
                <th class="fx-sort" data-col="2" style="padding:10px 8px;cursor:pointer;white-space:nowrap;text-align:right;">ZAR Rate ⇅</th>
                <th class="fx-sort" data-col="3" style="padding:10px 8px;cursor:pointer;white-space:nowrap;">Region ⇅</th>
                <th class="fx-sort" data-col="4" style="padding:10px 8px;cursor:pointer;white-space:nowrap;text-align:right;">100 units ⇅</th>
                <th class="fx-sort" data-col="5" style="padding:10px 8px;cursor:pointer;white-space:nowrap;text-align:right;">1,000 units ⇅</th>
              </tr>
            </thead>
            <tbody id="forex-tbody"></tbody>
          </table>
        </div>
      </div>

      <details class="card" style="margin-top:20px;padding:24px;">
        <summary style="cursor:pointer;font-weight:600;font-size:16px;color:var(--text);">Trip Budget — EUR Conversion</summary>
        <div style="margin-top:16px;">
          ${data.zarPerEur ? `
            <p class="text-secondary">At current rate of <strong class="text-primary">R${Number(data.zarPerEur).toFixed(2)}</strong> per EUR:</p>
            <div class="stats-grid stats-grid-3" style="margin-top:12px;">
              <div class="stat-card">
                <div class="stat-label">€500 spending</div>
                <div class="stat-value" style="font-size:18px;">${fmt.zar(500 * data.zarPerEur)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">€1,000 spending</div>
                <div class="stat-value" style="font-size:18px;">${fmt.zar(1000 * data.zarPerEur)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">€2,000 spending</div>
                <div class="stat-value" style="font-size:18px;">${fmt.zar(2000 * data.zarPerEur)}</div>
              </div>
            </div>
          ` : '<p class="text-muted">EUR rate not available</p>'}
        </div>
      </details>
    `;

    // Draw sparklines
    if (history.length >= 2) {
      container.querySelectorAll('.forex-spark').forEach(canvas => {
        const key = canvas.dataset.key;
        const color = canvas.dataset.color;
        const values = history.map(h => h[key]).filter(v => v != null);
        if (values.length >= 2) drawSparkline(canvas, values, color);
      });
    }

    // Build table rows
    const tbody = document.getElementById('forex-tbody');
    const rows = currencies.filter(c => c.zarRate != null).map(c => ({
      code: c.code,
      flag: c.flag,
      name: c.name,
      rate: c.zarRate,
      region: c.region,
      r100: c.zarRate * 100,
      r1000: c.zarRate * 1000,
    }));

    function renderRows(data) {
      tbody.innerHTML = data.map(r => `
        <tr style="border-bottom:1px solid var(--border);" class="fx-row">
          <td style="padding:10px 8px;white-space:nowrap;">${r.flag} ${r.code}</td>
          <td style="padding:10px 8px;">${r.name}</td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;">R${r.rate.toFixed(4)}</td>
          <td style="padding:10px 8px;">${r.region}</td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;">${fmt.zar(r.r100)}</td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;">${fmt.zar(r.r1000)}</td>
        </tr>
      `).join('');
    }

    // Sort state
    let sortCol = 2, sortAsc = false;
    const sortKeys = [r => r.code, r => r.name, r => r.rate, r => r.region, r => r.r100, r => r.r1000];

    function sortAndRender(filtered) {
      const fn = sortKeys[sortCol];
      filtered.sort((a, b) => {
        const va = fn(a), vb = fn(b);
        if (typeof va === 'number') return sortAsc ? va - vb : vb - va;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
      renderRows(filtered);
      // Update header arrows
      document.querySelectorAll('.fx-sort').forEach(th => {
        const col = Number(th.dataset.col);
        const base = th.textContent.replace(/ [↑↓⇅]$/, '');
        th.textContent = base + (col === sortCol ? (sortAsc ? ' ↑' : ' ↓') : ' ⇅');
      });
    }

    function getFiltered() {
      const q = (document.getElementById('forex-search')?.value || '').toLowerCase();
      return q ? rows.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) : [...rows];
    }

    // Sort click handlers
    document.querySelectorAll('.fx-sort').forEach(th => {
      th.addEventListener('click', () => {
        const col = Number(th.dataset.col);
        if (col === sortCol) { sortAsc = !sortAsc; } else { sortCol = col; sortAsc = true; }
        sortAndRender(getFiltered());
      });
    });

    // Search
    document.getElementById('forex-search')?.addEventListener('input', () => sortAndRender(getFiltered()));

    // Initial render
    sortAndRender(getFiltered());

    // Add hover style
    const style = document.createElement('style');
    style.textContent = `.fx-row:hover { background: var(--bg-hover, rgba(255,255,255,0.05)); }`;
    document.head.appendChild(style);

  } catch (err) {
    console.error('Forex load failed:', err);
    container.innerHTML = '<div class="empty-state">Failed to load forex data</div>';
  }
}
