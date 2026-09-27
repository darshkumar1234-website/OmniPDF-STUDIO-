import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  testConnection,
  syncUserProfile,
  saveCloudFile,
  fetchUserCloudFiles,
  deleteCloudFile,
  recordOperationLog,
  fetchUserOperations,
  clearUserOperations,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  loginAsGuest,
  logoutUser,
} from '../services/firebase';
import { CloudFile, OperationRecord } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cloudFiles: CloudFile[];
  operations: OperationRecord[];
  isAuthModalOpen: boolean;
  isVaultOpen: boolean;
  isHistoryOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  setIsVaultOpen: (open: boolean) => void;
  setIsHistoryOpen: (open: boolean) => void;
  refreshFiles: () => Promise<void>;
  refreshOperations: () => Promise<void>;
  saveFileToCloud: (file: {
    name: string;
    bytes: Uint8Array;
    pageCount?: number;
    textContent?: string;
    summary?: string;
  }) => Promise<CloudFile | null>;
  deleteFileFromCloud: (fileId: string) => Promise<void>;
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
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [operations, setOperations] = useState<OperationRecord[]>([]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
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
        setCloudFiles([]);
        setOperations([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid: string) => {
    try {
      const [files, ops] = await Promise.all([
        fetchUserCloudFiles(uid),
        fetchUserOperations(uid),
      ]);
      setCloudFiles(files);
      setOperations(ops);
    } catch (err) {
      console.warn('Error loading user data:', err);
    }
  };

  const refreshFiles = async () => {
    if (!user) return;
    const files = await fetchUserCloudFiles(user.uid);
    setCloudFiles(files);
  };

  const refreshOperations = async () => {
    if (!user) return;
    const ops = await fetchUserOperations(user.uid);
    setOperations(ops);
  };

  const saveFileToCloud = async (file: {
    name: string;
    bytes: Uint8Array;
    pageCount?: number;
    textContent?: string;
    summary?: string;
  }): Promise<CloudFile | null> => {
    if (!user) {
      setIsAuthModalOpen(true);
      return null;
    }

    // Convert Uint8Array to base64
    let binary = '';
    const len = file.bytes.byteLength;
    // Chunk for big files to prevent stack overflow
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = file.bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const dataBase64 = btoa(binary);

    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const saved = await saveCloudFile(user.uid, {
      id: fileId,
      name: file.name,
      size: file.bytes.length,
      pageCount: file.pageCount || 1,
      dataBase64,
      textContent: file.textContent || '',
      summary: file.summary || '',
    });

    await logAction('vault', 'Personal Cloud Storage', file.name, 'success', `Saved ${file.name} to cloud storage vault`);
    await refreshFiles();
    return saved;
  };

  const deleteFileFromCloud = async (fileId: string) => {
    if (!user) return;
    await deleteCloudFile(user.uid, fileId);
    setCloudFiles((prev) => prev.filter((f) => f.id !== fileId));
    await logAction('vault', 'Personal Cloud Storage', 'Document Deleted', 'success', `Deleted file from storage`);
  };

  const logAction = async (
    toolId: string,
    toolName: string,
    fileName: string,
    status: 'success' | 'failed' | 'processing',
    details: string
  ) => {
    if (!user) return;
    const record = await recordOperationLog(user.uid, {
      toolId,
      toolName,
      fileName,
      status,
      details,
    });
    setOperations((prev) => [record, ...prev]);
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
        cloudFiles,
        operations,
        isAuthModalOpen,
        isVaultOpen,
        isHistoryOpen,
        setIsAuthModalOpen,
        setIsVaultOpen,
        setIsHistoryOpen,
        refreshFiles,
        refreshOperations,
        saveFileToCloud,
        deleteFileFromCloud,
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
