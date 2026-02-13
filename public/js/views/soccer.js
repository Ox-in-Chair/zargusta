/** ZARyder Cup — Soccer News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadSoccer() {
  renderNewsView($('#soccer-content'), '/news/soccer', 'soccer', 'No soccer news available');
}
