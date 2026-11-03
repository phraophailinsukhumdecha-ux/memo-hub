'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '@/types';
import { login as apiLogin, getStoredUser, storeUser, clearStoredUser } from '@/lib/auth-service';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { HEARTBEAT_INTERVAL_MS } from '@/lib/presence';
import { logAuthEvent } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isApproveUser: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const foundUser = await apiLogin(username, password);
      if (foundUser) {
        setUser(foundUser);
        storeUser(foundUser);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    const current = getStoredUser();
    if (current?.id) {
      // Mark offline immediately (otherwise the heartbeat timeout does it).
      updateDoc(doc(db, 'users', current.id), { lastSeenAt: null }).catch(() => {});
      void logAuthEvent('logout', current.username || '', true, { userId: current.id });
    }
    setUser(null);
    clearStoredUser();
  }, []);

  // Presence heartbeat: keeps `lastSeenAt` fresh while the app is open.
  useEffect(() => {
    if (!user?.id) return;
    const userRef = doc(db, 'users', user.id);
    const beat = () => {
      updateDoc(userRef, { lastSeenAt: serverTimestamp() }).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user?.id]);

  const refreshUser = useCallback(async () => {
    const current = getStoredUser();
    if (!current) return;
    try {
      const snap = await getDoc(doc(db, 'users', current.id));
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      delete data.password;
      const fresh = { id: snap.id, ...data } as User;
      setUser(fresh);
      storeUser(fresh);
    } catch {
      /* keep cached user */
    }
  }, []);

  const isAdmin = user?.role === 'admin';
  const isApproveUser = user?.isApprover === true || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        logout,
        isAdmin,
        isApproveUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
