import { Router } from 'express';
import { SiweMessage, generateNonce } from 'siwe';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

const NONCE_TTL_MS = 5 * 60 * 1000;
const nonces = new Map(); // nonce -> expiry epoch ms

setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of nonces) if (expiry < now) nonces.delete(nonce);
}, 60_000).unref();

const allowedDomains = config.frontendOrigins
  .map((o) => {
    try {
      return new URL(o).host;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

export const authRouter = Router();

authRouter.get('/nonce', (_req, res) => {
  const nonce = generateNonce();
  nonces.set(nonce, Date.now() + NONCE_TTL_MS);
  res.json({ nonce });
});

authRouter.post('/login', async (req, res) => {
  try {
    const { message, signature } = req.body ?? {};
    if (!message || !signature) return res.status(400).json({ error: 'message and signature required' });

    const siwe = new SiweMessage(message);

    if (siwe.chainId !== config.chainId) {
      return res.status(401).json({ error: `Wrong chain — expected Sepolia (${config.chainId})` });
    }
    const expiry = nonces.get(siwe.nonce);
    if (!expiry || expiry < Date.now()) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }
    nonces.delete(siwe.nonce); // single use
    if (allowedDomains.length && !allowedDomains.includes(siwe.domain)) {
      return res.status(401).json({ error: 'Domain not allowed' });
    }

    const result = await siwe.verify({ signature });
    if (!result.success) return res.status(401).json({ error: 'Signature verification failed' });

    const wallet = siwe.address.toLowerCase();
    const role = config.adminAddresses.includes(wallet) ? 'admin' : 'user';
    const token = jwt.sign({ wallet, role }, config.jwtSecret, { expiresIn: '24h' });
    res.json({ token, wallet, role });
  } catch (err) {
    console.error('[auth] login failed:', err.message ?? err);
    res.status(401).json({ error: 'SIWE verification failed' });
  }
});

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { wallet: payload.wallet.toLowerCase(), role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}
