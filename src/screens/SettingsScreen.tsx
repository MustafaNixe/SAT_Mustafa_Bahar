import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GlassContainer } from '../components/GlassContainer';
import { AnimatedButton } from '../components/AnimatedButton';
import { Colors, Sizes } from '../constants';
import { usePortfolio } from '../hooks/usePortfolio';

const SettingsScreen: React.FC = () => {
  const { portfolio } = usePortfolio();

  const handleClearPortfolio = () => {
    Alert.alert(
      'Portföyü Temizle',
      'Tüm portföy verileriniz silinecek. Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('portfolio_data');
              Alert.alert('Başarılı', 'Portföy temizlendi');
              // Portfolio hook'u otomatik olarak güncellenecek
            } catch (error) {
              Alert.alert('Hata', 'Portföy temizlenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleExportPortfolio = () => {
    Alert.alert(
      'Portföy Dışa Aktar',
      'Portföy verileriniz JSON formatında dışa aktarılacak.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Dışa Aktar',
          onPress: () => {
            const exportData = {
              timestamp: new Date().toISOString(),
              portfolio: portfolio,
            };
            
            // Bu gerçek uygulamada dosya sistemi ile yapılabilir
            console.log('Portfolio Export Data:', JSON.stringify(exportData, null, 2));
            Alert.alert('Başarılı', 'Portföy verileri konsola yazdırıldı');
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      icon: 'notifications-outline',
      title: 'Bildirimler',
      subtitle: 'Fiyat uyarıları ve güncellemeler',
      type: 'switch' as const,
      value: true,
      onToggle: () => {},
    },
    {
      icon: 'language-outline',
      title: 'Dil',
      subtitle: 'Türkçe',
      type: 'navigate' as const,
      onPress: () => {},
    },
    {
      icon: 'color-palette-outline',
      title: 'Tema',
      subtitle: 'Koyu Tema',
      type: 'navigate' as const,
      onPress: () => {},
    },
    {
      icon: 'cash-outline',
      title: 'Para Birimi',
      subtitle: 'USD',
      type: 'navigate' as const,
      onPress: () => {},
    },
  ];

  const dataItems = [
    {
      icon: 'download-outline',
      title: 'Portföyü Dışa Aktar',
      subtitle: 'Verilerinizi yedekleyin',
      onPress: handleExportPortfolio,
    },
    {
      icon: 'trash-outline',
      title: 'Portföyü Temizle',
      subtitle: 'Tüm verileri sil',
      onPress: handleClearPortfolio,
    },
  ];

  const aboutItems = [
    {
      icon: 'information-circle-outline',
      title: 'Hakkında',
      subtitle: 'Versiyon 1.0.0',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline',
      title: 'Yardım',
      subtitle: 'SSS ve destek',
      onPress: () => {},
    },
    {
      icon: 'star-outline',
      title: 'Uygulamayı Değerlendir',
      subtitle: 'App Store\'da değerlendirin',
      onPress: () => {},
    },
  ];

  const renderSettingsItem = (item: any, index: number) => (
    <TouchableOpacity key={index} onPress={item.onPress}>
      <GlassContainer style={styles.settingsItem}>
        <View style={styles.settingsItemLeft}>
          <View style={styles.settingsIcon}>
            <Ionicons name={item.icon as any} size={20} color={Colors.text.primary} />
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>{item.title}</Text>
            <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        
        {item.type === 'switch' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: Colors.glass.dark, true: Colors.primary }}
            thumbColor={Colors.text.primary}
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        )}
      </GlassContainer>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ayarlar</Text>
        </View>

        <View style={styles.content}>
          {/* Profile Section */}
          <GlassContainer style={styles.profileContainer}>
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={Colors.text.primary} />
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>Kullanıcı</Text>
                <Text style={styles.profileEmail}>kullanici@example.com</Text>
              </View>
            </View>
          </GlassContainer>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genel</Text>
            {settingsItems.map(renderSettingsItem)}
          </View>

          {/* Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
            {dataItems.map(renderSettingsItem)}
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            {aboutItems.map(renderSettingsItem)}
          </View>

          {/* Portfolio Stats */}
          <GlassContainer style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Portföy İstatistikleri</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{portfolio.items?.length || 0}</Text>
                <Text style={styles.statLabel}>Toplam Coin</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  ${(portfolio.totalValue || 0).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Toplam Değer</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[
                  styles.statValue,
                  { color: (portfolio.totalProfitLoss || 0) >= 0 ? Colors.success : Colors.error }
                ]}>
                  {(portfolio.totalProfitLoss || 0) >= 0 ? '+' : ''}{(portfolio.totalProfitLossPercentage || 0).toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>Getiri</Text>
              </View>
            </View>
          </GlassContainer>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Sizes.lg,
  },
  profileContainer: {
    marginBottom: Sizes.lg,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.glass.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sizes.md,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  profileEmail: {
    fontSize: Sizes.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Sizes.xs,
  },
  section: {
    marginBottom: Sizes.lg,
  },
  sectionTitle: {
    fontSize: Sizes.fontSize.md,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Sizes.sm,
    marginLeft: Sizes.sm,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Sizes.sm,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sizes.md,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: Sizes.fontSize.md,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  settingsSubtitle: {
    fontSize: Sizes.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Sizes.xs,
  },
  statsContainer: {
    marginBottom: Sizes.xl,
  },
  statsTitle: {
    fontSize: Sizes.fontSize.lg,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Sizes.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Sizes.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: Sizes.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Sizes.xs,
  },
});

export default SettingsScreen;
