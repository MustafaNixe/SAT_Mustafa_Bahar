import axios from 'axios';
import { Platform } from 'react-native';

const RAW_BASE = 'https://api.binance.com/api/v3';
const BINANCE_API_BASE = Platform.OS === 'web'
  ? `https://cors.isomorphic-git.org/${RAW_BASE}`
  : RAW_BASE;

type ExchangeInfo = {
  symbols: Array<{
    symbol: string;
    status: string; // e.g., 'TRADING'
    permissions?: string[]; // includes 'SPOT' for spot markets
    isSpotTradingAllowed?: boolean;
  }>;
};

export type TickerPrice = {
  symbol: string;
  price: string;
};

export type KlinePoint = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export async function fetchTickerPrice(symbol: string): Promise<number> {
  const res = await axios.get(`${BINANCE_API_BASE}/ticker/price`, {
    params: { symbol },
    timeout: 10000,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  const price = Number((res.data as TickerPrice).price);
  if (!isFinite(price) || price <= 0) {
    throw new Error(`Invalid price for ${symbol}`);
  }
  return price;
}

let cachedSpotSymbols: Set<string> | null = null;

async function ensureSpotSymbols(): Promise<Set<string>> {
  if (cachedSpotSymbols) return cachedSpotSymbols;
  const res = await axios.get(`${BINANCE_API_BASE}/exchangeInfo`);
  const info = res.data as ExchangeInfo;
  const set = new Set<string>();
  for (const s of info.symbols) {
    const isTrading = s.status === 'TRADING';
    const byPerm = Array.isArray(s.permissions) ? s.permissions.includes('SPOT') : false;
    const byFlag = s.isSpotTradingAllowed === true;
    const isSpot = byPerm || byFlag;
    if (isTrading && isSpot) set.add(s.symbol);
  }
  cachedSpotSymbols = set;
  return set;
}

export async function getSpotSymbols(): Promise<Set<string>> {
  return ensureSpotSymbols();
}

export async function fetchAllUSDTPrices(): Promise<Record<string, number>> {
  const [res, spotSet] = await Promise.all([
    axios.get(`${BINANCE_API_BASE}/ticker/price`),
    ensureSpotSymbols(),
  ]);
  const list = res.data as TickerPrice[];
  const map: Record<string, number> = {};
  for (const t of list) {
    if (t.symbol.endsWith('USDT') && spotSet.has(t.symbol)) map[t.symbol] = Number(t.price);
  }
  return map;
}

export async function fetchKlines(
  symbol: string,
  interval: '1h' | '4h' | '1d' | '1w' = '1d',
  limit: number = 100
): Promise<KlinePoint[]> {
  const res = await axios.get(`${BINANCE_API_BASE}/klines`, {
    params: { symbol, interval, limit },
  });
  const rows = res.data as any[];
  return rows.map((r) => ({
    openTime: r[0],
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
    closeTime: r[6],
  }));
}

export async function fetchSevenDayChangePercent(symbol: string): Promise<number> {
  const rows = await fetchKlines(symbol, '1d', 8);
  if (!rows.length) return 0;
  const first = rows[0]?.close;
  const last = rows[rows.length - 1]?.close;
  if (!first || !last) return 0;
  return ((last - first) / first) * 100;
}

export type Ticker24h = {
  symbol: string;
  priceChangePercent: string; // string number
  lastPrice: string;
  quoteVolume?: string; // total traded quote asset volume (e.g., USDT)
  // many more fields omitted
};

export async function fetch24hTickersUSDT(): Promise<Record<string, { price: number; changePct: number; volumeQ?: number }>> {
  const [res, spotSet] = await Promise.all([
    axios.get(`${BINANCE_API_BASE}/ticker/24hr`, {
      timeout: 10000, // 10 saniye timeout
      headers: {
        'Cache-Control': 'no-cache',
      },
    }),
    ensureSpotSymbols(),
  ]);
  const list = res.data as Ticker24h[];
  const out: Record<string, { price: number; changePct: number; volumeQ?: number }> = {};
  for (const t of list) {
    if (t.symbol.endsWith('USDT') && spotSet.has(t.symbol)) {
      // lastPrice alanı gerçek zamanlı son fiyatı verir
      const price = Number(t.lastPrice);
      const changePct = Number(t.priceChangePercent);
      const volumeQ = t.quoteVolume !== undefined ? Number(t.quoteVolume) : undefined;
      
      // Sadece geçerli fiyatları ekle
      if (isFinite(price) && price > 0) {
        out[t.symbol] = {
          price,
          changePct: isFinite(changePct) ? changePct : 0,
          volumeQ: volumeQ !== undefined && isFinite(volumeQ) ? volumeQ : undefined,
        };
      }
    }
  }
  return out;
}


