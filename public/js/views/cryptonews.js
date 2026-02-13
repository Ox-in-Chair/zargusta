/** ZARyder Cup — Crypto News view */
import { $ } from '../api.js';
import { renderNewsView } from './news-shared.js';

export async function loadCryptoNews() {
  renderNewsView($('#cryptonews-content'), '/news/crypto', 'crypto', 'No crypto news available. RSS feed may be temporarily unavailable.');
}
