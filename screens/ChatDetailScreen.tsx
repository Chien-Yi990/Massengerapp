import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import {
  getCurrentUser,
  getMessages,
  getUserProfile,
  markChatRead,
  onDataChange,
  sendMessage,
} from '../services/database';
import { ChatMessage, UserProfile } from '../types';

const formatMessageTime = (message: ChatMessage) => {
  if (!message.createdAt) {
    return '剛剛';
  }

  return new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitial = (name?: string) => (name?.trim().charAt(0) || '?').toUpperCase();

const MessageAvatar = ({ profile }: { profile?: UserProfile }) => (
  <View style={styles.messageAvatar}>
    <Text style={styles.messageAvatarText}>{getInitial(profile?.displayName)}</Text>
  </View>
);

const ChatDetailScreen = ({ route }: any) => {
  const { chatId } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const currentUser = getCurrentUser();

  const loadMessages = async () => {
    const nextMessages = await getMessages(chatId);
    setMessages(nextMessages);

    const senderIds = Array.from(new Set(nextMessages.map((message) => message.senderId)));
    const profileEntries = await Promise.all(
      senderIds.map(async (senderId) => [senderId, await getUserProfile(senderId)] as const)
    );
    setProfiles(
      Object.fromEntries(
        profileEntries
          .filter((entry): entry is readonly [string, UserProfile] => Boolean(entry[1]))
          .map(([senderId, profile]) => [senderId, profile])
      )
    );

    if (currentUser) {
      await markChatRead(chatId, currentUser.uid);
    }

    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  useEffect(() => {
    loadMessages();
    return onDataChange(loadMessages);
  }, [chatId]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !currentUser) {
      return;
    }

    setInputText('');
    await sendMessage(chatId, currentUser.uid, text);
    await loadMessages();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.senderId === currentUser?.uid;
    const senderProfile = profiles[item.senderId];

    return (
      <View style={[styles.messageRow, isMine ? styles.userMessage : styles.otherMessage]}>
        {!isMine && <MessageAvatar profile={senderProfile} />}
        <View style={styles.messageContent}>
          {!isMine && senderProfile && <Text style={styles.senderName}>{senderProfile.displayName}</Text>}
          <View style={[styles.messageBubble, isMine ? styles.userBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isMine ? styles.userMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>
          </View>
          <Text style={[styles.messageTime, isMine && styles.userMessageTime]}>
            {formatMessageTime(item)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.chatDetailContainer}
    >
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="輸入訊息..."
          value={inputText}
          onChangeText={setInputText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <FontAwesome name="paper-plane" color="#0A66C2" size={18} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  chatDetailContainer: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  messageRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginVertical: 4,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#E7F0FA',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  messageAvatarText: {
    color: '#0A66C2',
    fontSize: 13,
    fontWeight: '700',
  },
  messageContent: {
    maxWidth: '78%',
  },
  senderName: {
    color: '#65676B',
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userBubble: {
    backgroundColor: '#0A66C2',
  },
  otherBubble: {
    backgroundColor: '#E4E6EB',
  },
  messageText: {
    fontSize: 15,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    color: '#65676B',
    fontSize: 12,
    marginHorizontal: 4,
    marginTop: 2,
  },
  userMessageTime: {
    textAlign: 'right',
  },
  inputContainer: {
    alignItems: 'center',
    borderTopColor: '#E5E5EA',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    borderColor: '#E5E5EA',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});

export default ChatDetailScreen;
