/** ZARyder Cup — Portfolio Analytics */
import { $, api, fmt } from '../api.js';

export async function loadAnalytics() {
  const el = $('#view-analytics');
  if (!el) return;

  el.innerHTML = `
    <div class="view-header"><h2>Portfolio Analytics</h2></div>
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-label">Weighted Avg Cost Basis</div>
        <div class="stat-value" id="avg-cost-basis">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unrealised P&amp;L</div>
        <div class="stat-value" id="unrealised-pnl">—</div>
        <div class="stat-change" id="unrealised-roi">—</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Contribution Streak</div>
        <div class="stat-value" id="streak-current">—</div>
        <div class="stat-sub text-muted">consecutive months</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Monthly Contribution</div>
        <div class="stat-value" id="avg-monthly">—</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><div class="card-title">Cumulative Investment (ZAR)</div></div>
      <div style="padding:16px;"><canvas id="chart-investment"></canvas></div>
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><div class="card-title">BTC Holdings Accumulation</div></div>
      <div style="padding:16px;"><canvas id="chart-btc"></canvas></div>
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><div class="card-title">Avg Cost Basis vs Current BTC Price</div></div>
      <div style="padding:16px;"><canvas id="chart-costbasis"></canvas></div>
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header"><div class="card-title">Member Contribution Breakdown</div></div>
      <div style="padding:16px;" id="member-breakdown"></div>
    </div>
    <div class="card" id="missed-months-card" style="display:none; margin-bottom:24px;">
      <div class="card-header"><div class="card-title">Missed Months</div></div>
      <div style="padding:16px;"><p id="missed-months" class="text-muted"></p></div>
    </div>
  `;

  try {
    const data = await api('/analytics/performance');

    $('#avg-cost-basis').textContent = fmt.zar(data.costBasis.weightedAvgZar);

    const pnl = data.liveValuation.unrealisedPnlZar;
    const pnlEl = $('#unrealised-pnl');
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + fmt.zar(pnl);
    pnlEl.className = `stat-value ${pnl >= 0 ? 'text-green' : 'text-red'}`;

    const roiEl = $('#unrealised-roi');
    roiEl.textContent = (data.liveValuation.roiPct >= 0 ? '+' : '') + data.liveValuation.roiPct.toFixed(2) + '%';
    roiEl.className = `stat-change ${data.liveValuation.roiPct >= 0 ? 'positive' : 'negative'}`;

    $('#streak-current').textContent = data.streaks.currentMonthlyStreak;
    $('#avg-monthly').textContent = fmt.zar(data.contributionStats.avgMonthlyZar);

    // Charts
    const snaps = data.monthlySnapshots;
    const labels = snaps.map(s => {
      const [y, m] = s.month.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months[+m - 1] + ' ' + y.slice(2);
    });

    drawChart('chart-investment', labels, snaps.map(s => s.cumulativeInvestedZar), {
      color: '#FFD700', fill: 0.15, yFmt: v => 'R' + (v / 1000).toFixed(0) + 'k',
    });
    drawChart('chart-btc', labels, snaps.map(s => s.cumulativeBtc), {
      color: '#22c55e', fill: 0.1, yFmt: v => v.toFixed(4),
    });
    drawChart('chart-costbasis', labels, snaps.map(s => s.avgCostBasis), {
      color: '#FFD700', fill: 0,
      yFmt: v => 'R' + (v / 1e6).toFixed(1) + 'M',
      overlay: { value: data.currentPrice.zar, color: '#22c55e',
        label: 'Current: R' + (data.currentPrice.zar / 1e6).toFixed(2) + 'M' },
    });

    // Member breakdown bars
    const members = data.memberAnalytics;
    const maxC = members[0]?.totalContributed ?? 1;
    $('#member-breakdown').innerHTML = members.map(m => `
      <div style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
          <span style="color:${m.status === 'active' ? '#22c55e' : '#6b7280'}">${m.name}</span>
          <span style="color:#FFD700">${fmt.zar(m.totalContributed)} (${m.sharePercent}%)</span>
        </div>
        <div style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
          <div style="height:100%; width:${Math.max(2, m.totalContributed / maxC * 100)}%; background:#FFD700; border-radius:4px;"></div>
        </div>
      </div>
    `).join('');

    if (data.streaks.missedMonths.length) {
      $('#missed-months-card').style.display = 'block';
      $('#missed-months').textContent = data.streaks.missedMonths.join(', ');
    }
  } catch (err) {
    console.error('Analytics failed:', err);
    el.innerHTML += '<p class="text-red" style="padding:16px;">Failed to load analytics.</p>';
  }
}

/* ── Canvas line chart ── */
function drawChart(id, labels, values, opts = {}) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width, h = 280;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 20, bottom: 40, left: 70 };
  const pw = w - pad.left - pad.right, ph = h - pad.top - pad.bottom;
  const color = opts.color || '#FFD700';
  const yFmt = opts.yFmt || (v => v.toLocaleString());
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;

  ctx.clearRect(0, 0, w, h);

  // Grid + Y axis
  ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#6b7280'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = min + range * i / 4, y = pad.top + ph - ph * i / 4;
    ctx.fillText(yFmt(v), pad.left - 8, y + 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
  }

  // X labels
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(labels.length / 8));
  for (let i = 0; i < labels.length; i += step) {
    const x = pad.left + pw * i / (labels.length - 1);
    ctx.fillText(labels[i], x, h - 8);
  }

  // Points
  const pts = values.map((v, i) => ({
    x: pad.left + pw * i / (values.length - 1),
    y: pad.top + ph - ph * (v - min) / range,
  }));

  // Fill area
  if (opts.fill > 0) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pad.top + ph);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, pad.top + ph); ctx.closePath();
    ctx.fillStyle = color + Math.round(opts.fill * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }

  // Line
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

  // Overlay dashed line
  if (opts.overlay) {
    const oy = pad.top + ph - ph * (opts.overlay.value - min) / range;
    if (oy >= pad.top && oy <= pad.top + ph) {
      ctx.setLineDash([6, 4]); ctx.beginPath();
      ctx.moveTo(pad.left, oy); ctx.lineTo(pad.left + pw, oy);
      ctx.strokeStyle = opts.overlay.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = opts.overlay.color; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(opts.overlay.label, pad.left + 8, oy - 6);
    }
  }

  // End dot
  const last = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}
