import mongoose from 'mongoose';
import { readConfig } from './config.js';
import { Employee, Enquiry } from './models.js';
import { createApp } from './app.js';

let server;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10000).unref();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  clearTimeout(timeout);
}
try {
  const config = readConfig();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([Employee.init(), Enquiry.init()]);
  const app = await createApp(config);
  server = app.listen(config.port, () => console.log(`Fastor CRM listening on port ${config.port}`));
  server.on('error', async err => { console.error('HTTP startup failed:', err.code); await stop(); process.exitCode = 1; });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (err) {
  console.error('Startup failed:', err instanceof mongoose.Error ? 'Cannot connect to MongoDB; check MONGODB_URI and database availability' : err.message);
  await stop();
  process.exitCode = 1;
}
