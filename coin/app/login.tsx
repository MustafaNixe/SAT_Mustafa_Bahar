import { BaharLogo } from '@/components/common/bahar-logo';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/store/auth';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    (async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('remembered-username');
        if (savedUsername) {
          setUsername(savedUsername);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Error loading remembered username:', error);
      }
    })();
  }, []);
  
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'card');
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Hata', 'Lütfen kullanıcı adı ve şifrenizi giriniz');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        if (rememberMe) {
          await AsyncStorage.setItem('remembered-username', username.trim());
        } else {
          await AsyncStorage.removeItem('remembered-username');
        }
        router.replace('/(tabs)');
      } else {
        Alert.alert('Giriş Hatası', result.error || 'Giriş yapılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container} safe edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <BaharLogo size={IS_SMALL_SCREEN ? 140 : IS_MEDIUM_SCREEN ? 160 : 180} color="#16a34a" />
          </View>

          <ThemedText 
            type="title" 
            style={[
              styles.title,
              { fontSize: IS_SMALL_SCREEN ? 24 : IS_MEDIUM_SCREEN ? 28 : 32 }
            ]}
          >
            Hoş Geldiniz
          </ThemedText>
          <ThemedText style={[
            styles.subtitle,
            { fontSize: IS_SMALL_SCREEN ? 13 : 14 }
          ]}>
            Coin portföyünüze giriş yapın
          </ThemedText>

          {/* Form */}
          <View style={styles.form}>
            {/* Username Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons 
                name="account-outline" 
                size={20} 
                color={muted as string} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: text as string, borderColor: border as string }]}
                placeholder="Kullanıcı Adı"
                placeholderTextColor={muted as string}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons 
                name="lock-outline" 
                size={20} 
                color={muted as string} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: text as string, borderColor: border as string }]}
                placeholder="Şifre"
                placeholderTextColor={muted as string}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialCommunityIcons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={muted as string} 
                />
              </Pressable>
            </View>

            {/* Remember Me */}
            <View style={styles.rememberMeContainer}>
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.rememberMePressable}
                disabled={loading}
              >
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: muted as string, true: tint as string }}
                  thumbColor="#ffffff"
                  disabled={loading}
                />
                <ThemedText style={styles.rememberMeText}>Beni Hatırla</ThemedText>
              </Pressable>
            </View>

            {/* Login Button */}
            <Pressable
              style={[
                styles.button,
                { backgroundColor: tint as string },
                loading && styles.buttonDisabled
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.buttonText}>Giriş Yap</ThemedText>
              )}
            </Pressable>

            <View style={styles.registerContainer}>
              <ThemedText style={styles.registerText}>Hesabınız yok mu? </ThemedText>
              <Pressable onPress={() => router.replace('/register')} disabled={loading}>
                <ThemedText style={[styles.registerLink, { color: tint as string }]}>
                  Kayıt Ol
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: IS_SMALL_SCREEN ? 20 : 24,
    paddingVertical: IS_SMALL_SCREEN ? 24 : 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: IS_SMALL_SCREEN ? 24 : 32,
    paddingVertical: IS_SMALL_SCREEN ? 16 : 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: IS_SMALL_SCREEN ? 6 : 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: IS_SMALL_SCREEN ? 32 : 48,
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: IS_SMALL_SCREEN ? 12 : 16,
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: IS_SMALL_SCREEN ? 12 : 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: IS_SMALL_SCREEN ? 48 : 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: IS_SMALL_SCREEN ? 44 : 48,
    fontSize: IS_SMALL_SCREEN ? 14 : 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: IS_SMALL_SCREEN ? 12 : 16,
    zIndex: 1,
    padding: 4,
  },
  rememberMeContainer: {
    marginBottom: IS_SMALL_SCREEN ? 12 : 16,
  },
  rememberMePressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    marginLeft: IS_SMALL_SCREEN ? 8 : 10,
  },
  button: {
    height: IS_SMALL_SCREEN ? 48 : 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: IS_SMALL_SCREEN ? 6 : 8,
    marginBottom: IS_SMALL_SCREEN ? 20 : 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: IS_SMALL_SCREEN ? 14 : 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    opacity: 0.7,
  },
  registerLink: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    fontWeight: '600',
  },
  demoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: IS_SMALL_SCREEN ? 10 : 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: IS_SMALL_SCREEN ? 20 : 24,
  },
  demoText: {
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    flex: 1,
  },
});

