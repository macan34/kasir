import { spawn } from 'node:child_process';

console.log('🌟 Starting POS Local Fullstack Environment...\n');

// 1. Start Backend API Server
const server = spawn('node', ['--watch', 'server/index.js'], {
  stdio: 'inherit',
  shell: true,
});

server.on('error', (err) => {
  console.error('❌ Failed to start Backend Server:', err);
});

// 2. Start Vite Dev Server
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
});

vite.on('error', (err) => {
  console.error('❌ Failed to start Vite:', err);
});

// Handle graceful exit
function cleanup() {
  console.log('\n🛑 Shutting down server and vite...');
  try {
    server.kill();
  } catch (e) {}
  try {
    vite.kill();
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
