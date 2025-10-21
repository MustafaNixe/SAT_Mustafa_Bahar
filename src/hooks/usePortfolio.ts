import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, PortfolioItem, Coin } from '../types';
import { fetchCoinData } from '../services/coinService';

const PORTFOLIO_STORAGE_KEY = 'portfolio_data';

export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<Portfolio>({
    items: [],
    totalValue: 0,
    totalProfitLoss: 0,
    totalProfitLossPercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const calculatePortfolio = (items: PortfolioItem[]): Portfolio => {
    let totalValue = 0;
    let totalInvestment = 0;

    items.forEach(item => {
      totalValue += item.currentValue;
      totalInvestment += item.amount * item.purchasePrice;
    });

    const totalProfitLoss = totalValue - totalInvestment;
    const totalProfitLossPercentage = totalInvestment > 0 
      ? (totalProfitLoss / totalInvestment) * 100 
      : 0;

    return {
      items,
      totalValue,
      totalProfitLoss,
      totalProfitLossPercentage,
    };
  };

  const loadPortfolio = async () => {
    try {
      setIsLoading(true);
      const storedData = await AsyncStorage.getItem(PORTFOLIO_STORAGE_KEY);
      
      if (storedData) {
        const portfolioItems: PortfolioItem[] = JSON.parse(storedData);
        
        // Update coin prices with better error handling
        const updatedItems = await Promise.all(
          portfolioItems.map(async (item) => {
            try {
              const coinData = await fetchCoinData(item.coin.id);
              const currentValue = item.amount * (coinData.price || item.coin.price);
              const profitLoss = currentValue - (item.amount * item.purchasePrice);
              const profitLossPercentage = ((profitLoss / (item.amount * item.purchasePrice)) * 100);

              return {
                ...item,
                coin: { ...item.coin, ...coinData },
                currentValue,
                profitLoss,
                profitLossPercentage,
              };
            } catch (error) {
              console.error(`Error updating coin ${item.coin.id}:`, error);
              // Return original item if update fails
              return item;
            }
          })
        );

        const calculatedPortfolio = calculatePortfolio(updatedItems);
        setPortfolio(calculatedPortfolio);
        
        // Save updated data
        try {
          await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedItems));
        } catch (saveError) {
          console.error('Error saving portfolio:', saveError);
        }
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
      // Set empty portfolio on error
      setPortfolio({
        items: [],
        totalValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addCoinToPortfolio = async (coin: Coin, amount: number, purchasePrice: number) => {
    try {
      const currentValue = amount * coin.price;
      const profitLoss = currentValue - (amount * purchasePrice);
      const profitLossPercentage = ((profitLoss / (amount * purchasePrice)) * 100);

      const newItem: PortfolioItem = {
        coin,
        amount,
        purchasePrice,
        currentValue,
        profitLoss,
        profitLossPercentage,
      };

      const updatedItems = [...portfolio.items, newItem];
      const calculatedPortfolio = calculatePortfolio(updatedItems);
      
      setPortfolio(calculatedPortfolio);
      await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedItems));
      
      return true;
    } catch (error) {
      console.error('Error adding coin to portfolio:', error);
      return false;
    }
  };

  const removeCoinFromPortfolio = async (coinId: string) => {
    try {
      const updatedItems = portfolio.items.filter(item => item.coin.id !== coinId);
      const calculatedPortfolio = calculatePortfolio(updatedItems);
      
      setPortfolio(calculatedPortfolio);
      await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedItems));
      
      return true;
    } catch (error) {
      console.error('Error removing coin from portfolio:', error);
      return false;
    }
  };

  const updateCoinAmount = async (coinId: string, newAmount: number) => {
    try {
      const updatedItems = portfolio.items.map(item => {
        if (item.coin.id === coinId) {
          const currentValue = newAmount * item.coin.price;
          const profitLoss = currentValue - (newAmount * item.purchasePrice);
          const profitLossPercentage = ((profitLoss / (newAmount * item.purchasePrice)) * 100);

          return {
            ...item,
            amount: newAmount,
            currentValue,
            profitLoss,
            profitLossPercentage,
          };
        }
        return item;
      });

      const calculatedPortfolio = calculatePortfolio(updatedItems);
      setPortfolio(calculatedPortfolio);
      await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedItems));
      
      return true;
    } catch (error) {
      console.error('Error updating coin amount:', error);
      return false;
    }
  };

  const refreshPortfolio = async () => {
    await loadPortfolio();
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  return {
    portfolio,
    isLoading,
    addCoinToPortfolio,
    removeCoinFromPortfolio,
    updateCoinAmount,
    refreshPortfolio,
  };
};
