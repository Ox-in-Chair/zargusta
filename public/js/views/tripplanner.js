/** ZARyder Cup — Trip Planner view */
import { $, api, fmt } from '../api.js';

export async function loadTripPlanner() {
  const container = $('#tripplanner-content');
  if (!container) return;

  try {
    const plan = await api('/trip/plan');

    const checklist = (plan.members || []).map(m => {
      const items = ['passport', 'visa', 'insurance', 'tickets'];
      const done = items.filter(i => m[i]).length;
      const pct = Math.round((done / items.length) * 100);
      return `
        <div class="stat-card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;">${m.name}</span>
            <span class="badge ${pct === 100 ? 'badge-green' : pct > 0 ? 'badge-amber' : 'badge-red'}">${pct}%</span>
          </div>
          <div style="margin-top:8px;">
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:8px;">
              <div style="width:${pct}%;height:100%;background:${pct === 100 ? 'var(--green)' : 'var(--amber)'};border-radius:3px;transition:width 0.3s;"></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${items.map(i => `<span class="checklist-item ${m[i] ? 'done' : ''}">${m[i] ? '✓' : '○'} ${i}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const deadlines = plan.bookingDeadlines || {};
    const now = new Date();

    container.innerHTML = `
      <div class="view-hero" style="background:linear-gradient(135deg,rgba(11,26,50,0.85),rgba(15,29,50,0.9)),url('/images/camiral-hole3.jpg');background-size:cover;background-position:center;border-radius:var(--radius-lg);padding:32px;margin-bottom:20px;color:var(--text-primary);">
        <h3 style="font-size:22px;font-weight:700;color:var(--amber);margin-bottom:4px;">${plan.tripName || 'Ryder Cup 2031'}</h3>
        <p style="color:var(--text-secondary);">${plan.venue || ''}</p>
        <p style="color:var(--text-muted);font-size:13px;margin-top:4px;">Nearest Airport: ${plan.nearestAirport || 'Barcelona–El Prat (BCN)'}</p>
      </div>

      <div class="stats-grid stats-grid-4" style="margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-label">Tournament</div>
          <div class="stat-value" style="font-size:16px;">${plan.tournamentDates?.start || '—'}</div>
          <div class="text-muted" style="font-size:12px;">to ${plan.tournamentDates?.end || '—'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Travel</div>
          <div class="stat-value" style="font-size:16px;">${plan.travelDates?.depart || '—'}</div>
          <div class="text-muted" style="font-size:12px;">to ${plan.travelDates?.return || '—'}</div>
        </div>
        <div class="stat-card" id="countdown-card">
          <div class="stat-label">Countdown</div>
          <div id="countdown-timer" style="font-weight:700;color:var(--amber);font-size:16px;">—</div>
          <div class="text-muted" style="font-size:12px;margin-top:2px;">${plan.travelDates?.depart ? Math.max(0, Math.ceil((new Date(plan.travelDates.depart) - now) / 86400000)) + ' days' : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Group Size</div>
          <div class="stat-value" style="font-size:20px;">${(plan.members || []).length}</div>
        </div>
      </div>

      <div class="card" style="padding:24px;margin-bottom:20px;">
        <div class="card-title" style="margin-bottom:16px;">Booking Deadlines</div>
        <div class="stats-grid stats-grid-4">
          ${Object.entries(deadlines).map(([k, v]) => {
            const d = new Date(v);
            const daysLeft = Math.ceil((d - now) / 86400000);
            return `<div class="stat-card" style="padding:12px;">
              <div class="stat-label">${k}</div>
              <div style="font-weight:600;font-size:14px;">${fmt.date(v)}</div>
              <div class="${daysLeft < 180 ? 'text-red' : 'text-muted'}" style="font-size:12px;">${daysLeft > 0 ? daysLeft + ' days left' : 'OVERDUE'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="padding:24px;">
        <div class="card-title" style="margin-bottom:16px;">Member Readiness</div>
        <div class="stats-grid stats-grid-3">${checklist}</div>
      </div>

      ${plan.notes ? `<div class="card" style="padding:16px;margin-top:16px;"><p class="text-secondary" style="font-size:13px;">${plan.notes}</p></div>` : ''}
    `;

    // Live countdown timer
    if (plan.travelDates?.depart) {
      const target = new Date(plan.travelDates.depart).getTime();
      const tick = () => {
        const el = document.getElementById('countdown-timer');
        if (!el) return;
        const diff = target - Date.now();
        if (diff <= 0) { el.textContent = 'Departed!'; return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.textContent = `${d}d ${h}h ${m}m ${s}s`;
      };
      tick();
      const iv = setInterval(() => {
        if (!document.getElementById('countdown-timer')) { clearInterval(iv); return; }
        tick();
      }, 1000);
    }
  } catch (err) {
    console.error('Trip planner load failed:', err);
    container.innerHTML = '<div class="empty-state">Failed to load trip plan</div>';
  }
}
