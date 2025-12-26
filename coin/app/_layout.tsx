import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth';
import { usePortfolioStore } from '@/store/portfolio';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const IS_SMALL_SCREEN = screenWidth < 375;
  const IS_MEDIUM_SCREEN = screenWidth >= 375 && screenWidth < 414;

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0];
    const isAuthRoute = currentRoute === 'login' || currentRoute === 'register';
    const inAuthGroup = currentRoute === '(auth)';
    const inTabsGroup = currentRoute === '(tabs)';

    if (!isAuthenticated && !isAuthRoute && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && (isAuthRoute || inAuthGroup)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Initialize portfolio for current user
  const setUserId = usePortfolioStore((s) => s.setUserId);
  
  useEffect(() => {
    if (!isLoading) {
      const userId = user?.id || null;
      setUserId(userId);
    }
  }, [user?.id, isLoading, setUserId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              animation: 'simple_push',
              animationDuration: 200,
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? DarkTheme.colors.card : DefaultTheme.colors.card,
                height: Platform.OS === 'ios' 
                  ? (IS_SMALL_SCREEN ? 44 : IS_MEDIUM_SCREEN ? 50 : 56)
                  : (IS_SMALL_SCREEN ? 56 : IS_MEDIUM_SCREEN ? 60 : 64),
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
              },
              contentStyle: {
                paddingTop: 0,
              },
              headerTitleStyle: {
                fontSize: IS_SMALL_SCREEN ? 16 : IS_MEDIUM_SCREEN ? 18 : 20,
              },
              headerTintColor: colorScheme === 'dark' ? DarkTheme.colors.text : DefaultTheme.colors.text,
              headerBackTitleVisible: false,
              headerTransparent: false,
            }}
          >
            <Stack.Screen name="login" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="register" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="coin/[symbol]" options={{ headerShown: true, title: 'Coin Detay' }} />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
