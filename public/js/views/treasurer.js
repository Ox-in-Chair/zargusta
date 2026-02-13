/** ZARyder Cup — Treasurer (Admin Portal) */
import { $, api, adminApi, fmt } from '../api.js';
import { makeSortable } from '../table-sort.js';

/** Check if user is authenticated */
function isAuthed() {
  return sessionStorage.getItem('zargusta-admin-key') === '6969';
}

/** Show password gate modal */
function showGate(container) {
  container.innerHTML = `
    <div class="admin-gate-overlay">
      <div class="admin-gate-modal">
        <div class="admin-gate-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
        </div>
        <h3 class="admin-gate-title">Treasurer Access</h3>
        <p class="admin-gate-sub">Enter the admin password to continue</p>
        <form id="admin-gate-form">
          <input type="password" id="admin-gate-input" class="admin-input" placeholder="Password" autocomplete="off" />
          <div id="admin-gate-error" class="admin-gate-error"></div>
          <button type="submit" class="btn-primary" style="width:100%;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            Unlock
          </button>
        </form>
      </div>
    </div>
  `;

  const form = $('#admin-gate-form');
  const input = $('#admin-gate-input');
  const errEl = $('#admin-gate-error');
  input?.focus();

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input?.value?.trim();
    if (val === '6969') {
      sessionStorage.setItem('zargusta-admin-key', val);
      loadTreasurerPortal(container);
    } else {
      errEl.textContent = 'Incorrect password';
      input.value = '';
      input.focus();
    }
  });
}

/** Main load function */
export async function loadTreasurer() {
  const container = $('#treasurer-content');
  if (!container) return;

  if (!isAuthed()) {
    showGate(container);
    return;
  }

  loadTreasurerPortal(container);
}

async function loadTreasurerPortal(container) {
  try {
    const [members, summary, fundInfo, purchases, contributions] = await Promise.all([
      api('/members'),
      api('/fund/summary'),
      api('/fund/info'),
      api('/purchases'),
      api('/contributions'),
    ]);

    const activeMembers = members.filter(m => m.status === 'active');

    container.innerHTML = `
      <!-- Admin header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20" style="color:var(--green);"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
          <span style="font-size:13px;color:var(--green);font-weight:600;">AUTHENTICATED</span>
        </div>
        <button class="btn-outline" id="admin-logout" style="font-size:12px;padding:6px 12px;min-height:36px;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
          Lock
        </button>
      </div>

      <!-- Fund snapshot -->
      <div class="stats-grid stats-grid-4" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-label">BTC Holdings</div>
          <div class="stat-value" style="font-size:18px;">${fmt.btc(fundInfo.currentBtcHoldings)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Invested</div>
          <div class="stat-value text-amber" style="font-size:18px;">${fmt.zar(summary.totalContributionsZar)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Active Members</div>
          <div class="stat-value" style="font-size:18px;">${summary.activeMembers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Purchases</div>
          <div class="stat-value" style="font-size:18px;">${summary.numberOfPurchases}</div>
        </div>
      </div>

      <!-- Section: Record Payment -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          Record Payment
        </div>
        <form id="form-payment" class="admin-form">
          <div class="admin-form-grid">
            <div class="admin-field">
              <label class="admin-label">Member</label>
              <select id="pay-member" class="admin-input" required>
                <option value="">Select member...</option>
                ${activeMembers.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('')}
              </select>
            </div>
            <div class="admin-field">
              <label class="admin-label">Amount (ZAR)</label>
              <input type="number" id="pay-amount" class="admin-input" placeholder="e.g. 500" min="1" step="1" required />
            </div>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Record Payment
            </button>
            <span id="pay-result" class="admin-result"></span>
          </div>
        </form>
      </div>

      <!-- Section: Bulk Payment Round -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
          Bulk Payment Round
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Tick who paid, enter the amount per person, submit. Each ticked member gets recorded at that amount.</p>
        <form id="form-bulk-payment" class="admin-form">
          <div class="admin-form-grid" style="margin-bottom:16px;">
            <div class="admin-field">
              <label class="admin-label">Payment Date</label>
              <input type="date" id="bulk-date" class="admin-input" value="${new Date().toISOString().slice(0,10)}" required />
            </div>
            <div class="admin-field">
              <label class="admin-label">Amount per Person (ZAR)</label>
              <input type="number" id="bulk-amount" class="admin-input" value="500" min="1" step="1" required />
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
            ${activeMembers.map(m => `
              <label class="bulk-member-chip" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:14px;font-weight:500;transition:all var(--transition);">
                <input type="checkbox" class="bulk-include" data-member-id="${m.id}" data-member-name="${m.name}" checked />
                ${m.name}
              </label>
            `).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
            <span style="font-size:13px;color:var(--text-muted);">
              <span id="bulk-count">${activeMembers.length}</span> members × R<span id="bulk-rate">500</span> = <strong id="bulk-total" style="color:var(--amber);">R${(activeMembers.length * 500).toLocaleString()}</strong>
            </span>
            <label style="font-size:12px;color:var(--text-muted);display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" id="bulk-select-all" checked /> All
            </label>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              Submit Payment Round
            </button>
            <span id="bulk-result" class="admin-result"></span>
          </div>
        </form>
      </div>

      <!-- Section: Record BTC Purchase -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
          Record BTC Purchase
        </div>
        <form id="form-purchase" class="admin-form">
          <div class="admin-form-grid">
            <div class="admin-field">
              <label class="admin-label">BTC Amount</label>
              <input type="number" id="purch-btc" class="admin-input" placeholder="e.g. 0.005" step="0.00000001" min="0.00000001" required />
            </div>
            <div class="admin-field">
              <label class="admin-label">Price (ZAR per BTC)</label>
              <input type="number" id="purch-price" class="admin-input" placeholder="e.g. 1200000" min="1" required />
            </div>
            <div class="admin-field">
              <label class="admin-label">Amount Invested (ZAR)</label>
              <input type="number" id="purch-invested" class="admin-input" placeholder="e.g. 6000" min="1" required />
            </div>
            <div class="admin-field">
              <label class="admin-label">Notes</label>
              <input type="text" id="purch-notes" class="admin-input" placeholder="e.g. Month 52 DCA" />
            </div>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Record Purchase
            </button>
            <span id="purch-result" class="admin-result"></span>
          </div>
        </form>
      </div>

      <!-- Section: Adjust Holdings -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          Verify & Adjust Holdings
        </div>
        <div style="margin-bottom:12px;">
          <span class="stat-label">Current Holdings</span>
          <span style="font-size:18px;font-weight:700;margin-left:8px;">${fmt.btc(fundInfo.currentBtcHoldings)} BTC</span>
        </div>
        <form id="form-adjust" class="admin-form">
          <div class="admin-form-grid">
            <div class="admin-field">
              <label class="admin-label">New Holdings (BTC)</label>
              <input type="number" id="adj-holdings" class="admin-input" placeholder="e.g. 0.125" step="0.00000001" min="0" required />
            </div>
            <div class="admin-field">
              <label class="admin-label">Reason</label>
              <input type="text" id="adj-reason" class="admin-input" placeholder="e.g. Wallet reconciliation" required />
            </div>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              Adjust Holdings
            </button>
            <span id="adj-result" class="admin-result"></span>
          </div>
        </form>
      </div>

      <!-- Section: Member Management -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
          Member Management
        </div>
        <div class="data-table-wrap" style="margin-bottom:20px;">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Joined</th><th>Contributed</th></tr></thead>
            <tbody>
              ${members.map(m => `
                <tr>
                  <td>${m.id}</td>
                  <td style="font-weight:600;">${m.name}</td>
                  <td><span class="badge ${m.status === 'active' ? 'badge-green' : 'badge-red'}">${m.status}</span></td>
                  <td>${fmt.date(m.joinedDate)}</td>
                  <td>${fmt.zar(summary.memberContributions?.[m.name] || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <details class="admin-details">
          <summary class="admin-details-summary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
            Onboard New Member
          </summary>
          <form id="form-add-member" class="admin-form" style="margin-top:12px;">
            <div class="admin-form-grid">
              <div class="admin-field">
                <label class="admin-label">Name</label>
                <input type="text" id="new-member-name" class="admin-input" placeholder="e.g. Dave" required />
              </div>
              <div class="admin-field">
                <label class="admin-label">Join Date</label>
                <input type="date" id="new-member-date" class="admin-input" required />
              </div>
              <div class="admin-field">
                <label class="admin-label">Role</label>
                <select id="new-member-role" class="admin-input">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div class="admin-form-actions">
              <button type="submit" class="btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Member
              </button>
              <span id="add-member-result" class="admin-result"></span>
            </div>
          </form>
        </details>

        <details class="admin-details">
          <summary class="admin-details-summary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
            Dissolve Member
          </summary>
          <form id="form-dissolve" class="admin-form" style="margin-top:12px;">
            <div class="admin-form-grid">
              <div class="admin-field">
                <label class="admin-label">Member</label>
                <select id="dissolve-member" class="admin-input" required>
                  <option value="">Select member...</option>
                  ${activeMembers.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                </select>
              </div>
              <div class="admin-field">
                <label class="admin-label">Leave Date</label>
                <input type="date" id="dissolve-date" class="admin-input" required />
              </div>
            </div>
            <div class="admin-form-actions">
              <button type="submit" class="btn-primary" style="background:var(--red);">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                Remove Member
              </button>
              <span id="dissolve-result" class="admin-result"></span>
            </div>
          </form>
        </details>
      </div>

      <!-- Section: Transaction History -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
          Transaction History
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
          <select id="ledger-type-filter" class="admin-input" style="width:auto;min-width:140px;">
            <option value="all">All Types</option>
            <option value="contribution">Contributions</option>
            <option value="purchase">Purchases</option>
          </select>
          <select id="ledger-member-filter" class="admin-input" style="width:auto;min-width:140px;">
            <option value="">All Members</option>
            ${members.map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
          </select>
          <span id="ledger-count" class="text-muted" style="font-size:12px;"></span>
        </div>
        <div class="data-table-wrap">
          <table class="data-table" id="ledger-table">
            <thead><tr>
              <th>Date</th>
              <th>Type</th>
              <th>Member</th>
              <th class="text-right">ZAR</th>
              <th class="text-right">BTC</th>
              <th class="text-right">Price</th>
              <th>Notes</th>
            </tr></thead>
            <tbody id="ledger-body"><tr><td colspan="7" class="text-muted">Loading...</td></tr></tbody>
          </table>
        </div>
        <div id="ledger-pagination" style="display:flex;gap:8px;margin-top:12px;justify-content:center;"></div>
      </div>

      <!-- Section: Audit Log -->
      <div class="admin-section">
        <div class="admin-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          Audit Log
        </div>
        <div id="audit-log-content" class="admin-audit-log">Loading audit log...</div>
      </div>
    `;

    // Wire up forms
    wirePaymentForm(activeMembers);
    wireBulkPaymentForm(activeMembers);
    wirePurchaseForm();
    wireAdjustForm();
    wireAddMemberForm();
    wireDissolveForm();
    loadAuditLog();
    loadLedger(1);

    // Make member management table sortable
    const memberTableWrap = container.querySelector('.data-table-wrap');
    if (memberTableWrap) {
      const memberData = members.map(m => ({
        ...m,
        contributed: summary.memberContributions?.[m.name] || 0,
      }));
      function renderMemberTable(data) {
        const tbody = memberTableWrap.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = data.map(m => `
          <tr>
            <td>${m.id}</td>
            <td style="font-weight:600;">${m.name}</td>
            <td><span class="badge ${m.status === 'active' ? 'badge-green' : 'badge-red'}">${m.status}</span></td>
            <td>${fmt.date(m.joinedDate)}</td>
            <td>${fmt.zar(m.contributed)}</td>
          </tr>
        `).join('');
      }
      makeSortable({
        tableContainer: memberTableWrap,
        data: memberData,
        renderFn: renderMemberTable,
        columns: [
          { key: 'id', type: 'number' },
          { key: 'name', type: 'string' },
          { key: 'status', type: 'string' },
          { key: 'joinedDate', type: 'date' },
          { key: 'contributed', type: 'number' },
        ],
      });
    }

    // Logout
    $('#admin-logout')?.addEventListener('click', () => {
      sessionStorage.removeItem('zargusta-admin-key');
      loadTreasurer();
    });

  } catch (err) {
    console.error('Treasurer load failed:', err);
    container.innerHTML = `<div class="empty-state">Failed to load admin portal: ${err.message}</div>`;
  }
}

function wirePaymentForm(activeMembers) {
  $('#form-payment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const select = $('#pay-member');
    const memberId = Number(select.value);
    const memberName = select.options[select.selectedIndex]?.dataset?.name;
    const amountZar = Number($('#pay-amount').value);
    const resultEl = $('#pay-result');
    try {
      resultEl.textContent = 'Processing...';
      resultEl.className = 'admin-result';
      await adminApi('/contributions', {
        method: 'POST',
        body: JSON.stringify({ memberId, memberName, amountZar }),
      });
      resultEl.textContent = `Recorded ${fmt.zar(amountZar)} from ${memberName}`;
      resultEl.className = 'admin-result admin-result-ok';
      $('#pay-amount').value = '';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.className = 'admin-result admin-result-err';
    }
  });
}

function wireBulkPaymentForm(activeMembers) {
  const updateTotal = () => {
    const checked = document.querySelectorAll('.bulk-include:checked').length;
    const rate = Number($('#bulk-amount')?.value || 0);
    $('#bulk-count').textContent = checked;
    $('#bulk-rate').textContent = rate.toLocaleString();
    $('#bulk-total').textContent = `R${(checked * rate).toLocaleString()}`;
  };

  $('#bulk-amount')?.addEventListener('input', updateTotal);
  document.querySelectorAll('.bulk-include').forEach(cb => cb.addEventListener('change', updateTotal));

  $('#bulk-select-all')?.addEventListener('change', (e) => {
    document.querySelectorAll('.bulk-include').forEach(cb => { cb.checked = e.target.checked; });
    updateTotal();
  });

  $('#form-bulk-payment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = $('#bulk-date')?.value;
    const amountZar = Number($('#bulk-amount')?.value);
    const payments = [];
    document.querySelectorAll('.bulk-include:checked').forEach(cb => {
      payments.push({
        memberId: Number(cb.dataset.memberId),
        memberName: cb.dataset.memberName,
        amountZar,
      });
    });

    const resultEl = $('#bulk-result');
    if (payments.length === 0) {
      resultEl.textContent = 'No members selected';
      resultEl.className = 'admin-result admin-result-err';
      return;
    }

    try {
      resultEl.textContent = 'Processing...';
      resultEl.className = 'admin-result';
      const res = await adminApi('/admin/bulk-payment', {
        method: 'POST',
        body: JSON.stringify({ date, payments }),
      });
      resultEl.textContent = `✓ ${res.paymentsRecorded} payments × R${amountZar.toLocaleString()} = R${res.totalZar.toLocaleString()}`;
      resultEl.className = 'admin-result admin-result-ok';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.className = 'admin-result admin-result-err';
    }
  });
}

function wirePurchaseForm() {
  $('#form-purchase')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btcBought = Number($('#purch-btc').value);
    const priceZar = Number($('#purch-price').value);
    const amountInvested = Number($('#purch-invested').value);
    const notes = $('#purch-notes').value || '';
    const resultEl = $('#purch-result');
    try {
      resultEl.textContent = 'Processing...';
      resultEl.className = 'admin-result';
      await adminApi('/purchases', {
        method: 'POST',
        body: JSON.stringify({ btcBought, priceZar, amountInvested, notes }),
      });
      resultEl.textContent = `Recorded ${btcBought} BTC @ ${fmt.zar(priceZar)}`;
      resultEl.className = 'admin-result admin-result-ok';
      $('#purch-btc').value = '';
      $('#purch-price').value = '';
      $('#purch-invested').value = '';
      $('#purch-notes').value = '';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.className = 'admin-result admin-result-err';
    }
  });
}

function wireAdjustForm() {
  $('#form-adjust')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newHoldings = Number($('#adj-holdings').value);
    const reason = $('#adj-reason').value;
    const resultEl = $('#adj-result');
    try {
      resultEl.textContent = 'Processing...';
      resultEl.className = 'admin-result';
      const data = await adminApi('/admin/adjust-holdings', {
        method: 'POST',
        body: JSON.stringify({ newHoldings, reason }),
      });
      resultEl.textContent = `Adjusted: ${data.previous} → ${data.current} BTC (${reason})`;
      resultEl.className = 'admin-result admin-result-ok';
      $('#adj-holdings').value = '';
      $('#adj-reason').value = '';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.className = 'admin-result admin-result-err';
    }
  });
}

function wireAddMemberForm() {
  $('#form-add-member')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#new-member-name').value;
    const joinedDate = $('#new-member-date').value;
    const role = $('#new-member-role').value;
    const resultEl = $('#add-member-result');
    try {
      resultEl.textContent = 'Processing...';
      resultEl.className = 'admin-result';
      await adminApi('/members', {
        method: 'POST',
        body: JSON.stringify({ name, joinedDate, role }),
      });
      resultEl.textContent = `Added ${name} as ${role}`;
      resultEl.className = 'admin-result admin-result-ok';
      $('#new-member-name').value = '';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.className = 'admin-result admin-result-err';
    }
  });
}

function wireDissolveForm() {
  $('#form-dissolve')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = Number($('#dissolve-member').value);
    const leaveDate = $('#dissolve-date').value;
    const resultEl = $('#dissolve-result');
    try {
      resultEl.textContent = 'Processing...';
      resultEl.className = 'admin-result';
      await adminApi(`/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'left', leaveDate }),
      });
      resultEl.textContent = 'Member dissolved';
      resultEl.className = 'admin-result admin-result-ok';
    } catch (err) {
      resultEl.textContent = err.message;
      resultEl.className = 'admin-result admin-result-err';
    }
  });
}

async function loadLedger(page = 1) {
  const typeFilter = $('#ledger-type-filter')?.value || 'all';
  const memberFilter = $('#ledger-member-filter')?.value || '';
  const body = $('#ledger-body');
  const countEl = $('#ledger-count');
  const pagEl = $('#ledger-pagination');
  if (!body) return;

  try {
    const params = new URLSearchParams({ page: String(page), limit: '50', type: typeFilter });
    if (memberFilter) params.set('member', memberFilter);
    const res = await adminApi(`/fund/ledger?${params}`);
    const entries = res.entries || [];
    const total = res.total || entries.length;
    const pages = res.pages || 1;

    if (countEl) countEl.textContent = `${total} transactions`;

    if (!entries.length) {
      body.innerHTML = '<tr><td colspan="7" class="text-muted">No transactions found.</td></tr>';
      if (pagEl) pagEl.innerHTML = '';
      return;
    }

    body.innerHTML = entries.map(e => {
      const isPurchase = e.type === 'purchase';
      return `<tr>
        <td>${fmt.date(e.date)}</td>
        <td><span class="badge ${isPurchase ? 'badge-amber' : 'badge-green'}">${e.type}</span></td>
        <td>${e.member || '—'}</td>
        <td class="text-right">${e.amountZar ? fmt.zar(e.amountZar) : '—'}</td>
        <td class="text-right">${e.btc ? fmt.btcShort(e.btc) : '—'}</td>
        <td class="text-right">${e.priceZar ? fmt.zar(e.priceZar) : '—'}</td>
        <td class="text-muted" style="font-size:12px;">${e.notes || ''}</td>
      </tr>`;
    }).join('');

    // Pagination
    if (pagEl && pages > 1) {
      let btns = '';
      for (let i = 1; i <= pages; i++) {
        btns += `<button class="btn-outline ledger-page-btn ${i === page ? 'active' : ''}" data-page="${i}" style="min-height:32px;padding:4px 10px;font-size:12px;">${i}</button>`;
      }
      pagEl.innerHTML = btns;
      pagEl.querySelectorAll('.ledger-page-btn').forEach(btn => {
        btn.addEventListener('click', () => loadLedger(Number(btn.dataset.page)));
      });
    } else if (pagEl) {
      pagEl.innerHTML = '';
    }
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7" class="text-muted">Failed: ${err.message}</td></tr>`;
  }

  // Wire filters (once)
  if (!loadLedger._wired) {
    loadLedger._wired = true;
    $('#ledger-type-filter')?.addEventListener('change', () => loadLedger(1));
    $('#ledger-member-filter')?.addEventListener('change', () => loadLedger(1));
  }

  // Make ledger table sortable on current page
  const ledgerTable = $('#ledger-table');
  if (ledgerTable && entries.length) {
    function renderLedgerRows(data) {
      body.innerHTML = data.map(e => {
        const isPurchase = e.type === 'purchase';
        return `<tr>
          <td>${fmt.date(e.date)}</td>
          <td><span class="badge ${isPurchase ? 'badge-amber' : 'badge-green'}">${e.type}</span></td>
          <td>${e.member || '—'}</td>
          <td class="text-right">${e.amountZar ? fmt.zar(e.amountZar) : '—'}</td>
          <td class="text-right">${e.btc ? fmt.btcShort(e.btc) : '—'}</td>
          <td class="text-right">${e.priceZar ? fmt.zar(e.priceZar) : '—'}</td>
          <td class="text-muted" style="font-size:12px;">${e.notes || ''}</td>
        </tr>`;
      }).join('');
    }
    makeSortable({
      tableContainer: ledgerTable,
      data: entries,
      renderFn: renderLedgerRows,
      columns: [
        { key: 'date', type: 'date' },
        { key: 'type', type: 'string' },
        { key: 'member', type: 'string' },
        { key: 'amountZar', type: 'number' },
        { key: 'btc', type: 'number' },
        { key: 'priceZar', type: 'number' },
        { key: 'notes', type: 'string' },
      ],
    });
  }
}

async function loadAuditLog() {
  const container = $('#audit-log-content');
  if (!container) return;
  try {
    const log = await adminApi('/admin/audit-log?limit=50');
    if (!Array.isArray(log) || log.length === 0) {
      container.innerHTML = '<div class="text-muted" style="padding:12px;">No audit entries yet.</div>';
      return;
    }
    container.innerHTML = log.map(entry => {
      const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-ZA') : '—';
      const action = entry.action || 'unknown';
      const detail = Object.entries(entry)
        .filter(([k]) => k !== 'timestamp' && k !== 'action')
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' ');
      return `<div class="audit-entry">
        <span class="audit-ts">${ts}</span>
        <span class="audit-action">${action}</span>
        <span class="audit-detail">${detail}</span>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-muted" style="padding:12px;">Failed to load audit log: ${err.message}</div>`;
  }
}
