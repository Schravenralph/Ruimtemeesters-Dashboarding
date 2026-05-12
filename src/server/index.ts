import app from './app.js';
import { env } from './env.js';
import { pool } from './db/pool.js';
import { startSyncScheduler, stopSyncScheduler } from './services/cbs/sync-scheduler.js';
import { startSyncDecayRunner, stopSyncDecayRunner } from './services/sync/decay-runner.js';

const server = app.listen(env.port, env.host, () => {
  console.log(`Server running on ${env.host}:${env.port} in ${env.nodeEnv} mode`);
  startSyncScheduler().catch(err => console.error('Scheduler start failed:', err));
  startSyncDecayRunner();
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed');
  });

  stopSyncScheduler();
  stopSyncDecayRunner();

  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
