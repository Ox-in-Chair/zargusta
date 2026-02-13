/** Shared news rendering — with source labels, thumbnails, domain display */
import { api } from '../api.js';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return months === 1 ? 'A MONTH AGO' : `${months} MONTHS AGO`;
  if (days > 0) return days === 1 ? 'YESTERDAY' : `${days} DAYS AGO`;
  if (hours > 0) return hours === 1 ? 'AN HOUR AGO' : `${hours} HOURS AGO`;
  if (mins > 5) return `${mins} MINUTES AGO`;
  return 'JUST NOW';
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

const SOURCE_COLORS = {
  BBC: '#BB1919',
  ESPN: '#D00',
  'News24': '#E8590C',
  CoinDesk: '#0A5EB0',
  Autosport: '#FF0600',
  SuperSport: '#009B3A',
};

export async function renderNewsView(container, endpoint, label, emptyMsg) {
  if (!container) return;

  try {
    const articles = await api(endpoint);
    if (!Array.isArray(articles) || articles.length === 0) {
      container.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
      return;
    }

    // Get unique sources for filter
    const sources = [...new Set(articles.map(a => a.source).filter(Boolean))];
    let activeSource = 'all';

    function render(filtered) {
      const grid = container.querySelector('.news-grid');
      if (!grid) return;
      grid.innerHTML = filtered.map(a => {
        const domain = extractDomain(a.link);
        const sourceColor = SOURCE_COLORS[a.source] || 'var(--text-muted)';
        return `
          <a href="${a.link}" target="_blank" rel="noopener" class="news-card">
            ${a.image ? `<img src="${a.image}" alt="" class="news-thumb" loading="lazy" onerror="this.style.display='none'">` : '<div class="news-thumb-placeholder"></div>'}
            <div class="news-body">
              <div class="news-meta-row">
                <span class="news-source" style="color:${sourceColor}">${a.source || 'Unknown'}</span>
                <span class="news-time">${timeAgo(a.pubDate)}</span>
              </div>
              <div class="news-title">${a.title || 'Untitled'}</div>
              ${a.description ? `<div class="news-desc">${a.description}</div>` : ''}
              <div class="news-domain">${domain}</div>
            </div>
          </a>
        `;
      }).join('');
    }

    // Build layout with source filter
    container.innerHTML = `
      ${sources.length > 1 ? `
        <div class="news-source-filters">
          <button class="filter-btn active" data-source="all">All</button>
          ${sources.map(s => `<button class="filter-btn" data-source="${s}">${s}</button>`).join('')}
        </div>
      ` : ''}
      <div class="news-grid"></div>
    `;

    render(articles);

    // Source filter click handler
    const filterBar = container.querySelector('.news-source-filters');
    if (filterBar) {
      filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSource = btn.dataset.source;
        const filtered = activeSource === 'all' ? articles : articles.filter(a => a.source === activeSource);
        render(filtered);
      });
    }
  } catch (err) {
    console.error(`${label} news load failed:`, err);
    container.innerHTML = `<div class="empty-state">Failed to load ${label} news</div>`;
  }
}
