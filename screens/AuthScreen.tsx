import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { registerUser, signInUser } from '../services/database';

const AuthScreen = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('資料不足', '請輸入 Email 和密碼');
      return;
    }

    if (mode === 'register' && !displayName.trim()) {
      Alert.alert('資料不足', '請輸入顯示名稱');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerUser(email, password, displayName);
      } else {
        await signInUser(email, password);
      }
    } catch (error: any) {
      Alert.alert('登入失敗', error.message ?? '請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.panel}>
        <View style={styles.brandMark}>
          <FontAwesome name="comments" color="#FFFFFF" size={34} />
        </View>
        <Text style={styles.title}>MyChatApp</Text>
        <Text style={styles.subtitle}>使用網路 API 儲存資料的聊天 App</Text>

        {mode === 'register' && (
          <TextInput
            autoCapitalize="words"
            placeholder="顯示名稱"
            placeholderTextColor="#8A8D91"
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
        )}
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#8A8D91"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="密碼"
          placeholderTextColor="#8A8D91"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{mode === 'login' ? '登入' : '註冊'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          <Text style={styles.switchText}>
            {mode === 'login' ? '還沒有帳號？建立新帳號' : '已有帳號？回到登入'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
    padding: 20,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    borderColor: '#DDE2E8',
    borderWidth: 1,
  },
  brandMark: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#0A66C2',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
    width: 64,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#5F6672',
    fontSize: 14,
    marginBottom: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  input: {
    borderColor: '#DDE2E8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0A66C2',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    paddingTop: 18,
  },
  switchText: {
    color: '#0A66C2',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuthScreen;
