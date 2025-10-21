import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import { RootStackParamList, Coin } from '../types';
import { usePortfolio } from '../hooks/usePortfolio';
import { fetchTopCoins, searchCoins } from '../services/coinService';

type AddCoinScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddCoin'>;

const AddCoinScreen: React.FC = () => {
  const navigation = useNavigation<AddCoinScreenNavigationProp>();
  const { addCoinToPortfolio } = usePortfolio();
  
  const [coins, setCoins] = useState<Coin[]>([]);
  const [filteredCoins, setFilteredCoins] = useState<Coin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadCoins();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchCoinsQuery();
    } else {
      setFilteredCoins(coins);
    }
  }, [searchQuery, coins]);

  const loadCoins = async () => {
    try {
      setIsLoading(true);
      const topCoins = await fetchTopCoins(50);
      if (topCoins && topCoins.length > 0) {
        setCoins(topCoins);
        setFilteredCoins(topCoins);
      } else {
        Alert.alert('Uyarı', 'Coinler yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
      }
    } catch (error) {
      console.error('Error loading coins:', error);
      Alert.alert('Hata', 'Coinler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const searchCoinsQuery = async () => {
    try {
      const searchResults = await searchCoins(searchQuery);
      if (searchResults && searchResults.length > 0) {
        setFilteredCoins(searchResults.slice(0, 20));
      } else {
        setFilteredCoins([]);
      }
    } catch (error) {
      console.error('Error searching coins:', error);
      setFilteredCoins([]);
    }
  };

  const handleCoinSelect = (coin: Coin) => {
    setSelectedCoin(coin);
    setPurchasePrice(coin.price.toString());
  };

  const handleAddToPortfolio = async () => {
    if (!selectedCoin || !amount || !purchasePrice) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(purchasePrice);

    if (isNaN(amountNum) || isNaN(priceNum) || amountNum <= 0 || priceNum <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli değerler girin');
      return;
    }

    try {
      setIsAdding(true);
      const success = await addCoinToPortfolio(selectedCoin, amountNum, priceNum);
      
      if (success) {
        Alert.alert(
          'Başarılı',
          `${selectedCoin.name} portföyünüze eklendi`,
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Hata', 'Coin eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error adding coin:', error);
      Alert.alert('Hata', 'Coin eklenirken bir hata oluştu');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coin Ekle</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <GlassContainer style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={Colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Coin ara..."
                placeholderTextColor={Colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </GlassContainer>

          {/* Coin Selection */}
          {!selectedCoin ? (
            <View style={styles.coinListContainer}>
              <Text style={styles.sectionTitle}>Popüler Coinler</Text>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Coinler yükleniyor...</Text>
                </View>
              ) : (
                filteredCoins.map((coin) => (
                  <TouchableOpacity
                    key={coin.id}
                    onPress={() => handleCoinSelect(coin)}
                  >
                    <CoinCard coin={coin} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <View style={styles.formContainer}>
              {/* Selected Coin */}
              <GlassContainer style={styles.selectedCoinContainer}>
                <Text style={styles.sectionTitle}>Seçilen Coin</Text>
                <CoinCard coin={selectedCoin} />
                <TouchableOpacity
                  style={styles.changeCoinButton}
                  onPress={() => setSelectedCoin(null)}
                >
                  <Text style={styles.changeCoinText}>Farklı Coin Seç</Text>
                </TouchableOpacity>
              </GlassContainer>

              {/* Form */}
              <GlassContainer style={styles.form}>
                <Text style={styles.formTitle}>Yatırım Bilgileri</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Miktar</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 0.5"
                    placeholderTextColor={Colors.text.tertiary}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Alış Fiyatı (USD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 45000"
                    placeholderTextColor={Colors.text.tertiary}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="numeric"
                  />
                </View>

                {/* Summary */}
                {amount && purchasePrice && (
                  <GlassContainer style={styles.summary}>
                    <Text style={styles.summaryTitle}>Yatırım Özeti</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Toplam Yatırım:</Text>
                      <Text style={styles.summaryValue}>
                        ${(parseFloat(amount) * parseFloat(purchasePrice)).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Güncel Değer:</Text>
                      <Text style={styles.summaryValue}>
                        ${(parseFloat(amount) * selectedCoin.price).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Fark:</Text>
                      <Text style={[
                        styles.summaryValue,
                        {
                          color: (parseFloat(amount) * selectedCoin.price) >= (parseFloat(amount) * parseFloat(purchasePrice))
                            ? Colors.success
                            : Colors.error
                        }
                      ]}>
                        {((parseFloat(amount) * selectedCoin.price) - (parseFloat(amount) * parseFloat(purchasePrice))) >= 0 ? '+' : ''}
                        ${((parseFloat(amount) * selectedCoin.price) - (parseFloat(amount) * parseFloat(purchasePrice))).toFixed(2)}
                      </Text>
                    </View>
                  </GlassContainer>
                )}

                <AnimatedButton
                  title={isAdding ? "Ekleniyor..." : "Portföye Ekle"}
                  onPress={handleAddToPortfolio}
                  disabled={isAdding || !amount || !purchasePrice}
                  style={styles.addButton}
                />
              </GlassContainer>
            </View>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Sizes.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Sizes.lg,
  },
  searchContainer: {
    marginBottom: Sizes.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.md,
    marginLeft: Sizes.sm,
  },
  coinListContainer: {
    marginBottom: Sizes.xl,
  },
  sectionTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Sizes.xxl,
  },
  loadingText: {
    color: Colors.text.secondary,
    marginTop: Sizes.md,
  },
  formContainer: {
    marginBottom: Sizes.xl,
  },
  selectedCoinContainer: {
    marginBottom: Sizes.lg,
  },
  changeCoinButton: {
    alignItems: 'center',
    marginTop: Sizes.md,
  },
  changeCoinText: {
    color: Colors.primary,
    fontSize: Sizes.fontSize.sm,
    fontWeight: '500',
  },
  form: {
    marginBottom: Sizes.lg,
  },
  formTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.lg,
  },
  inputContainer: {
    marginBottom: Sizes.lg,
  },
  inputLabel: {
    fontSize: Sizes.fontSize.md,
    color: Colors.text.secondary,
    marginBottom: Sizes.sm,
  },
  input: {
    backgroundColor: Colors.glass.dark,
    borderRadius: Sizes.radius.md,
    paddingHorizontal: Sizes.md,
    paddingVertical: Sizes.md,
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.md,
    borderWidth: 1,
    borderColor: Colors.glass.medium,
  },
  summary: {
    marginTop: Sizes.lg,
    marginBottom: Sizes.lg,
  },
  summaryTitle: {
    fontSize: Sizes.fontSize.md,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.sm,
  },
  summaryLabel: {
    color: Colors.text.secondary,
    fontSize: Sizes.fontSize.sm,
  },
  summaryValue: {
    color: Colors.text.primary,
    fontSize: Sizes.fontSize.sm,
    fontWeight: '600',
  },
  addButton: {
    marginTop: Sizes.lg,
  },
});

export default AddCoinScreen;
