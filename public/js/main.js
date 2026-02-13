/** ZARyder Cup — Main entry point (ES module) */
import { $, $$ } from './api.js';
import { drawSparkline, drawPriceChart } from './charts.js';
import { loadDashboard } from './views/dashboard.js';
import { loadMembers } from './views/members.js';
import { loadPurchases } from './views/purchases.js';
import { loadContributions } from './views/contributions.js';
import { loadAltcoins } from './views/altcoins.js';
import { loadForex } from './views/forex.js';
import { loadCryptoNews } from './views/cryptonews.js';
import { loadRugby } from './views/rugby.js';
import { loadCricket } from './views/cricket.js';
import { loadGolf } from './views/golf.js';
import { loadTripPlanner } from './views/tripplanner.js';
import { loadFlights } from './views/flights.js';
import { loadAccommodation } from './views/accommodation.js';
import { loadBudget } from './views/budget.js';
import { loadTreasurer } from './views/treasurer.js';
import { loadWorldNews } from './views/worldnews.js';
import { loadBusinessNews } from './views/businessnews.js';
import { loadSANews } from './views/sanews.js';
import { loadTechNews } from './views/technews.js';
import { loadSoccer } from './views/soccer.js';
import { loadTennis } from './views/tennis.js';
import { loadF1News } from './views/f1news.js';
import { loadAnalytics } from './views/analytics.js';

// ── Shared state ──────────────────────────────────────
let priceHistory = [];

export function getPriceHistory() { return priceHistory; }
export function setPriceHistory(data) { priceHistory = data; }

// ── Views ─────────────────────────────────────────────
const viewLoaders = {
  dashboard: loadDashboard,
  members: loadMembers,
  purchases: loadPurchases,
  contributions: loadContributions,
  altcoins: loadAltcoins,
  forex: loadForex,
  cryptonews: loadCryptoNews,
  rugby: loadRugby,
  cricket: loadCricket,
  golf: loadGolf,
  tripplanner: loadTripPlanner,
  flights: loadFlights,
  accommodation: loadAccommodation,
  budget: loadBudget,
  treasurer: loadTreasurer,
  worldnews: loadWorldNews,
  businessnews: loadBusinessNews,
  sanews: loadSANews,
  technews: loadTechNews,
  soccer: loadSoccer,
  tennis: loadTennis,
  f1news: loadF1News,
  analytics: loadAnalytics,
};

function showView(name) {
  $$('[id^="view-"]').forEach((el) => el.classList.add('hidden'));
  $(`#view-${name}`)?.classList.remove('hidden');
  $$('.nav-link').forEach((el) => el.classList.remove('active'));
  $(`.nav-link[data-view="${name}"]`)?.classList.add('active');
  $('#sidebar')?.classList.remove('open');
  $('#sidebar-overlay')?.classList.remove('open');
  // Update bottom nav active state
  $$('.bottom-nav-item').forEach((el) => el.classList.remove('active'));
  $(`.bottom-nav-item[data-view="${name}"]`)?.classList.add('active');
}

function loadView(view) {
  const loader = viewLoaders[view] || loadDashboard;
  loader();
}

// ── Navigation ────────────────────────────────────────
$$('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    showView(view);
    window.location.hash = view;
    loadView(view);
  });
});

// ── Mobile Menu ───────────────────────────────────────
$('#menu-toggle')?.addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  $('#sidebar-overlay').classList.toggle('open');
});

$('#sidebar-overlay')?.addEventListener('click', () => {
  $('#sidebar').classList.remove('open');
  $('#sidebar-overlay').classList.remove('open');
});

// ── Bottom Nav ────────────────────────────────────────
$$('.bottom-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    showView(view);
    window.location.hash = view;
    loadView(view);
  });
});

// ── Collapsible Nav Sections ──────────────────────────
$$('.nav-section-collapsible').forEach((section) => {
  section.addEventListener('click', () => {
    const groupId = section.dataset.collapse;
    const group = $(`#nav-group-${groupId}`);
    if (group) {
      group.classList.toggle('collapsed');
      section.classList.toggle('collapsed');
    }
  });
});

// ── Resize handler ────────────────────────────────────
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (priceHistory.length > 0) {
      drawSparkline($('#sidebar-sparkline'), priceHistory.slice(-48).map(d => d.priceZar));
      drawPriceChart($('#price-chart'), priceHistory);
    }
  }, 200);
});

// ── Init ──────────────────────────────────────────────
const initialView = window.location.hash.slice(1) || 'dashboard';
showView(initialView);
loadView(initialView);

// Auto-refresh every 30s
setInterval(() => {
  loadDashboard();
}, 30000);

// Theme: dark only (light theme removed per Ox mandate 2026-02-13)
