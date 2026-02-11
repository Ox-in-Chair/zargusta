/** Bitcoin price fetching — CoinGecko free tier */
import type { BtcPrice } from '../shared/types.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

let cachedPrice: BtcPrice | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // 30s

export async function getCurrentBtcPrice(): Promise<BtcPrice> {
  if (cachedPrice && Date.now() < cacheExpiry) return cachedPrice;

  try {
    const res = await fetch(`${COINGECKO_URL}?ids=bitcoin&vs_currencies=zar,usd&include_24hr_change=true`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const json = (await res.json()) as {
      bitcoin: { zar: number; usd: number; zar_24h_change?: number; usd_24h_change?: number };
    };

    cachedPrice = {
      zar: json.bitcoin.zar,
      usd: json.bitcoin.usd,
      zar24hChange: json.bitcoin.zar_24h_change ?? 0,
      usd24hChange: json.bitcoin.usd_24h_change ?? 0,
      timestamp: new Date().toISOString(),
      source: 'coingecko',
    };
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedPrice;
  } catch {
    // Fallback to last known or mock
    if (cachedPrice) return { ...cachedPrice, source: 'cache' };
    return {
      zar: 0,
      usd: 0,
      zar24hChange: 0,
      usd24hChange: 0,
      timestamp: new Date().toISOString(),
      source: 'unavailable',
    };
  }
}

export async function getBtcHistory(days = 30): Promise<Array<{ date: string; priceZar: number }>> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=zar&days=${days}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { prices: [number, number][] };
    return json.prices.map(([ts, price]) => ({
      date: new Date(ts).toISOString().slice(0, 10),
      priceZar: Math.round(price),
    }));
  } catch {
    return [];
  }
}
