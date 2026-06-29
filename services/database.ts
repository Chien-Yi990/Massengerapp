import { ChatMessage, ChatSummary, LocalUser, UserProfile } from '../types';

type Listener<T> = (value: T) => void;
type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const SESSION_KEY = 'mychatapp.session';

let initialized = false;
let authUser: LocalUser | null = null;
let poller: ReturnType<typeof setInterval> | null = null;

const authListeners = new Set<Listener<LocalUser | null>>();
const dataListeners = new Set<() => void>();

const normalize = (value: string) => value.trim().toLowerCase();

const getLocalStorage = () => {
  const candidate = globalThis as typeof globalThis & {
    localStorage?: BrowserStorage;
  };

  return candidate.localStorage ?? null;
};

const saveSession = (user: LocalUser | null) => {
  if (user) {
    getLocalStorage()?.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    getLocalStorage()?.removeItem(SESSION_KEY);
  }
};

const loadSession = () => {
  const raw = getLocalStorage()?.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LocalUser;
  } catch {
    return null;
  }
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data as T;
};

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

const notifyAuth = () => {
  authListeners.forEach((listener) => listener(authUser));
};

const notifyData = () => {
  dataListeners.forEach((listener) => listener());
};

const ensurePoller = () => {
  if (poller || dataListeners.size === 0) {
    return;
  }

  poller = setInterval(() => {
    notifyData();
  }, 1500);
};

const stopPollerIfIdle = () => {
  if (dataListeners.size > 0 || !poller) {
    return;
  }

  clearInterval(poller);
  poller = null;
};

export const makeChatId = (uidA: string, uidB: string) => [uidA, uidB].sort().join('_');

export const initDatabase = async () => {
  if (initialized) {
    return;
  }

  await request<{ ok: boolean }>('/health');
  authUser = loadSession();
  initialized = true;
};

export const onAuthChange = (listener: Listener<LocalUser | null>) => {
  authListeners.add(listener);
  listener(authUser);
  return () => {
    authListeners.delete(listener);
  };
};

export const onDataChange = (listener: () => void) => {
  dataListeners.add(listener);
  ensurePoller();
  return () => {
    dataListeners.delete(listener);
    stopPollerIfIdle();
  };
};

export const getCurrentUser = () => authUser;

export const getLocalUser = async (uid: string): Promise<LocalUser | null> => {
  const profile = await getUserProfile(uid);
  return profile ? { uid: profile.uid, email: profile.email } : null;
};

export const registerUser = async (email: string, password: string, displayName: string) => {
  const data = await post<{ user: LocalUser }>('/auth/register', {
    email: normalize(email),
    password,
    displayName,
  });
  authUser = data.user;
  saveSession(authUser);
  notifyAuth();
};

export const signInUser = async (email: string, password: string) => {
  const data = await post<{ user: LocalUser }>('/auth/login', {
    email: normalize(email),
    password,
  });
  authUser = data.user;
  saveSession(authUser);
  notifyAuth();
};

export const signOutUser = async () => {
  authUser = null;
  saveSession(null);
  notifyAuth();
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const data = await request<{ profile: UserProfile }>(`/users/${encodeURIComponent(uid)}`);
    return data.profile;
  } catch {
    return null;
  }
};

export const updateUserProfile = async (
  uid: string,
  changes: { displayName?: string; photoURL?: string }
) => {
  await post<{ profile: UserProfile }>('/users/update', { uid, ...changes });
  notifyData();
};

export const updatePassword = async (uid: string, currentPassword: string, newPassword: string) => {
  await post<{ ok: boolean }>('/users/password', { uid, currentPassword, newPassword });
};

export const searchUser = async (term: string): Promise<UserProfile | null> => {
  const data = await request<{ profile: UserProfile | null }>(
    `/users/search?term=${encodeURIComponent(normalize(term))}`
  );
  return data.profile;
};

export const getFriends = async (uid: string): Promise<UserProfile[]> => {
  const data = await request<{ friends: UserProfile[] }>(
    `/friends?uid=${encodeURIComponent(uid)}`
  );
  return data.friends;
};

export const addFriend = async (uid: string, friendUid: string) => {
  const data = await post<{ chatId: string }>('/friends/add', { uid, friendUid });
  notifyData();
  return data.chatId;
};

export const getChats = async (uid: string): Promise<ChatSummary[]> => {
  const data = await request<{ chats: ChatSummary[] }>(`/chats?uid=${encodeURIComponent(uid)}`);
  return data.chats;
};

export const getMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const data = await request<{ messages: ChatMessage[] }>(
    `/messages?chatId=${encodeURIComponent(chatId)}`
  );
  return data.messages;
};

export const sendMessage = async (chatId: string, senderId: string, text: string) => {
  await post<{ message: ChatMessage }>('/messages/send', { chatId, senderId, text });
  notifyData();
};

export const markChatRead = async (chatId: string, uid: string) => {
  await post<{ ok: boolean }>('/chats/read', { chatId, uid });
};
