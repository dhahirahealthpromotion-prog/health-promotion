import React, { useState, createContext, useEffect, useCallback } from 'react';
import { User, MonthlyReport, UserRole, FullBackupData, DeletedItem, DropdownConfig, DropdownCategory } from './types';
import { INITIAL_USERS, DEFAULT_APP_NAME, CURRENT_USER_KEY, MOCK_USERS, DEFAULT_DROPDOWN_CONFIG, DROPDOWN_CONFIG_KEY } from './constants';
import LoginScreen from './components/LoginScreen';
import SupervisorDashboard from './components/SupervisorDashboard';
import InstitutionDashboard from './components/InstitutionDashboard';
import { HealthPromotionDashboard } from './components/HealthPromotionDashboard';
import Header from './components/Header';
import { HelpModal } from './components/HelpModal';
import { FaviconManager } from './components/FaviconManager';
import MobileInstallModal from './components/MobileInstallModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import Modal from './components/Modal';
import { 
  testConnection, 
  tryAutoAuth, 
  subscribeAuthState, 
  signInWithGoogle, 
  signOutFirebase,
  subscribeToUsers, 
  subscribeToReports, 
  subscribeToAppConfig, 
  subscribeToDropdownConfig,
  saveFirestoreReport, 
  deleteFirestoreReport, 
  saveFirestoreUser, 
  deleteFirestoreUser, 
  saveFirestoreAppConfig, 
  saveFirestoreDropdownConfig,
  seedInitialUsersIfEmpty,
  HARDCODED_FIREBASE_CONFIG
} from './utils/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

declare const JSZip: any;

const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    binaryString.charCodeAt(i);
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

function deduplicateById<T extends { id: number | string; updatedAt?: number }>(items: T[]): T[] {
  const map = new Map<number, T>();
  items.forEach((item, index) => {
    let id = Number(item.id);
    if (isNaN(id) || id === 0) {
        id = Date.now() + index;
    }
    const existing = map.get(id);
    if (!existing || (item.updatedAt || 0) >= (existing.updatedAt || 0)) {
      map.set(id, { ...item, id });
    }
  });
  return Array.from(map.values());
}

interface AppContextType {
  users: User[];
  reports: MonthlyReport[];
  addReport: (report: Omit<MonthlyReport, 'id' | 'updatedAt'>) => void;
  updateReport: (report: MonthlyReport) => void;
  deleteReport: (reportId: number) => void;
  deleteAllReports: () => Promise<void>;
  deleteAllData: () => Promise<void>;
  loadMockData: () => void;
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
  addInstitution: (name: string, state?: string, population?: { [year: number]: number }) => void;
  updateInstitution: (institution: User) => void;
  deleteInstitution: (institutionId: number) => void;
  importFullBackup: (data: FullBackupData) => void;
  supervisorPassword: string;
  setSupervisorPassword: (password: string) => void;
  logout: () => void;
  isLoading: boolean;
  initiateLogoutCheck: () => void;
  appName: string;
  setAppName: (name: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  firebaseConnectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting' | 'restricted';
  firebaseConfig: any;
  setFirebaseConfig: (config: any) => void;
  isDistributable: boolean;
  isPublishedConnected: boolean;
  currentUser: User | null;

  immunizationPassword: string;
  setImmunizationPassword: (p: string) => void;

  dropdownConfig: DropdownConfig;
  updateDropdownConfig: (config: DropdownConfig) => void;
  resetDropdownConfigToDefault: () => void;
  addDropdownCategory: (tab: 'partnerships' | 'initiatives', name: string, items?: string[], icon?: string) => void;
  updateDropdownCategory: (tab: 'partnerships' | 'initiatives', categoryId: string, newName: string, items?: string[]) => void;
  deleteDropdownCategory: (tab: 'partnerships' | 'initiatives', categoryId: string) => void;
  addDropdownItem: (tab: 'partnerships' | 'initiatives', categoryId: string, item: string) => void;
  updateDropdownItem: (tab: 'partnerships' | 'initiatives', categoryId: string, itemIndex: number, newItem: string) => void;
  deleteDropdownItem: (tab: 'partnerships' | 'initiatives', categoryId: string, itemIndex: number) => void;

  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // Real-time Cloud Auth
  googleUser: FirebaseUser | null;
  signInWithGoogleAccount: () => Promise<void>;
  signOutGoogleAccount: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);

const THEME_KEY = 'excellenceTheme_v2';
const LOCAL_STORAGE_DATA_KEY = 'excellenceAppData_local_cache_v5';
const BUILD_ID_KEY = 'app_deployment_build_id';

const cleanAppName = (name?: string) => {
    if (!name || name === 'Expand Program on Immunization' || name.includes('Immunization') || name.includes('EPI') || name === 'Hafiz App' || name === 'Yousuf App') {
        return DEFAULT_APP_NAME;
    }
    return name;
};

const App: React.FC = () => {
  const isDistributedEnv = (window as any).__IS_DISTRIBUTED__ === true;

  // Flash clear check on new deployments
  useEffect(() => {
    const currentBuildId = (window as any).__BUILD_ID__;
    if (currentBuildId) {
        const lastBuildId = localStorage.getItem(BUILD_ID_KEY);
        if (lastBuildId && lastBuildId !== currentBuildId) {
            console.log("New Build Detected. Resetting build version...");
            localStorage.setItem(BUILD_ID_KEY, currentBuildId);
        } else if (!lastBuildId) {
            localStorage.setItem(BUILD_ID_KEY, currentBuildId);
        }
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      if (isDistributedEnv) return null;
      try {
          const savedUser = localStorage.getItem(CURRENT_USER_KEY);
          if (!savedUser) return null;
          const user = JSON.parse(savedUser);
          return { ...user, id: Number(user.id) }; 
      } catch (e) { return null; }
  });

  const [data, setData] = useState<{
    users: User[];
    reports: MonthlyReport[];
    deletedItems: DeletedItem[];
  }>({ 
    users: INITIAL_USERS.map(u => ({ ...u, id: Number(u.id) })), 
    reports: [], 
    deletedItems: [] 
  });
  
  const [supervisorPassword, setSupervisorPasswordState] = useState<string>('123');
  const [immunizationPassword, setImmunizationPasswordState] = useState<string>('12345');
  const [customLogo, setCustomLogoState] = useState<string | null>(null);
  const [appName, setAppNameState] = useState<string>(DEFAULT_APP_NAME);
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark';
  });

  const [firebaseConfigState, setFirebaseConfigState] = useState<any>(HARDCODED_FIREBASE_CONFIG);
  const [firebaseConnectionStatus, setFirebaseConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'connecting' | 'restricted'>('connecting');
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isDistributable, setIsDistributable] = useState(false);
  const [isPublishedConnected, setIsPublishedConnected] = useState(true);

  const handleRetryConnection = useCallback(() => {
    setFirebaseConnectionStatus('connecting');
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  }, []);

  const [dropdownConfig, setDropdownConfigState] = useState<DropdownConfig>(() => {
    try {
      const saved = localStorage.getItem(DROPDOWN_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.partnershipsCategories) && Array.isArray(parsed.initiativesCategories)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved dropdown config:", e);
    }
    return DEFAULT_DROPDOWN_CONFIG;
  });

  const updateDropdownConfig = useCallback((newConfig: DropdownConfig) => {
    const configWithTimestamp = { ...newConfig, updatedAt: Date.now() };
    setDropdownConfigState(configWithTimestamp);
    try {
      localStorage.setItem(DROPDOWN_CONFIG_KEY, JSON.stringify(configWithTimestamp));
    } catch (e) {}
    saveFirestoreDropdownConfig(configWithTimestamp).catch(err => {
      console.warn("Could not save dropdown config to Firestore:", err);
    });
  }, []);

  const resetDropdownConfigToDefault = useCallback(() => {
    updateDropdownConfig(DEFAULT_DROPDOWN_CONFIG);
  }, [updateDropdownConfig]);

  const addDropdownCategory = useCallback((tab: 'partnerships' | 'initiatives', name: string, items: string[] = [], icon?: string) => {
    const targetKey = tab === 'partnerships' ? 'partnershipsCategories' : 'initiativesCategories';
    const newCategory: DropdownCategory = {
      id: `${tab === 'partnerships' ? 'part_cat' : 'init_cat'}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      name: name.trim(),
      items: items.filter(Boolean),
      icon: icon || (tab === 'partnerships' ? '🏛️' : '🏷️')
    };
    setDropdownConfigState(prev => {
      const updated = {
        ...prev,
        [targetKey]: [...prev[targetKey], newCategory],
        updatedAt: Date.now()
      };
      saveFirestoreDropdownConfig(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const updateDropdownCategory = useCallback((tab: 'partnerships' | 'initiatives', categoryId: string, newName: string, items?: string[]) => {
    const targetKey = tab === 'partnerships' ? 'partnershipsCategories' : 'initiativesCategories';
    setDropdownConfigState(prev => {
      const updatedList = prev[targetKey].map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            name: newName.trim(),
            items: items !== undefined ? items : cat.items
          };
        }
        return cat;
      });
      const updated = {
        ...prev,
        [targetKey]: updatedList,
        updatedAt: Date.now()
      };
      saveFirestoreDropdownConfig(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const deleteDropdownCategory = useCallback((tab: 'partnerships' | 'initiatives', categoryId: string) => {
    const targetKey = tab === 'partnerships' ? 'partnershipsCategories' : 'initiativesCategories';
    setDropdownConfigState(prev => {
      const updatedList = prev[targetKey].filter(cat => cat.id !== categoryId);
      const updated = {
        ...prev,
        [targetKey]: updatedList,
        updatedAt: Date.now()
      };
      saveFirestoreDropdownConfig(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const addDropdownItem = useCallback((tab: 'partnerships' | 'initiatives', categoryId: string, item: string) => {
    const cleanItem = item.trim();
    if (!cleanItem) return;
    const targetKey = tab === 'partnerships' ? 'partnershipsCategories' : 'initiativesCategories';
    setDropdownConfigState(prev => {
      const updatedList = prev[targetKey].map(cat => {
        if (cat.id === categoryId) {
          if (cat.items.includes(cleanItem)) return cat;
          return {
            ...cat,
            items: [...cat.items, cleanItem]
          };
        }
        return cat;
      });
      const updated = {
        ...prev,
        [targetKey]: updatedList,
        updatedAt: Date.now()
      };
      saveFirestoreDropdownConfig(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const updateDropdownItem = useCallback((tab: 'partnerships' | 'initiatives', categoryId: string, itemIndex: number, newItem: string) => {
    const cleanItem = newItem.trim();
    if (!cleanItem) return;
    const targetKey = tab === 'partnerships' ? 'partnershipsCategories' : 'initiativesCategories';
    setDropdownConfigState(prev => {
      const updatedList = prev[targetKey].map(cat => {
        if (cat.id === categoryId) {
          const newItems = [...cat.items];
          newItems[itemIndex] = cleanItem;
          return {
            ...cat,
            items: newItems
          };
        }
        return cat;
      });
      const updated = {
        ...prev,
        [targetKey]: updatedList,
        updatedAt: Date.now()
      };
      saveFirestoreDropdownConfig(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const deleteDropdownItem = useCallback((tab: 'partnerships' | 'initiatives', categoryId: string, itemIndex: number) => {
    const targetKey = tab === 'partnerships' ? 'partnershipsCategories' : 'initiativesCategories';
    setDropdownConfigState(prev => {
      const updatedList = prev[targetKey].map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.filter((_, idx) => idx !== itemIndex)
          };
        }
        return cat;
      });
      const updated = {
        ...prev,
        [targetKey]: updatedList,
        updatedAt: Date.now()
      };
      saveFirestoreDropdownConfig(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMobileInstallModal, setShowMobileInstallModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDbHelpModal, setShowDbHelpModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      const dismissed = localStorage.getItem('pwa_install_banner_dismissed') === 'true';
      if (!isStandalone && !dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
        localStorage.setItem('pwa_install_banner_dismissed', 'true');
      }
      setDeferredPrompt(null);
    }
  };

  // 1. Initial Local Cache Load
  useEffect(() => {
    const localData = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.users && parsed.users.length > 0) {
          setData(prev => ({
            ...prev,
            users: deduplicateById(parsed.users.map((u: any) => ({ ...u, id: Number(u.id) }))),
            reports: parsed.reports ? deduplicateById(parsed.reports.map((r: any) => ({ ...r, id: Number(r.id) }))) : prev.reports,
            deletedItems: parsed.deletedItems || []
          }));
        }
        if (parsed.appName) setAppNameState(cleanAppName(parsed.appName));
        if (parsed.customLogo) setCustomLogoState(parsed.customLogo);
        if (parsed.supervisorPassword) setSupervisorPasswordState(parsed.supervisorPassword);
        if (parsed.immunizationPassword) setImmunizationPasswordState(parsed.immunizationPassword);
      } catch (e) {
        console.warn("Failed to parse local storage cache:", e);
      }
    }
  }, []);

  // 2. Real-time Firebase Firestore Synchronizer
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let isMounted = true;

    // Test connection proactively
    testConnection().then((isSuccess) => {
      if (isSuccess && isMounted) {
        console.log("Database connection verified successfully.");
      }
    }).catch((err) => {
      console.warn("Database test connection check:", err);
    });

    tryAutoAuth().catch(console.warn);

    // Track Auth state
    const authUnsub = subscribeAuthState((u) => {
      if (isMounted) setGoogleUser(u);
    });
    unsubs.push(authUnsub);

    // Realtime Users Listener
    const unsubUsers = subscribeToUsers(
      (remoteUsers) => {
        if (!isMounted) return;
        if (remoteUsers.length === 0) {
          // If Firestore users collection is empty, seed initial institutions
          seedInitialUsersIfEmpty(INITIAL_USERS);
        } else {
          setData(prev => ({
            ...prev,
            users: deduplicateById(remoteUsers)
          }));
        }
        setFirebaseConnectionStatus('connected');
        setIsLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error("Users sync listener error:", err);
        if (err?.code === 'permission-denied') {
          setFirebaseConnectionStatus('restricted');
        } else {
          setFirebaseConnectionStatus('error');
        }
        setIsLoading(false);
      }
    );
    unsubs.push(unsubUsers);

    // Realtime Reports Listener
    const unsubReports = subscribeToReports(
      (remoteReports) => {
        if (!isMounted) return;
        setData(prev => ({
          ...prev,
          reports: deduplicateById(remoteReports)
        }));
        setFirebaseConnectionStatus('connected');
        setIsLoading(false);
      },
      (err) => {
        console.error("Reports sync listener error:", err);
      }
    );
    unsubs.push(unsubReports);

    // Realtime App Config Listener
    const unsubConfig = subscribeToAppConfig(
      (remoteConfig) => {
        if (!isMounted) return;
        if (remoteConfig.appName) setAppNameState(cleanAppName(remoteConfig.appName));
        if (remoteConfig.customLogo !== undefined) setCustomLogoState(remoteConfig.customLogo);
        if (remoteConfig.supervisorPassword) setSupervisorPasswordState(remoteConfig.supervisorPassword);
        if (remoteConfig.immunizationPassword) setImmunizationPasswordState(remoteConfig.immunizationPassword);
      },
      (err) => {
        console.warn("App config sync listener warning:", err);
      }
    );
    unsubs.push(unsubConfig);

    // Realtime Dropdowns Listener
    const unsubDropdowns = subscribeToDropdownConfig(
      (remoteDropdownConfig) => {
        if (!isMounted) return;
        if (remoteDropdownConfig && remoteDropdownConfig.partnershipsCategories) {
          setDropdownConfigState(remoteDropdownConfig);
        }
      },
      (err) => {
        console.warn("Dropdown config sync listener warning:", err);
      }
    );
    unsubs.push(unsubDropdowns);

    return () => {
      isMounted = false;
      unsubs.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
    };
  }, [retryCount]);

  // Save to local cache on state changes for offline reliability
  useEffect(() => {
    if (!isLoading) {
      const dataToSave: FullBackupData = {
        users: data.users,
        reports: data.reports,
        deletedItems: data.deletedItems,
        customLogo,
        supervisorPassword,
        immunizationPassword,
        appName,
        isDistributable,
        isPublishedConnected,
        firebaseConfig: firebaseConfigState
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.warn("Quota exceeded or error saving to localStorage", e);
      }
    }
  }, [data, appName, customLogo, supervisorPassword, immunizationPassword, firebaseConfigState, isDistributable, isPublishedConnected, isLoading]);

  // Data Mutation Handlers with Real-Time Cloud Updates
  const addReport = (rep: Omit<MonthlyReport, 'id' | 'updatedAt'>) => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const newReport: MonthlyReport = {
      ...rep,
      entryPerson: rep.entryPerson || '',
      id: newId,
      institutionId: Number(rep.institutionId),
      updatedAt: Date.now()
    };
    // Optimistic local update
    setData(prev => ({
      ...prev,
      reports: deduplicateById([newReport, ...prev.reports])
    }));
    // Real-time Firestore write
    saveFirestoreReport(newReport).catch(err => {
      console.error("Failed to sync new report to Firestore:", err);
    });
  };

  const updateReport = (rep: MonthlyReport) => {
    const updatedReport: MonthlyReport = {
      ...rep,
      entryPerson: rep.entryPerson || '',
      id: Number(rep.id),
      institutionId: Number(rep.institutionId),
      updatedAt: Date.now()
    };
    setData(prev => ({
      ...prev,
      reports: deduplicateById(prev.reports.map(r => r.id === updatedReport.id ? updatedReport : r))
    }));
    saveFirestoreReport(updatedReport).catch(err => {
      console.error("Failed to sync report update to Firestore:", err);
    });
  };

  const deleteReport = (reportId: number) => {
    const id = Number(reportId);
    setData(prev => ({
      ...prev,
      reports: prev.reports.filter(r => r.id !== id)
    }));
    deleteFirestoreReport(id).catch(err => {
      console.error("Failed to delete report from Firestore:", err);
    });
  };

  const deleteAllReports = async () => {
    const reportIds = data.reports.map(r => r.id);
    setData(prev => ({ ...prev, reports: [] }));
    await Promise.allSettled(reportIds.map(id => deleteFirestoreReport(id)));
  };

  const deleteAllData = async () => {
    await deleteAllReports();
    setData(prev => ({ ...prev, users: INITIAL_USERS }));
    await seedInitialUsersIfEmpty(INITIAL_USERS);
  };

  const addInstitution = (name: string, state?: string, population?: { [year: number]: number }) => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const newUser: User = {
      id: newId,
      name: name.trim(),
      state: state || '',
      role: UserRole.INSTITUTION,
      pin: '123',
      population: population || {},
      updatedAt: Date.now()
    };
    setData(prev => ({
      ...prev,
      users: deduplicateById([...prev.users, newUser])
    }));
    saveFirestoreUser(newUser).catch(err => {
      console.error("Failed to sync new institution to Firestore:", err);
    });
  };

  const updateInstitution = (institution: User) => {
    const updatedUser: User = {
      ...institution,
      id: Number(institution.id),
      updatedAt: Date.now()
    };
    setData(prev => ({
      ...prev,
      users: deduplicateById(prev.users.map(u => u.id === updatedUser.id ? updatedUser : u))
    }));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
    saveFirestoreUser(updatedUser).catch(err => {
      console.error("Failed to sync institution update to Firestore:", err);
    });
  };

  const deleteInstitution = (institutionId: number) => {
    const id = Number(institutionId);
    setData(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id)
    }));
    deleteFirestoreUser(id).catch(err => {
      console.error("Failed to delete institution from Firestore:", err);
    });
  };

  const handleLogout = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('⚠️ تنبيه: لديك تعديلات غير محفوظة. هل ترغب بتسجيل الخروج على أية حال؟')) return;
    }
    setCurrentUser(null);
    setHasUnsavedChanges(false);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const handleLogin = (user: User) => {
    const cleanUser = { ...user, id: Number(user.id) };
    setCurrentUser(cleanUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(cleanUser));
  };

  const signInWithGoogleAccount = async () => {
    try {
      const u = await signInWithGoogle();
      setGoogleUser(u);
    } catch (e) {
      console.error("Error signing in with Google:", e);
    }
  };

  const signOutGoogleAccount = async () => {
    try {
      await signOutFirebase();
      setGoogleUser(null);
    } catch (e) {
      console.error("Error signing out Google:", e);
    }
  };

  const isMandatoryPasswordChange = currentUser?.role === UserRole.INSTITUTION && currentUser?.pin === '123';

  // GATE: Do NOT open LoginScreen or the app until the database connection is verified and established ('connected')
  if (firebaseConnectionStatus !== 'connected' || isLoading) {
    if (firebaseConnectionStatus === 'error') {
      return (
        <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-4 transition-colors ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-gray-900'}`}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-red-300 dark:border-red-900 text-center animate-fade-in space-y-5">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-red-700 dark:text-red-400 mb-2">
                تعذر الاتصال بقاعدة البيانات
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                لا يمكن فتح صفحة تسجيل الدخول إلا بعد إتمام الاتصال بقاعدة البيانات السحابية (Firebase) بنجاح لضمان مزامنة البيانات بشكل سليم وفوري.
              </p>
            </div>
            
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300">
              يرجى التحقق من اتصال الإنترنت، ثم الضغط على زر إعادة المحاولة أدناه.
            </div>

            <button
              onClick={handleRetryConnection}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white rounded-xl font-black text-base shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🔄 إعادة محاولة الاتصال بقاعدة البيانات</span>
            </button>
          </div>
        </div>
      );
    }

    if (firebaseConnectionStatus === 'restricted') {
      return (
        <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-4 transition-colors ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-gray-900'}`}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-amber-300 dark:border-amber-700 text-center animate-fade-in space-y-5">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-300 mb-2">
                صلاحيات الاتصال السحابي مقيدة
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                يتطلب الاتصال بقاعدة البيانات التحقق لتفعيل المزامنة المباشرة.
              </p>
            </div>

            <button
              onClick={signInWithGoogleAccount}
              className="w-full py-3.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>تسجيل الدخول بحساب Google للاتصال السحابي</span>
            </button>

            <button
              onClick={handleRetryConnection}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs transition-all"
            >
              إعادة فحص الاتصال
            </button>
          </div>
        </div>
      );
    }

    // Default connecting / initializing state: Prevents login page from opening
    return (
      <div className={`min-h-[100dvh] flex flex-col items-center justify-center p-4 transition-colors ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-gray-900'}`}>
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700 text-center animate-fade-in flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-700"></div>

          <img 
            src={customLogo || '/logo.png'} 
            alt="شعار البرنامج" 
            className="h-28 w-28 sm:h-32 sm:w-32 mx-auto mb-4 object-contain drop-shadow-xl"
          />
          
          <div className="relative mb-5 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-700 dark:border-t-blue-400 animate-spin"></div>
            <span className="absolute text-xl">⚡</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-200 mb-2 leading-snug">
            جاري الاتصال بقاعدة البيانات...
          </h2>
          
          <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 max-w-xs mb-4 leading-relaxed">
            يتم فحص الاتصال السحابي وتأكيد المزامنة المباشرة قبل فتح صفحة تسجيل الدخول.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-full border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-800 dark:text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            <span>انتظار تأكيد الاتصال بقاعدة البيانات</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      users: data.users,
      reports: data.reports,
      addReport,
      updateReport,
      deleteReport,
      deleteAllReports,
      deleteAllData,
      loadMockData: () => {
        const mockObj = MOCK_USERS.map(u => ({ ...u, id: Number(u.id) }));
        setData({ users: mockObj, reports: [], deletedItems: [] });
        mockObj.forEach(u => saveFirestoreUser(u));
      },
      customLogo,
      setCustomLogo: (logo) => {
        setCustomLogoState(logo);
        saveFirestoreAppConfig({ customLogo: logo });
      },
      addInstitution,
      updateInstitution,
      deleteInstitution,
      importFullBackup: (d) => {
        if (d.users) {
          setData(prev => ({ ...prev, users: deduplicateById(d.users.map(u => ({ ...u, id: Number(u.id) }))) }));
          d.users.forEach(u => saveFirestoreUser({ ...u, id: Number(u.id) }));
        }
        if (d.reports) {
          setData(prev => ({ ...prev, reports: deduplicateById(d.reports.map(r => ({ ...r, id: Number(r.id) }))) }));
          d.reports.forEach(r => saveFirestoreReport({ ...r, id: Number(r.id) }));
        }
        if (d.appName) {
          setAppNameState(d.appName);
          saveFirestoreAppConfig({ appName: d.appName });
        }
        if (d.supervisorPassword) {
          setSupervisorPasswordState(d.supervisorPassword);
          saveFirestoreAppConfig({ supervisorPassword: d.supervisorPassword });
        }
        if (d.immunizationPassword) {
          setImmunizationPasswordState(d.immunizationPassword);
          saveFirestoreAppConfig({ immunizationPassword: d.immunizationPassword });
        }
      },
      supervisorPassword,
      setSupervisorPassword: (p) => {
        setSupervisorPasswordState(p);
        saveFirestoreAppConfig({ supervisorPassword: p });
      },
      logout: handleLogout,
      isLoading,
      initiateLogoutCheck: handleLogout,
      appName,
      setAppName: (n) => {
        setAppNameState(n);
        saveFirestoreAppConfig({ appName: n });
      },
      darkMode,
      toggleDarkMode: () => setDarkMode(!darkMode),
      firebaseConnectionStatus,
      firebaseConfig: firebaseConfigState,
      setFirebaseConfig: setFirebaseConfigState,
      isDistributable,
      isPublishedConnected,
      currentUser,
      immunizationPassword,
      setImmunizationPassword: (p) => {
        setImmunizationPasswordState(p);
        saveFirestoreAppConfig({ immunizationPassword: p });
      },
      dropdownConfig,
      updateDropdownConfig,
      resetDropdownConfigToDefault,
      addDropdownCategory,
      updateDropdownCategory,
      deleteDropdownCategory,
      addDropdownItem,
      updateDropdownItem,
      deleteDropdownItem,
      setHasUnsavedChanges,
      googleUser,
      signInWithGoogleAccount,
      signOutGoogleAccount
    }}>
      <FaviconManager />
      <div className={`min-h-[100dvh] flex flex-col transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-gray-900'}`}>
        {!currentUser ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <div className="flex flex-col flex-1 min-h-[100dvh]">
            <Header 
              user={currentUser} 
              onShowHelp={() => setShowHelpModal(true)} 
              onInitiateLogoutCheck={handleLogout} 
              onShowMobileInstallModal={() => setShowMobileInstallModal(true)} 
              onShowChangePassword={() => setShowChangePasswordModal(true)}
              onShowDbHelp={() => setShowDbHelpModal(true)}
            />
            <main className="flex-1 overflow-y-auto p-2.5 sm:p-6 lg:p-8">
              {currentUser.role === UserRole.SUPERVISOR && <SupervisorDashboard />}
              {currentUser.role === UserRole.IMMUNIZATION && <HealthPromotionDashboard />}
              {currentUser.role === UserRole.INSTITUTION && <InstitutionDashboard institutionId={currentUser.id} />}
            </main>
          </div>
        )}

        {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
        {showMobileInstallModal && <MobileInstallModal onClose={() => setShowMobileInstallModal(false)} />}
        
        {showDbHelpModal && (
          <Modal title="حالة الاتصال السحابي (Firebase Realtime)" onClose={() => setShowDbHelpModal(false)}>
            <div className="space-y-4 text-right">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-700">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200">
                    {firebaseConnectionStatus === 'connected' ? 'المزامنة السحابية المباشرة نشطة (Live)' : 'جاري الاتصال بالسحابة...'}
                  </h4>
                  <p className="text-emerald-800 dark:text-emerald-300 text-xs">
                    أي تقرير أو مؤسسة يتم إضافتها تتزامن فورياً مع جميع المستخدمين والمشرفين في الوقت الحقيقي.
                  </p>
                </div>
              </div>

              {googleUser ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <button 
                    onClick={signOutGoogleAccount}
                    className="text-xs text-red-600 hover:underline font-bold"
                  >
                    تسجيل الخروج من الحساب
                  </button>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-bold">الحساب المتصل: </span>
                    <span className="font-mono">{googleUser.email || googleUser.displayName || 'Google Account'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">يمكنك ربط حساب Google الخاص بك لتأمين الاتصال السحابي:</p>
                  <button
                    onClick={signInWithGoogleAccount}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow"
                  >
                    تسجيل الدخول بحساب Google
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                قاعدة البيانات تعمل على Firebase Cloud Firestore مع مزامنة لحظية فورية وتخزين احتياطي محلي لضمان العمل حتى عند ضعف الإنترنت.
              </p>
            </div>
          </Modal>
        )}

        {(showChangePasswordModal || isMandatoryPasswordChange) && currentUser && (
          <ChangePasswordModal 
            onClose={() => setShowChangePasswordModal(false)} 
            isMandatory={isMandatoryPasswordChange}
            currentStoredPassword={
              currentUser.role === UserRole.SUPERVISOR ? supervisorPassword : 
              currentUser.role === UserRole.IMMUNIZATION ? immunizationPassword :
              (currentUser.pin || '123')
            }
            onSave={(p) => {
              if (currentUser.role === UserRole.SUPERVISOR) {
                setSupervisorPasswordState(p);
                saveFirestoreAppConfig({ supervisorPassword: p });
              } else if (currentUser.role === UserRole.IMMUNIZATION) {
                setImmunizationPasswordState(p);
                saveFirestoreAppConfig({ immunizationPassword: p });
              } else if (currentUser.role === UserRole.INSTITUTION) {
                const updatedUser: User = { ...currentUser, id: Number(currentUser.id), pin: p, updatedAt: Date.now() };
                updateInstitution(updatedUser);
              }
            }} 
          />
        )}

        {showInstallBanner && (
          <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-2xl border-2 border-gold-light z-50 flex flex-col gap-4 sm:left-auto sm:right-4 sm:max-w-xs animate-fade-in golden-frame">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden shadow-inner border border-gray-100 dark:border-gray-700 bg-white">
                <img 
                  src={customLogo || '/logo.png'} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 dark:text-white text-lg leading-tight">{appName}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تثبيت التطبيق على جهازك</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setShowInstallBanner(false);
                  localStorage.setItem('pwa_install_banner_dismissed', 'true');
                }} 
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ليس الآن
              </button>
              <button 
                onClick={handleInstallClick} 
                className="flex-1 px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-sm font-extrabold rounded-xl shadow-lg transition-all transform active:scale-95"
              >
                تثبيت
              </button>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
