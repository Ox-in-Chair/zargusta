/** ZARyder Cup — Contributions view */
import { $, api, fmt } from '../api.js';
import { drawBarChart } from '../charts.js';
import { makeSortable } from '../table-sort.js';

let allContributions = [];
let allMembers = [];
let contribFilterMember = 'all';
let contribSorter = null;

export async function loadContributions() {
  try {
    if (!allContributions.length) {
      [allContributions, allMembers] = await Promise.all([
        api('/contributions'),
        api('/members'),
      ]);
    }

    const filterContainer = $('#contrib-filters');
    if (!filterContainer.children.length) {
      const names = [...new Set(allContributions.map(c => c.memberName))].sort();
      let btns = `<button class="filter-btn active" data-member="all">All</button>`;
      for (const name of names) {
        btns += `<button class="filter-btn" data-member="${name}">${name}</button>`;
      }
      filterContainer.innerHTML = btns;
      filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contribFilterMember = btn.dataset.member;
        renderContributions();
      });
    }

    renderContributions();
  } catch (err) {
    console.error('Contributions load failed:', err);
  }
}

function renderContributions() {
  const filtered = contribFilterMember === 'all'
    ? allContributions
    : allContributions.filter(c => c.memberName === contribFilterMember);

  const total = filtered.reduce((s, c) => s + c.amountZar, 0);
  $('#contrib-meta').innerHTML = `
    <span class="text-amber">${fmt.zar(total)}</span>
    <span class="text-muted">from ${filtered.length} contributions</span>
  `;

  // Monthly bar chart
  const monthlyMap = {};
  filtered.forEach(c => {
    const key = c.date.slice(0, 7); // YYYY-MM
    monthlyMap[key] = (monthlyMap[key] || 0) + c.amountZar;
  });
  const sortedMonths = Object.keys(monthlyMap).sort();
  const barLabels = sortedMonths.map(m => fmt.monthLabel(m)); // "Oct 21", "Nov 21" etc
  const barValues = sortedMonths.map(m => monthlyMap[m]);
  drawBarChart($('#contrib-bar-chart'), barLabels, barValues);

  const defaultSorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  function renderTable(data) {
    const rows = data.map((c) => `
      <tr>
        <td>${fmt.date(c.date)}</td>
        <td>${c.memberName}</td>
        <td class="text-right text-amber">${fmt.zar(c.amountZar)}</td>
      </tr>
    `).join('');

    $('#contributions-table').innerHTML = `
      <table>
        <thead><tr>
          <th>Date</th>
          <th>Member</th>
          <th class="text-right">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  renderTable(defaultSorted);
  contribSorter = makeSortable({
    tableContainer: $('#contributions-table'),
    data: defaultSorted,
    renderFn: renderTable,
    columns: [
      { key: 'date', type: 'date' },
      { key: 'memberName', type: 'string' },
      { key: 'amountZar', type: 'number' },
    ],
  });
}
