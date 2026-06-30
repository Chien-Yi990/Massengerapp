import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getCurrentUser,
  getUserProfile,
  onDataChange,
  signOutUser,
  updatePassword,
  updateUserProfile,
} from '../services/database';
import { UserProfile } from '../types';

const getInitial = (name?: string) => (name?.trim().charAt(0) || '?').toUpperCase();

const ProfileScreen = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const currentUser = getCurrentUser();

  const loadProfile = async () => {
    if (!currentUser) {
      return;
    }

    const nextProfile = await getUserProfile(currentUser.uid);
    setProfile(nextProfile);
    setDisplayName(nextProfile?.displayName ?? '');
  };

  useEffect(() => {
    loadProfile();
    return onDataChange(loadProfile);
  }, [currentUser?.uid]);

  const saveName = async () => {
    if (!currentUser || !displayName.trim()) {
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, { displayName });
      Alert.alert('已更新', '名稱已儲存');
      await loadProfile();
    } catch (error: any) {
      Alert.alert('更新失敗', error.message ?? '請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentUser || !currentPassword || !newPassword) {
      Alert.alert('資料不足', '請輸入目前密碼和新密碼');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(currentUser.uid, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('已更新', '密碼已變更');
    } catch (error: any) {
      Alert.alert('密碼更新失敗', error.message ?? '請確認目前密碼');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0A66C2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.profileImageFallback}>
            <Text style={styles.profileInitial}>{getInitial(profile.displayName)}</Text>
          </View>
        </View>

        <Text style={styles.userName}>{profile.displayName}</Text>
        <Text style={styles.userStatus}>{profile.email}</Text>
        <Text style={styles.uidText}>UID: {profile.uid}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>個人資料</Text>
        <TextInput
          style={styles.input}
          placeholder="顯示名稱"
          placeholderTextColor="#8A8D91"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={saveName} disabled={saving}>
          <Text style={styles.primaryButtonText}>儲存名稱</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>變更密碼</Text>
        <TextInput
          style={styles.input}
          placeholder="目前密碼"
          placeholderTextColor="#8A8D91"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="新密碼"
          placeholderTextColor="#8A8D91"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={changePassword} disabled={saving}>
          <Text style={styles.primaryButtonText}>更新密碼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={signOutUser}>
          <Text style={styles.logoutButtonText}>登出</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  center: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  profileImageFallback: {
    alignItems: 'center',
    backgroundColor: '#E7F0FA',
    borderColor: '#0A66C2',
    borderRadius: 60,
    borderWidth: 3,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  profileInitial: {
    color: '#0A66C2',
    fontSize: 42,
    fontWeight: '700',
  },
  userName: {
    color: '#000',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userStatus: {
    color: '#65676B',
    fontSize: 14,
  },
  uidText: {
    color: '#8A8D91',
    fontSize: 12,
    marginTop: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
    borderTopColor: '#E5E5EA',
    borderTopWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#65676B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderColor: '#DDE2E8',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0A66C2',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#E4163A',
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ProfileScreen;
