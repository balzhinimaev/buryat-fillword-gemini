import { spawnSync } from 'node:child_process';
const profile = process.argv[2];
if (!['web', 'android'].includes(profile)) throw new Error('Choose web or android');
const env = { ...process.env, VITE_OFFLINE_MODE: profile === 'android' ? 'true' : 'false' };
if (env.VITE_API_URL === undefined) env.VITE_API_URL = profile === 'web' ? '/api' : 'https://buryat-game.ru/api';
for (const [command, args] of [['tsc', ['-b']], ['vite', ['build', '--mode', profile]]]) {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
