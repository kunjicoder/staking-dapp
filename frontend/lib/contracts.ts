import tokenJson from '../../shared/abi/StakeToken.json';
import stakingJson from '../../shared/abi/Staking.json';
import type { Abi } from 'viem';

// accept either a raw ABI array or a full Hardhat artifact ({ abi: [...] })
const unwrap = (j: unknown): Abi => (Array.isArray(j) ? j : (j as { abi: Abi }).abi) as Abi;

export const tokenAbi = unwrap(tokenJson);
export const stakingAbi = unwrap(stakingJson);

export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? '0x') as `0x${string}`;
export const STAKING_ADDRESS = (process.env.NEXT_PUBLIC_STAKING_ADDRESS ?? '0x') as `0x${string}`;
