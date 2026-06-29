const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'messenger-smoke-'));
const dataFile = path.join(tempDir, 'store.json');

const request = async (route, options = {}) => {
  const response = await fetch(`${BASE_URL}${route}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${route}: ${data.error || response.status}`);
  }
  return data;
};

const post = (route, body) =>
  request(route, { method: 'POST', body: JSON.stringify(body) });

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await request('/health');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('API server did not start');
};

const run = async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT), DATA_FILE: dataFile },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  try {
    await waitForServer();

    const first = (await post('/auth/register', {
      email: 'acceptance-one@example.com',
      password: '123456',
      displayName: 'Acceptance One',
    })).user;
    const second = (await post('/auth/register', {
      email: 'acceptance-two@example.com',
      password: '123456',
      displayName: 'Acceptance Two',
    })).user;

    const found = await request('/users/search?term=acceptance-two%40example.com');
    if (found.profile?.uid !== second.uid) throw new Error('User search failed');

    const { chatId } = await post('/friends/add', { uid: first.uid, friendUid: second.uid });
    const friends = await request(`/friends?uid=${encodeURIComponent(first.uid)}`);
    if (!friends.friends.some((friend) => friend.uid === second.uid)) {
      throw new Error('Friendship was not shared');
    }

    await post('/messages/send', { chatId, senderId: first.uid, text: '雙機驗收訊息' });
    const messages = await request(`/messages?chatId=${encodeURIComponent(chatId)}`);
    if (messages.messages.at(-1)?.text !== '雙機驗收訊息') throw new Error('Message send failed');

    const chatsBeforeRead = await request(`/chats?uid=${encodeURIComponent(second.uid)}`);
    if (chatsBeforeRead.chats[0]?.unreadCount !== 1) throw new Error('Unread count failed');

    await post('/chats/read', { chatId, uid: second.uid });
    const chatsAfterRead = await request(`/chats?uid=${encodeURIComponent(second.uid)}`);
    if (chatsAfterRead.chats[0]?.unreadCount !== 0) throw new Error('Mark as read failed');

    console.log('✓ 註冊與搜尋');
    console.log('✓ 雙向加好友與建立聊天室');
    console.log('✓ 傳送、接收訊息與最後訊息');
    console.log('✓ 未讀計數與標記已讀');
    console.log('API 驗收測試全部通過。');
  } finally {
    server.kill();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

run().catch((error) => {
  console.error(`API 驗收測試失敗：${error.message}`);
  process.exit(1);
});
