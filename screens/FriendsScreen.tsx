import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import {
  addFriend as addFriendRecord,
  getCurrentUser,
  getFriends,
  getUserProfile,
  makeChatId,
  onDataChange,
  searchUser,
} from '../services/database';
import { UserProfile } from '../types';

const normalize = (value: string) => value.trim().toLowerCase();
const getInitial = (name?: string) => (name?.trim().charAt(0) || '?').toUpperCase();

const Avatar = ({ user, size = 48 }: { user?: UserProfile; size?: number }) => {
  if (user?.photoURL) {
    return <Image source={{ uri: user.photoURL }} style={[styles.avatar, { height: size, width: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.avatarFallback, { height: size, width: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{getInitial(user?.displayName)}</Text>
    </View>
  );
};

const FriendsScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const currentUser = getCurrentUser();

  const loadData = async () => {
    if (!currentUser) {
      return;
    }

    const nextProfile = await getUserProfile(currentUser.uid);
    setProfile(nextProfile);
    setFriends(await getFriends(currentUser.uid));
  };

  useEffect(() => {
    loadData();
    return onDataChange(loadData);
  }, [currentUser?.uid]);

  const findUser = async () => {
    const term = normalize(searchText);
    if (!term || !currentUser || !profile) {
      return null;
    }

    if (term === currentUser.uid || term === profile.email || term === profile.displayNameLower) {
      Alert.alert('不能加入自己', '請搜尋其他使用者');
      return null;
    }

    return searchUser(term);
  };

  const addFriend = async () => {
    if (!currentUser || !profile) {
      return;
    }

    setSearching(true);
    try {
      const friend = await findUser();
      if (!friend) {
        Alert.alert('找不到使用者', '請用 UID、Email 或顯示名稱搜尋。你也可以試 demo1@example.com、demo2@example.com 或 demo3@example.com。');
        return;
      }

      if (profile.friendIds.includes(friend.uid)) {
        Alert.alert('已經是好友', `${friend.displayName} 已在好友清單中`);
        return;
      }

      await addFriendRecord(currentUser.uid, friend.uid);
      setSearchText('');
      Alert.alert('好友已加入', `${friend.displayName} 已加入好友清單`);
      await loadData();
    } catch (error: any) {
      Alert.alert('加入失敗', error.message ?? '請稍後再試');
    } finally {
      setSearching(false);
    }
  };

  const openChat = (friend: UserProfile) => {
    if (!currentUser) {
      return;
    }

    navigation.navigate('ChatListTab', {
      screen: 'ChatDetail',
      params: {
        chatId: makeChatId(currentUser.uid, friend.uid),
        chatName: friend.displayName,
        friendId: friend.uid,
      },
    });
  };

  const renderFriend = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => openChat(item)}>
      <Avatar user={item} />
      <View style={styles.friendText}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendEmail}>{item.email}</Text>
      </View>
      <FontAwesome name="comment" color="#0A66C2" size={18} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchPanel}>
        <TextInput
          autoCapitalize="none"
          placeholder="搜尋 UID、Email 或顯示名稱"
          placeholderTextColor="#8A8D91"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
        <TouchableOpacity style={styles.addButton} onPress={addFriend} disabled={searching}>
          {searching ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <FontAwesome name="user-plus" color="#FFFFFF" size={18} />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.helperText}>
        測試用帳號：demo1@example.com / demo2@example.com / demo3@example.com，密碼 123456
      </Text>

      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={<Text style={styles.emptyText}>還沒有好友。搜尋 demo1@example.com、demo2@example.com 或 demo3@example.com 可以立即測試。</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  searchPanel: {
    alignItems: 'center',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  searchInput: {
    borderColor: '#DDE2E8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#0A66C2',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  helperText: {
    color: '#65676B',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendItem: {
    alignItems: 'center',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    backgroundColor: '#F0F2F5',
    marginRight: 12,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#E7F0FA',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#0A66C2',
    fontSize: 18,
    fontWeight: '700',
  },
  friendText: {
    flex: 1,
  },
  friendName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  friendEmail: {
    color: '#65676B',
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    color: '#65676B',
    fontSize: 15,
    lineHeight: 22,
    padding: 24,
    textAlign: 'center',
  },
});

export default FriendsScreen;
