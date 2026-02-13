/** Bitcoin price fetching — CoinGecko free tier */
import type { BtcPrice } from '../shared/types.js';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

let cachedPrice: BtcPrice | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 120_000; // 2min (CoinGecko free tier: 10-30 calls/min)

export async function getCurrentBtcPrice(): Promise<BtcPrice> {
  if (cachedPrice && Date.now() < cacheExpiry) return cachedPrice;

  try {
    const res = await fetch(`${COINGECKO_URL}?ids=bitcoin&vs_currencies=zar,usd&include_24hr_change=true`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Rate limited — extend cache and return stale
      if (res.status === 429 && cachedPrice) {
        cacheExpiry = Date.now() + 300_000; // back off 5min on 429
        return { ...cachedPrice, source: 'cache' };
      }
      throw new Error(`CoinGecko ${res.status}`);
    }

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
  } catch (err) {
    // Fallback to last known price (stale > zero)
    if (cachedPrice) {
      // Extend cache on failure to avoid hammering rate limit
      cacheExpiry = Date.now() + CACHE_TTL_MS;
      return { ...cachedPrice, source: 'cache' };
    }
    // Fallback: Binance + forex conversion
    try {
      const [btcRes, fxRes] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { signal: AbortSignal.timeout(8_000) }),
        fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8_000) }),
      ]);
      if (btcRes.ok && fxRes.ok) {
        const btcJson = (await btcRes.json()) as { price: string };
        const fxJson = (await fxRes.json()) as { rates: Record<string, number> };
        const usdPrice = parseFloat(btcJson.price);
        const zarRate = fxJson.rates?.ZAR ?? 16.1;
        cachedPrice = {
          zar: Math.round(usdPrice * zarRate),
          usd: Math.round(usdPrice),
          zar24hChange: 0,
          usd24hChange: 0,
          timestamp: new Date().toISOString(),
          source: 'binance-fallback',
        };
        cacheExpiry = Date.now() + CACHE_TTL_MS;
        return cachedPrice;
      }
    } catch { /* ignore fallback failure */ }

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
