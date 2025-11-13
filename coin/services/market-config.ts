const MARKET_SOURCE = 'futures' as const;

type MarketSource = 'spot' | 'futures';

type MarketConfig = {
  restBase: string;
  wsBase: string;
  arrStream: string;
  exchangeInfoPath: string;
  filterSymbol: (symbol: any) => boolean;
};

const CONFIGS: Record<MarketSource, MarketConfig> = {
  spot: {
    restBase: 'https://api.binance.com/api/v3',
    wsBase: 'wss://stream.binance.com:9443/ws',
    arrStream: '!ticker@arr',
    exchangeInfoPath: '/exchangeInfo',
    filterSymbol: (s) => {
      const isTrading = s.status === 'TRADING';
      const byPerm = Array.isArray(s.permissions) ? s.permissions.includes('SPOT') : false;
      const byFlag = s.isSpotTradingAllowed === true;
      return isTrading && (byPerm || byFlag) && typeof s.symbol === 'string' && s.symbol.endsWith('USDT');
    },
  },
  futures: {
    restBase: 'https://fapi.binance.com/fapi/v1',
    wsBase: 'wss://fstream.binance.com/ws',
    arrStream: '!ticker@arr',
    exchangeInfoPath: '/exchangeInfo',
    filterSymbol: (s) => {
      const isTrading = s.status === 'TRADING';
      const isPerpetual = s.contractType === 'PERPETUAL';
      const marginUsdt = s.marginAsset === 'USDT';
      return isTrading && isPerpetual && marginUsdt && typeof s.symbol === 'string' && s.symbol.endsWith('USDT');
    },
  },
};

export const MARKET_MODE: MarketSource = MARKET_SOURCE;
export const MARKET_CONFIG = CONFIGS[MARKET_MODE];

