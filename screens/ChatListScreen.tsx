import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getChats, getCurrentUser, onDataChange } from '../services/database';
import { ChatSummary } from '../types';

const formatTime = (chat: ChatSummary) => {
  if (!chat.lastMessageAt) {
    return '';
  }

  return new Date(chat.lastMessageAt).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitial = (name?: string) => (name?.trim().charAt(0) || '?').toUpperCase();

const Avatar = ({ name, photoURL }: { name?: string; photoURL?: string }) => {
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={styles.avatar} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{getInitial(name)}</Text>
    </View>
  );
};

const ChatListScreen = ({ navigation }: any) => {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  const loadChats = async () => {
    if (!currentUser) {
      return;
    }

    setChats(await getChats(currentUser.uid));
    setLoading(false);
  };

  useEffect(() => {
    loadChats();
    return onDataChange(loadChats);
  }, [currentUser?.uid]);

  const renderChatItem = ({ item }: { item: ChatSummary }) => {
    const friendId = item.participants.find((id) => id !== currentUser?.uid) ?? '';
    const friend = item.participantInfo?.[friendId];

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('ChatDetail', {
            chatId: item.id,
            chatName: friend?.displayName ?? '聊天室',
            friendId,
          })
        }
      >
        <Avatar name={friend?.displayName} photoURL={friend?.photoURL} />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name}>{friend?.displayName ?? '未知使用者'}</Text>
            <View style={styles.meta}>
              {!!item.unreadCount && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
              <Text style={styles.timestamp}>{formatTime(item)}</Text>
            </View>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '還沒有訊息'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0A66C2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>還沒有聊天室。到好友頁加入好友後，就可以開始聊天。</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
  },
  chatItem: {
    alignItems: 'center',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    backgroundColor: '#F0F2F5',
    borderRadius: 28,
    height: 56,
    marginRight: 12,
    width: 56,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#E7F0FA',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginRight: 12,
    width: 56,
  },
  avatarText: {
    color: '#0A66C2',
    fontSize: 20,
    fontWeight: '700',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#E4163A',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    color: '#65676B',
    fontSize: 12,
  },
  lastMessage: {
    color: '#65676B',
    fontSize: 13,
  },
  emptyText: {
    color: '#65676B',
    fontSize: 15,
    lineHeight: 22,
    padding: 24,
    textAlign: 'center',
  },
});

export default ChatListScreen;
