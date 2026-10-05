import { createApp } from './app';
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const secureCookies = process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true';
const configuredOrigins = process.env.ALLOWED_ORIGINS ?? process.env.RENDER_EXTERNAL_URL;
const origins = configuredOrigins?.split(',').map(value => value.trim()).filter(Boolean);
if (secureCookies && (!origins?.length || origins.some(origin => {
  try { const url = new URL(origin); return url.protocol !== 'https:' || url.origin !== origin; }
  catch { return true; }
}))) throw new Error('Hosted mode requires explicit HTTPS origins.');
const app = createApp({
  database: process.env.DATABASE_PATH,
  origins,
  secureCookies,
  logSamplePasswords: !secureCookies,
});
app.server.listen(port, host, () => console.log(`Support server listening on ${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void app.close().then(() => process.exit(0)));
