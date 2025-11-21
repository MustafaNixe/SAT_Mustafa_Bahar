import { getTradableSymbols } from '@/services/binance';
import { MARKET_CONFIG } from '@/services/market-config';

export type Ticker24h = {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price (last price)
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  p: string; // Price change
  P: string; // Price change percent
};

export type TickerUpdate = Record<string, { price: number; changePct: number; volumeQ?: number }>;

// Tek WebSocket - @ticker stream hem fiyat hem 24h bilgisi verir
let globalWS: WebSocket | null = null;
let globalSubscribers: Set<(data: TickerUpdate) => void> = new Set();
let globalClosed = false;
let globalReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function startGlobalWebSocket() {
  // Eğer zaten açık veya bağlanıyorsa, yeni bağlantı açma
  if (globalWS) {
    if (globalWS.readyState === WebSocket.OPEN || globalWS.readyState === WebSocket.CONNECTING) {
      return;
    }
    // Eski bağlantıyı temizle
    try {
      globalWS.onopen = null;
      globalWS.onclose = null;
      globalWS.onerror = null;
      globalWS.onmessage = null;
      globalWS.close();
    } catch {}
    globalWS = null;
  }

  if (globalClosed) return;
  if (globalReconnectTimer) {
    clearTimeout(globalReconnectTimer);
    globalReconnectTimer = null;
  }

  try {
    // @ticker stream - hem fiyat hem 24h bilgisi (her 1 saniyede güncellenir, güvenilir)
    globalWS = new WebSocket(`${MARKET_CONFIG.wsBase}/${MARKET_CONFIG.arrStream}`);
    
    globalWS.onopen = () => {
      if (globalReconnectTimer) {
        clearTimeout(globalReconnectTimer);
        globalReconnectTimer = null;
      }
    };

    globalWS.onmessage = async (ev) => {
      try {
        const arr = JSON.parse(ev.data as string) as Ticker24h[];
        const spotSet = await getTradableSymbols();
        const out: TickerUpdate = {};
        
        for (const t of arr) {
          const sym = t.s;
          if (!sym.endsWith('USDT')) continue;
          if (!spotSet.has(sym)) continue;
          
          // Gerçek zamanlı son fiyat - 'c' field (close/last price)
          const price = Number(t.c);
          const changePct = Number(t.P); // 24h değişim yüzdesi
          const volumeQ = Number(t.q);
          
          if (isFinite(price) && price > 0) {
            out[sym] = { 
              price, 
              changePct: isFinite(changePct) ? changePct : 0,
              volumeQ: isFinite(volumeQ) ? volumeQ : undefined 
            };
          }
        }
        
        if (Object.keys(out).length > 0) {
          // Tüm subscriber'lara gönder
          globalSubscribers.forEach((callback) => {
            try {
              callback(out);
            } catch (err) {
              console.error('Subscriber callback error:', err);
            }
          });
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    globalWS.onclose = (event) => {
      if (globalClosed) return;
      
      // Eğer kod 1000 (normal kapanma) değilse yeniden bağlan
      if (event.code !== 1000) {
        if (!globalReconnectTimer) {
          globalReconnectTimer = setTimeout(() => {
            startGlobalWebSocket();
          }, 2000);
        }
      }
    };

    globalWS.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  } catch (err) {
    console.error('WebSocket connection error:', err);
    if (!globalClosed && !globalReconnectTimer) {
      globalReconnectTimer = setTimeout(() => {
        startGlobalWebSocket();
      }, 3000);
    }
  }
}

export function startUSDTSpotMiniTicker(
  onUpdate: (data: TickerUpdate) => void
) {
  // Subscriber'ı ekle
  globalSubscribers.add(onUpdate);
  
  // WebSocket başlat (eğer yoksa veya kapalıysa)
  if (!globalWS || globalWS.readyState === WebSocket.CLOSED || globalWS.readyState === WebSocket.CLOSING) {
    startGlobalWebSocket();
  }

  // Cleanup function
  return () => {
    globalSubscribers.delete(onUpdate);
    
    // Eğer hiç subscriber kalmadıysa WebSocket'i kapat (ama sadece normal şekilde)
    if (globalSubscribers.size === 0 && globalWS && globalWS.readyState === WebSocket.OPEN) {
      try {
        // Normal kapanma kodu ile kapat (1000) - bu yeniden bağlanmayı tetiklemez
        globalWS.close(1000, 'No more subscribers');
      } catch {}
      globalWS = null;
      if (globalReconnectTimer) {
        clearTimeout(globalReconnectTimer);
        globalReconnectTimer = null;
      }
    }
  };
}

// Uygulama kapanırken tüm WebSocket'i kapat
export function closeAllWebSockets() {
  globalClosed = true;
  if (globalReconnectTimer) {
    clearTimeout(globalReconnectTimer);
  }
  if (globalWS) {
    try {
      globalWS.close();
    } catch {}
    globalWS = null;
  }
  globalSubscribers.clear();
}



