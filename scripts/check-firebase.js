const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const requiredFiles = [
  'firebase.json',
  'firestore.rules',
  '.env.example',
  'services/database.ts',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`缺少 Firebase 必要檔案：${file}`);
  }
}

const database = fs.readFileSync(path.join(root, 'services', 'database.ts'), 'utf8');
for (const feature of [
  'createUserWithEmailAndPassword',
  'signInWithEmailAndPassword',
  'onSnapshot',
  'runTransaction',
  'writeBatch',
]) {
  if (!database.includes(feature)) {
    throw new Error(`Firebase 實作缺少：${feature}`);
  }
}

const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
if (!rules.includes('request.auth') || !rules.includes('/messages/{messageId}')) {
  throw new Error('Firestore 安全規則不完整');
}

console.log('✓ Firebase Authentication 註冊與登入程式已就緒');
console.log('✓ Firestore 好友、聊天室、即時監聽與訊息程式已就緒');
console.log('✓ Firestore 安全規則已就緒');
console.log('Firebase 靜態驗收全部通過。');
