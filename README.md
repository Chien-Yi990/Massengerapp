# MyChatApp

React Native Expo 聊天 App。資料目前透過 Node.js HTTP API 儲存在伺服器端 JSON 檔案：

```text
server/data/store.json
```

前端不再直接把主要資料存在瀏覽器本機，而是透過網路 API 存取使用者、好友、聊天室、訊息、未讀狀態等資料。

## 組員名單
11256028 簡翊安
11256027 黃楷恩
11256035 劉張祥恩
11256038 陳紹豪
11156050 莊閎翔

## 驗收當天：兩台電腦 Demo（建議方式）

兩台電腦連到同一個 Wi-Fi。選一台當「主機」，只需要在主機從 GitHub 下載並啟動專案：

```bash
git clone https://github.com/Chien-Yi990/Massengerapp.git
cd Massengerapp
npm ci
npm run demo
```

終端機會顯示類似以下網址：

```text
本機與第二台電腦請開啟：http://192.168.1.100:8081
```

在兩台電腦的瀏覽器都開啟終端機實際顯示的網址，分別登入不同帳號：

- 電腦 A：`demo1@example.com` / `123456`
- 電腦 B：`demo2@example.com` / `123456`

接著可直接測試互傳訊息、未讀數、好友列表。若 Windows 防火牆跳出詢問，請允許 Node.js 使用「私人網路」。

> 第二台電腦不可輸入 `localhost:8081`，必須使用主機終端機顯示的 `192.168.x.x:8081` 網址。

### 若自動判斷到錯誤的 IP

主機有 VPN、虛擬網卡時，可手動指定主機的 Wi-Fi IPv4：

```powershell
$env:DEMO_HOST="192.168.1.100"
npm run demo
```

可在 Windows 執行 `ipconfig`，從「無線區域網路介面卡 Wi-Fi」找到 IPv4 位址。

### 一般開發啟動方式

第一個終端機：

```bash
npm run api
```

第二個終端機：

```bash
npm run web
```

此方式預設只供同一台電腦使用，網址為 `http://localhost:8081`，API 為 `http://localhost:3001`。

## 測試帳號

系統會自動建立三個測試帳號，且三個帳號已互相加入好友：

| Email | 密碼 |
| --- | --- |
| demo1@example.com | 123456 |
| demo2@example.com | 123456 |
| demo3@example.com | 123456 |

也可以自行註冊新帳號，並透過 UID、Email 或顯示名稱搜尋其他使用者加入好友。

## 作業要求檢查表

| 狀態 | 作業要求 | 目前狀況 |
| --- | --- | --- |
| ✓ | 以下所有的資料都需要能存在網路上 | 使用 Node.js HTTP API 儲存在 server 端 `server/data/store.json` |
| ✓ | 跟期中一樣有跳轉頁跟 tab 標籤頁 | 有登入頁、Bottom Tab、聊天室 Stack 跳轉頁 |
| ✓ | 註冊帳號、登入，帳號是 email | 支援 email 註冊與登入 |
| ✓ | 把另一個帳號加入好友，可以透過 id、帳號或 email | 可用 UID、Email、顯示名稱搜尋並加入好友 |
| ✓ | 至少註冊三個以上的帳號，然後互加好友 | 內建 3 個 demo 帳號，且已互相加入好友 |
| ✓ | 不同好友的聊天室都有自己的聊天訊息 | 每組好友會建立獨立聊天室與訊息列表 |
| ✓ | 聊天訊息顯示時間 | 訊息會顯示送出時間 |
| ✓ | 聊天訊息顯示頭像 optional | 對方訊息會顯示頭像/名稱首字母 |
| ✓ | 帳號設定可以設定名字、修改密碼、變更頭像等 | 個人頁可修改名稱、密碼、頭像 |
| ✓ | 好友列表跟聊天室列表 | 有好友頁與聊天室列表頁 |
| ✓ | 聊天室列表如果該聊天室有訊息，需顯示最後一筆訊息含時間 | 聊天室列表會顯示最後訊息與時間 |
| ✓ | 聊天訊息可以半即時在雙方畫面上顯示 optional | 前端每 1.5 秒 polling API，達成半即時更新 |
| ✓ | 未讀 optional | 聊天室列表會顯示未讀數，進入聊天室會標記已讀 |

## 資料內容

API server 儲存以下資料：

- `users`：帳號、Email、顯示名稱、密碼、頭像、好友 ID
- `chats`：聊天室、參與者、最後訊息、最後訊息時間、已讀時間
- `messages`：各聊天室訊息

## 驗收流程

1. 兩台電腦開啟 `npm run demo` 顯示的相同網址。
2. 電腦 A 登入 `demo1@example.com`，電腦 B 登入 `demo2@example.com`。
3. 到「好友」頁，確認 Demo One 與 Demo Two 都在好友清單。
4. 到「聊天」頁開啟彼此的聊天室。
5. 電腦 A 傳訊息，約 1.5 秒內確認電腦 B 顯示新訊息與時間。
6. 回到聊天列表確認最後訊息及未讀數，再進入聊天室確認已標記為已讀。
7. 如需展示加好友：兩台分別註冊新帳號，用 Email 搜尋對方並加入好友。

## 自動檢查

下載依賴後可執行：

```bash
npm test
npm run check
```

- `npm test`：實際啟動獨立 API，測試註冊、搜尋、加好友、聊天室、傳訊息及未讀。
- `npm run check`：檢查 TypeScript 與 Expo 專案設定、相依套件版本。

## API 測試結果

已測試：

- 三個 demo 帳號登入
- 用 Email 搜尋使用者
- 加好友
- 取得好友列表
- 取得聊天室列表
- 送出聊天訊息
- 顯示最後一筆訊息與時間
- 未讀數增加
- 進入聊天室後標記已讀
- 修改使用者名稱

## 常見問題

- 第二台打不開網址：確認兩台在同一個 Wi-Fi，並允許 Windows 防火牆的私人網路存取。
- 網址顯示 VPN／虛擬網卡 IP：用上方 `DEMO_HOST` 手動指定 Wi-Fi IPv4。
- Port 已被使用：先關閉舊的 Node.js／Expo 終端機，再執行 `npm run demo`。
- GitHub repository 是 private：驗收主機必須先登入有權限的 GitHub 帳號才能 clone。
