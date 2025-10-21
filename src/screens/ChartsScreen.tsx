import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';

import { GlassContainer } from '../components/GlassContainer';
import { Colors, Sizes } from '../constants';
import { usePortfolio } from '../hooks/usePortfolio';

const screenWidth = Dimensions.get('window').width;

const ChartsScreen: React.FC = () => {
  const { portfolio } = usePortfolio();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Colors.glass.medium,
    },
  };

  const pieChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  };

  const generatePortfolioHistory = () => {
    // Mock data - gerçek uygulamada bu veriler API'den gelecek
    const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Portfolio değerini simüle et
      const baseValue = portfolio.totalValue;
      const variation = (Math.random() - 0.5) * 0.1; // ±5% varyasyon
      const value = baseValue * (1 + variation);
      
      data.push({
        date: date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
        value: Math.max(0, value),
      });
    }
    
    return data;
  };

  const portfolioHistory = generatePortfolioHistory();

  const lineChartData = {
    labels: portfolioHistory.map(item => item.date),
    datasets: [
      {
        data: portfolioHistory.map(item => item.value),
        color: (opacity = 1) => Colors.primary,
        strokeWidth: 3,
      },
    ],
  };

  const pieChartData = portfolio.items.map((item, index) => {
    const colors = [
      Colors.primary,
      Colors.secondary,
      Colors.accent,
      Colors.success,
      Colors.warning,
      Colors.error,
    ];
    
    return {
      name: item.coin.symbol || 'Unknown',
      population: Math.max(0, item.currentValue || 0),
      color: colors[index % colors.length],
      legendFontColor: Colors.text.secondary,
      legendFontSize: 12,
    };
  });

  const timeframes = [
    { key: '7d', label: '7 Gün' },
    { key: '30d', label: '30 Gün' },
    { key: '90d', label: '90 Gün' },
  ] as const;

  if (!portfolio.items || portfolio.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Grafikler</Text>
          </View>
          
          <View style={styles.emptyContainer}>
            <Ionicons
              name="bar-chart-outline"
              size={64}
              color={Colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>Grafik Verisi Yok</Text>
            <Text style={styles.emptySubtitle}>
              Portföyünüze coin ekleyerek grafikleri görüntüleyin
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Grafikler</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Timeframe Selector */}
          <GlassContainer style={styles.timeframeContainer}>
            <View style={styles.timeframeSelector}>
              {timeframes.map((timeframe) => (
                <TouchableOpacity
                  key={timeframe.key}
                  style={[
                    styles.timeframeButton,
                    selectedTimeframe === timeframe.key && styles.timeframeButtonActive,
                  ]}
                  onPress={() => setSelectedTimeframe(timeframe.key)}
                >
                  <Text
                    style={[
                      styles.timeframeButtonText,
                      selectedTimeframe === timeframe.key && styles.timeframeButtonTextActive,
                    ]}
                  >
                    {timeframe.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassContainer>

          {/* Portfolio Value Chart */}
          <GlassContainer style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Portföy Değeri</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={lineChartData}
                width={screenWidth - 80}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
              />
            </View>
          </GlassContainer>

          {/* Portfolio Distribution */}
          <GlassContainer style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Portföy Dağılımı</Text>
            <View style={styles.chartWrapper}>
              <PieChart
                data={pieChartData}
                width={screenWidth - 80}
                height={220}
                chartConfig={pieChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>
          </GlassContainer>

          {/* Performance Summary */}
          <GlassContainer style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Performans Özeti</Text>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Toplam Yatırım</Text>
                <Text style={styles.summaryValue}>
                  ${(portfolio.items || []).reduce((total, item) => total + (item.amount * item.purchasePrice), 0).toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Güncel Değer</Text>
                <Text style={styles.summaryValue}>
                  ${(portfolio.totalValue || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Kar/Zarar</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: (portfolio.totalProfitLoss || 0) >= 0 ? Colors.success : Colors.error }
                ]}>
                  {(portfolio.totalProfitLoss || 0) >= 0 ? '+' : ''}${(portfolio.totalProfitLoss || 0).toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Getiri Oranı</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: (portfolio.totalProfitLossPercentage || 0) >= 0 ? Colors.success : Colors.error }
                ]}>
                  {(portfolio.totalProfitLossPercentage || 0) >= 0 ? '+' : ''}{(portfolio.totalProfitLossPercentage || 0).toFixed(2)}%
                </Text>
              </View>
            </View>
          </GlassContainer>

          {/* Top Performers */}
          <GlassContainer style={styles.performanceContainer}>
            <Text style={styles.performanceTitle}>En İyi Performans</Text>
            
            {(portfolio.items || [])
              .sort((a, b) => (b.profitLossPercentage || 0) - (a.profitLossPercentage || 0))
              .slice(0, 3)
              .map((item, index) => (
                <View key={item.coin.id} style={styles.performanceItem}>
                  <View style={styles.performanceItemLeft}>
                    <Text style={styles.performanceRank}>#{index + 1}</Text>
                    <View>
                      <Text style={styles.performanceCoinName}>{item.coin.name || 'Unknown'}</Text>
                      <Text style={styles.performanceCoinSymbol}>{item.coin.symbol || 'UNK'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.performanceItemRight}>
                    <LinearGradient
                      colors={(item.profitLossPercentage || 0) >= 0 ? Colors.gradient.success as [string, string] : Colors.gradient.error as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.performanceBadge}
                    >
                      <Text style={styles.performancePercentage}>
                        {(item.profitLossPercentage || 0) >= 0 ? '+' : ''}{(item.profitLossPercentage || 0).toFixed(2)}%
                      </Text>
                    </LinearGradient>
                  </View>
                </View>
              ))}
          </GlassContainer>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Sizes.lg,
    paddingVertical: Sizes.lg,
    paddingTop: Sizes.xl,
  },
  headerTitle: {
    fontSize: Sizes.fontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Sizes.lg,
  },
  timeframeContainer: {
    marginBottom: Sizes.lg,
  },
  timeframeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeframeButton: {
    paddingHorizontal: Sizes.lg,
    paddingVertical: Sizes.sm,
    borderRadius: Sizes.radius.full,
    backgroundColor: Colors.glass.dark,
  },
  timeframeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeframeButtonText: {
    color: Colors.text.secondary,
    fontSize: Sizes.fontSize.sm,
    fontWeight: '500',
  },
  timeframeButtonTextActive: {
    color: Colors.text.primary,
  },
  chartContainer: {
    marginBottom: Sizes.lg,
  },
  chartTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: Sizes.radius.lg,
  },
  summaryContainer: {
    marginBottom: Sizes.lg,
  },
  summaryTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: Sizes.fontSize.sm,
    marginBottom: Sizes.xs,
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.md,
    fontWeight: '600',
  },
  performanceContainer: {
    marginBottom: Sizes.xl,
  },
  performanceTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Sizes.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.medium,
  },
  performanceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceRank: {
    color: Colors.primary,
    fontSize: Sizes.fontSize.lg,
    fontWeight: 'bold',
    marginRight: Sizes.md,
    width: 30,
  },
  performanceCoinName: {
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.md,
    fontWeight: '600',
  },
  performanceCoinSymbol: {
    color: Colors.text.secondary,
    fontSize: Sizes.fontSize.sm,
  },
  performanceItemRight: {
    alignItems: 'flex-end',
  },
  performanceBadge: {
    paddingHorizontal: Sizes.sm,
    paddingVertical: Sizes.xs,
    borderRadius: Sizes.radius.full,
  },
  performancePercentage: {
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Sizes.xl,
  },
  emptyTitle: {
    fontSize: Sizes.fontSize.xl,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Sizes.lg,
    marginBottom: Sizes.sm,
  },
  emptySubtitle: {
    fontSize: Sizes.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

export default ChartsScreen;
