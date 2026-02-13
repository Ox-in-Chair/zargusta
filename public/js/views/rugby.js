/** ZARyder Cup — Rugby News view */
import { $, api } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadRugby() {
  renderNewsView($('#rugby-content'), '/news/rugby', 'rugby', 'No rugby news available');
}
