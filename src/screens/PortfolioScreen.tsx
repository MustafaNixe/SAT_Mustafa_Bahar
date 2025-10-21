import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { GlassContainer } from '../components/GlassContainer';
import { AnimatedButton } from '../components/AnimatedButton';
import { CoinCard } from '../components/CoinCard';
import { Colors, Sizes } from '../constants';
import { RootStackParamList, PortfolioItem } from '../types';
import { usePortfolio } from '../hooks/usePortfolio';

type PortfolioScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const PortfolioScreen: React.FC = () => {
  const navigation = useNavigation<PortfolioScreenNavigationProp>();
  const { portfolio, refreshPortfolio, isLoading } = usePortfolio();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  };

  const handleAddCoin = () => {
    navigation.navigate('AddCoin');
  };

  const getTotalProfitLossColor = () => {
    if ((portfolio.totalProfitLoss || 0) >= 0) return Colors.success;
    return Colors.error;
  };

  const getTotalProfitLossGradient = () => {
    if ((portfolio.totalProfitLoss || 0) >= 0) return Colors.gradient.success;
    return Colors.gradient.error;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Portföyüm</Text>
            <Text style={styles.headerSubtitle}>Kripto Para Yatırımlarınız</Text>
          </View>
          <TouchableOpacity onPress={handleAddCoin} style={styles.addButton}>
            <Ionicons name="add" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Portfolio Summary */}
          <GlassContainer style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Toplam Değer</Text>
            <Text style={styles.totalValue}>
              ${(portfolio.totalValue || 0).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>

            <View style={styles.profitLossContainer}>
              <LinearGradient
                colors={getTotalProfitLossGradient() as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.profitLossBadge}
              >
                  <Ionicons
                    name={(portfolio.totalProfitLoss || 0) >= 0 ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={Colors.text.primary}
                  />
                  <Text style={styles.profitLossText}>
                    {(portfolio.totalProfitLoss || 0) >= 0 ? '+' : ''}
                    ${Math.abs(portfolio.totalProfitLoss || 0).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.profitLossPercentage}>
                    ({(portfolio.totalProfitLossPercentage || 0) >= 0 ? '+' : ''}
                    {(portfolio.totalProfitLossPercentage || 0).toFixed(2)}%)
                  </Text>
              </LinearGradient>
            </View>
          </GlassContainer>

          {/* Portfolio Items */}
          {portfolio.items && portfolio.items.length > 0 ? (
            <View style={styles.portfolioSection}>
              <Text style={styles.sectionTitle}>Portföy İçeriği</Text>
              {portfolio.items.map((item: PortfolioItem, index: number) => (
                <CoinCard
                  key={`${item.coin.id}-${index}`}
                  coin={item.coin}
                  style={styles.coinCard}
                />
              ))}
            </View>
          ) : (
            <GlassContainer style={styles.emptyState}>
              <Ionicons
                name="wallet-outline"
                size={64}
                color={Colors.text.tertiary}
              />
              <Text style={styles.emptyTitle}>Portföyünüz Boş</Text>
              <Text style={styles.emptySubtitle}>
                İlk kripto paranızı ekleyerek başlayın
              </Text>
              <AnimatedButton
                title="Coin Ekle"
                onPress={handleAddCoin}
                style={styles.addFirstCoinButton}
              />
            </GlassContainer>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Sizes.lg,
    paddingVertical: Sizes.lg,
    paddingTop: Sizes.xl,
  },
  headerTitle: {
    fontSize: Sizes.fontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: Sizes.fontSize.md,
    color: Colors.text.secondary,
    marginTop: Sizes.xs,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.glass.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glass.light,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Sizes.lg,
  },
  summaryContainer: {
    marginBottom: Sizes.lg,
  },
  summaryTitle: {
    fontSize: Sizes.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Sizes.sm,
  },
  totalValue: {
    fontSize: Sizes.fontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  profitLossContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  profitLossBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Sizes.md,
    paddingVertical: Sizes.sm,
    borderRadius: Sizes.radius.full,
  },
  profitLossText: {
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.md,
    fontWeight: '600',
    marginLeft: Sizes.xs,
  },
  profitLossPercentage: {
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.sm,
    marginLeft: Sizes.xs,
    opacity: 0.8,
  },
  portfolioSection: {
    marginBottom: Sizes.xl,
  },
  sectionTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  coinCard: {
    marginBottom: Sizes.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Sizes.xxl,
    marginTop: Sizes.xl,
  },
  emptyTitle: {
    fontSize: Sizes.fontSize.xl,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Sizes.md,
    marginBottom: Sizes.sm,
  },
  emptySubtitle: {
    fontSize: Sizes.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Sizes.xl,
  },
  addFirstCoinButton: {
    marginTop: Sizes.md,
  },
});

export default PortfolioScreen;
