export interface Coin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  image: string;
  amount?: number;
  purchasePrice?: number;
}

export interface PortfolioItem {
  coin: Coin;
  amount: number;
  purchasePrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface Portfolio {
  items: PortfolioItem[];
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export type RootStackParamList = {
  Main: undefined;
  AddCoin: undefined;
  CoinDetails: { coin: Coin };
};

export type MainTabParamList = {
  Portfolio: undefined;
  Charts: undefined;
  Settings: undefined;
};
