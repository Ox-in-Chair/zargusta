/** ZARyder Cup — Business News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadBusinessNews() {
  renderNewsView($('#businessnews-content'), '/news/business', 'business', 'No business news available');
}
