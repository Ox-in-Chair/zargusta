/** ZARyder Cup — Flights view */
import { $, api, fmt } from '../api.js';

export async function loadFlights() {
  const container = $('#flights-content');
  if (!container) return;

  try {
    const data = await api('/trip/flights');
    const bookings = data.bookings || [];

    container.innerHTML = `
      <div class="stats-grid stats-grid-3" style="margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-label">Route</div>
          <div class="stat-value" style="font-size:16px;">${data.route || 'CPT → BCN (Barcelona)'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Est. Cost / Person</div>
          <div class="stat-value" style="font-size:20px;">${fmt.zar(data.estimatedCostPerPerson || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Booked</div>
          <div class="stat-value" style="font-size:20px;">${bookings.filter(b => b.status === 'booked').length} / 7</div>
        </div>
      </div>

      ${data.preferredAirlines ? `
        <div class="card" style="padding:16px;margin-bottom:20px;">
          <div class="stat-label" style="margin-bottom:8px;">Preferred Airlines</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${data.preferredAirlines.map(a => `<span class="badge badge-outline">${a}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="card" style="padding:24px;">
        <div class="card-title" style="margin-bottom:16px;">Flight Bookings</div>
        ${bookings.length === 0 
          ? '<div class="empty-state">No flight bookings yet. Use the API to add bookings.</div>'
          : `<div class="stats-grid stats-grid-3">${bookings.map(b => `
            <div class="stat-card" style="padding:16px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="font-weight:600;">${b.memberName}</span>
                <span class="badge ${b.status === 'booked' ? 'badge-green' : 'badge-amber'}">${b.status}</span>
              </div>
              <div class="text-muted" style="font-size:13px;margin-top:4px;">${b.airline}${b.flightNumber ? ' ' + b.flightNumber : ''}</div>
              <div style="font-size:14px;margin-top:4px;">${fmt.zar(b.costZar)}</div>
            </div>
          `).join('')}</div>`
        }
      </div>
    `;
  } catch (err) {
    console.error('Flights load failed:', err);
    container.innerHTML = '<div class="empty-state">Failed to load flight data</div>';
  }
}
