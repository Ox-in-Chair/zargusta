/** ZARyder Cup — South Africa News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadSANews() {
  renderNewsView($('#sanews-content'), '/news/sa', 'SA', 'No South Africa news available');
}
