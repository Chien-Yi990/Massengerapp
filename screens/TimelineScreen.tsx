import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type Post = {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  accent: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase();

const TimelineScreen = () => {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      author: 'MyChatApp',
      timestamp: '剛剛',
      content: 'Firebase 雲端版已啟用。帳號、好友、聊天室和訊息會跨裝置即時同步。',
      accent: '#0A66C2',
      likes: 45,
      comments: 12,
      shares: 3,
      liked: false,
    },
    {
      id: '2',
      author: 'Local Demo',
      timestamp: '今天',
      content: '教師機與學生端只要能連上 Internet，不必使用相同 Wi-Fi，也不必設定 IP。',
      accent: '#1F8A70',
      likes: 128,
      comments: 34,
      shares: 8,
      liked: false,
    },
  ]);

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <View style={[styles.authorAvatar, { backgroundColor: item.accent }]}>
          <Text style={styles.authorInitial}>{getInitial(item.author)}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <FontAwesome name="ellipsis-h" color="#65676B" size={16} />
      </View>

      <Text style={styles.postContent}>{item.content}</Text>

      <View style={[styles.demoPanel, { borderLeftColor: item.accent }]}>
        <Text style={styles.demoPanelTitle}>{item.author}</Text>
        <Text style={styles.demoPanelText}>Firebase cloud demo</Text>
      </View>

      <View style={styles.postStats}>
        <Text style={styles.statText}>{item.likes} 個讚</Text>
        <Text style={styles.statText}>
          {item.comments} 則留言 · {item.shares} 次分享
        </Text>
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
          <FontAwesome
            name={item.liked ? 'thumbs-up' : 'thumbs-o-up'}
            color={item.liked ? '#0A66C2' : '#65676B'}
            size={16}
          />
          <Text style={[styles.actionText, item.liked && styles.actionTextActive]}>讚</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <FontAwesome name="comment-o" color="#65676B" size={16} />
          <Text style={styles.actionText}>留言</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <FontAwesome name="share" color="#65676B" size={16} />
          <Text style={styles.actionText}>分享</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F2F5',
    flex: 1,
  },
  post: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  authorAvatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  authorInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  timestamp: {
    color: '#65676B',
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    color: '#000',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  demoPanel: {
    backgroundColor: '#F7F9FC',
    borderLeftWidth: 4,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 16,
  },
  demoPanelTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  demoPanelText: {
    color: '#65676B',
    fontSize: 13,
    marginTop: 4,
  },
  postStats: {
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: 1,
    borderTopColor: '#E5E5EA',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    color: '#65676B',
    fontSize: 12,
  },
  postActions: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionText: {
    color: '#65676B',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  actionTextActive: {
    color: '#0A66C2',
  },
  separator: {
    backgroundColor: '#F0F2F5',
    height: 8,
  },
});

export default TimelineScreen;
