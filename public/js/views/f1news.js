/** ZARyder Cup — F1 News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadF1News() {
  renderNewsView($('#f1news-content'), '/news/f1', 'F1', 'No F1 news available');
}
