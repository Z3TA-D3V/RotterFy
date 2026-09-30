import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const api = fileURLToPath(new URL('../api/server.js', import.meta.url));
const children = [];
let stopping = false;
let closed = 0;

function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  }
}

function start(name, args, cwd) {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit' });
  children.push(child);
  child.on('error', (error) => {
    console.error(`No se pudo iniciar ${name}:`, error);
    process.exitCode = 1;
    stop();
  });
  child.on('close', (code, signal) => {
    if (!stopping) {
      process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
      stop();
    }
    closed += 1;
    if (closed === children.length) process.exit(process.exitCode ?? 0);
  });
}

process.on('SIGINT', () => {
  process.exitCode = 130;
  stop('SIGINT');
});
process.on('SIGTERM', () => stop());

start('frontend', [vite, '--host', '127.0.0.1', '--port', '3000', '--strictPort'], root);
start('API', [api], fileURLToPath(new URL('../api/', import.meta.url)));
