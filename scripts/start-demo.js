const dgram = require('dgram');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const API_PORT = process.env.PORT || '3001';
const WEB_PORT = process.env.WEB_PORT || '8081';

const fallbackAddress = () => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);

  return addresses.find((address) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address))
    || addresses[0]
    || '127.0.0.1';
};

const detectLanAddress = () =>
  new Promise((resolve) => {
    if (process.env.DEMO_HOST) {
      resolve(process.env.DEMO_HOST);
      return;
    }

    const socket = dgram.createSocket('udp4');
    socket.once('error', () => {
      socket.close();
      resolve(fallbackAddress());
    });
    socket.connect(53, '8.8.8.8', () => {
      const address = socket.address().address;
      socket.close();
      resolve(address);
    });
  });

const run = async () => {
  const lanAddress = await detectLanAddress();
  const apiUrl = `http://${lanAddress}:${API_PORT}`;
  const webUrl = `http://${lanAddress}:${WEB_PORT}`;
  const expoCli = require.resolve('expo/bin/cli');
  const children = [];

  console.log('');
  console.log('=== 雙機 Demo ===');
  console.log(`本機與第二台電腦請開啟：${webUrl}`);
  console.log(`共用 API：${apiUrl}`);
  console.log('兩台電腦必須連到同一個 Wi-Fi；Windows 防火牆詢問時請允許「私人網路」。');
  console.log('按 Ctrl+C 可同時停止前端與 API。');
  console.log('');

  children.push(
    spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], {
      env: { ...process.env, HOST: '0.0.0.0', PORT: API_PORT },
      stdio: 'inherit',
    })
  );
  children.push(
    spawn(process.execPath, [expoCli, 'start', '--web', '--clear', '--lan', '--port', WEB_PORT], {
      env: { ...process.env, EXPO_PUBLIC_API_BASE_URL: apiUrl },
      stdio: 'inherit',
    })
  );

  const stop = () => {
    children.forEach((child) => {
      if (!child.killed) {
        child.kill();
      }
    });
  };

  process.once('SIGINT', () => {
    stop();
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    stop();
    process.exit(0);
  });

  children.forEach((child) => {
    child.once('exit', (code) => {
      if (code && code !== 0) {
        stop();
        process.exitCode = code;
      }
    });
  });
};

run().catch((error) => {
  console.error(`Demo 啟動失敗：${error.message}`);
  process.exit(1);
});
