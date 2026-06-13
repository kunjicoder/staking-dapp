import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { startIndexer } from './indexer.js';
import { authRouter } from './auth.js';
import { publicRouter } from './routes/public.js';
import { meRouter } from './routes/me.js';
import { adminRouter } from './routes/admin.js';

const app = express();

app.use(
  cors({
    origin: config.frontendOrigins.length ? config.frontendOrigins : true,
  })
);
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRouter);
app.use('/api', publicRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  startIndexer();
});
