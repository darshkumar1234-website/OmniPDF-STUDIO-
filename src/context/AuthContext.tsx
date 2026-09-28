import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  testConnection,
  syncUserProfile,
  recordOperationLog,
  fetchUserOperations,
  clearUserOperations,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAsGuest,
  logoutUser,
} from '../services/firebase';
import { OperationRecord } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  operations: OperationRecord[];
  isAuthModalOpen: boolean;
  isHistoryOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsHistoryOpen: (open: boolean) => void;
  refreshOperations: () => Promise<void>;
  logAction: (
    toolId: string,
    toolName: string,
    fileName: string,
    status: 'success' | 'failed' | 'processing',
    details: string
  ) => Promise<void>;
  clearHistory: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OperationRecord[]>([]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await syncUserProfile(currentUser);
        await loadUserData(currentUser.uid);
      } else {
        setOperations([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const ops = await fetchUserOperations(uid);
      setOperations(ops);
    } catch (err) {
      console.warn('Error loading user history:', err);
    }
  };

  const refreshOperations = async () => {
    if (!user) return;
    const ops = await fetchUserOperations(user.uid);
    setOperations(ops);
  };

  const logAction = async (
    toolId: string,
    toolName: string,
    fileName: string,
    status: 'success' | 'failed' | 'processing',
    details: string
  ) => {
    if (!user) return;
    try {
      await recordOperationLog(user.uid, {
        toolId,
        toolName,
        fileName,
        status,
        details,
      });
      await refreshOperations();
    } catch (err) {
      console.warn('Could not record operation log:', err);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await clearUserOperations(user.uid);
    setOperations([]);
  };

  const signInWithGoogle = async () => {
    await loginWithGoogle();
    setIsAuthModalOpen(false);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await loginWithEmail(email, pass);
    setIsAuthModalOpen(false);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    await registerWithEmail(email, pass);
    setIsAuthModalOpen(false);
  };

  const signInAsGuest = async () => {
    await loginAsGuest();
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await logoutUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        operations,
        isAuthModalOpen,
        isHistoryOpen,
        setIsAuthModalOpen,
        setIsHistoryOpen,
        refreshOperations,
        logAction,
        clearHistory,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
