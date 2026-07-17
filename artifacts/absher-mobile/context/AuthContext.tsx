import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import type { SafeUser } from '@workspace/api-client-react';

type AuthState = {
  user: SafeUser | null;
  accessToken: string | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  setAuth: (auth: { user: SafeUser; accessToken: string; refreshToken: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  isLoading: true,
  setAuth: async () => {},
  logout: async () => {},
});

const STORAGE_KEY = '@absher_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, accessToken: null, isLoading: true });
  const tokenRef = useRef<string | null>(null);

  // Wire up auth token getter for the API client
  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
  }, []);

  // Load persisted auth on startup
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const { user, accessToken } = JSON.parse(raw);
          tokenRef.current = accessToken;
          setState({ user, accessToken, isLoading: false });
        } catch {
          setState((s) => ({ ...s, isLoading: false }));
        }
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });
  }, []);

  const setAuth = useCallback(async (auth: { user: SafeUser; accessToken: string; refreshToken: string }) => {
    tokenRef.current = auth.accessToken;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    setState({ user: auth.user, accessToken: auth.accessToken, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    tokenRef.current = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState({ user: null, accessToken: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
