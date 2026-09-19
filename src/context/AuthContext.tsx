import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  updateProfile, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc,
  type User 
} from '../firebase';
import { UserProfile } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline' | 'local-only';
  lastSyncTime: Date | null;
  isDemoSession: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginAsDemo: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  markSyncing: () => void;
  markSynced: () => void;
  markSyncError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'lukmoo_demo_user_session';
const AUTH_USER_CACHE_KEY = 'lukmoo_authenticated_user_session';
const USER_PROFILE_CACHE_KEY = 'lukmoo_authenticated_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const savedDemo = localStorage.getItem(DEMO_USER_KEY);
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo);
        if (parsed?.user) return parsed.user;
      }
      const savedAuth = localStorage.getItem(AUTH_USER_CACHE_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed) return parsed;
      }
    } catch {}
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const savedDemo = localStorage.getItem(DEMO_USER_KEY);
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo);
        if (parsed?.profile) return parsed.profile;
      }
      const savedProfile = localStorage.getItem(USER_PROFILE_CACHE_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed) return parsed;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'local-only'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  const isDemoSession = !!user?.isDemo;

  const markSyncing = () => {
    if (user?.isDemo) {
      setSyncStatus('local-only');
    } else {
      setSyncStatus('syncing');
    }
  };

  const markSynced = () => {
    if (user?.isDemo) {
      setSyncStatus('local-only');
    } else {
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    }
  };

  const markSyncError = () => {
    if (!user?.isDemo) {
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    // 1. Check for existing Demo user session first
    const savedDemo = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser(parsed.user);
        setProfile(parsed.profile);
        setLoading(false);
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    // 2. Check for redirect result from Google on mobile redirect return
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          localStorage.removeItem(DEMO_USER_KEY);
          const appUser: AppUser = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            isAnonymous: result.user.isAnonymous,
            isDemo: false,
          };
          localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(appUser));
          setUser(appUser);
          markSynced();
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result warning:', err?.message);
      });

    // 3. Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If we have an active demo session and no real currentUser, don't overwrite with null
      const currentDemo = localStorage.getItem(DEMO_USER_KEY);
      if (currentDemo && !currentUser) {
        setLoading(false);
        return;
      }

      if (currentUser) {
        // Clear demo flag if real user logs in
        localStorage.removeItem(DEMO_USER_KEY);
        const appUser: AppUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          isAnonymous: currentUser.isAnonymous,
          isDemo: false
        };
        localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(appUser));
        setUser(appUser);

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const prof = docSnap.data() as UserProfile;
            localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(prof));
            setProfile(prof);
          } else {
            // First time user registration in firestore
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || 'นักเรียนติวเตอร์',
              photoURL: currentUser.photoURL || '',
              bio: 'พร้อมเก็บเนื้อหาทุกวิชาและลุยทุกสนามสอบ!',
              schoolOrUniv: 'มัธยมศึกษาตอนปลาย / มหาวิทยาลัย',
              targetExam: 'TCAS / A-Level / สอบกลางภาค-ปลายภาค',
              studyGoalHours: 15,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(newProfile));
            setProfile(newProfile);
          }
          markSynced();
        } catch {
          // If firestore fails (e.g. offline or rules), fallback to cached or basic profile
          const cachedProfileStr = localStorage.getItem(USER_PROFILE_CACHE_KEY);
          if (cachedProfileStr) {
            try {
              setProfile(JSON.parse(cachedProfileStr));
            } catch {}
          } else {
            const fallbackProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || 'นักเรียน',
              photoURL: currentUser.photoURL || '',
              bio: 'มุ่งมั่นเตรียมสอบและเก็บเนื้อหาคอร์สติว',
              schoolOrUniv: '',
              targetExam: 'TCAS / A-Level',
              studyGoalHours: 15,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(fallbackProfile));
            setProfile(fallbackProfile);
          }
          markSynced();
        }
      } else {
        localStorage.removeItem(AUTH_USER_CACHE_KEY);
        localStorage.removeItem(USER_PROFILE_CACHE_KEY);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      markSyncing();
      // Clear any prior demo session
      localStorage.removeItem(DEMO_USER_KEY);

      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        // If popup was blocked or fails on mobile browsers, fallback smoothly to redirect
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/cancelled-popup-request' ||
          popupErr?.code === 'auth/popup-closed-by-user'
        ) {
          // On mobile or if popup was blocked, we can either throw or let user choose redirect
          throw popupErr;
        }
        throw popupErr;
      }
      
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isAnonymous: result.user.isAnonymous,
        isDemo: false
      });

      try {
        const userRef = doc(db, 'users', result.user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const newProfile: UserProfile = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || 'นักเรียน Lukmoo',
            photoURL: result.user.photoURL || '',
            bio: 'มุ่งมั่นเตรียมสอบและเก็บเนื้อหาคอร์สติว',
            schoolOrUniv: '',
            targetExam: 'TCAS / A-Level',
            studyGoalHours: 15,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(snap.data() as UserProfile);
        }
      } catch {
        // Fallback profile if offline
        setProfile({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || 'นักเรียน Lukmoo',
          photoURL: result.user.photoURL || '',
          bio: 'มุ่งมั่นเตรียมสอบและเก็บเนื้อหาคอร์สติว',
          schoolOrUniv: '',
          targetExam: 'TCAS / A-Level',
          studyGoalHours: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      markSynced();
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        // User closed popup; treat as soft cancellation, don't set system error
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
      throw error;
    }
  };

  const loginWithGoogleRedirect = async () => {
    try {
      markSyncing();
      localStorage.removeItem(DEMO_USER_KEY);
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      markSyncing();
      localStorage.removeItem(DEMO_USER_KEY);
      await signInWithEmailAndPassword(auth, email, pass);
      markSynced();
    } catch (error: any) {
      setSyncStatus('error');
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      markSyncing();
      localStorage.removeItem(DEMO_USER_KEY);
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName: name });
      
      const newProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name || 'นักเรียน Lukmoo',
        photoURL: '',
        bio: 'มุ่งมั่นเตรียมสอบและเก็บเนื้อหาคอร์สติว',
        schoolOrUniv: '',
        targetExam: 'TCAS / A-Level',
        studyGoalHours: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', result.user.uid), newProfile);
      } catch {
        // Continue even if firestore write delayed
      }
      setProfile(newProfile);
      markSynced();
    } catch (error: any) {
      setSyncStatus('error');
      throw error;
    }
  };

  // Instant Demo Student Login (allows testing when email/password is not yet toggled on or popups are blocked)
  const loginAsDemo = async (name?: string) => {
    markSyncing();
    // Maintain a stable demo uid so demo users never lose their data across demo logins or page refreshes
    let uid = 'demo_student_user';
    const existingDemo = localStorage.getItem(DEMO_USER_KEY);
    if (existingDemo) {
      try {
        const parsed = JSON.parse(existingDemo);
        if (parsed?.user?.uid) uid = parsed.user.uid;
      } catch {}
    } else {
      try {
        const anonRes = await signInAnonymously(auth);
        if (anonRes?.user) {
          uid = anonRes.user.uid;
        }
      } catch {
        // Anonymous might also be disabled in Firebase console, use custom demo uid
      }
    }

    const demoUser: AppUser = {
      uid,
      email: 'student.demo@lukmoo.app',
      displayName: name || 'นักเรียนตัวอย่าง (Demo Student)',
      photoURL: '',
      isAnonymous: true,
      isDemo: true,
    };

    const demoProfile: UserProfile = {
      uid,
      email: 'student.demo@lukmoo.app',
      displayName: name || 'นักเรียนตัวอย่าง (Demo Student)',
      photoURL: '',
      bio: 'กำลังทดลองใช้งานระบบคอร์สติวและคลังความรู้ Lukmoo Tutor',
      schoolOrUniv: 'โรงเรียนเตรียมอุดมศึกษา / สาธิตฯ',
      targetExam: 'TCAS / A-Level',
      studyGoalHours: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save demo session
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ user: demoUser, profile: demoProfile }));
    setUser(demoUser);
    setProfile(demoProfile);
    markSynced();
  };

  const logout = async () => {
    try {
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(AUTH_USER_CACHE_KEY);
      localStorage.removeItem(USER_PROFILE_CACHE_KEY);
      await signOut(auth);
      setUser(null);
      setProfile(null);
      markSynced();
    } catch (error) {
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(AUTH_USER_CACHE_KEY);
      localStorage.removeItem(USER_PROFILE_CACHE_KEY);
      setUser(null);
      setProfile(null);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      markSyncing();
      const updated = {
        ...profile,
        ...data,
        updatedAt: new Date().toISOString(),
      } as UserProfile;

      if (user.isDemo) {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ user, profile: updated }));
        setProfile(updated);
        markSynced();
        return;
      }

      localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(updated));
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, updated, { merge: true });
      setProfile(updated);
      
      if (auth.currentUser && data.displayName && data.displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      }
      markSynced();
    } catch (error) {
      // Fallback local update
      if (profile) {
        const updated = { ...profile, ...data, updatedAt: new Date().toISOString() };
        localStorage.setItem(USER_PROFILE_CACHE_KEY, JSON.stringify(updated));
        setProfile(updated);
      }
      markSynced();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      syncStatus,
      lastSyncTime,
      isDemoSession,
      loginWithGoogle,
      loginWithGoogleRedirect,
      loginWithEmail,
      registerWithEmail,
      loginAsDemo,
      logout,
      updateProfileData,
      markSyncing,
      markSynced,
      markSyncError
    }}>
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
