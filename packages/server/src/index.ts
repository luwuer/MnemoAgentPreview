import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { loadConfig } from '@mnemo/core';
import { createServer } from './server.js';

async function main() {
  // 配置文件优先级：环境变量 > 本地配置 > 默认配置
  const localPath = resolve('config/mnemo.config.local.yaml');
  const defaultPath = resolve('config/mnemo.config.yaml');
  const configPath =
    process.env.MNEMO_CONFIG ??
    (existsSync(localPath) ? localPath : defaultPath);

  console.log(`[mnemo] 加载配置: ${configPath}`);
  const config = loadConfig(configPath);

  const { app } = await createServer(config);
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`[mnemo] Server 运行中: http://localhost:${port}`);
  console.log(`[mnemo] WebSocket: ws://localhost:${port}/ws`);
}

main().catch((e) => {
  console.error('[mnemo] 启动失败:', e);
  process.exit(1);
});
