import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CloudFile, OperationRecord } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
    }
  }
}

// User Profile
export async function syncUserProfile(user: User) {
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email || 'anonymous@omnipdf.app',
        displayName: user.displayName || (user.isAnonymous ? 'Guest User' : user.email?.split('@')[0] || 'User'),
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Cloud Storage for User Files
export async function saveCloudFile(
  userId: string,
  file: Omit<CloudFile, 'userId' | 'createdAt'>
): Promise<CloudFile> {
  const path = `users/${userId}/files/${file.id}`;
  const record: CloudFile = {
    ...file,
    userId,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'users', userId, 'files', file.id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return record;
  }
}

export async function fetchUserCloudFiles(userId: string): Promise<CloudFile[]> {
  const path = `users/${userId}/files`;
  try {
    const q = query(collection(db, 'users', userId, 'files'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const files: CloudFile[] = [];
    snapshot.forEach((d) => {
      files.push(d.data() as CloudFile);
    });
    return files;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function deleteCloudFile(userId: string, fileId: string): Promise<void> {
  const path = `users/${userId}/files/${fileId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'files', fileId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Operations Audit Trail / History Log
export async function recordOperationLog(
  userId: string,
  log: Omit<OperationRecord, 'id' | 'userId' | 'timestamp'>
): Promise<OperationRecord> {
  const opId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `users/${userId}/operations/${opId}`;
  const record: OperationRecord = {
    ...log,
    id: opId,
    userId,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'users', userId, 'operations', opId), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return record;
  }
}

export async function fetchUserOperations(userId: string): Promise<OperationRecord[]> {
  const path = `users/${userId}/operations`;
  try {
    const q = query(
      collection(db, 'users', userId, 'operations'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const records: OperationRecord[] = [];
    snapshot.forEach((d) => {
      records.push(d.data() as OperationRecord);
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function clearUserOperations(userId: string): Promise<void> {
  const path = `users/${userId}/operations`;
  try {
    const snapshot = await getDocs(collection(db, 'users', userId, 'operations'));
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Auth helpers
export async function loginWithGoogle() {
  return await signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string) {
  return await createUserWithEmailAndPassword(auth, email, pass);
}

export async function loginAsGuest() {
  return await signInAnonymously(auth);
}

export async function logoutUser() {
  return await signOut(auth);
}
