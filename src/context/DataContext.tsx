import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { 
  db, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot,
  writeBatch
} from '../firebase';
import { useAuth } from './AuthContext';
import { Course, CourseMaterial, CalendarEvent, CommunityPost, PostComment, SharedItemPayload, PortfolioItem } from '../types';
import { INITIAL_COMMUNITY_POSTS } from '../data/mockCommunity';
import { convertTCASToCalendarEvents } from '../data/tcas70Schedule';

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {};
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      clean[key] = value
        .filter(item => item !== undefined)
        .map(item => {
          if (item !== null && typeof item === 'object' && !(item instanceof Date)) {
            return sanitizeForFirestore(item);
          }
          return item;
        });
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      clean[key] = sanitizeForFirestore(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const code = err?.code || '';
  const msg = err?.message || String(err || '');
  return code === 'resource-exhausted' ||
         code === 'permission-denied' ||
         msg.includes('Quota limit exceeded') ||
         msg.includes('resource-exhausted') ||
         msg.includes('Quota exceeded') ||
         msg.includes('Free daily write units') ||
         msg.includes('maximum backoff delay') ||
         msg.includes('timed out');
}

// Timeout wrapper for Firestore cloud writes to prevent hanging UI
export const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 3500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timed out or quota exceeded')), timeoutMs)
    ),
  ]);
};

// LocalStorage helpers
export const getLocalData = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const setLocalData = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

// Compact URL / Base64 encoding for sharing
export function encodeSharedPayload(payload: SharedItemPayload): string {
  try {
    const compact = {
      t: payload.title || '',
      c: payload.category || 'other',
      i: payload.instructor || '',
      d: payload.description || '',
      tp: payload.type || 'course',
      m: payload.materials?.map(m => ({
        t: m.title || '',
        y: m.youtubeId || '',
        u: m.url || '',
        tp: m.type || 'video',
        o: m.orderIndex || 0,
        n: m.notes || '',
        d: m.duration || '',
      }))
    };
    const jsonStr = JSON.stringify(compact);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeSharedPayload(encoded: string): SharedItemPayload | null {
  try {
    if (!encoded) return null;
    let base64 = encoded.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    let compact: any = null;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      compact = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      const decodedStr = decodeURIComponent(Array.prototype.map.call(atob(base64), (c: string) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      compact = JSON.parse(decodedStr);
    }

    if (!compact || (!compact.t && !compact.title)) return null;
    const title = compact.t || compact.title;
    return {
      title,
      category: compact.c || compact.category,
      instructor: compact.i || compact.instructor,
      description: compact.d || compact.description,
      type: compact.tp || compact.type || 'course',
      materials: (compact.m || compact.materials)?.map((m: any, idx: number) => ({
        title: m.t || m.title || `บทที่ ${idx + 1}`,
        type: m.tp || m.type || 'video',
        youtubeId: m.y || m.youtubeId || '',
        url: m.u || m.url || (m.y ? `https://youtu.be/${m.y}` : ''),
        orderIndex: m.o ?? m.orderIndex ?? idx,
        notes: m.n || m.notes || '',
        duration: m.d || m.duration || '',
      }))
    };
  } catch {
    return null;
  }
}

interface DataContextType {
  courses: Course[];
  materials: CourseMaterial[];
  events: CalendarEvent[];
  communityPosts: CommunityPost[];
  portfolioItems: PortfolioItem[];
  isLoadingData: boolean;
  addCourse: (course: Omit<Course, 'id' | 'createdAt' | 'orderIndex'>) => Promise<string>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  reorderCourses: (newOrderedList: Course[]) => Promise<void>;
  addMaterial: (material: Omit<CourseMaterial, 'id' | 'createdAt' | 'orderIndex'>) => Promise<string>;
  updateMaterial: (id: string, data: Partial<CourseMaterial>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  toggleMaterialCompleted: (id: string, current: boolean) => Promise<void>;
  reorderMaterials: (courseId: string, newOrderedList: CourseMaterial[]) => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<string>;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEventCompleted: (id: string, current: boolean) => Promise<void>;
  addCommunityPost: (content: string, tags: string[], imageUrl?: string, sharedItem?: SharedItemPayload) => Promise<string>;
  likeCommunityPost: (postId: string) => Promise<void>;
  addCommentToPost: (postId: string, content: string) => Promise<void>;
  deleteCommunityPost: (postId: string) => Promise<void>;
  importSharedItem: (sharedItem: SharedItemPayload) => Promise<{ success: boolean; message: string; courseId?: string }>;
  addPortfolioItem: (item: Omit<PortfolioItem, 'id' | 'createdAt'>) => Promise<string>;
  updatePortfolioItem: (id: string, data: Partial<PortfolioItem>) => Promise<void>;
  deletePortfolioItem: (id: string) => Promise<void>;
  createPrivateShareLink: (payload: SharedItemPayload, note?: string, presetCode?: string) => Promise<{ url: string; shareCode: string; shareId: string }>;
  resolvePrivateShare: (shareCode?: string, shareId?: string) => Promise<SharedItemPayload | null>;
  exportBackupData: () => string;
  importBackupData: (jsonData: string) => Promise<void>;
  syncWithCloud: () => Promise<void>;
  pinnedTCASEvents: CalendarEvent[];
  tcasCompletedIds: string[];
  toggleTCASCompleted: (id: string) => void;
  showPinnedTCAS: boolean;
  setShowPinnedTCAS: (show: boolean) => void;
  allEvents: CalendarEvent[];
  isQuotaExceeded: boolean;
  quotaDismissed: boolean;
  dismissQuotaBanner: () => void;
  firebaseConsoleUrl: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, markSyncing, markSynced, markSyncError } = useAuth();

  // Quota exhaustion tracking
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('lukmoo_quota_exceeded') === 'true';
    } catch {
      return false;
    }
  });

  const [quotaDismissed, setQuotaDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('lukmoo_quota_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleQuotaExceeded = useCallback(() => {
    setIsQuotaExceeded(true);
    try {
      sessionStorage.setItem('lukmoo_quota_exceeded', 'true');
    } catch {}
  }, []);

  const dismissQuotaBanner = useCallback(() => {
    setQuotaDismissed(true);
    try {
      sessionStorage.setItem('lukmoo_quota_dismissed', 'true');
    } catch {}
  }, []);

  const firebaseConsoleUrl = "https://console.firebase.google.com/project/lukmoo-tutor/firestore/databases/ai-studio-d47d47f8-d5f9-45d5-9cb9-a031ee128943/data?openUpgradeDialog=true";

  // Active user ID helper
  const getUid = useCallback(() => {
    return user?.uid || 'guest';
  }, [user?.uid]);

  const getCacheKey = useCallback((sub: string) => {
    return `lukmoo_cache_${getUid()}_${sub}`;
  }, [getUid]);

  // Initial State: Load from cache immediately for 0ms render
  const [courses, setCourses] = useState<Course[]>(() => {
    const uid = user?.uid || 'guest';
    return getLocalData<Course[]>(`lukmoo_cache_${uid}_courses`, []);
  });

  const [materials, setMaterials] = useState<CourseMaterial[]>(() => {
    const uid = user?.uid || 'guest';
    return getLocalData<CourseMaterial[]>(`lukmoo_cache_${uid}_materials`, []);
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const uid = user?.uid || 'guest';
    return getLocalData<CalendarEvent[]>(`lukmoo_cache_${uid}_events`, []);
  });

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => {
    const uid = user?.uid || 'guest';
    return getLocalData<PortfolioItem[]>(`lukmoo_cache_${uid}_portfolio`, []);
  });

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    return getLocalData<CommunityPost[]>('lukmoo_community_posts', INITIAL_COMMUNITY_POSTS);
  });

  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // TCAS70 pinned schedule state
  const [tcasCompletedIds, setTcasCompletedIds] = useState<string[]>(() =>
    getLocalData<string[]>('lukmoo_tcas_completed_ids', [])
  );
  const [hiddenTcasIds, setHiddenTcasIds] = useState<string[]>(() =>
    getLocalData<string[]>('lukmoo_hidden_tcas_ids', [])
  );
  const [showPinnedTCAS, setShowPinnedTCAS] = useState<boolean>(() =>
    getLocalData<boolean>('lukmoo_show_pinned_tcas', true)
  );

  // TCAS Methods
  const toggleTCASCompleted = (id: string) => {
    setTcasCompletedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setLocalData('lukmoo_tcas_completed_ids', next);
      if (user && !user.isDemo && !isQuotaExceeded) {
        updateDoc(doc(db, 'users', user.uid), { tcasCompletedIds: next }).catch((err) => {
          if (isQuotaError(err)) handleQuotaExceeded();
        });
      }
      return next;
    });
  };

  const hideTCASEvent = (id: string) => {
    setHiddenTcasIds(prev => {
      const next = [...prev, id];
      setLocalData('lukmoo_hidden_tcas_ids', next);
      if (user && !user.isDemo && !isQuotaExceeded) {
        updateDoc(doc(db, 'users', user.uid), { hiddenTcasIds: next }).catch((err) => {
          if (isQuotaError(err)) handleQuotaExceeded();
        });
      }
      return next;
    });
  };

  const handleSetShowPinnedTCAS = (show: boolean) => {
    setShowPinnedTCAS(show);
    setLocalData('lukmoo_show_pinned_tcas', show);
    if (user && !user.isDemo && !isQuotaExceeded) {
      updateDoc(doc(db, 'users', user.uid), { showPinnedTCAS: show }).catch((err) => {
        if (isQuotaError(err)) handleQuotaExceeded();
      });
    }
  };

  const pinnedTCASEvents = useMemo<CalendarEvent[]>(() => {
    return convertTCASToCalendarEvents()
      .filter(ev => !hiddenTcasIds.includes(ev.id))
      .map(ev => ({
        ...ev,
        isCompleted: tcasCompletedIds.includes(ev.id),
      }));
  }, [tcasCompletedIds, hiddenTcasIds]);

  const allEvents = useMemo<CalendarEvent[]>(() => {
    if (showPinnedTCAS) {
      return [...events, ...pinnedTCASEvents];
    }
    return events;
  }, [events, pinnedTCASEvents, showPinnedTCAS]);

  // Timers for batch reorders
  const reorderCoursesTimerRef = useRef<any>(null);
  const reorderMaterialsTimerRef = useRef<any>(null);

  // ----------------------------------------------------
  // Sync Data on User Auth Change & Setup Firestore Listeners
  // ----------------------------------------------------
  useEffect(() => {
    const uid = user?.uid || 'guest';
    const courseCacheKey = `lukmoo_cache_${uid}_courses`;
    const matCacheKey = `lukmoo_cache_${uid}_materials`;
    const evCacheKey = `lukmoo_cache_${uid}_events`;
    const portCacheKey = `lukmoo_cache_${uid}_portfolio`;

    // 1. Instant cache hydration for current active user
    const cachedC = getLocalData<Course[]>(courseCacheKey, []);
    const cachedM = getLocalData<CourseMaterial[]>(matCacheKey, []);
    const cachedE = getLocalData<CalendarEvent[]>(evCacheKey, []);
    const cachedP = getLocalData<PortfolioItem[]>(portCacheKey, []);

    setCourses(cachedC);
    setMaterials(cachedM);
    setEvents(cachedE);
    setPortfolioItems(cachedP);

    if (!user || user.isDemo) {
      setIsLoadingData(false);
      markSynced();
      return;
    }

    setIsLoadingData(true);
    markSyncing();

    // 2. Connect real-time Firestore listeners for authenticated cloud users
    let unsubCourses = () => {};
    let unsubMaterials = () => {};
    let unsubEvents = () => {};
    let unsubPortfolio = () => {};
    let unsubProfile = () => {};

    try {
      // Profile listener
      const profileRef = doc(db, 'users', uid);
      unsubProfile = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.tcasCompletedIds)) {
            setTcasCompletedIds(data.tcasCompletedIds);
            setLocalData('lukmoo_tcas_completed_ids', data.tcasCompletedIds);
          }
          if (Array.isArray(data.hiddenTcasIds)) {
            setHiddenTcasIds(data.hiddenTcasIds);
            setLocalData('lukmoo_hidden_tcas_ids', data.hiddenTcasIds);
          }
          if (typeof data.showPinnedTCAS === 'boolean') {
            setShowPinnedTCAS(data.showPinnedTCAS);
            setLocalData('lukmoo_show_pinned_tcas', data.showPinnedTCAS);
          }
        }
      }, () => {});

      // Courses listener
      const coursesRef = collection(db, 'users', uid, 'courses');
      unsubCourses = onSnapshot(coursesRef, (snapshot) => {
        const cloudCourses: Course[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            cloudCourses.push({ id: docSnap.id, ...data } as Course);
          }
        });

        cloudCourses.sort((a, b) => {
          const orderDiff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        setCourses(prev => {
          const cloudIds = new Set(cloudCourses.map(c => c.id));
          const localOnly = prev.filter(c => !cloudIds.has(c.id));
          const merged = [...cloudCourses, ...localOnly];
          setLocalData(courseCacheKey, merged);
          return merged;
        });
        markSynced();
        setIsLoadingData(false);
      }, (err) => {
        if (!isQuotaError(err)) console.warn('Courses sync listener notice:', err?.message);
        setIsLoadingData(false);
        markSynced();
      });

      // Materials listener
      const materialsRef = collection(db, 'users', uid, 'materials');
      unsubMaterials = onSnapshot(materialsRef, (snapshot) => {
        const cloudMats: CourseMaterial[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            cloudMats.push({ id: docSnap.id, ...data } as CourseMaterial);
          }
        });

        cloudMats.sort((a, b) => {
          const orderDiff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        setMaterials(prev => {
          const cloudIds = new Set(cloudMats.map(m => m.id));
          const localOnly = prev.filter(m => !cloudIds.has(m.id));
          const merged = [...cloudMats, ...localOnly];
          setLocalData(matCacheKey, merged);
          return merged;
        });
        markSynced();
      }, (err) => {
        if (!isQuotaError(err)) console.warn('Materials sync listener notice:', err?.message);
        markSynced();
      });

      // Events listener
      const eventsRef = collection(db, 'users', uid, 'events');
      unsubEvents = onSnapshot(eventsRef, (snapshot) => {
        const cloudEvents: CalendarEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            cloudEvents.push({ id: docSnap.id, ...data } as CalendarEvent);
          }
        });

        cloudEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        setEvents(prev => {
          const cloudIds = new Set(cloudEvents.map(e => e.id));
          const localOnly = prev.filter(e => !cloudIds.has(e.id));
          const merged = [...cloudEvents, ...localOnly];
          setLocalData(evCacheKey, merged);
          return merged;
        });
        markSynced();
      }, (err) => {
        if (!isQuotaError(err)) console.warn('Events sync listener notice:', err?.message);
        markSynced();
      });

      // Portfolio items listener
      const portRef = collection(db, 'users', uid, 'portfolio_items');
      unsubPortfolio = onSnapshot(portRef, (snapshot) => {
        const cloudPort: PortfolioItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            cloudPort.push({ id: docSnap.id, ...data } as PortfolioItem);
          }
        });

        cloudPort.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        setPortfolioItems(prev => {
          const cloudIds = new Set(cloudPort.map(p => p.id));
          const localOnly = prev.filter(p => !cloudIds.has(p.id));
          const merged = [...cloudPort, ...localOnly];
          setLocalData(portCacheKey, merged);
          return merged;
        });
        markSynced();
      }, (err) => {
        if (!isQuotaError(err)) console.warn('Portfolio sync listener notice:', err?.message);
        markSynced();
      });

    } catch (err) {
      console.warn('Sync connection notice:', err);
      setIsLoadingData(false);
    }

    return () => {
      unsubCourses();
      unsubMaterials();
      unsubEvents();
      unsubPortfolio();
      unsubProfile();
    };
  }, [user?.uid, user?.isDemo]);

  // ----------------------------------------------------
  // Community Feed Sync
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchServerPosts = async () => {
      try {
        const res = await fetch('/api/community/posts');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setCommunityPosts(data);
            setLocalData('lukmoo_community_posts', data);
          }
        }
      } catch {}
    };

    fetchServerPosts();
    const pollInterval = setInterval(fetchServerPosts, 4000);

    let unsubCommunity = () => {};
    try {
      const postsRef = collection(db, 'community_posts');
      unsubCommunity = onSnapshot(postsRef, (snapshot) => {
        if (!snapshot.empty) {
          const cloudPosts: CommunityPost[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data) cloudPosts.push({ id: docSnap.id, ...data } as CommunityPost);
          });
          cloudPosts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          if (isMounted && cloudPosts.length > 0) {
            setCommunityPosts(cloudPosts);
            setLocalData('lukmoo_community_posts', cloudPosts);
          }
        }
      }, () => {});
    } catch {}

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      unsubCommunity();
    };
  }, []);

  // ----------------------------------------------------
  // CRUD: Course Actions
  // ----------------------------------------------------
  const addCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'orderIndex'>): Promise<string> => {
    markSyncing();
    const newId = 'crs_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();
    const newCourse: Course = {
      ...courseData,
      id: newId,
      orderIndex: courses.length,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Instant local update with atomic setter
    setCourses(prev => {
      const updated = [...prev, newCourse];
      setLocalData(getCacheKey('courses'), updated);
      return updated;
    });

    // 2. Persist to Firestore Cloud if authenticated
    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        const courseDocRef = doc(db, 'users', user.uid, 'courses', newId);
        await withTimeout(setDoc(courseDocRef, sanitizeForFirestore(newCourse)));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice saving course to Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
    return newId;
  };

  const updateCourse = async (id: string, data: Partial<Course>): Promise<void> => {
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    let updatedCourseObj: Course | null = null;
    setCourses(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          updatedCourseObj = { ...c, ...updatedFields };
          return updatedCourseObj;
        }
        return c;
      });
      setLocalData(getCacheKey('courses'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        const courseRef = doc(db, 'users', user.uid, 'courses', id);
        await withTimeout(setDoc(courseRef, sanitizeForFirestore(updatedFields), { merge: true }));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice updating course in Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deleteCourse = async (id: string): Promise<void> => {
    markSyncing();
    const relatedMatIds = materials.filter(m => m.courseId === id).map(m => m.id);
    const relatedEvIds = events.filter(e => e.courseId === id).map(e => e.id);

    setCourses(prev => {
      const updated = prev.filter(c => c.id !== id);
      setLocalData(getCacheKey('courses'), updated);
      return updated;
    });
    setMaterials(prev => {
      const updated = prev.filter(m => m.courseId !== id);
      setLocalData(getCacheKey('materials'), updated);
      return updated;
    });
    setEvents(prev => {
      const updated = prev.filter(e => e.courseId !== id);
      setLocalData(getCacheKey('events'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'courses', id)));
        for (const mId of relatedMatIds) {
          await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'materials', mId))).catch(() => {});
        }
        for (const eId of relatedEvIds) {
          await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'events', eId))).catch(() => {});
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice deleting course from Firestore:', err?.message);
        }
      }
    }
    markSynced();
  };

  const reorderCourses = async (newOrderedList: Course[]): Promise<void> => {
    const nowIso = new Date().toISOString();
    const reindexed = newOrderedList.map((c, idx) => ({ ...c, orderIndex: idx, updatedAt: nowIso }));

    setCourses(reindexed);
    setLocalData(getCacheKey('courses'), reindexed);

    if (user && !user.isDemo && !isQuotaExceeded) {
      if (reorderCoursesTimerRef.current) clearTimeout(reorderCoursesTimerRef.current);
      reorderCoursesTimerRef.current = setTimeout(async () => {
        try {
          markSyncing();
          const batch = writeBatch(db);
          reindexed.forEach((course) => {
            const ref = doc(db, 'users', user.uid, 'courses', course.id);
            batch.set(ref, { orderIndex: course.orderIndex, updatedAt: course.updatedAt }, { merge: true });
          });
          await batch.commit();
          markSynced();
        } catch (err: any) {
          if (isQuotaError(err)) handleQuotaExceeded();
          markSynced();
        }
      }, 1500);
    }
  };

  // ----------------------------------------------------
  // CRUD: Material Actions
  // ----------------------------------------------------
  const addMaterial = async (materialData: Omit<CourseMaterial, 'id' | 'createdAt' | 'orderIndex'>): Promise<string> => {
    markSyncing();
    const newId = 'mat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();
    const newMaterial: CourseMaterial = {
      ...materialData,
      id: newId,
      orderIndex: materials.filter(m => m.courseId === materialData.courseId).length,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setMaterials(prev => {
      const updated = [...prev, newMaterial];
      setLocalData(getCacheKey('materials'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        const matDocRef = doc(db, 'users', user.uid, 'materials', newId);
        await withTimeout(setDoc(matDocRef, sanitizeForFirestore(newMaterial)));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice saving material to Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
    return newId;
  };

  const updateMaterial = async (id: string, data: Partial<CourseMaterial>): Promise<void> => {
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    setMaterials(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updatedFields } : m);
      setLocalData(getCacheKey('materials'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        const matDocRef = doc(db, 'users', user.uid, 'materials', id);
        await withTimeout(setDoc(matDocRef, sanitizeForFirestore(updatedFields), { merge: true }));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice updating material in Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deleteMaterial = async (id: string): Promise<void> => {
    markSyncing();
    setMaterials(prev => {
      const updated = prev.filter(m => m.id !== id);
      setLocalData(getCacheKey('materials'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'materials', id)));
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice deleting material in Firestore:', err?.message);
        }
      }
    }
    markSynced();
  };

  const toggleMaterialCompleted = async (id: string, current: boolean): Promise<void> => {
    await updateMaterial(id, { isCompleted: !current });
  };

  const reorderMaterials = async (courseId: string, newOrderedList: CourseMaterial[]): Promise<void> => {
    const nowIso = new Date().toISOString();
    const reindexedCourseItems = newOrderedList.map((m, idx) => ({ ...m, orderIndex: idx, updatedAt: nowIso }));
    const otherItems = materials.filter(m => m.courseId !== courseId);
    const allMaterials = [...otherItems, ...reindexedCourseItems];

    setMaterials(allMaterials);
    setLocalData(getCacheKey('materials'), allMaterials);

    if (user && !user.isDemo && !isQuotaExceeded) {
      if (reorderMaterialsTimerRef.current) clearTimeout(reorderMaterialsTimerRef.current);
      reorderMaterialsTimerRef.current = setTimeout(async () => {
        try {
          markSyncing();
          const batch = writeBatch(db);
          reindexedCourseItems.forEach((mat) => {
            const ref = doc(db, 'users', user.uid, 'materials', mat.id);
            batch.set(ref, { orderIndex: mat.orderIndex, updatedAt: mat.updatedAt }, { merge: true });
          });
          await withTimeout(batch.commit());
          markSynced();
        } catch (err: any) {
          if (isQuotaError(err)) handleQuotaExceeded();
          markSynced();
        }
      }, 1500);
    }
  };

  // ----------------------------------------------------
  // CRUD: Event Actions
  // ----------------------------------------------------
  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<string> => {
    markSyncing();
    const newId = 'ev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();
    const newEvent: CalendarEvent = {
      ...eventData,
      id: newId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setEvents(prev => {
      const updated = [...prev, newEvent];
      setLocalData(getCacheKey('events'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        const evDocRef = doc(db, 'users', user.uid, 'events', newId);
        await withTimeout(setDoc(evDocRef, sanitizeForFirestore(newEvent)));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice saving event to Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
    return newId;
  };

  const updateEvent = async (id: string, data: Partial<CalendarEvent>): Promise<void> => {
    if (id.startsWith('tcas70-')) {
      if (data.isCompleted !== undefined) toggleTCASCompleted(id);
      return;
    }
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    setEvents(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updatedFields } : e);
      setLocalData(getCacheKey('events'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        const evDocRef = doc(db, 'users', user.uid, 'events', id);
        await withTimeout(setDoc(evDocRef, sanitizeForFirestore(updatedFields), { merge: true }));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice updating event in Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deleteEvent = async (id: string): Promise<void> => {
    if (id.startsWith('tcas70-')) {
      hideTCASEvent(id);
      return;
    }
    markSyncing();
    setEvents(prev => {
      const updated = prev.filter(e => e.id !== id);
      setLocalData(getCacheKey('events'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'events', id)));
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice deleting event in Firestore:', err?.message);
        }
      }
    }
    markSynced();
  };

  const toggleEventCompleted = async (id: string, current: boolean): Promise<void> => {
    if (id.startsWith('tcas70-')) {
      toggleTCASCompleted(id);
      return;
    }
    await updateEvent(id, { isCompleted: !current });
  };

  // ----------------------------------------------------
  // CRUD: Portfolio Actions
  // ----------------------------------------------------
  const addPortfolioItem = async (itemData: Omit<PortfolioItem, 'id' | 'createdAt'>): Promise<string> => {
    markSyncing();
    const newId = 'port_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newItem: PortfolioItem = {
      ...itemData,
      id: newId,
      userId: user?.uid || 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPortfolioItems(prev => {
      const updated = [newItem, ...prev];
      setLocalData(getCacheKey('portfolio'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        await withTimeout(setDoc(doc(db, 'users', user.uid, 'portfolio_items', newId), sanitizeForFirestore(newItem)));
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice saving portfolio item to Firestore:', err?.message);
        }
      }
    }
    markSynced();
    return newId;
  };

  const updatePortfolioItem = async (id: string, data: Partial<PortfolioItem>): Promise<void> => {
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    setPortfolioItems(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updatedFields } : p);
      setLocalData(getCacheKey('portfolio'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        await withTimeout(setDoc(doc(db, 'users', user.uid, 'portfolio_items', id), sanitizeForFirestore(updatedFields), { merge: true }));
        markSynced();
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice updating portfolio item in Firestore:', err?.message);
        }
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deletePortfolioItem = async (id: string): Promise<void> => {
    markSyncing();
    setPortfolioItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      setLocalData(getCacheKey('portfolio'), updated);
      return updated;
    });

    if (user && !user.isDemo && !isQuotaExceeded) {
      try {
        await withTimeout(deleteDoc(doc(db, 'users', user.uid, 'portfolio_items', id)));
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExceeded();
        } else {
          console.warn('Notice deleting portfolio item in Firestore:', err?.message);
        }
      }
    }
    markSynced();
  };

  // ----------------------------------------------------
  // Community Operations
  // ----------------------------------------------------
  const addCommunityPost = async (
    content: string, 
    tags: string[], 
    imageUrl?: string, 
    sharedItem?: SharedItemPayload
  ): Promise<string> => {
    const newId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanSharedItem = sharedItem ? {
      ...sharedItem,
      materials: sharedItem.materials?.map(m => ({
        ...m,
        fileData: m.fileData && m.fileData.length < 200000 ? m.fileData : undefined,
      }))
    } : undefined;

    const newPost: CommunityPost = {
      id: newId,
      authorId: user?.uid || 'guest-user',
      authorName: profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'เพื่อนนักเรียน Dek68',
      authorAvatar: user?.photoURL || undefined,
      authorTag: profile?.targetExam || 'Dek68',
      content: content.trim(),
      imageUrl: imageUrl || undefined,
      tags: tags.length > 0 ? tags : ['#พูดคุย'],
      likes: 0,
      likedBy: [],
      comments: [],
      sharedItem: cleanSharedItem,
      createdAt: new Date().toISOString(),
    };

    setCommunityPosts(prev => [newPost, ...prev]);

    fetch('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    }).catch(() => {});

    setDoc(doc(db, 'community_posts', newId), sanitizeForFirestore(newPost)).catch(() => {});

    return newId;
  };

  const likeCommunityPost = async (postId: string) => {
    const currentUid = user?.uid || 'guest-user';
    let updatedLikedBy: string[] = [];
    let updatedLikes = 0;

    setCommunityPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const hasLiked = p.likedBy.includes(currentUid);
      updatedLikedBy = hasLiked 
        ? p.likedBy.filter(uid => uid !== currentUid)
        : [...p.likedBy, currentUid];
      updatedLikes = updatedLikedBy.length;
      return { ...p, likedBy: updatedLikedBy, likes: updatedLikes };
    }));

    fetch(`/api/community/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUid }),
    }).catch(() => {});

    updateDoc(doc(db, 'community_posts', postId), {
      likedBy: updatedLikedBy,
      likes: updatedLikes
    }).catch(() => {});
  };

  const addCommentToPost = async (postId: string, content: string) => {
    if (!content.trim()) return;
    const commentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newComment: PostComment = {
      id: commentId,
      postId,
      authorId: user?.uid || 'guest-user',
      authorName: profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'เพื่อนนักเรียน Dek68',
      authorAvatar: user?.photoURL || undefined,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    let updatedComments: PostComment[] = [];
    setCommunityPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      updatedComments = [...(p.comments || []), newComment];
      return { ...p, comments: updatedComments };
    }));

    fetch(`/api/community/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment),
    }).catch(() => {});

    updateDoc(doc(db, 'community_posts', postId), {
      comments: updatedComments.map(c => sanitizeForFirestore(c))
    }).catch(() => {});
  };

  const deleteCommunityPost = async (postId: string) => {
    setCommunityPosts(prev => prev.filter(p => p.id !== postId));
    fetch(`/api/community/posts/${postId}`, { method: 'DELETE' }).catch(() => {});
    deleteDoc(doc(db, 'community_posts', postId)).catch(() => {});
  };

  // ----------------------------------------------------
  // Import Shared Course or Material
  // ----------------------------------------------------
  const importSharedItem = async (sharedItem: SharedItemPayload): Promise<{ success: boolean; message: string; courseId?: string }> => {
    markSyncing();
    try {
      if (sharedItem.type === 'course') {
        const newCourseId = await addCourse({
          title: sharedItem.title,
          code: 'TCAS-SHARE',
          instructor: sharedItem.instructor || 'ครูผู้แชร์จากชุมชน',
          category: sharedItem.category || 'general',
          color: '#2563EB',
          description: sharedItem.description || `บันทึกมาจากชุมชน Lukmoo Tutor เมื่อ ${new Date().toLocaleDateString('th-TH')}`,
          roomOrPlatform: 'คอร์สแชร์จากชุมชน',
        });

        if (Array.isArray(sharedItem.materials) && sharedItem.materials.length > 0) {
          for (let i = 0; i < sharedItem.materials.length; i++) {
            const mat = sharedItem.materials[i];
            await addMaterial({
              courseId: newCourseId,
              title: mat.title,
              type: mat.type,
              url: mat.url,
              youtubeId: mat.youtubeId,
              fileData: mat.fileData,
              fileName: mat.fileName,
              fileSize: mat.fileSize,
              notes: mat.notes,
              duration: mat.duration,
            });
          }
        }

        markSynced();
        const matCount = sharedItem.materials?.length || 0;
        return { 
          success: true, 
          message: `บันทึกคอร์ส "${sharedItem.title}" ${matCount > 0 ? `พร้อมชีทและคลิป (${matCount} รายการ) ` : ''}เข้าคลังวิชาของคุณสำเร็จแล้ว!`, 
          courseId: newCourseId 
        };
      } else {
        let targetCourseId = courses.find(c => 
          (sharedItem.category && c.category === sharedItem.category) ||
          c.title.toLowerCase().includes(sharedItem.title.toLowerCase().slice(0, 5))
        )?.id;

        if (!targetCourseId) {
          targetCourseId = await addCourse({
            title: sharedItem.courseTitle || (sharedItem.category ? `วิชา ${sharedItem.category}` : 'คลังเอกสาร & ชีทจากชุมชน'),
            instructor: sharedItem.instructor || 'เพื่อนนักเรียนในชุมชน',
            category: sharedItem.category || 'general',
            color: '#059669',
            description: 'รวมชีทสรุป คลิป YouTube และเอกสารที่บันทึกมาจากชุมชน',
            roomOrPlatform: 'ชุมชน Dek68-69',
          });
        }

        await addMaterial({
          courseId: targetCourseId,
          title: sharedItem.title,
          type: sharedItem.materialType || 'document',
          url: sharedItem.url,
          youtubeId: sharedItem.youtubeId,
          fileData: sharedItem.fileData,
          fileName: sharedItem.fileName,
          fileSize: sharedItem.fileSize,
          notes: (sharedItem.notes ? `${sharedItem.notes}\n\n` : '') + `(บันทึกมาจากชุมชนเมื่อ ${new Date().toLocaleDateString('th-TH')})`,
        });

        markSynced();
        return { success: true, message: `บันทึก "${sharedItem.title}" เข้าคลังชีท & วิดีโอของคุณเรียบร้อยแล้ว!`, courseId: targetCourseId };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'ไม่สามารถบันทึกรายการได้' };
    }
  };

  // ----------------------------------------------------
  // Share Links
  // ----------------------------------------------------
  const createPrivateShareLink = async (
    payload: SharedItemPayload, 
    note?: string,
    presetCode?: string
  ): Promise<{ url: string; shareCode: string; shareId: string }> => {
    let shareCode = presetCode ? presetCode.toUpperCase().trim() : '';
    if (!shareCode) {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let rand = '';
      for (let i = 0; i < 4; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      shareCode = `LM-${rand}`;
    }
    const cleanCode = shareCode.replace(/[^A-Z0-9]/g, '');
    const formattedCode = cleanCode.startsWith('LM') && cleanCode.length === 6 
      ? `LM-${cleanCode.substring(2)}` 
      : shareCode;
    const shareId = 'shr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const lightweightPayload: SharedItemPayload = {
      ...payload,
      fileData: payload.fileData && payload.fileData.length < 250000 ? payload.fileData : undefined,
      materials: payload.materials?.map(m => ({
        ...m,
        fileData: m.fileData && m.fileData.length < 150000 ? m.fileData : undefined,
      }))
    };

    const record = {
      id: shareId,
      shareCode: formattedCode,
      cleanCode,
      authorId: user ? user.uid : 'anonymous',
      authorName: profile?.displayName || user?.displayName || 'เพื่อนเด็กติว Lukmoo',
      type: lightweightPayload.type,
      payload: lightweightPayload,
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    localShares[shareCode] = record;
    localShares[cleanCode] = record;
    localShares[formattedCode] = record;
    localShares[shareId] = record;
    setLocalData('lukmoo_private_shares', localShares);

    fetch('/api/shared-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shareCode: formattedCode,
        cleanCode,
        shareId,
        payload: lightweightPayload,
        authorName: profile?.displayName || user?.displayName || 'เพื่อนเด็กติว Lukmoo',
        authorId: user ? user.uid : 'anonymous',
        note: note || '',
      }),
    }).catch(() => {});

    setDoc(doc(db, 'shared_links', cleanCode), sanitizeForFirestore(record)).catch(() => {});

    const encoded = encodeSharedPayload(lightweightPayload);
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = encoded 
      ? `${baseUrl}#code=${formattedCode}&import=${encoded}`
      : `${baseUrl}?code=${formattedCode}`;

    return { url: shareUrl, shareCode: formattedCode, shareId };
  };

  const resolvePrivateShare = async (shareCodeOrQuery?: string, shareId?: string): Promise<SharedItemPayload | null> => {
    if (!shareCodeOrQuery && !shareId) return null;
    let queryStr = (shareCodeOrQuery || shareId || '').trim();

    if (queryStr.includes('import=')) {
      const match = queryStr.match(/import=([A-Za-z0-9+/=%_-]+)/i);
      if (match) {
        const decoded = decodeSharedPayload(decodeURIComponent(match[1]));
        if (decoded && decoded.title) return decoded;
      }
    }
    if (queryStr.length > 25 && /^[A-Za-z0-9+/=_-]+$/.test(queryStr)) {
      const decoded = decodeSharedPayload(queryStr);
      if (decoded && decoded.title) return decoded;
    }

    const lmRegexMatch = queryStr.match(/LM-?[A-Z0-9]{4}/i);
    if (lmRegexMatch) {
      queryStr = lmRegexMatch[0];
    } else if (queryStr.includes('?') || queryStr.includes('http') || queryStr.includes('#')) {
      try {
        const urlStr = queryStr.match(/https?:\/\/[^\s]+/)?.[0] || queryStr;
        const hashPart = urlStr.includes('#') ? urlStr.split('#')[1] : '';
        const hashParams = new URLSearchParams(hashPart);
        if (hashParams.get('import')) {
          const decoded = decodeSharedPayload(hashParams.get('import')!);
          if (decoded && decoded.title) return decoded;
        }
        const urlObj = new URL(urlStr.split('#')[0], window.location.origin);
        if (urlObj.searchParams.get('import')) {
          const decoded = decodeSharedPayload(urlObj.searchParams.get('import')!);
          if (decoded && decoded.title) return decoded;
        }
        queryStr = hashParams.get('code') ||
                   urlObj.searchParams.get('code') || 
                   urlObj.searchParams.get('c') ||
                   urlObj.searchParams.get('share_code') || 
                   urlObj.searchParams.get('share_id') || 
                   queryStr;
      } catch {}
    }

    const upper = queryStr.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const cleanNoHyphen = upper.replace(/-/g, '');
    const formattedHyphen = upper.includes('-') 
      ? upper 
      : (upper.startsWith('LM') && upper.length === 6 ? `LM-${upper.substring(2)}` : upper);

    const parseDocPayload = (data: any): SharedItemPayload | null => {
      if (!data) return null;
      const p = data.payload || (data.title ? data : null);
      if (p && (p.title || data.title)) {
        return {
          ...p,
          type: p.type || data.type || 'course',
          title: p.title || data.title,
        } as SharedItemPayload;
      }
      return null;
    };

    // 1. Local Cache
    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    const localFound = localShares[queryStr] || localShares[upper] || localShares[cleanNoHyphen] || localShares[formattedHyphen];
    if (localFound) {
      const parsedLocal = parseDocPayload(localFound);
      if (parsedLocal) return parsedLocal;
    }

    // 2. Express Backend
    try {
      for (const k of [formattedHyphen, cleanNoHyphen, upper, queryStr]) {
        if (!k) continue;
        const res = await fetch(`/api/shared-links/${encodeURIComponent(k)}`);
        if (res.ok) {
          const serverData = await res.json();
          const parsed = parseDocPayload(serverData);
          if (parsed) return parsed;
        }
      }
    } catch {}

    // 3. Firestore
    try {
      for (const k of [cleanNoHyphen, formattedHyphen, upper, queryStr]) {
        if (!k) continue;
        const snap = await getDoc(doc(db, 'shared_links', k)).catch(() => null);
        if (snap && snap.exists()) {
          const parsed = parseDocPayload(snap.data());
          if (parsed) return parsed;
        }
      }
    } catch {}

    return null;
  };

  // ----------------------------------------------------
  // Backup Export / Import & Direct Cloud Sync
  // ----------------------------------------------------
  const exportBackupData = (): string => {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      userUid: user?.uid,
      courses,
      materials,
      events,
      portfolioItems,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackupData = async (jsonData: string) => {
    markSyncing();
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed.courses)) {
        for (const c of parsed.courses) {
          await addCourse({
            title: c.title,
            code: c.code,
            instructor: c.instructor,
            category: c.category,
            color: c.color,
            description: c.description,
            roomOrPlatform: c.roomOrPlatform
          });
        }
      }
      if (Array.isArray(parsed.portfolioItems)) {
        for (const p of parsed.portfolioItems) {
          await addPortfolioItem({
            title: p.title,
            category: p.category,
            date: p.date,
            organization: p.organization,
            description: p.description,
            reflection: p.reflection,
            imageUrl: p.imageUrl,
            linkUrl: p.linkUrl,
            hours: p.hours,
            level: p.level,
          });
        }
      }
      markSynced();
    } catch {
      throw new Error('รูปแบบไฟล์ JSON สำรองข้อมูลไม่ถูกต้อง');
    }
  };

  const syncWithCloud = async () => {
    if (!user || user.isDemo) return;
    markSyncing();
    try {
      const [coursesSnap, matsSnap, evsSnap, portSnap] = await Promise.all([
        getDocs(collection(db, 'users', user.uid, 'courses')),
        getDocs(collection(db, 'users', user.uid, 'materials')),
        getDocs(collection(db, 'users', user.uid, 'events')),
        getDocs(collection(db, 'users', user.uid, 'portfolio_items')),
      ]);

      const cloudCourses = coursesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(c => !c._deleted && !c.isDeleted) as Course[];
      cloudCourses.sort((a, b) => ((a.orderIndex ?? 0) - (b.orderIndex ?? 0)) || ((a.createdAt || '').localeCompare(b.createdAt || '')));

      const cloudMats = matsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(m => !m._deleted && !m.isDeleted) as CourseMaterial[];
      cloudMats.sort((a, b) => ((a.orderIndex ?? 0) - (b.orderIndex ?? 0)) || ((a.createdAt || '').localeCompare(b.createdAt || '')));

      const cloudEvs = evsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(e => !e._deleted && !e.isDeleted) as CalendarEvent[];
      cloudEvs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const cloudPort = portSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(p => !p._deleted && !p.isDeleted) as PortfolioItem[];
      cloudPort.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      setCourses(cloudCourses);
      setMaterials(cloudMats);
      setEvents(cloudEvs);
      setPortfolioItems(cloudPort);

      setLocalData(getCacheKey('courses'), cloudCourses);
      setLocalData(getCacheKey('materials'), cloudMats);
      setLocalData(getCacheKey('events'), cloudEvs);
      setLocalData(getCacheKey('portfolio'), cloudPort);

      markSynced();
    } catch (err: any) {
      console.warn('Manual cloud sync notice:', err?.message);
      markSynced();
    }
  };

  return (
    <DataContext.Provider value={{
      courses,
      materials,
      events: allEvents,
      communityPosts,
      portfolioItems,
      isLoadingData,
      addCourse,
      updateCourse,
      deleteCourse,
      reorderCourses,
      addMaterial,
      updateMaterial,
      deleteMaterial,
      toggleMaterialCompleted,
      reorderMaterials,
      addEvent,
      updateEvent,
      deleteEvent,
      toggleEventCompleted,
      addCommunityPost,
      likeCommunityPost,
      addCommentToPost,
      deleteCommunityPost,
      importSharedItem,
      addPortfolioItem,
      updatePortfolioItem,
      deletePortfolioItem,
      createPrivateShareLink,
      resolvePrivateShare,
      exportBackupData,
      importBackupData,
      syncWithCloud,
      pinnedTCASEvents,
      tcasCompletedIds,
      toggleTCASCompleted,
      showPinnedTCAS,
      setShowPinnedTCAS: handleSetShowPinnedTCAS,
      allEvents,
      isQuotaExceeded,
      quotaDismissed,
      dismissQuotaBanner,
      firebaseConsoleUrl,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
