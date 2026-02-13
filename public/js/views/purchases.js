/** ZARyder Cup — Purchases & Withdrawals view */
import { $, api, fmt } from '../api.js';
import { drawDCAChart } from '../charts.js';
import { makeSortable } from '../table-sort.js';

export async function loadPurchases() {
  try {
    const purchases = await api('/purchases');
    const totalBtc = purchases.reduce((s, p) => s + p.btcBought, 0);
    const totalSpent = purchases.reduce((s, p) => s + (p.amountInvested || 0), 0);
    const avgPrice = totalSpent > 0 && totalBtc > 0 ? totalSpent / totalBtc : 0;

    $('#purchases-total').textContent = fmt.btc(totalBtc) + ' BTC';

    // Pre-compute running BTC in chronological order (always oldest→newest)
    const chronological = [...purchases].sort((a, b) => a.date.localeCompare(b.date));
    const runningMap = new Map();
    let cumBtc = 0;
    let cumSpent = 0;
    for (const p of chronological) {
      cumBtc += p.btcBought;
      cumSpent += (p.amountInvested || 0);
      // Use date+btcBought as key to handle same-date entries
      runningMap.set(p.date + '|' + p.btcBought, { runningBtc: cumBtc, runningSpent: cumSpent });
    }

    // Draw DCA chart (only positive purchases)
    const currentPrice = await api('/portfolio').then(d => d.price.zar).catch(() => null);
    const purchasesOnly = purchases.filter(p => p.btcBought > 0);
    drawDCAChart($('#dca-chart'), purchasesOnly, currentPrice);

    function renderPurchasesTable(data) {
      const rows = data.map((p, i) => {
        const key = p.date + '|' + p.btcBought;
        const running = runningMap.get(key) || { runningBtc: 0, runningSpent: 0 };
        const runningAvg = running.runningSpent > 0 && running.runningBtc > 0 ? running.runningSpent / running.runningBtc : 0;
        const isWithdrawal = p.btcBought < 0;

        return `
          <tr class="${isWithdrawal ? 'row-withdrawal' : ''}">
            <td style="color:var(--text-muted);font-size:12px;">${i + 1}</td>
            <td>${fmt.date(p.date)}</td>
            <td class="text-right ${isWithdrawal ? 'text-red' : ''}">${isWithdrawal ? '' : '+'}${fmt.btcShort(p.btcBought)}</td>
            <td class="text-right">${p.priceZar ? fmt.zar(p.priceZar) : '—'}</td>
            <td class="text-right">${p.amountInvested ? fmt.zar(p.amountInvested) : '—'}</td>
            <td class="text-right font-mono" style="font-weight:600;">${fmt.btcShort(running.runningBtc)}</td>
            <td class="text-right text-muted">${runningAvg > 0 ? fmt.zar(runningAvg) : '—'}</td>
            <td class="text-muted" style="font-size:12px;">${isWithdrawal ? '🔻 ' + (p.notes || 'Withdrawal') : (p.notes || '')}</td>
          </tr>
        `;
      }).join('');

      $('#purchases-table').innerHTML = `
        <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
          <div><span class="stat-label">Total Spent</span><div style="font-size:16px;font-weight:600;">${fmt.zar(totalSpent)}</div></div>
          <div><span class="stat-label">Avg Buy Price</span><div style="font-size:16px;font-weight:600;">${avgPrice > 0 ? fmt.zar(avgPrice) : '—'}</div></div>
          <div><span class="stat-label">Purchases</span><div style="font-size:16px;font-weight:600;">${purchasesOnly.length}</div></div>
          <div><span class="stat-label">Current Holdings</span><div style="font-size:16px;font-weight:600;">${fmt.btc(totalBtc)} BTC</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>Date</th>
            <th class="text-right">BTC</th>
            <th class="text-right">Price</th>
            <th class="text-right">Spent</th>
            <th class="text-right">Running BTC</th>
            <th class="text-right">Avg Price</th>
            <th>Notes</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    renderPurchasesTable(purchases);
    makeSortable({
      tableContainer: $('#purchases-table'),
      data: purchases,
      renderFn: renderPurchasesTable,
      columns: [
        { key: 'date', type: 'date', thIndex: 1 },
        { key: 'btcBought', type: 'number', thIndex: 2 },
        { key: 'priceZar', type: 'number', thIndex: 3 },
        { key: 'amountInvested', type: 'number', thIndex: 4 },
      ],
    });
  } catch (err) {
    console.error('Purchases load failed:', err);
  }
}
