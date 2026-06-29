export type LocalUser = {
  uid: string;
  email: string;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  displayNameLower: string;
  photoURL?: string;
  friendIds: string[];
  createdAt?: number;
  updatedAt?: number;
};

export type ChatSummary = {
  id: string;
  participants: string[];
  participantInfo: Record<
    string,
    {
      displayName: string;
      email: string;
      photoURL?: string;
    }
  >;
  lastMessage?: string;
  lastMessageAt?: number;
  updatedAt?: number;
  unreadCount?: number;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: number;
};
