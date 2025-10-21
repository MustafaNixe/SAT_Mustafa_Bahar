import { Coin } from '../types';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export const fetchTopCoins = async (limit: number = 100): Promise<Coin[]> => {
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    return data.map((coin: any) => ({
      id: coin.id || '',
      name: coin.name || 'Unknown',
      symbol: coin.symbol || '',
      price: coin.current_price || 0,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercentage24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap || 0,
      image: coin.image || '',
    }));
  } catch (error) {
    console.error('Error fetching top coins:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
};

export const fetchCoinData = async (coinId: string): Promise<Coin> => {
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Coin not found');
    }

    const coin = data[0];
    
    return {
      id: coin.id || coinId,
      name: coin.name || 'Unknown',
      symbol: coin.symbol || '',
      price: coin.current_price || 0,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercentage24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap || 0,
      image: coin.image || '',
    };
  } catch (error) {
    console.error('Error fetching coin data:', error);
    // Return a default coin object to prevent app crash
    return {
      id: coinId,
      name: 'Unknown',
      symbol: 'UNK',
      price: 0,
      priceChange24h: 0,
      priceChangePercentage24h: 0,
      marketCap: 0,
      image: '',
    };
  }
};

export const searchCoins = async (query: string): Promise<Coin[]> => {
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/search?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search coins');
    }

    const data = await response.json();
    
    return data.coins.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      price: coin.current_price || 0,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercentage24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap || 0,
      image: coin.large,
    }));
  } catch (error) {
    console.error('Error searching coins:', error);
    throw error;
  }
};

export const fetchCoinHistory = async (
  coinId: string,
  days: number = 7
): Promise<{ date: string; price: number }[]> => {
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch coin history');
    }

    const data = await response.json();
    
    return data.prices.map((item: [number, number]) => ({
      date: new Date(item[0]).toLocaleDateString(),
      price: item[1],
    }));
  } catch (error) {
    console.error('Error fetching coin history:', error);
    throw error;
  }
};
