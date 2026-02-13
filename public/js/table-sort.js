/** ZARyder Cup — Table Sort Utility (ES module) */

/**
 * Make a table sortable by clicking column headers.
 * Click once = ascending, again = descending, again = default order.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.tableContainer - Element containing the <table>
 * @param {Array} opts.data - The data array (will NOT be mutated; a sorted copy is used)
 * @param {Function} opts.renderFn - Called with sorted data to re-render
 * @param {Array<{key:string, type:'string'|'number'|'date', thIndex?:number}>} opts.columns
 *   Each column config. thIndex defaults to array index.
 */
export function makeSortable({ tableContainer, data, renderFn, columns }) {
  let sortKey = null;
  let sortDir = null; // 'asc' | 'desc' | null

  function attach() {
    const ths = tableContainer.querySelectorAll('thead th');
    columns.forEach((col, i) => {
      const thIdx = col.thIndex ?? i;
      const th = ths[thIdx];
      if (!th) return;
      th.setAttribute('data-sortable', '');
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';

      // Set current state
      th.classList.remove('sort-asc', 'sort-desc');
      if (sortKey === col.key) {
        if (sortDir === 'asc') th.classList.add('sort-asc');
        else if (sortDir === 'desc') th.classList.add('sort-desc');
      }

      // Clone to remove old listeners
      const newTh = th.cloneNode(true);
      th.parentNode.replaceChild(newTh, th);

      newTh.addEventListener('click', () => {
        if (sortKey === col.key) {
          if (sortDir === 'asc') sortDir = 'desc';
          else if (sortDir === 'desc') { sortDir = null; sortKey = null; }
          else sortDir = 'asc';
        } else {
          sortKey = col.key;
          sortDir = 'asc';
        }
        doSort();
      });
    });
  }

  function doSort() {
    let sorted;
    if (!sortKey || !sortDir) {
      sorted = [...data];
    } else {
      const col = columns.find(c => c.key === sortKey);
      if (!col) { sorted = [...data]; }
      else {
        const getter = col.getValue || (row => row[col.key]);
        sorted = [...data].sort((a, b) => {
          let va = getter(a), vb = getter(b);
          let cmp = 0;
          switch (col.type) {
            case 'date':
              cmp = new Date(va || 0) - new Date(vb || 0);
              break;
            case 'number':
              cmp = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
              break;
            case 'string':
            default:
              cmp = String(va || '').localeCompare(String(vb || ''));
          }
          return sortDir === 'desc' ? -cmp : cmp;
        });
      }
    }
    renderFn(sorted);
    // Re-attach after render replaces DOM
    requestAnimationFrame(() => attach());
  }

  // Initial attach after first render
  requestAnimationFrame(() => attach());

  // Return controller
  return {
    /** Call after data changes to re-sort with current settings */
    update(newData) {
      data = newData;
      doSort();
    },
    /** Reset sort state */
    reset() {
      sortKey = null;
      sortDir = null;
      renderFn([...data]);
      requestAnimationFrame(() => attach());
    }
  };
}
