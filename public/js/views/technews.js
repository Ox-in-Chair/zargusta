/** ZARyder Cup — Technology News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadTechNews() {
  renderNewsView($('#technews-content'), '/news/tech', 'tech', 'No technology news available');
}
