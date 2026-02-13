/** ZARyder Cup — Golf News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadGolf() {
  renderNewsView($('#golf-content'), '/news/golf', 'golf', 'No golf news available');
}
