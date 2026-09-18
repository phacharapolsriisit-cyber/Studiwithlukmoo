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
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  lastSyncTime: Date | null;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginAsDemo: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  markSyncing: () => void;
  markSynced: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'lukmoo_demo_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());

  const markSyncing = () => setSyncStatus('syncing');
  const markSynced = () => {
    setSyncStatus('synced');
    setLastSyncTime(new Date());
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
        return;
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    // 2. Check for redirect result from Google on mobile redirect return
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          localStorage.removeItem(DEMO_USER_KEY);
          setUser({
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            isAnonymous: result.user.isAnonymous,
            isDemo: false,
          });
          markSynced();
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result warning:', err?.message);
      });

    // 3. Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If we have an active demo session, don't overwrite with null
      const currentDemo = localStorage.getItem(DEMO_USER_KEY);
      if (currentDemo && !currentUser) {
        setLoading(false);
        return;
      }

      if (currentUser) {
        // Clear demo flag if real user logs in
        localStorage.removeItem(DEMO_USER_KEY);
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          isAnonymous: currentUser.isAnonymous,
          isDemo: false
        });

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
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
            setProfile(newProfile);
          }
          markSynced();
        } catch (err: any) {
          // If firestore fails (e.g. offline or rules), fallback to basic profile
          setProfile({
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
          });
        }
      } else {
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
    // Try anonymous login first if enabled in Firebase
    let uid = 'demo_student_' + Math.random().toString(36).substring(2, 9);
    try {
      const anonRes = await signInAnonymously(auth);
      if (anonRes?.user) {
        uid = anonRes.user.uid;
      }
    } catch {
      // Anonymous might also be disabled in Firebase console, use custom demo uid
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
      await signOut(auth);
      setUser(null);
      setProfile(null);
      markSynced();
    } catch (error) {
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
        setProfile({ ...profile, ...data, updatedAt: new Date().toISOString() });
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      syncStatus,
      lastSyncTime,
      loginWithGoogle,
      loginWithGoogleRedirect,
      loginWithEmail,
      registerWithEmail,
      loginAsDemo,
      logout,
      updateProfileData,
      markSyncing,
      markSynced
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
