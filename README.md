# MyChatApp（Firebase 雲端版）

React Native Expo 聊天 App。帳號由 Firebase Authentication 管理，好友、聊天室與訊息儲存在 Cloud Firestore。教師機與學生端只需各自能連上 Internet，不必連同一個 Wi-Fi，也不必執行本機 API server。

## 組員名單

- 11256028 簡翊安
- 11256027 黃楷恩
- 11256035 劉張祥恩
- 11256038 陳紹豪
- 11156050 莊閎翔

Demo 開始前請先在 GitHub repository 的這一段顯示組員名單。

## Firebase 狀態

本組已完成下列雲端設定，教師機與學生端不需要再設定 Firebase：

- Firebase 專案：`gen-lang-client-0363855150`
- Email/Password Authentication
- Cloud Firestore
- Firestore 安全規則

Firebase Web App 公開設定已內建在程式中，因此從 GitHub clone 後不需要新增 `.env`。只有組員修改 `firestore.rules` 時，才需要登入 Firebase 並重新部署：

```powershell
npx firebase-tools login
npm run firebase:deploy
```

Firebase Web App 設定值不是伺服器私鑰，因此已作為程式的預設設定提交；`.env` 仍可用來覆蓋它。不要把 service-account JSON 或 Admin SDK 私鑰放進 GitHub。

## 教師機啟動步驟

教師機需先安裝 [Git](https://git-scm.com/) 與 [Node.js LTS](https://nodejs.org/)，並確定可以連上 Internet。

在教師機開啟 PowerShell，依序執行：

```powershell
# 1. 只能從 GitHub 取得程式
git clone https://github.com/Chien-Yi990/Massengerapp.git

# 2. 進入專案
cd Massengerapp

# 3. 安裝鎖定版本的套件
npm ci

# 4. 啟動 App
npm run demo
```

終端機出現 `Waiting on http://localhost:8081` 後，在教師機瀏覽器開啟：

```text
http://localhost:8081
```

不要關閉執行 `npm run demo` 的 PowerShell 視窗；Demo 結束後可在該視窗按 `Ctrl+C` 停止。

## 學生端啟動步驟

學生端可使用另一台已安裝 Git 與 Node.js 的電腦，執行與教師機相同的四個指令。每台電腦都開啟自己的 `http://localhost:8081`，資料會透過 Firebase 同步，不需要連接相同 Wi-Fi、不需要設定 IP，也不需要開啟防火牆 port。

若使用 Android/iPhone，可在專案中執行 `npm start`，再使用 Expo Go 開啟。Firebase JS SDK 可同時支援 Web、Android 與 iOS。

## Demo 建議流程

1. 在 GitHub README 顯示上方組員名單。
2. 教師機與至少兩個學生端都開啟 App。
3. 兩位學生先各自註冊帳號，記下 Email。
4. 教師機註冊一個新帳號。
5. 教師機到「好友」，用 Email 搜尋並加入兩位學生。
6. 教師機分別進入兩個聊天室，傳送不同訊息。
7. 兩位學生各回覆至少兩則訊息。
8. 教師機確認收到回覆後，按返回並停在底部的「聊天」tab（聊天室列表）。

建議準備三組不重複 Email；Firebase 密碼至少 6 個字元。若重複演示，可直接登入原帳號，或在 Firebase Console 刪除測試帳號及相關 Firestore 文件後重來。

## 資料結構

```text
users/{uid}
chats/{由兩個 uid 組成的 chatId}
chats/{chatId}/messages/{messageId}
```

Firestore 使用 snapshot listener 即時通知其他裝置，不再每 1.5 秒輪詢。加好友及建立聊天室使用 transaction，訊息及聊天室摘要使用 batched write，避免只寫入一半。

## 驗證

```powershell
npm test
npm run check
```

`npm test` 檢查 Firebase 實作與規則檔是否齊全；`npm run check` 執行 TypeScript 與 Expo 環境檢查。真正的跨裝置資料驗收仍需部署規則並連上同一個 Firebase 專案。

## 常見問題

- `git clone` 顯示找不到指令：先安裝 Git，再重新開啟 PowerShell。
- `npm` 顯示找不到指令：先安裝 Node.js LTS，再重新開啟 PowerShell。
- 8081 已被占用：關閉先前的 Expo 視窗，或在該視窗按 `Ctrl+C` 後重啟。
- 顯示「Firebase 尚未完成設定」：確認 GitHub 下載的是最新版本後重啟 Expo。
- 顯示權限不足：執行 `npm run firebase:deploy`，並確認 `.firebaserc` 專案正確。
- 搜尋不到使用者：對方必須先完成 App 註冊；建議用完整 Email 搜尋。
- 教師機收不到訊息：確認所有裝置可以連上 Internet，並且都使用最新 GitHub 版本。
