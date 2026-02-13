/** ZARyder Cup — Alt Coins view */
import { $, api, fmt } from '../api.js';
import { makeSortable } from '../table-sort.js';

let refreshTimer = null;

export async function loadAltcoins() {
  const container = $('#altcoins-list');
  if (!container) return;
  
  try {
    const coins = await api('/market/altcoins');
    if (!Array.isArray(coins) || coins.length === 0) {
      container.innerHTML = '<div class="empty-state">No altcoin data available. CoinGecko API may be rate-limited.</div>';
      return;
    }

    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      container.innerHTML = coins.map(c => `
        <div class="stat-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            ${c.image ? `<img src="${c.image}" width="24" height="24" alt="${c.symbol}" style="border-radius:50%;">` : ''}
            <div>
              <div style="font-weight:600;">${c.name}</div>
              <div class="text-muted" style="font-size:12px;">${(c.symbol || '').toUpperCase()}</div>
            </div>
          </div>
          <div class="stat-value" style="font-size:18px;">${fmt.zar(c.current_price || 0)}</div>
          <div style="display:flex;gap:12px;margin-top:4px;">
            <span class="${(c.price_change_percentage_24h_in_currency || 0) >= 0 ? 'text-green' : 'text-red'}" style="font-size:13px;">24h: ${fmt.pct(c.price_change_percentage_24h_in_currency || 0)}</span>
            <span class="${(c.price_change_percentage_7d_in_currency || 0) >= 0 ? 'text-green' : 'text-red'}" style="font-size:13px;">7d: ${fmt.pct(c.price_change_percentage_7d_in_currency || 0)}</span>
          </div>
          <div class="text-muted" style="font-size:12px;margin-top:4px;">MCap: ${fmt.zar(c.market_cap || 0)}</div>
          ${c.sparkline_in_7d?.price ? `<canvas class="coin-sparkline" data-prices='${JSON.stringify(c.sparkline_in_7d.price.slice(-48))}' width="200" height="40" style="width:100%;height:40px;margin-top:8px;"></canvas>` : ''}
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="card table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Coin</th><th>Price (ZAR)</th><th>24h %</th><th>7d %</th><th>Market Cap</th><th>7d Chart</th>
            </tr></thead>
            <tbody>
              ${coins.map((c, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td style="display:flex;align-items:center;gap:8px;">
                    ${c.image ? `<img src="${c.image}" width="20" height="20" alt="${c.symbol}" style="border-radius:50%;">` : ''}
                    <span style="font-weight:600;">${c.name}</span>
                    <span class="text-muted">${(c.symbol || '').toUpperCase()}</span>
                  </td>
                  <td>${fmt.zar(c.current_price || 0)}</td>
                  <td class="${(c.price_change_percentage_24h_in_currency || 0) >= 0 ? 'text-green' : 'text-red'}">${fmt.pct(c.price_change_percentage_24h_in_currency || 0)}</td>
                  <td class="${(c.price_change_percentage_7d_in_currency || 0) >= 0 ? 'text-green' : 'text-red'}">${fmt.pct(c.price_change_percentage_7d_in_currency || 0)}</td>
                  <td>${fmt.zar(c.market_cap || 0)}</td>
                  <td>${c.sparkline_in_7d?.price ? `<canvas class="coin-sparkline" data-prices='${JSON.stringify(c.sparkline_in_7d.price.slice(-48))}' width="120" height="32" style="width:120px;height:32px;"></canvas>` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Draw sparklines
    drawSparklines(container);

    // Make desktop table sortable
    if (!isMobile) {
      const tableEl = container.querySelector('table');
      if (tableEl) {
        function renderAltTable(data) {
          const tbody = tableEl.querySelector('tbody');
          if (!tbody) return;
          tbody.innerHTML = data.map((c, i) => `
            <tr>
              <td>${i + 1}</td>
              <td style="display:flex;align-items:center;gap:8px;">
                ${c.image ? `<img src="${c.image}" width="20" height="20" alt="${c.symbol}" style="border-radius:50%;">` : ''}
                <span style="font-weight:600;">${c.name}</span>
                <span class="text-muted">${(c.symbol || '').toUpperCase()}</span>
              </td>
              <td>${fmt.zar(c.current_price || 0)}</td>
              <td class="${(c.price_change_percentage_24h_in_currency || 0) >= 0 ? 'text-green' : 'text-red'}">${fmt.pct(c.price_change_percentage_24h_in_currency || 0)}</td>
              <td class="${(c.price_change_percentage_7d_in_currency || 0) >= 0 ? 'text-green' : 'text-red'}">${fmt.pct(c.price_change_percentage_7d_in_currency || 0)}</td>
              <td>${fmt.zar(c.market_cap || 0)}</td>
              <td>${c.sparkline_in_7d?.price ? `<canvas class="coin-sparkline" data-prices='${JSON.stringify(c.sparkline_in_7d.price.slice(-48))}' width="120" height="32" style="width:120px;height:32px;"></canvas>` : '—'}</td>
            </tr>
          `).join('');
          drawSparklines(container);
        }
        makeSortable({
          tableContainer: tableEl.closest('.card') || tableEl.parentElement,
          data: coins,
          renderFn: renderAltTable,
          columns: [
            { key: 'name', type: 'string', thIndex: 1 },
            { key: 'current_price', type: 'number', thIndex: 2 },
            { key: 'price_change_percentage_24h_in_currency', type: 'number', thIndex: 3 },
            { key: 'price_change_percentage_7d_in_currency', type: 'number', thIndex: 4 },
            { key: 'market_cap', type: 'number', thIndex: 5 },
          ],
        });
      }
    }
  } catch (err) {
    console.error('Altcoins load failed:', err);
    container.innerHTML = '<div class="empty-state">Failed to load altcoin data</div>';
  }

  // Auto-refresh
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadAltcoins, 60000);
}

function drawSparklines(root) {
  root.querySelectorAll('.coin-sparkline').forEach(canvas => {
    try {
      const prices = JSON.parse(canvas.dataset.prices);
      drawMiniSparkline(canvas, prices);
    } catch { /* ignore */ }
  });
}

function drawMiniSparkline(canvas, prices) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !prices.length) return;
  const w = canvas.width, h = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const isUp = prices[prices.length - 1] >= prices[0];
  
  ctx.beginPath();
  prices.forEach((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h * 0.8) - h * 0.1;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = isUp ? '#FFD700' : '#DC2626';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
