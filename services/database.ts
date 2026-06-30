import { initializeApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  EmailAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as updateFirebasePassword,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ChatMessage, ChatSummary, LocalUser, UserProfile } from '../types';

type Listener<T> = (value: T) => void;

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBGaR2l1yK69C7QWx99uWhsI2Z4eBG7xPo',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'gen-lang-client-0363855150.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'gen-lang-client-0363855150',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1023845718150',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:1023845718150:web:0e92296b87b634b4789907',
};

let initialized = false;
let authUser: LocalUser | null = null;
let unsubscribeAuth = () => {};
const authListeners = new Set<Listener<LocalUser | null>>();

const normalize = (value: string) => value.trim().toLowerCase();
const toLocalUser = (user: User | null): LocalUser | null =>
  user ? { uid: user.uid, email: user.email ?? '' } : null;

const requireConfiguration = () => {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error('尚未設定 Firebase。請複製 .env.example 為 .env，並填入 Firebase Web App 設定。');
  }
};

const services = () => {
  requireConfiguration();
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  let auth;
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      auth = getAuth(app);
    }
  }
  return {
    auth,
    db: getFirestore(app),
  };
};

const cleanProfile = (uid: string, data: Record<string, unknown>): UserProfile => ({
  uid,
  email: String(data.email ?? ''),
  displayName: String(data.displayName ?? ''),
  displayNameLower: String(data.displayNameLower ?? ''),
  photoURL: data.photoURL ? String(data.photoURL) : '',
  friendIds: Array.isArray(data.friendIds) ? data.friendIds.map(String) : [],
  createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
  updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
});

const ensureUserProfile = async (user: User) => {
  const { db } = services();
  const userRef = doc(db, 'users', user.uid);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (snapshot.exists()) return;

    const timestamp = Date.now();
    const fallbackName = user.displayName?.trim() || user.email?.split('@')[0] || '使用者';
    transaction.set(userRef, {
      email: normalize(user.email ?? ''),
      displayName: fallbackName,
      displayNameLower: normalize(fallbackName),
      photoURL: '',
      friendIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
};

const firebaseError = (error: unknown) => {
  const code = (error as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': '這個 Email 已經註冊過了',
    'auth/invalid-credential': 'Email 或密碼不正確',
    'auth/invalid-email': 'Email 格式不正確',
    'auth/weak-password': '密碼至少需要 6 個字元',
    'auth/too-many-requests': '嘗試次數過多，請稍後再試',
    'auth/network-request-failed': '無法連上 Firebase，請檢查網路',
    'permission-denied': 'Firebase 權限不足，請確認安全規則已部署',
    'firestore/permission-denied': 'Firebase 權限不足，請確認安全規則已部署',
  };
  return new Error(messages[code] ?? (error as Error)?.message ?? 'Firebase 操作失敗');
};

export const makeChatId = (uidA: string, uidB: string) => [uidA, uidB].sort().join('_');

export const initDatabase = async () => {
  if (initialized) return;

  const { auth } = services();
  await new Promise<void>((resolve) => {
    let firstEvent = true;
    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await ensureUserProfile(user);
        } catch (error) {
          console.warn('無法補齊 Firestore 使用者資料：', error);
        }
      }
      authUser = toLocalUser(user);
      authListeners.forEach((listener) => listener(authUser));
      if (firstEvent) {
        firstEvent = false;
        initialized = true;
        resolve();
      }
    });
  });
};

export const onAuthChange = (listener: Listener<LocalUser | null>) => {
  authListeners.add(listener);
  listener(authUser);
  return () => authListeners.delete(listener);
};

// Existing screens use this common hook. Firestore snapshots replace the old polling timer.
export const onDataChange = (listener: () => void) => {
  const current = authUser;
  if (!current) return () => {};

  const { db } = services();
  let initialUserSnapshot = true;
  let initialChatSnapshot = true;
  const notifyAfterInitial = (kind: 'user' | 'chat') => {
    if (kind === 'user' && initialUserSnapshot) {
      initialUserSnapshot = false;
      return;
    }
    if (kind === 'chat' && initialChatSnapshot) {
      initialChatSnapshot = false;
      return;
    }
    listener();
  };

  const stopUser = onSnapshot(doc(db, 'users', current.uid), () => notifyAfterInitial('user'));
  const stopChats = onSnapshot(
    query(collection(db, 'chats'), where('participants', 'array-contains', current.uid)),
    () => notifyAfterInitial('chat')
  );

  return () => {
    stopUser();
    stopChats();
  };
};

export const getCurrentUser = () => authUser;

export const getLocalUser = async (uid: string): Promise<LocalUser | null> => {
  const profile = await getUserProfile(uid);
  return profile ? { uid: profile.uid, email: profile.email } : null;
};

export const registerUser = async (email: string, password: string, displayName: string) => {
  try {
    const { auth, db } = services();
    const credential = await createUserWithEmailAndPassword(auth, normalize(email), password);
    await updateFirebaseProfile(credential.user, { displayName: displayName.trim() });
    const timestamp = Date.now();
    await setDoc(doc(db, 'users', credential.user.uid), {
      email: normalize(email),
      displayName: displayName.trim(),
      displayNameLower: normalize(displayName),
      photoURL: '',
      friendIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } catch (error) {
    throw firebaseError(error);
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(services().auth, normalize(email), password);
  } catch (error) {
    throw firebaseError(error);
  }
};

export const resetUserPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(services().auth, normalize(email));
  } catch (error) {
    throw firebaseError(error);
  }
};

export const signOutUser = async () => {
  try {
    await signOut(services().auth);
  } catch (error) {
    throw firebaseError(error);
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const snapshot = await getDoc(doc(services().db, 'users', uid));
    return snapshot.exists() ? cleanProfile(snapshot.id, snapshot.data()) : null;
  } catch (error) {
    throw firebaseError(error);
  }
};

export const updateUserProfile = async (
  uid: string,
  changes: { displayName?: string; photoURL?: string }
) => {
  try {
    const payload: Record<string, any> = { updatedAt: Date.now() };
    if (changes.displayName !== undefined) {
      payload.displayName = changes.displayName.trim();
      payload.displayNameLower = normalize(changes.displayName);
      const current = services().auth.currentUser;
      if (current?.uid === uid) {
        await updateFirebaseProfile(current, { displayName: changes.displayName.trim() });
      }
    }
    if (changes.photoURL !== undefined) payload.photoURL = changes.photoURL;
    await updateDoc(doc(services().db, 'users', uid), payload);
  } catch (error) {
    throw firebaseError(error);
  }
};

export const updatePassword = async (_uid: string, currentPassword: string, newPassword: string) => {
  try {
    const { auth } = services();
    const user = auth.currentUser;
    if (!user?.email) throw new Error('請重新登入後再變更密碼');
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, currentPassword)
    );
    await updateFirebasePassword(user, newPassword);
  } catch (error) {
    throw firebaseError(error);
  }
};

export const searchUser = async (term: string): Promise<UserProfile | null> => {
  try {
    const raw = term.trim();
    const normalized = normalize(raw);
    const { db } = services();
    if (!raw.includes('/')) {
      const direct = await getDoc(doc(db, 'users', raw));
      if (direct.exists()) return cleanProfile(direct.id, direct.data());
    }

    for (const field of ['email', 'displayNameLower'] as const) {
      const snapshot = await getDocs(
        query(collection(db, 'users'), where(field, '==', normalized), limit(1))
      );
      const match = snapshot.docs[0];
      if (match) return cleanProfile(match.id, match.data());
    }
    return null;
  } catch (error) {
    throw firebaseError(error);
  }
};

export const getFriends = async (uid: string): Promise<UserProfile[]> => {
  const profile = await getUserProfile(uid);
  if (!profile?.friendIds.length) return [];

  try {
    const { db } = services();
    const chunks: string[][] = [];
    for (let index = 0; index < profile.friendIds.length; index += 30) {
      chunks.push(profile.friendIds.slice(index, index + 30));
    }
    const snapshots = await Promise.all(
      chunks.map((ids) =>
        getDocs(query(collection(db, 'users'), where(documentId(), 'in', ids)))
      )
    );
    const byId = new Map(
      snapshots.flatMap((snapshot) =>
        snapshot.docs.map((item) => [item.id, cleanProfile(item.id, item.data())] as const)
      )
    );
    return profile.friendIds.map((id) => byId.get(id)).filter(Boolean) as UserProfile[];
  } catch (error) {
    throw firebaseError(error);
  }
};

export const addFriend = async (uid: string, friendUid: string) => {
  if (uid === friendUid) throw new Error('不能加入自己為好友');
  try {
    const { db } = services();
    const userRef = doc(db, 'users', uid);
    const friendRef = doc(db, 'users', friendUid);
    const chatId = makeChatId(uid, friendUid);
    const chatRef = doc(db, 'chats', chatId);

    await runTransaction(db, async (transaction) => {
      const [userSnapshot, friendSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(friendRef),
      ]);
      if (!userSnapshot.exists() || !friendSnapshot.exists()) {
        throw new Error('找不到使用者');
      }

      const timestamp = Date.now();
      transaction.update(userRef, { friendIds: arrayUnion(friendUid), updatedAt: timestamp });
      transaction.update(friendRef, { friendIds: arrayUnion(uid), updatedAt: timestamp });

      const user = cleanProfile(uid, userSnapshot.data());
      const friend = cleanProfile(friendUid, friendSnapshot.data());
      transaction.set(
        chatRef,
        {
          participants: [uid, friendUid].sort(),
          participantInfo: {
            [uid]: {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL || '',
            },
            [friendUid]: {
              displayName: friend.displayName,
              email: friend.email,
              photoURL: friend.photoURL || '',
            },
          },
          updatedAt: timestamp,
        },
        { merge: true }
      );
    });
    return chatId;
  } catch (error) {
    throw firebaseError(error);
  }
};

export const getChats = async (uid: string): Promise<ChatSummary[]> => {
  try {
    const snapshot = await getDocs(
      query(collection(services().db, 'chats'), where('participants', 'array-contains', uid))
    );
    return snapshot.docs
      .map((item) => {
        const data = item.data();
        const readAt = Number(data.readAtByUser?.[uid] ?? 0);
        const lastMessageAt = Number(data.lastMessageAt ?? 0);
        return {
          id: item.id,
          participants: data.participants ?? [],
          participantInfo: data.participantInfo ?? {},
          lastMessage: data.lastMessage,
          lastMessageAt: lastMessageAt || undefined,
          updatedAt: Number(data.updatedAt ?? 0) || undefined,
          unreadCount:
            data.lastSenderId && data.lastSenderId !== uid && lastMessageAt > readAt
              ? Number(data.unreadCountByUser?.[uid] ?? 1)
              : 0,
        } as ChatSummary;
      })
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } catch (error) {
    throw firebaseError(error);
  }
};

export const getMessages = async (chatId: string): Promise<ChatMessage[]> => {
  try {
    const snapshot = await getDocs(
      query(collection(services().db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'))
    );
    return snapshot.docs.map((item) => ({
      id: item.id,
      senderId: String(item.data().senderId ?? ''),
      text: String(item.data().text ?? ''),
      createdAt: Number(item.data().createdAt ?? 0) || undefined,
    }));
  } catch (error) {
    throw firebaseError(error);
  }
};

export const sendMessage = async (chatId: string, senderId: string, text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    const { db } = services();
    const chatRef = doc(db, 'chats', chatId);
    const messageRef = doc(collection(chatRef, 'messages'));
    const timestamp = Date.now();
    const chatSnapshot = await getDoc(chatRef);
    if (!chatSnapshot.exists()) throw new Error('找不到聊天室');

    const participants: string[] = chatSnapshot.data().participants ?? [];
    const unreadUpdates = Object.fromEntries(
      participants
        .filter((uid) => uid !== senderId)
        .map((uid) => [`unreadCountByUser.${uid}`, increment(1)])
    );
    const batch = writeBatch(db);
    batch.set(messageRef, { senderId, text: trimmed, createdAt: timestamp });
    batch.update(chatRef, {
      lastMessage: trimmed,
      lastMessageAt: timestamp,
      lastSenderId: senderId,
      updatedAt: timestamp,
      [`readAtByUser.${senderId}`]: timestamp,
      ...unreadUpdates,
    });
    await batch.commit();
  } catch (error) {
    throw firebaseError(error);
  }
};

export const markChatRead = async (chatId: string, uid: string) => {
  try {
    const { db } = services();
    const chatRef = doc(db, 'chats', chatId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(chatRef);
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const lastMessageAt = Number(data.lastMessageAt ?? 0);
      const readAt = Number(data.readAtByUser?.[uid] ?? 0);
      if (lastMessageAt <= readAt) return;
      transaction.update(chatRef, {
        [`readAtByUser.${uid}`]: lastMessageAt,
        [`unreadCountByUser.${uid}`]: 0,
      });
    });
  } catch (error) {
    throw firebaseError(error);
  }
};

export const disposeDatabase = () => unsubscribeAuth();
