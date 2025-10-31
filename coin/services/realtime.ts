import { getSpotSymbols } from '@/services/binance';

export type MiniTicker = {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
};

export type TickerUpdate = Record<string, { price: number; changePct: number; volumeQ?: number }>;

export function startUSDTSpotMiniTicker(
  onUpdate: (data: TickerUpdate) => void
) {
  let closed = false;
  let ws: WebSocket | null = null;
  let spotSetPromise = getSpotSymbols();

  function connect() {
    // Global stream for all symbols
    ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    ws.onmessage = async (ev) => {
      try {
        const arr = JSON.parse(ev.data as string) as MiniTicker[];
        const spotSet = await spotSetPromise;
        const out: TickerUpdate = {};
        for (const t of arr) {
          const sym = t.s;
          if (!sym.endsWith('USDT')) continue;
          if (!spotSet.has(sym)) continue;
          const close = Number(t.c);
          const open = Number(t.o);
          const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
          const volumeQ = Number(t.q);
          out[sym] = { price: close, changePct, volumeQ: isFinite(volumeQ) ? volumeQ : undefined };
        }
        if (Object.keys(out).length > 0) onUpdate(out);
      } catch {}
    };
    ws.onclose = () => {
      if (closed) return;
      // simple retry after 2s
      setTimeout(connect, 2000);
    };
    ws.onerror = () => {
      try { ws && ws.close(); } catch {}
    };
  }

  connect();

  return () => {
    closed = true;
    try { ws && ws.close(); } catch {}
  };
}


