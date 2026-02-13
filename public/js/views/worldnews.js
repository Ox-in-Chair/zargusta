/** ZARyder Cup — World News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadWorldNews() {
  renderNewsView($('#worldnews-content'), '/news/world', 'world', 'No world news available');
}
