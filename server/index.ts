import { createApp } from './app';
const port=Number(process.env.PORT ?? 3001);
const app=createApp({database:process.env.DATABASE_PATH,origins:process.env.ALLOWED_ORIGINS?.split(',').map(v=>v.trim())});
app.server.listen(port,'127.0.0.1',()=>console.log(`Full-stack app: http://localhost:${port} (SQLite, real sign-in, no cloud calls)`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>void app.close().then(()=>process.exit(0)));
