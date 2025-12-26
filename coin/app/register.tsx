  import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuthStore } from '@/store/auth';
import { BaharLogo } from '@/components/common/bahar-logo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View, Dimensions, ScrollView } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const register = useAuthStore((s) => s.register);
  
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const cardBg = useThemeColor({}, 'card');
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalıdır');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      const result = await register(username.trim(), email.trim(), password);
      
      if (result.success) {
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [
          {
            text: 'Tamam',
            onPress: () => router.replace('/(tabs)'),
          },
        ]);
      } else {
        Alert.alert('Kayıt Hatası', result.error || 'Kayıt olunamadı');
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              Hesap Oluştur
            </ThemedText>
            <ThemedText style={[
              styles.subtitle,
              { fontSize: IS_SMALL_SCREEN ? 13 : 14 }
            ]}>
              Coin portföyünüzü yönetmek için hesap oluşturun
            </ThemedText>
            
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons 
                  name="account-outline" 
                  size={20} 
                  color={muted as string} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: text as string, borderColor: border as string }]}
                  placeholder="Kullanıcı Adı (min. 3 karakter)"
                  placeholderTextColor={muted as string}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons 
                  name="email-outline" 
                  size={20} 
                  color={muted as string} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: text as string, borderColor: border as string }]}
                  placeholder="E-posta Adresi"
                  placeholderTextColor={muted as string}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons 
                  name="lock-outline" 
                  size={20} 
                  color={muted as string} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: text as string, borderColor: border as string }]}
                  placeholder="Şifre (min. 6 karakter)"
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

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons 
                  name="lock-check-outline" 
                  size={20} 
                  color={muted as string} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: text as string, borderColor: border as string }]}
                  placeholder="Şifre Tekrar"
                  placeholderTextColor={muted as string}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={muted as string} 
                  />
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.button,
                  { backgroundColor: tint as string },
                  loading && styles.buttonDisabled
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Kayıt Ol</ThemedText>
                )}
              </Pressable>

              <View style={styles.loginContainer}>
                <ThemedText style={styles.loginText}>Zaten hesabınız var mı? </ThemedText>
                <Pressable onPress={() => router.replace('/login')} disabled={loading}>
                  <ThemedText style={[styles.loginLink, { color: tint as string }]}>
                    Giriş Yap
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    opacity: 0.7,
  },
  loginLink: {
    fontSize: IS_SMALL_SCREEN ? 13 : 14,
    fontWeight: '600',
  },
});

