/** ZARyder Cup — Cricket News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadCricket() {
  renderNewsView($('#cricket-content'), '/news/cricket', 'cricket', 'No cricket news available');
}
