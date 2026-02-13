/** ZARyder Cup — Dashboard view */
import { $, api, fmt } from '../api.js';
import { drawSparkline, drawPriceChart, drawFearGreedGauge, drawDominanceChart } from '../charts.js';
import { getPriceHistory, setPriceHistory } from '../main.js';

export async function loadDashboard() {
  try {
    let priceHistory = getPriceHistory();
    const [data, summary, history] = await Promise.all([
      api('/portfolio'),
      api('/fund/summary'),
      priceHistory.length ? priceHistory : api('/btc/history'),
    ]);
    if (Array.isArray(history)) {
      priceHistory = history;
      setPriceHistory(history);
    }

    const p = data.price;
    const avgBuyPrice = data.totalInvestedZar / data.totalBtc;

    $('#sidebar-price').textContent = fmt.zar(p.zar);
    const changeEl = $('#sidebar-change');
    changeEl.textContent = fmt.pct(p.zar24hChange);
    changeEl.className = `sidebar-price-change ${p.zar24hChange >= 0 ? 'text-green' : 'text-red'}`;
    $('#sidebar-fund-value').textContent = fmt.zar(data.valueZar);
    $('#sidebar-members').textContent = `${summary.activeMembers} of ${summary.totalMembersAllTime}`;

    const mobilePrice = $('#mobile-price');
    if (mobilePrice) mobilePrice.textContent = fmt.zar(p.zar);

    if (priceHistory.length > 0) {
      drawSparkline($('#sidebar-sparkline'), priceHistory.slice(-48).map(d => d.priceZar));
    }

    $('#total-invested').textContent = fmt.zar(data.totalInvestedZar);
    $('#total-contributions').textContent = `${fmt.number(summary.numberOfContributions)} contributions`;
    $('#portfolio-zar').textContent = fmt.zar(data.valueZar);
    $('#total-btc').textContent = fmt.btc(data.totalBtc);

    const pnlCard = $('#pnl-card');
    const pnlEl = $('#pnl');
    pnlEl.textContent = (data.profitLossZar >= 0 ? '+' : '−') + fmt.zar(Math.abs(data.profitLossZar));
    pnlEl.className = `stat-value ${data.profitLossZar >= 0 ? 'text-green' : 'text-red'}`;
    const pnlPctEl = $('#pnl-pct');
    pnlPctEl.textContent = fmt.pct(data.profitLossPct);
    pnlPctEl.className = `stat-change ${data.profitLossPct >= 0 ? 'positive' : 'negative'}`;
    pnlCard.className = `stat-card stat-card-pnl ${data.profitLossPct >= 0 ? 'positive' : 'negative'}`;

    $('#avg-buy-price').textContent = fmt.zar(avgBuyPrice);
    const avgDiff = ((p.zar - avgBuyPrice) / avgBuyPrice) * 100;
    const avgEl = $('#avg-vs-current');
    avgEl.textContent = `${avgDiff >= 0 ? '↑' : '↓'} ${Math.abs(avgDiff).toFixed(0)}% vs current`;
    avgEl.className = avgDiff >= 0 ? 'text-green' : 'text-red';

    $('#augusta-bar').style.width = `${Math.min(data.augustaProgress, 100)}%`;
    $('#augusta-pct-label').textContent = `${data.augustaProgress}%`;
    $('#augusta-value').textContent = fmt.zar(data.valueZar);
    $('#days-left').textContent = data.daysToTarget.toLocaleString();

    // Per-member: show average across active members from breakdown
    const breakdown = data.perMemberBreakdown || {};
    const activeShares = Object.values(breakdown);
    const avgBtc = activeShares.length > 0 ? activeShares.reduce((s, m) => s + m.btcShare, 0) / activeShares.length : 0;
    const avgZar = activeShares.length > 0 ? activeShares.reduce((s, m) => s + m.valueZar, 0) / activeShares.length : 0;
    $('#member-btc').textContent = fmt.btcShort(avgBtc) + ' BTC';
    $('#member-zar').textContent = `≈ ${fmt.zar(avgZar)} avg per member`;

    $('#dash-btc-price').textContent = fmt.zar(p.zar);
    const dashChange = $('#dash-btc-change');
    dashChange.textContent = `24h: ${fmt.pct(p.zar24hChange)}`;
    dashChange.className = `stat-change ${p.zar24hChange >= 0 ? 'positive' : 'negative'}`;

    const startDate = new Date('2021-10-01');
    const now = new Date();
    const years = ((now - startDate) / (365.25 * 86400000)).toFixed(1);
    $('#fund-age').textContent = `${years} years`;
    $('#purchase-count').textContent = `${summary.numberOfPurchases} purchases made`;

    if (priceHistory.length > 0) {
      drawPriceChart($('#price-chart'), priceHistory);
    }
    // ── Extended KPI cards (fire and forget) ──
    const purchases = await api('/purchases').catch(() => []);
    loadExtendedKpis(data, summary, purchases);
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

/** Safely set text content — never shows undefined or NaN */
function kpi(id, text) {
  const el = document.querySelector(id);
  if (!el) return;
  const s = String(text);
  if (s === 'undefined' || s === 'NaN' || s === 'null') { el.textContent = '—'; return; }
  el.textContent = s;
}

function kpiClass(id, className) {
  const el = document.querySelector(id);
  if (el) el.className = className;
}

async function loadExtendedKpis(portfolioData, summaryData, purchasesData) {
  const now = new Date();

  // ── Static/computed KPIs ──
  // Trip countdown
  const ryderCup = new Date('2031-09-26');
  const daysToTrip = Math.max(0, Math.ceil((ryderCup - now) / 86400000));
  kpi('#kpi-countdown-val', daysToTrip.toLocaleString());

  // Next DCA (15th of each month)
  let nextDca = new Date(now.getFullYear(), now.getMonth(), 15);
  if (nextDca <= now) nextDca = new Date(now.getFullYear(), now.getMonth() + 1, 15);
  kpi('#kpi-dca-val', Math.ceil((nextDca - now) / 86400000) + 'd');

  // Group size
  if (summaryData) {
    kpi('#kpi-group-size', summaryData.activeMembers || '—');
  }

  // Fund performance KPIs from portfolio + summary + purchases
  if (portfolioData && summaryData) {
    const months = Math.max(1, (now - new Date('2021-10-01')) / (30.44 * 86400000));
    const activeMembers = summaryData.activeMembers || 7;
    const avgMonthly = Math.round(summaryData.totalContributionsZar / months / activeMembers);
    kpi('#kpi-avg-monthly', fmt.zar(avgMonthly));
  }

  // Best/worst month & largest purchase from purchases data
  if (purchasesData && Array.isArray(purchasesData) && purchasesData.length > 0) {
    // Largest purchase
    const sorted = [...purchasesData].sort((a, b) => b.btcBought - a.btcBought);
    kpi('#kpi-largest-buy', fmt.zar(sorted[0].amountInvested || sorted[0].priceZar * sorted[0].btcBought));
    kpi('#kpi-largest-buy-btc', fmt.btcShort(sorted[0].btcBought) + ' BTC');

    // Best/worst month by BTC price at purchase
    const bySortedPrice = [...purchasesData].sort((a, b) => a.priceZar - b.priceZar);
    const best = bySortedPrice[0]; // lowest buy price = best deal
    const worst = bySortedPrice[bySortedPrice.length - 1]; // highest buy = worst
    kpi('#kpi-best-month', fmt.zar(best.priceZar));
    kpi('#kpi-best-month-label', fmt.dateShort(best.date) + ' buy');
    kpi('#kpi-worst-month', fmt.zar(worst.priceZar));
    kpi('#kpi-worst-month-label', fmt.dateShort(worst.date) + ' buy');
  }

  // ── Parallel API fetches ──
  const [forex, fearGreed, dominance, flights, accom, budget, altcoins] = await Promise.all([
    fetch('/api/market/forex').then(r => r.json()).catch(() => null),
    fetch('/api/market/fear-greed').then(r => r.json()).catch(() => null),
    fetch('/api/market/dominance').then(r => r.json()).catch(() => null),
    fetch('/api/trip/flights').then(r => r.json()).catch(() => null),
    fetch('/api/trip/accommodation').then(r => r.json()).catch(() => null),
    fetch('/api/trip/budget').then(r => r.json()).catch(() => null),
    fetch('/api/market/altcoins').then(r => r.json()).catch(() => null),
  ]);

  // ── Forex ──
  let zarPerEur = null;
  if (forex?.data) {
    const f = forex.data;
    if (f.zarPerUsd) kpi('#kpi-zar-usd-val', 'R' + Number(f.zarPerUsd).toFixed(2));
    if (f.zarPerEur) { zarPerEur = f.zarPerEur; kpi('#kpi-zar-eur-val', 'R' + Number(f.zarPerEur).toFixed(2)); }
  }

  // EUR spending power
  if (zarPerEur && portfolioData) {
    const eurVal = Math.round(portfolioData.valueZar / zarPerEur);
    kpi('#kpi-eur-power', '€' + eurVal.toLocaleString());
  }

  // ── Fear & Greed ──
  if (fearGreed?.data) {
    const v = Number(fearGreed.data.value);
    kpi('#kpi-fg-val', v);
    kpi('#kpi-fg-label', fearGreed.data.classification || '—');
    kpiClass('#kpi-fg-val', `stat-value ${v <= 25 ? 'text-red' : v >= 75 ? 'text-green' : ''}`);
    drawFearGreedGauge(document.querySelector('#fear-greed-gauge'), v, fearGreed.data.classification || '');
  }

  // ── Dominance ──
  if (dominance?.data) {
    kpi('#kpi-dominance-val', Number(dominance.data.btcDominance).toFixed(1) + '%');
    drawDominanceChart(document.querySelector('#dominance-chart'), Number(dominance.data.btcDominance), Number(dominance.data.ethDominance || 0));
  }

  // ── BTC vs ATH ──
  if (altcoins?.data && Array.isArray(altcoins.data)) {
    const btc = altcoins.data.find(c => c.symbol === 'btc');
    if (btc && btc.ath) {
      const pctFromAth = ((btc.current_price - btc.ath) / btc.ath * 100);
      kpi('#kpi-ath-val', fmt.pct(pctFromAth));
      kpiClass('#kpi-ath-val', `stat-value ${pctFromAth >= 0 ? 'text-green' : 'text-red'}`);
      kpi('#kpi-ath-sub', 'ATH: ' + fmt.zar(btc.ath));
    }

    // Alt coin cards
    const altMap = { eth: 'eth', sol: 'sol', xrp: 'xrp', ada: 'ada', dot: 'dot' };
    for (const [sym, id] of Object.entries(altMap)) {
      const coin = altcoins.data.find(c => c.symbol === sym);
      if (coin) {
        const pct = coin.price_change_percentage_24h_in_currency || 0;
        kpi(`#kpi-alt-${id}`, fmt.pct(pct));
        kpiClass(`#kpi-alt-${id}`, `stat-value ${pct >= 0 ? 'text-green' : 'text-red'}`);
        kpi(`#kpi-alt-${id}-price`, fmt.zar(coin.current_price || 0));
      }
    }
  }

  // ── Trip cost KPIs ──
  if (flights?.data) {
    kpi('#kpi-flights-val', fmt.zar(flights.data.estimatedCostPerPerson || 0));
  }
  if (accom?.data) {
    kpi('#kpi-accom-val', fmt.zar(accom.data.estimatedCostPerPersonPerNight || 0));
  }

  if (budget?.data) {
    const cats = budget.data.categories || [];
    const totalEst = cats.reduce((s, c) => s + c.total, 0);
    const totalAlloc = cats.reduce((s, c) => s + c.allocated, 0);
    const members = budget.data.members || 7;
    const perPerson = Math.round(totalEst / members);

    kpi('#kpi-budget-val', fmt.zar(totalAlloc));
    kpi('#kpi-budget-sub', 'of ' + fmt.zar(totalEst) + ' est.');
    kpi('#kpi-trip-pp', fmt.zar(perPerson));

    // Funding gap
    if (portfolioData) {
      const gap = totalEst - portfolioData.valueZar;
      if (gap > 0) {
        kpi('#kpi-funding-gap', fmt.zar(gap));
        kpiClass('#kpi-funding-gap', 'stat-value text-red');
        kpi('#kpi-funding-gap-sub', 'still needed');
      } else {
        kpi('#kpi-funding-gap', 'Funded');
        kpiClass('#kpi-funding-gap', 'stat-value text-green');
        kpi('#kpi-funding-gap-sub', fmt.zar(Math.abs(gap)) + ' surplus');
      }

      // Monthly savings needed
      const monthsLeft = Math.max(1, (ryderCup - now) / (30.44 * 86400000));
      if (gap > 0) {
        kpi('#kpi-monthly-save', fmt.zar(Math.round(gap / monthsLeft)));
      } else {
        kpi('#kpi-monthly-save', 'R0');
      }
    }
  }
}
