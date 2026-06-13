'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { createSiweMessage } from 'viem/siwe';
import { api } from './api';

const STORAGE_KEY = 'stk_jwt';

type JwtPayload = { wallet: string; role: 'admin' | 'user'; exp: number };

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

type AuthState = {
  token: string | null;
  wallet: string | null;
  role: 'admin' | 'user' | null;
  setToken: (token: string | null) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState>({
  token: null,
  wallet: null,
  role: null,
  setToken: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && decodeJwt(saved)) setTokenState(saved);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const payload = token ? decodeJwt(token) : null;

  return (
    <AuthContext.Provider
      value={{
        token,
        wallet: payload?.wallet ?? null,
        role: payload?.role ?? null,
        setToken,
        signOut: () => setToken(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Returns an async function that runs the full SIWE flow and stores the JWT. */
export function useSignIn() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setToken } = useAuth();

  return useCallback(async () => {
    if (!address) throw new Error('Connect a wallet first');
    const { nonce } = await api<{ nonce: string }>('/auth/nonce');
    const message = createSiweMessage({
      address,
      chainId: chainId ?? 11155111,
      domain: window.location.host,
      uri: window.location.origin,
      nonce,
      version: '1',
      statement: 'Sign in to the Staking dApp',
    });
    const signature = await signMessageAsync({ message });
    const res = await api<{ token: string; wallet: string; role: 'admin' | 'user' }>('/auth/login', {
      method: 'POST',
      body: { message, signature },
    });
    setToken(res.token);
    return res;
  }, [address, chainId, signMessageAsync, setToken]);
}
