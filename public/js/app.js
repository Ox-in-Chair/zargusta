/** ZARgusta — Browser-native ES module frontend */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const fmt = {
  zar: (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  btc: (n) => Number(n).toFixed(8),
  pct: (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`,
  date: (d) => new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }),
};

// ── API ───────────────────────────────────────────────
async function api(path) {
  const res = await fetch(`/api${path}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

// ── Views ─────────────────────────────────────────────
function showView(name) {
  $$('[id^="view-"]').forEach((el) => el.classList.add('hidden'));
  $(`#view-${name}`)?.classList.remove('hidden');
  $$('.nav-link').forEach((el) => el.classList.remove('active'));
  $(`.nav-link[data-view="${name}"]`)?.classList.add('active');
}

// ── Dashboard ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await api('/portfolio');
    const p = data.price;

    // Sidebar price
    $('#sidebar-price').textContent = fmt.zar(p.zar);
    const changeEl = $('#sidebar-change');
    changeEl.textContent = fmt.pct(p.zar24hChange);
    changeEl.className = `stat-change ${p.zar24hChange >= 0 ? 'positive' : 'negative'}`;

    // Stats
    $('#total-btc').textContent = fmt.btc(data.totalBtc);
    $('#portfolio-zar').textContent = fmt.zar(data.valueZar);
    $('#total-invested').textContent = fmt.zar(data.totalInvestedZar);

    const pnlEl = $('#pnl');
    pnlEl.textContent = fmt.zar(Math.abs(data.profitLossZar));
    pnlEl.textContent = (data.profitLossZar >= 0 ? '+' : '-') + fmt.zar(Math.abs(data.profitLossZar));
    pnlEl.className = `stat-value ${data.profitLossZar >= 0 ? 'text-green' : 'text-red'}`;

    const pnlPctEl = $('#pnl-pct');
    pnlPctEl.textContent = fmt.pct(data.profitLossPct);
    pnlPctEl.className = `stat-change ${data.profitLossPct >= 0 ? 'positive' : 'negative'}`;

    // Augusta progress
    $('#augusta-bar').style.width = `${data.augustaProgress}%`;
    $('#augusta-pct').textContent = `${data.augustaProgress}%`;
    $('#days-left').textContent = data.daysToTarget.toLocaleString();

    // Per member
    $('#member-btc').textContent = fmt.btc(data.perMemberShareBtc);
    $('#member-zar').textContent = fmt.zar(data.perMemberValueZar);
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

// ── Members ───────────────────────────────────────────
async function loadMembers() {
  try {
    const members = await api('/members');
    const summary = await api('/fund/summary');
    const contribs = summary.memberContributions || {};

    const html = members
      .sort((a, b) => (contribs[b.name] || 0) - (contribs[a.name] || 0))
      .map((m) => `
        <div class="member-row">
          <div>
            <span class="member-name">${m.name}</span>
            <span class="member-status ${m.status}">${m.status}</span>
          </div>
          <div>
            <span class="member-amount">${fmt.zar(contribs[m.name] || 0)}</span>
            <span class="text-muted" style="font-size:12px; margin-left:8px;">
              joined ${fmt.date(m.joinedDate)}
              ${m.leaveDate ? ` · left ${fmt.date(m.leaveDate)}` : ''}
            </span>
          </div>
        </div>
      `).join('');

    $('#members-list').innerHTML = html;
  } catch (err) {
    console.error('Members load failed:', err);
  }
}

// ── Purchases ─────────────────────────────────────────
async function loadPurchases() {
  try {
    const purchases = await api('/purchases');
    const rows = purchases
      .slice()
      .reverse()
      .map((p) => `
        <tr>
          <td>${fmt.date(p.date)}</td>
          <td class="text-right">${fmt.btc(p.btcBought)}</td>
          <td class="text-right">${fmt.zar(p.priceZar)}</td>
          <td class="text-right">${p.amountInvested ? fmt.zar(p.amountInvested) : '—'}</td>
        </tr>
      `).join('');

    $('#purchases-table').innerHTML = `
      <table>
        <thead><tr><th>Date</th><th class="text-right">BTC Bought</th><th class="text-right">Price (ZAR)</th><th class="text-right">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    console.error('Purchases load failed:', err);
  }
}

// ── Contributions ─────────────────────────────────────
async function loadContributions() {
  try {
    const contribs = await api('/contributions');
    // Group by month
    const grouped = {};
    for (const c of contribs) {
      const key = c.date.slice(0, 7); // YYYY-MM
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    }

    const months = Object.keys(grouped).sort().reverse();
    let html = '';
    for (const month of months.slice(0, 12)) {
      const items = grouped[month];
      const total = items.reduce((s, c) => s + c.amountZar, 0);
      const names = [...new Set(items.map((c) => c.memberName))];
      html += `
        <tr>
          <td>${month}</td>
          <td>${names.join(', ')}</td>
          <td class="text-right">${items.length}</td>
          <td class="text-right text-amber">${fmt.zar(total)}</td>
        </tr>
      `;
    }

    $('#contributions-table').innerHTML = `
      <table>
        <thead><tr><th>Month</th><th>Contributors</th><th class="text-right">Count</th><th class="text-right">Total</th></tr></thead>
        <tbody>${html}</tbody>
      </table>
      <div class="text-muted" style="font-size:12px; margin-top:12px;">Showing last 12 months of ${months.length} total</div>
    `;
  } catch (err) {
    console.error('Contributions load failed:', err);
  }
}

// ── Navigation ────────────────────────────────────────
$$('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    showView(view);
    window.location.hash = view;

    if (view === 'members') loadMembers();
    else if (view === 'purchases') loadPurchases();
    else if (view === 'contributions') loadContributions();
    else loadDashboard();
  });
});

// ── Init ──────────────────────────────────────────────
const initialView = window.location.hash.slice(1) || 'dashboard';
showView(initialView);
loadDashboard();

// Auto-refresh price every 30s
setInterval(loadDashboard, 30_000);
