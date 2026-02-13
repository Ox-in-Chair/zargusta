/** ZARyder Cup — Accommodation view */
import { $, api, fmt } from '../api.js';

export async function loadAccommodation() {
  const container = $('#accommodation-content');
  if (!container) return;

  try {
    const data = await api('/trip/accommodation');
    const bookings = data.bookings || [];
    const options = data.options || [];
    const links = data.searchLinks || {};

    container.innerHTML = `
      <div class="stats-grid stats-grid-3" style="margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-label">Check-in → Check-out</div>
          <div class="stat-value" style="font-size:16px;">${data.checkIn || '23 Sep'} → ${data.checkOut || '30 Sep'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${data.nights || 7} Nights × 7 Members</div>
          <div class="stat-value" style="font-size:16px;">~${fmt.zar((data.estimatedCostPerPersonPerNight || 0) * (data.nights || 7))} pp</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Booked</div>
          <div class="stat-value" style="font-size:20px;">${bookings.filter(b => b.status === 'booked').length} / 7</div>
        </div>
      </div>

      <!-- Live search links -->
      <div class="card" style="padding:20px;margin-bottom:20px;">
        <div class="card-title" style="margin-bottom:12px;">Search Live Prices</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${links.booking ? `<a href="${links.booking}" target="_blank" rel="noopener" class="btn-primary" style="text-decoration:none;font-size:13px;padding:8px 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            Booking.com
          </a>` : ''}
          ${links.airbnb ? `<a href="${links.airbnb}" target="_blank" rel="noopener" class="btn-primary" style="text-decoration:none;font-size:13px;padding:8px 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            Airbnb
          </a>` : ''}
          ${links.vrbo ? `<a href="${links.vrbo}" target="_blank" rel="noopener" class="btn-primary" style="text-decoration:none;font-size:13px;padding:8px 16px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
            Vrbo
          </a>` : ''}
        </div>
        <div class="text-muted" style="font-size:11px;margin-top:8px;">Pre-filled with Caldes de Malavella, 23-30 Sep 2031, 7 guests</div>
      </div>

      <!-- Options -->
      <div class="card" style="padding:24px;margin-bottom:20px;">
        <div class="card-title" style="margin-bottom:16px;">Options Shortlist</div>
        <div style="display:grid;gap:16px;">
          ${options.map(o => `
            <div class="stat-card" style="padding:20px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                  <div style="font-weight:700;font-size:16px;">${o.name}</div>
                  <span class="badge badge-outline" style="margin-top:4px;">${o.type}</span>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:18px;font-weight:700;color:var(--amber);">${fmt.zar(o.costPerNightZar)}<span class="text-muted" style="font-weight:400;font-size:12px;"> /night</span></div>
                  <div class="text-muted" style="font-size:12px;">${fmt.zar(o.costPerNightZar * (data.nights || 7))} total</div>
                </div>
              </div>
              ${o.notes ? `<div class="text-muted" style="font-size:13px;margin-top:10px;">${o.notes}</div>` : ''}
              <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;">
                ${o.pros ? `<div><span style="color:var(--green);font-weight:600;">✓</span> ${o.pros}</div>` : ''}
                ${o.cons ? `<div><span style="color:var(--red);font-weight:600;">✗</span> ${o.cons}</div>` : ''}
              </div>
              ${o.link ? `<a href="${o.link}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;font-size:12px;color:var(--amber);text-decoration:none;">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                View &amp; Book →
              </a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Bookings -->
      <div class="card" style="padding:24px;">
        <div class="card-title" style="margin-bottom:16px;">Bookings</div>
        ${bookings.length === 0 
          ? '<div class="empty-state">No accommodation bookings yet. Start researching options above!</div>'
          : `<div class="stats-grid stats-grid-3">${bookings.map(b => `
            <div class="stat-card" style="padding:16px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="font-weight:600;">${b.memberName}</span>
                <span class="badge ${b.status === 'booked' ? 'badge-green' : 'badge-amber'}">${b.status}</span>
              </div>
              <div class="text-muted" style="font-size:13px;">${b.optionName}</div>
              <div style="font-size:14px;margin-top:4px;">${fmt.zar(b.costZar)}</div>
            </div>
          `).join('')}</div>`
        }
      </div>
    `;
  } catch (err) {
    console.error('Accommodation load failed:', err);
    container.innerHTML = '<div class="empty-state">Failed to load accommodation data</div>';
  }
}
