/** ZARyder Cup — Tennis News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadTennis() {
  renderNewsView($('#tennis-content'), '/news/tennis', 'tennis', 'No tennis news available');
}
