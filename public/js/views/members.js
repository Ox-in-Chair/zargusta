/** ZARyder Cup — Members view */
import { $, api, fmt } from '../api.js';
import { drawPieChart } from '../charts.js';

export async function loadMembers() {
  try {
    const [members, summary, portfolio] = await Promise.all([
      api('/members'),
      api('/fund/summary'),
      api('/portfolio'),
    ]);
    const contribs = summary.memberContributions || {};
    const totalContrib = summary.totalContributionsZar;
    const totalBtc = portfolio.totalBtc;
    const btcPrice = portfolio.price.zar;
    const breakdown = portfolio.perMemberBreakdown || {};
    const activeCount = members.filter(m => m.status === 'active').length;

    $('#members-active-count').textContent = activeCount;

    const html = members
      .sort((a, b) => (contribs[b.name] || 0) - (contribs[a.name] || 0))
      .map((m) => {
        const contrib = contribs[m.name] || 0;
        const bd = breakdown[m.name];
        // Use equal share from portfolio breakdown (Ox mandate: equal shares)
        const pctOfFund = bd ? bd.sharePct : 0;
        const btcShare = bd ? bd.btcShare : 0;
        const zarValue = bd ? bd.valueZar : 0;
        const isLeft = m.status === 'left';

        return `
          <div class="member-card ${isLeft ? 'member-left' : ''}">
            <div class="member-card-header">
              <div>
                <span class="member-name">${m.name}</span>
                ${m.role === 'admin' ? '<span class="member-role">Admin</span>' : ''}
              </div>
              <span class="badge ${isLeft ? 'badge-red' : 'badge-green'}">${m.status}</span>
            </div>
            <div class="member-stats">
              <div>
                <div class="member-stat-label">Contributed</div>
                <div class="member-stat-value text-amber">${fmt.zar(contrib)}</div>
              </div>
              <div>
                <div class="member-stat-label">% of Fund</div>
                <div class="member-stat-value">${pctOfFund.toFixed(1)}%</div>
              </div>
              <div>
                <div class="member-stat-label">BTC Share</div>
                <div class="member-stat-value">${fmt.btcShort(btcShare)}</div>
              </div>
              <div>
                <div class="member-stat-label">ZAR Value</div>
                <div class="member-stat-value ${isLeft ? 'text-muted' : 'text-green'}">${isLeft ? '—' : fmt.zar(zarValue)}</div>
              </div>
            </div>
            <div class="member-bar-track">
              <div class="member-bar-fill" style="width:${pctOfFund}%"></div>
            </div>
            <div class="text-muted" style="font-size:11px;margin-top:8px;">
              Joined ${fmt.date(m.joinedDate)}${m.leaveDate ? ` · Left ${fmt.date(m.leaveDate)}` : ''}
            </div>
          </div>
        `;
      }).join('');

    $('#members-list').innerHTML = html;

    // Draw contribution pie chart
    const activeMembers = members.filter(m => m.status === 'active');
    const pieLabels = activeMembers.map(m => m.name);
    const pieValues = activeMembers.map(m => contribs[m.name] || 0);
    drawPieChart($('#members-pie-chart'), pieLabels, pieValues);
  } catch (err) {
    console.error('Members load failed:', err);
  }
}
