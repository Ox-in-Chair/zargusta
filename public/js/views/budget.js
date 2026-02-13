/** ZARyder Cup — Budget view */
import { $, api, fmt } from '../api.js';
import { makeSortable } from '../table-sort.js';

export async function loadBudget() {
  const container = $('#budget-content');
  if (!container) return;

  try {
    const [budget, portfolio] = await Promise.all([
      api('/trip/budget'),
      api('/portfolio').catch(() => null),
    ]);

    const categories = budget.categories || [];
    const totalEstimate = categories.reduce((s, c) => s + c.total, 0);
    const totalAllocated = categories.reduce((s, c) => s + c.allocated, 0);
    const remaining = budget.totalBudgetZar - totalAllocated;
    const perPerson = Math.round(totalEstimate / (budget.members || 7));
    const btcHoldings = portfolio?.totalBtc || 0;
    const btcPriceZar = portfolio?.price?.zar || 0;
    const btcValueZar = btcHoldings * btcPriceZar;

    container.innerHTML = `
      <div class="stats-grid stats-grid-4" style="margin-bottom:20px;">
        <div class="stat-card">
          <div class="stat-label">Total Budget</div>
          <div class="stat-value" style="font-size:20px;">${fmt.zar(budget.totalBudgetZar)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Estimated Total</div>
          <div class="stat-value" style="font-size:20px;">${fmt.zar(totalEstimate)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Per Person</div>
          <div class="stat-value" style="font-size:20px;">${fmt.zar(perPerson)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">BTC Fund Value</div>
          <div class="stat-value text-amber" style="font-size:20px;">${fmt.zar(btcValueZar)}</div>
        </div>
      </div>

      <div class="card" style="padding:24px;margin-bottom:20px;">
        <div class="card-title" style="margin-bottom:16px;">Budget Breakdown</div>
        <div class="card table-wrap">
          <table class="data-table">
            <thead><tr><th>Category</th><th>Per Person</th><th>Total (×${budget.members || 7})</th><th>Allocated</th></tr></thead>
            <tbody>
              ${categories.map(c => `
                <tr>
                  <td style="font-weight:600;">${c.name}</td>
                  <td>${fmt.zar(c.estimatePerPerson)}</td>
                  <td>${fmt.zar(c.total)}</td>
                  <td>${fmt.zar(c.allocated)}</td>
                </tr>
              `).join('')}
              <tr style="border-top:2px solid var(--border);font-weight:700;">
                <td>Total</td>
                <td>${fmt.zar(perPerson)}</td>
                <td>${fmt.zar(totalEstimate)}</td>
                <td>${fmt.zar(totalAllocated)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="padding:24px;margin-bottom:20px;">
        <div class="card-title" style="margin-bottom:16px;">Funding Source</div>
        <div class="stats-grid stats-grid-3">
          <div class="stat-card">
            <div class="stat-label">BTC Fund Can Cover</div>
            <div class="stat-value text-green" style="font-size:18px;">${fmt.zar(btcValueZar)}</div>
            <div class="text-muted" style="font-size:12px;">${btcHoldings.toFixed(8)} BTC @ ${fmt.zar(btcPriceZar)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Shortfall</div>
            <div class="stat-value ${totalEstimate > btcValueZar ? 'text-red' : 'text-green'}" style="font-size:18px;">${totalEstimate > btcValueZar ? fmt.zar(totalEstimate - btcValueZar) : 'Fully funded!'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Coverage</div>
            <div class="stat-value" style="font-size:18px;">${totalEstimate > 0 ? Math.min(100, Math.round((btcValueZar / totalEstimate) * 100)) : 0}%</div>
          </div>
        </div>
      </div>



      ${(budget.scenarioModels || []).length > 0 ? `
        <div class="card" style="padding:24px;">
          <div class="card-title" style="margin-bottom:16px;">Scenario Modelling — "What if BTC reaches..."</div>
          <div class="stats-grid stats-grid-4">
            ${budget.scenarioModels.map(s => {
              const scenarioValue = btcHoldings * s.btcPriceZar;
              const covers = totalEstimate > 0 ? Math.round((scenarioValue / totalEstimate) * 100) : 0;
              const surplus = scenarioValue - totalEstimate;
              return `
                <div class="stat-card" style="padding:16px;">
                  <div class="stat-label">${s.label}</div>
                  <div class="text-amber" style="font-size:14px;margin:4px 0;">BTC @ ${fmt.zar(s.btcPriceZar)}</div>
                  <div class="stat-value" style="font-size:18px;">${fmt.zar(scenarioValue)}</div>
                  <div style="margin-top:4px;">
                    <div class="${covers >= 100 ? 'text-green' : 'text-red'}" style="font-size:13px;font-weight:600;">${covers}% covered</div>
                    <div class="text-muted" style="font-size:12px;">${surplus >= 0 ? '+' + fmt.zar(surplus) + ' surplus' : fmt.zar(Math.abs(surplus)) + ' shortfall'}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Make budget breakdown table sortable
    const budgetTable = container.querySelector('.data-table');
    if (budgetTable && categories.length) {
      function renderBudgetRows(data) {
        const tbody = budgetTable.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = data.map(c => `
          <tr>
            <td style="font-weight:600;">${c.name}</td>
            <td>${fmt.zar(c.estimatePerPerson)}</td>
            <td>${fmt.zar(c.total)}</td>
            <td>${fmt.zar(c.allocated)}</td>
          </tr>
        `).join('') + `
          <tr style="border-top:2px solid var(--border);font-weight:700;">
            <td>Total</td>
            <td>${fmt.zar(perPerson)}</td>
            <td>${fmt.zar(totalEstimate)}</td>
            <td>${fmt.zar(totalAllocated)}</td>
          </tr>
        `;
      }
      makeSortable({
        tableContainer: budgetTable.closest('.card') || budgetTable.parentElement,
        data: categories,
        renderFn: renderBudgetRows,
        columns: [
          { key: 'name', type: 'string' },
          { key: 'estimatePerPerson', type: 'number' },
          { key: 'total', type: 'number' },
          { key: 'allocated', type: 'number' },
        ],
      });
    }
  } catch (err) {
    console.error('Budget load failed:', err);
    container.innerHTML = '<div class="empty-state">Failed to load budget data</div>';
  }
}
