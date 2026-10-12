import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  signInAnonymously,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocFromServer, 
  getDocs, 
  writeBatch,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, MonthlyReport, DropdownConfig } from '../types';

// Initialize Firebase App instance
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore using the configured database ID
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth: Auth = getAuth(app);

export const HARDCODED_FIREBASE_CONFIG = firebaseConfig;

// Error Handling Specification as defined in Skill Section 3
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore as required by Skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test succeeded.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    return false;
  }
}

// Authentication Helpers
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

export const signOutFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase sign out error:", error);
  }
};

export const tryAutoAuth = async (): Promise<FirebaseUser | null> => {
  if (auth.currentUser) return auth.currentUser;
  try {
    const res = await signInAnonymously(auth);
    return res.user;
  } catch (e) {
    // If anonymous auth is not enabled on console, this is expected; Google Sign-in is available
    console.info("Anonymous auth omitted, Google sign-in available");
    return null;
  }
};

export const subscribeAuthState = (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// Real-Time Listeners for Application Data
export const subscribeToUsers = (
  onUpdate: (users: User[]) => void,
  onError: (err: any) => void
): Unsubscribe => {
  const usersCollection = collection(db, 'users');
  return onSnapshot(
    usersCollection,
    (snapshot) => {
      const userList: User[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        userList.push({
          id: Number(item.id || docSnap.id),
          name: item.name || '',
          role: item.role,
          pin: item.pin,
          state: item.state,
          population: item.population || {},
          updatedAt: item.updatedAt || 0,
        });
      });
      onUpdate(userList);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, 'users');
    }
  );
};

export const subscribeToReports = (
  onUpdate: (reports: MonthlyReport[]) => void,
  onError: (err: any) => void
): Unsubscribe => {
  const reportsCollection = collection(db, 'reports');
  return onSnapshot(
    reportsCollection,
    (snapshot) => {
      const reportList: MonthlyReport[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        reportList.push({
          ...(item as MonthlyReport),
          id: Number(item.id || docSnap.id),
          institutionId: Number(item.institutionId),
          updatedAt: Number(item.updatedAt || 0),
        });
      });
      onUpdate(reportList);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, 'reports');
    }
  );
};

export const subscribeToAppConfig = (
  onUpdate: (config: any) => void,
  onError: (err: any) => void
): Unsubscribe => {
  const configDoc = doc(db, 'config', 'app_config');
  return onSnapshot(
    configDoc,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, 'config/app_config');
    }
  );
};

export const subscribeToDropdownConfig = (
  onUpdate: (config: DropdownConfig) => void,
  onError: (err: any) => void
): Unsubscribe => {
  const dropdownDoc = doc(db, 'config', 'dropdown_config');
  return onSnapshot(
    dropdownDoc,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as DropdownConfig);
      }
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.GET, 'config/dropdown_config');
    }
  );
};

// Firestore Mutations
export const saveFirestoreReport = async (report: MonthlyReport): Promise<void> => {
  const path = `reports/${report.id}`;
  try {
    await setDoc(doc(db, 'reports', String(report.id)), {
      ...report,
      id: Number(report.id),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteFirestoreReport = async (reportId: number): Promise<void> => {
  const path = `reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'reports', String(reportId)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveFirestoreUser = async (user: User): Promise<void> => {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', String(user.id)), {
      ...user,
      id: Number(user.id),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteFirestoreUser = async (userId: number): Promise<void> => {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', String(userId)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveFirestoreAppConfig = async (configUpdate: Record<string, any>): Promise<void> => {
  const path = 'config/app_config';
  try {
    await setDoc(doc(db, 'config', 'app_config'), {
      ...configUpdate,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveFirestoreDropdownConfig = async (config: DropdownConfig): Promise<void> => {
  const path = 'config/dropdown_config';
  try {
    await setDoc(doc(db, 'config', 'dropdown_config'), {
      ...config,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Seed initial users if Firestore collection is fresh
export const seedInitialUsersIfEmpty = async (initialUsers: User[]): Promise<void> => {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty && initialUsers.length > 0) {
      console.log("Seeding initial institutions to Firestore...");
      const batch = writeBatch(db);
      for (const u of initialUsers) {
        const uRef = doc(db, 'users', String(u.id));
        batch.set(uRef, { ...u, id: Number(u.id), updatedAt: Date.now() });
      }
      await batch.commit();
      console.log("Initial institutions successfully seeded to Firestore.");
    }
  } catch (error) {
    console.warn("Could not check/seed initial users (might be offline or permission restricted):", error);
  }
};

// Backwards-compatible utility wrappers
export const getDb = () => db;
export const initializeFirebase = async (config?: any) => ({ db, app, auth });
export const disconnectFirebase = async () => {};
export const parseFirebaseConfigString = (input: string): any => {
  if (!input || !input.trim()) return null;
  try {
    return JSON.parse(input);
  } catch (e) {}
  return firebaseConfig;
};
