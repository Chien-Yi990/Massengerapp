const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const now = () => Date.now();
const normalize = (value) => String(value || '').trim().toLowerCase();
const randomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const makeChatId = (uidA, uidB) => [uidA, uidB].sort().join('_');

const defaultStore = () => ({
  users: [],
  chats: [],
  messages: {},
});

let store = defaultStore();

const ensureDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const loadStore = () => {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) {
    store = defaultStore();
    saveStore();
    return;
  }

  try {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    store = defaultStore();
    saveStore();
  }
};

const saveStore = () => {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
};

const publicUser = (user) => {
  if (!user) {
    return null;
  }

  const { password, ...profile } = user;
  return profile;
};

const ensureDemoUsers = () => {
  const demoUsers = [
    { uid: 'demo_one', email: 'demo1@example.com', displayName: 'Demo One' },
    { uid: 'demo_two', email: 'demo2@example.com', displayName: 'Demo Two' },
    { uid: 'demo_three', email: 'demo3@example.com', displayName: 'Demo Three' },
  ];
  let changed = false;

  demoUsers.forEach((demo) => {
    if (store.users.some((user) => user.uid === demo.uid || user.email === demo.email)) {
      return;
    }

    const timestamp = now();
    store.users.push({
      uid: demo.uid,
      email: demo.email,
      password: '123456',
      displayName: demo.displayName,
      displayNameLower: normalize(demo.displayName),
      photoURL: '',
      friendIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    changed = true;
  });

  const pairs = [
    ['demo_one', 'demo_two'],
    ['demo_one', 'demo_three'],
    ['demo_two', 'demo_three'],
  ];

  pairs.forEach(([uid, friendUid]) => {
    const user = store.users.find((item) => item.uid === uid);
    const friend = store.users.find((item) => item.uid === friendUid);
    if (!user || !friend) {
      return;
    }

    if (!user.friendIds.includes(friendUid)) {
      user.friendIds.push(friendUid);
      changed = true;
    }
    if (!friend.friendIds.includes(uid)) {
      friend.friendIds.push(uid);
      changed = true;
    }

    const chatId = makeChatId(uid, friendUid);
    if (!store.chats.some((chat) => chat.id === chatId)) {
      store.chats.push({
        id: chatId,
        participants: [uid, friendUid].sort(),
        readAtByUser: {},
        updatedAt: now(),
      });
      store.messages[chatId] = [];
      changed = true;
    }
  });

  if (changed) {
    saveStore();
  }
};

const getProfile = (uid) => publicUser(store.users.find((user) => user.uid === uid));

const chatSummary = (chat, uid) => {
  const participantInfo = {};
  chat.participants.forEach((participantId) => {
    const profile = getProfile(participantId);
    participantInfo[participantId] = {
      displayName: profile?.displayName || 'Unknown',
      email: profile?.email || '',
      photoURL: profile?.photoURL || '',
    };
  });

  const readAt = chat.readAtByUser?.[uid] || 0;
  const unreadCount = (store.messages[chat.id] || []).filter(
    (message) => message.senderId !== uid && (message.createdAt || 0) > readAt
  ).length;

  return {
    id: chat.id,
    participants: chat.participants,
    participantInfo,
    lastMessage: chat.lastMessage,
    lastMessageAt: chat.lastMessageAt,
    updatedAt: chat.updatedAt,
    unreadCount,
  };
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
  });

const send = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(data));
};

const fail = (res, statusCode, message) => {
  send(res, statusCode, { error: message });
};

const requireUser = (uid) => {
  const user = store.users.find((item) => item.uid === uid);
  if (!user) {
    throw new Error('找不到使用者');
  }
  return user;
};

const addFriendship = (uid, friendUid) => {
  const user = requireUser(uid);
  const friend = requireUser(friendUid);
  if (uid === friendUid) {
    throw new Error('不能加入自己為好友');
  }

  if (!user.friendIds.includes(friendUid)) {
    user.friendIds.unshift(friendUid);
  }
  if (!friend.friendIds.includes(uid)) {
    friend.friendIds.unshift(uid);
  }

  const chatId = makeChatId(uid, friendUid);
  if (!store.chats.some((chat) => chat.id === chatId)) {
    store.chats.push({
      id: chatId,
      participants: [uid, friendUid].sort(),
      readAtByUser: {},
      updatedAt: now(),
    });
    store.messages[chatId] = [];
  }

  saveStore();
  return chatId;
};

loadStore();
ensureDemoUsers();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    send(res, 200, {});
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/auth/register') {
      const body = await readBody(req);
      const email = normalize(body.email);
      const password = String(body.password || '');
      const displayName = String(body.displayName || '').trim();

      if (!email || !password || !displayName) {
        fail(res, 400, '請輸入 Email、密碼和顯示名稱');
        return;
      }
      if (store.users.some((user) => user.email === email)) {
        fail(res, 409, '這個 Email 已經註冊過了');
        return;
      }

      const timestamp = now();
      const user = {
        uid: randomId(),
        email,
        password,
        displayName,
        displayNameLower: normalize(displayName),
        photoURL: '',
        friendIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.users.push(user);
      saveStore();
      send(res, 200, { user: { uid: user.uid, email: user.email } });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/auth/login') {
      const body = await readBody(req);
      const user = store.users.find(
        (item) => item.email === normalize(body.email) && item.password === String(body.password || '')
      );

      if (!user) {
        fail(res, 401, 'Email 或密碼不正確');
        return;
      }

      send(res, 200, { user: { uid: user.uid, email: user.email } });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/users/search') {
      const term = normalize(url.searchParams.get('term') || '');
      const user = store.users.find(
        (item) => item.uid === term || item.email === term || item.displayNameLower === term
      );
      send(res, 200, { profile: publicUser(user) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/users/update') {
      const body = await readBody(req);
      const user = requireUser(body.uid);

      if (body.displayName !== undefined) {
        user.displayName = String(body.displayName).trim();
        user.displayNameLower = normalize(user.displayName);
      }
      if (body.photoURL !== undefined) {
        user.photoURL = String(body.photoURL || '');
      }
      user.updatedAt = now();
      saveStore();
      send(res, 200, { profile: publicUser(user) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/users/password') {
      const body = await readBody(req);
      const user = requireUser(body.uid);
      if (user.password !== String(body.currentPassword || '')) {
        fail(res, 400, '目前密碼不正確');
        return;
      }
      user.password = String(body.newPassword || '');
      user.updatedAt = now();
      saveStore();
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/users/')) {
      const uid = decodeURIComponent(url.pathname.split('/')[2] || '');
      const profile = getProfile(uid);
      if (!profile) {
        fail(res, 404, '找不到使用者');
        return;
      }
      send(res, 200, { profile });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/friends') {
      const uid = url.searchParams.get('uid') || '';
      const user = requireUser(uid);
      const friends = user.friendIds.map(getProfile).filter(Boolean);
      send(res, 200, { friends });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/friends/add') {
      const body = await readBody(req);
      const chatId = addFriendship(String(body.uid || ''), String(body.friendUid || ''));
      send(res, 200, { chatId });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/chats') {
      const uid = url.searchParams.get('uid') || '';
      requireUser(uid);
      const chats = store.chats
        .filter((chat) => chat.participants.includes(uid))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .map((chat) => chatSummary(chat, uid));
      send(res, 200, { chats });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/messages') {
      const chatId = url.searchParams.get('chatId') || '';
      const messages = [...(store.messages[chatId] || [])].sort(
        (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
      );
      send(res, 200, { messages });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/messages/send') {
      const body = await readBody(req);
      const chatId = String(body.chatId || '');
      const senderId = String(body.senderId || '');
      const text = String(body.text || '').trim();
      const chat = store.chats.find((item) => item.id === chatId);
      requireUser(senderId);

      if (!chat || !chat.participants.includes(senderId)) {
        fail(res, 404, '找不到聊天室');
        return;
      }
      if (!text) {
        fail(res, 400, '訊息不可為空');
        return;
      }

      const timestamp = now();
      const message = { id: randomId(), senderId, text, createdAt: timestamp };
      store.messages[chatId] = [...(store.messages[chatId] || []), message];
      chat.lastMessage = text;
      chat.lastMessageAt = timestamp;
      chat.updatedAt = timestamp;
      chat.readAtByUser = { ...(chat.readAtByUser || {}), [senderId]: timestamp };
      saveStore();
      send(res, 200, { message });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/chats/read') {
      const body = await readBody(req);
      const chat = store.chats.find((item) => item.id === String(body.chatId || ''));
      const uid = String(body.uid || '');
      requireUser(uid);

      if (!chat || !chat.participants.includes(uid)) {
        fail(res, 404, '找不到聊天室');
        return;
      }

      chat.readAtByUser = { ...(chat.readAtByUser || {}), [uid]: now() };
      saveStore();
      send(res, 200, { ok: true });
      return;
    }

    fail(res, 404, '找不到 API');
  } catch (error) {
    fail(res, 400, error.message || '伺服器錯誤');
  }
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
