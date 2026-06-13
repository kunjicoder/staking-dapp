import 'dotenv/config';

const required = [
  'SEPOLIA_RPC_URL',
  'TOKEN_ADDRESS',
  'STAKING_ADDRESS',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET',
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')} — copy .env.example to .env and fill it in.`);
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT || 4000),
  rpcUrl: process.env.SEPOLIA_RPC_URL,
  tokenAddress: process.env.TOKEN_ADDRESS.toLowerCase(),
  stakingAddress: process.env.STAKING_ADDRESS.toLowerCase(),
  deployBlock: Number(process.env.DEPLOY_BLOCK || 0),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  jwtSecret: process.env.JWT_SECRET,
  adminAddresses: (process.env.ADMIN_ADDRESSES || '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean),
  frontendOrigins: (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  chainId: 11155111,
};
