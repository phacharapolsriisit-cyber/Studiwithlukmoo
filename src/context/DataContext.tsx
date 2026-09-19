import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { 
  db, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  limit,
  getDocs,
  onSnapshot,
  writeBatch
} from '../firebase';
import { useAuth } from './AuthContext';
import { Course, CourseMaterial, CalendarEvent, CommunityPost, PostComment, SharedItemPayload, PortfolioItem } from '../types';
import { INITIAL_COMMUNITY_POSTS } from '../data/mockCommunity';
import { INITIAL_PORTFOLIO_ITEMS } from '../data/mockPortfolio';
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// LocalStorage helpers for offline or demo user persistence
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

// Compact URL / Base64 encoding for 100% reliable 1-click sharing without database quota dependency
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
      // Fallback for older format
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, markSyncing, markSynced, markSyncError } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => {
    return getLocalData<CommunityPost[]>('lukmoo_community_posts', INITIAL_COMMUNITY_POSTS);
  });
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Persistent Set of deleted IDs to permanently ignore any incoming snapshots or race conditions
  const localDeletedKey = user ? `lukmoo_deleted_ids_${user.uid}` : 'lukmoo_deleted_ids_guest';
  const deletedIdsRef = useRef<Set<string>>(new Set(getLocalData<string[]>(localDeletedKey, [])));

  // Keep deleted IDs in sync across user sessions
  useEffect(() => {
    if (user) {
      const stored = getLocalData<string[]>(`lukmoo_deleted_ids_${user.uid}`, []);
      deletedIdsRef.current = new Set(stored);
    }
  }, [user]);

  const markIdsAsDeleted = (ids: string[]) => {
    ids.forEach(id => deletedIdsRef.current.add(id));
    const key = user ? `lukmoo_deleted_ids_${user.uid}` : 'lukmoo_deleted_ids_guest';
    const stored = getLocalData<string[]>(key, []);
    const merged = Array.from(new Set([...stored, ...ids])).slice(-2000);
    setLocalData(key, merged);
  };

  const userPrefix = user ? user.uid : 'guest';
  const localCourseKey = `lukmoo_data_${userPrefix}_courses`;
  const localMatKey = `lukmoo_data_${userPrefix}_materials`;
  const localEvKey = `lukmoo_data_${userPrefix}_events`;
  const localPortKey = `lukmoo_data_${userPrefix}_portfolio`;

  const fallbackActiveCourseKey = 'lukmoo_last_active_courses';
  const fallbackActiveMatKey = 'lukmoo_last_active_materials';
  const fallbackActiveEvKey = 'lukmoo_last_active_events';
  const fallbackActivePortKey = 'lukmoo_last_active_portfolio';

  // TCAS70 pinned schedule state (pinned for everyone)
  const [tcasCompletedIds, setTcasCompletedIds] = useState<string[]>(() =>
    getLocalData<string[]>('lukmoo_tcas_completed_ids', [])
  );
  const [hiddenTcasIds, setHiddenTcasIds] = useState<string[]>(() =>
    getLocalData<string[]>('lukmoo_hidden_tcas_ids', [])
  );
  const [showPinnedTCAS, setShowPinnedTCAS] = useState<boolean>(() =>
    getLocalData<boolean>('lukmoo_show_pinned_tcas', true)
  );

  const toggleTCASCompleted = (id: string) => {
    setTcasCompletedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setLocalData('lukmoo_tcas_completed_ids', next);
      
      // Persist to Firestore if user is logged in
      if (user && !user.isDemo) {
        const profileRef = doc(db, 'users', user.uid);
        updateDoc(profileRef, { tcasCompletedIds: next }).catch(e => console.warn('TCAS sync error:', e));
      }
      
      return next;
    });
  };

  const hideTCASEvent = (id: string) => {
    setHiddenTcasIds(prev => {
      const next = [...prev, id];
      setLocalData('lukmoo_hidden_tcas_ids', next);
      
      if (user && !user.isDemo) {
        const profileRef = doc(db, 'users', user.uid);
        updateDoc(profileRef, { hiddenTcasIds: next }).catch(e => console.warn('TCAS hidden sync error:', e));
      }
      
      return next;
    });
  };

  const handleSetShowPinnedTCAS = (show: boolean) => {
    setShowPinnedTCAS(show);
    setLocalData('lukmoo_show_pinned_tcas', show);
    
    if (user && !user.isDemo) {
      const profileRef = doc(db, 'users', user.uid);
      updateDoc(profileRef, { showPinnedTCAS: show }).catch(e => console.warn('TCAS visibility sync error:', e));
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

  // Timer refs for high-speed debounced Firestore batch writes
  const reorderCoursesTimerRef = useRef<any>(null);
  const reorderMaterialsTimerRef = useRef<any>(null);
  const lastLocalCourseReorderTimeRef = useRef<number>(0);
  const lastLocalMaterialReorderTimeRef = useRef<number>(0);

  // Active real-time sync for community posts (visible to all users across the app)
  const deletedPostIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    // Helper to merge and sort posts without duplicates
    const updatePostsSafely = (incoming: CommunityPost[]) => {
      setCommunityPosts(prev => {
        const map = new Map<string, CommunityPost>();
        INITIAL_COMMUNITY_POSTS.forEach(p => {
          if (!deletedPostIdsRef.current.has(p.id)) {
            map.set(p.id, p);
          }
        });
        prev.forEach(p => {
          if (!deletedPostIdsRef.current.has(p.id)) {
            map.set(p.id, p);
          }
        });
        incoming.forEach(p => {
          if (p && p.id && !deletedPostIdsRef.current.has(p.id)) {
            map.set(p.id, { ...map.get(p.id), ...p });
          }
        });
        const combined = Array.from(map.values());
        combined.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setLocalData('lukmoo_community_posts', combined);
        return combined;
      });
    };

    // 1. Fetch immediately from /api/community/posts (works for all students across the app, 0ms lag, no Firebase quota limits)
    const fetchServerPosts = async () => {
      try {
        const res = await fetch('/api/community/posts');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            updatePostsSafely(data);
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchServerPosts();
    // Poll every 4 seconds so all students on different devices see new posts in real-time
    const pollTimer = setInterval(fetchServerPosts, 4000);

    // 2. Also listen to Firestore collection 'community_posts' for real-time cloud updates
    let unsubCommunity: () => void = () => {};
    try {
      const postsRef = collection(db, 'community_posts');
      unsubCommunity = onSnapshot(postsRef, (snapshot) => {
        if (!snapshot.empty) {
          const cloudPosts: CommunityPost[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data) {
              cloudPosts.push({ id: docSnap.id, ...data } as CommunityPost);
            }
          });
          if (isMounted && cloudPosts.length > 0) {
            updatePostsSafely(cloudPosts);
          }
        }
      }, (error) => {
        console.warn('Community posts onSnapshot notice:', error?.message);
      });
    } catch (err) {
      console.warn('Failed to listen to community_posts collection:', err);
    }

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      unsubCommunity();
    };
  }, []);

  // Synchronize community posts to local storage whenever updated
  useEffect(() => {
    setLocalData('lukmoo_community_posts', communityPosts);
  }, [communityPosts]);

  useEffect(() => {
    // If user is not logged in:
    // "เปิดมาไม่ให้มีวิชาไหนเลย จนกว่าจะล็อคอิน และให้เห็นเฉพาะงานของตัวเอง"
    if (!user) {
      setCourses([]);
      setMaterials([]);
      setEvents([]);
      setPortfolioItems([]);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    markSyncing();

    // Refresh deleted IDs for the current user
    const stored = getLocalData<string[]>(localDeletedKey, []);
    deletedIdsRef.current = new Set(stored);

    // 1. Instantly hydrate from local storage so refreshing the page never flashes blank or reverts
    let localC = getLocalData<Course[]>(localCourseKey, []).filter(c => !deletedIdsRef.current.has(c.id));
    if (localC.length === 0) {
      const fallbackC = getLocalData<Course[]>(fallbackActiveCourseKey, []).filter(c => !deletedIdsRef.current.has(c.id));
      if (fallbackC.length > 0) {
        localC = fallbackC;
        setLocalData(localCourseKey, localC);
      }
    }

    let localM = getLocalData<CourseMaterial[]>(localMatKey, []).filter(m => !deletedIdsRef.current.has(m.id));
    if (localM.length === 0) {
      const fallbackM = getLocalData<CourseMaterial[]>(fallbackActiveMatKey, []).filter(m => !deletedIdsRef.current.has(m.id));
      if (fallbackM.length > 0) {
        localM = fallbackM;
        setLocalData(localMatKey, localM);
      }
    }

    let localE = getLocalData<CalendarEvent[]>(localEvKey, []).filter(e => !deletedIdsRef.current.has(e.id));
    if (localE.length === 0) {
      const fallbackE = getLocalData<CalendarEvent[]>(fallbackActiveEvKey, []).filter(e => !deletedIdsRef.current.has(e.id));
      if (fallbackE.length > 0) {
        localE = fallbackE;
        setLocalData(localEvKey, localE);
      }
    }

    let localP = getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS);
    if (localP.length === 0) {
      const fallbackP = getLocalData<PortfolioItem[]>(fallbackActivePortKey, INITIAL_PORTFOLIO_ITEMS);
      if (fallbackP.length > 0) {
        localP = fallbackP;
        setLocalData(localPortKey, localP);
      }
    }

    if (localC.length > 0) {
      localC.sort((a, b) => ((a.orderIndex ?? 0) - (b.orderIndex ?? 0)) || ((a.createdAt || '').localeCompare(b.createdAt || '')));
      setCourses(localC);
    }
    if (localM.length > 0) {
      localM.sort((a, b) => ((a.orderIndex ?? 0) - (b.orderIndex ?? 0)) || ((a.createdAt || '').localeCompare(b.createdAt || '')));
      setMaterials(localM);
    }
    if (localE.length > 0) {
      localE.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setEvents(localE);
    }
    if (localP.length > 0) {
      setPortfolioItems(localP);
    }

    // If demo user or without cloud auth token, finish hydration here
    if (user.isDemo) {
      setIsLoadingData(false);
      markSynced();
      return;
    }

    // Cloud Firestore listeners
    let unsubCourses: () => void = () => {};
    let unsubMaterials: () => void = () => {};
    let unsubEvents: () => void = () => {};
    let unsubPortfolio: () => void = () => {};
    let unsubProfile: () => void = () => {};

    try {
      // 0. Listen to User Profile for settings and TCAS sync
      const profileRef = doc(db, 'users', user.uid);
      unsubProfile = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.tcasCompletedIds && Array.isArray(data.tcasCompletedIds)) {
            setTcasCompletedIds(data.tcasCompletedIds);
            setLocalData('lukmoo_tcas_completed_ids', data.tcasCompletedIds);
          }
          if (data.hiddenTcasIds && Array.isArray(data.hiddenTcasIds)) {
            setHiddenTcasIds(data.hiddenTcasIds);
            setLocalData('lukmoo_hidden_tcas_ids', data.hiddenTcasIds);
          }
          if (typeof data.showPinnedTCAS === 'boolean') {
            setShowPinnedTCAS(data.showPinnedTCAS);
            setLocalData('lukmoo_show_pinned_tcas', data.showPinnedTCAS);
          }
        }
      }, (err) => {
        console.warn('Profile sync notice:', err?.message);
      });

      const coursesRef = collection(db, 'users', user.uid, 'courses');
      unsubCourses = onSnapshot(coursesRef, (snapshot) => {
        const list: Course[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            list.push({ id: docSnap.id, ...data } as Course);
          }
        });

        const existingLocal = getLocalData<Course[]>(localCourseKey, []).filter(c => !deletedIdsRef.current.has(c.id));
        const mergedCourseMap = new Map<string, Course>();
        
        list.forEach(cloudItem => {
          mergedCourseMap.set(cloudItem.id, cloudItem);
        });

        const now = Date.now();
        existingLocal.forEach(localItem => {
          const cloudItem = mergedCourseMap.get(localItem.id);
          const localUpdatedTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
          
          if (cloudItem) {
            const cloudUpdatedTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            if (localUpdatedTime > cloudUpdatedTime) {
              mergedCourseMap.set(localItem.id, { ...cloudItem, ...localItem });
            }
          } else {
            const isVeryNew = (now - localUpdatedTime) < 300000;
            if (isVeryNew) {
              mergedCourseMap.set(localItem.id, localItem);
            }
          }
        });

        const finalCourses = Array.from(mergedCourseMap.values());
        finalCourses.sort((a, b) => {
          const orderDiff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        setCourses(finalCourses);
        setLocalData(localCourseKey, finalCourses);
        setLocalData(fallbackActiveCourseKey, finalCourses);
        markSynced();
        setIsLoadingData(false);
      }, (err) => {
        console.warn('Courses sync notice:', err?.message);
        markSyncError();
        setIsLoadingData(false);
      });

      const materialsRef = collection(db, 'users', user.uid, 'materials');
      unsubMaterials = onSnapshot(materialsRef, (snapshot) => {
        const list: CourseMaterial[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            list.push({ id: docSnap.id, ...data } as CourseMaterial);
          }
        });

        const existingLocal = getLocalData<CourseMaterial[]>(localMatKey, []).filter(m => !deletedIdsRef.current.has(m.id));
        const mergedMatMap = new Map<string, CourseMaterial>();
        
        list.forEach(cloudItem => {
          mergedMatMap.set(cloudItem.id, cloudItem);
        });

        const now = Date.now();
        existingLocal.forEach(localItem => {
          const cloudItem = mergedMatMap.get(localItem.id);
          const localUpdatedTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
          
          if (cloudItem) {
            const cloudUpdatedTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            if (localUpdatedTime > cloudUpdatedTime) {
              mergedMatMap.set(localItem.id, { ...cloudItem, ...localItem });
            }
          } else {
            const isVeryNew = (now - localUpdatedTime) < 300000;
            if (isVeryNew) {
              mergedMatMap.set(localItem.id, localItem);
            }
          }
        });

        const finalMaterials = Array.from(mergedMatMap.values());
        finalMaterials.sort((a, b) => {
          const orderDiff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        setMaterials(finalMaterials);
        setLocalData(localMatKey, finalMaterials);
        setLocalData(fallbackActiveMatKey, finalMaterials);
        markSynced();
      }, (err) => {
        console.warn('Materials sync notice:', err?.message);
        markSyncError();
      });

      const eventsRef = collection(db, 'users', user.uid, 'events');
      unsubEvents = onSnapshot(eventsRef, (snapshot) => {
        const list: CalendarEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data._deleted && !data.isDeleted) {
            list.push({ id: docSnap.id, ...data } as CalendarEvent);
          }
        });

        const existingLocal = getLocalData<CalendarEvent[]>(localEvKey, []).filter(e => !deletedIdsRef.current.has(e.id));
        const mergedEvMap = new Map<string, CalendarEvent>();
        
        list.forEach(cloudItem => {
          mergedEvMap.set(cloudItem.id, cloudItem);
        });

        const now = Date.now();
        existingLocal.forEach(localItem => {
          const cloudItem = mergedEvMap.get(localItem.id);
          const localUpdatedTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
          
          if (cloudItem) {
            const cloudUpdatedTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            if (localUpdatedTime > cloudUpdatedTime) {
              mergedEvMap.set(localItem.id, { ...cloudItem, ...localItem });
            }
          } else {
            const isVeryNew = (now - localUpdatedTime) < 300000;
            if (isVeryNew) {
              mergedEvMap.set(localItem.id, localItem);
            }
          }
        });

        const finalEvents = Array.from(mergedEvMap.values());
        finalEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        setEvents(finalEvents);
        setLocalData(localEvKey, finalEvents);
        setLocalData(fallbackActiveEvKey, finalEvents);
        markSynced();
      }, (err) => {
        console.warn('Events sync notice:', err?.message);
        markSyncError();
      });

      const portRef = collection(db, 'users', user.uid, 'portfolio_items');
      unsubPortfolio = onSnapshot(portRef, (snapshot) => {
        const list: PortfolioItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PortfolioItem);
        });

        const existingLocal = getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS);
        const mergedPortMap = new Map<string, PortfolioItem>();
        
        list.forEach(cloudItem => {
          mergedPortMap.set(cloudItem.id, cloudItem);
        });

        const now = Date.now();
        existingLocal.forEach(localItem => {
          const cloudItem = mergedPortMap.get(localItem.id);
          const localUpdatedTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
          
          if (cloudItem) {
            const cloudUpdatedTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
            if (localUpdatedTime > cloudUpdatedTime) {
              mergedPortMap.set(localItem.id, { ...cloudItem, ...localItem });
            }
          } else {
            const isVeryNew = (now - localUpdatedTime) < 300000;
            if (isVeryNew) {
              mergedPortMap.set(localItem.id, localItem);
            }
          }
        });

        const finalPort = Array.from(mergedPortMap.values());
        finalPort.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        setPortfolioItems(finalPort);
        setLocalData(localPortKey, finalPort);
        setLocalData(fallbackActivePortKey, finalPort);
        markSynced();
      }, () => {
        const cached = getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS);
        setPortfolioItems(cached);
      });
    } catch (e) {
      console.warn('Cloud listeners initialization failed:', e);
      setIsLoadingData(false);
    }

    // 2. Proactively trigger a cloud sync when logging in to ensure local changes are pushed
    if (!user.isDemo) {
      syncWithCloud().catch(() => {});
    }

    return () => {
      unsubCourses();
      unsubMaterials();
      unsubEvents();
      unsubPortfolio();
      unsubProfile();
    };
  }, [user]);

  // Course actions
  const addCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'orderIndex'>) => {
    if (!user) throw new Error('User not authenticated');
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

    // 1. Update state & localStorage immediately (instant responsiveness)
    const updated = [...courses, newCourse];
    setCourses(updated);
    setLocalData(localCourseKey, updated);
    setLocalData(fallbackActiveCourseKey, updated);

    // 2. Persist to Firestore asynchronously
    if (!user.isDemo) {
      const courseDocRef = doc(db, 'users', user.uid, 'courses', newId);
      setDoc(courseDocRef, sanitizeForFirestore(newCourse), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.warn('Notice saving course to Firestore (local copy is safe):', err?.message);
        });
    } else {
      markSynced();
    }
    return newId;
  };

  const updateCourse = async (id: string, data: Partial<Course>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    // 1. Update React state immediately with functional updater (prevents stale closure issues)
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedFields };
        return next;
      }
      return prev;
    });

    // 2. Update local storage with complete course object immediately
    const currentCached = getLocalData<Course[]>(localCourseKey, []);
    const cachedIdx = currentCached.findIndex(c => c.id === id);
    let updatedCourseObj: Course;
    if (cachedIdx >= 0) {
      updatedCourseObj = { ...currentCached[cachedIdx], ...updatedFields };
      currentCached[cachedIdx] = updatedCourseObj;
    } else {
      const fromState = courses.find(c => c.id === id);
      updatedCourseObj = fromState 
        ? { ...fromState, ...updatedFields } 
        : ({ id, ...updatedFields } as Course);
      currentCached.push(updatedCourseObj);
    }
    setLocalData(localCourseKey, currentCached);
    setLocalData(fallbackActiveCourseKey, currentCached);

    // 3. Persist complete sanitized object to Firestore with merge: true
    if (!user.isDemo) {
      const courseRef = doc(db, 'users', user.uid, 'courses', id);
      try {
        await setDoc(courseRef, sanitizeForFirestore(updatedCourseObj), { merge: true });
        markSynced();
      } catch (err: any) {
        console.warn('Notice updating course in Firestore (local copy is safe):', err?.message);
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deleteCourse = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();

    const relatedMatIds = materials.filter(m => m.courseId === id).map(m => m.id);
    const relatedEvIds = events.filter(e => e.courseId === id).map(e => e.id);
    const allDeletedIds = [id, ...relatedMatIds, ...relatedEvIds];
    markIdsAsDeleted(allDeletedIds);

    setCourses(prev => {
      const updated = prev.filter(c => c.id !== id);
      setLocalData(localCourseKey, updated);
      setLocalData(fallbackActiveCourseKey, updated);
      return updated;
    });
    setMaterials(prev => {
      const updated = prev.filter(m => m.courseId !== id);
      setLocalData(localMatKey, updated);
      setLocalData(fallbackActiveMatKey, updated);
      return updated;
    });
    setEvents(prev => {
      const updated = prev.filter(e => e.courseId !== id);
      setLocalData(localEvKey, updated);
      setLocalData(fallbackActiveEvKey, updated);
      return updated;
    });

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'courses', id));
      } catch {
        try {
          await setDoc(doc(db, 'users', user.uid, 'courses', id), { _deleted: true, isDeleted: true }, { merge: true });
        } catch {}
      }
      for (const mId of relatedMatIds) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'materials', mId));
        } catch {
          try {
            await setDoc(doc(db, 'users', user.uid, 'materials', mId), { _deleted: true, isDeleted: true }, { merge: true });
          } catch {}
        }
      }
      for (const eId of relatedEvIds) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'events', eId));
        } catch {
          try {
            await setDoc(doc(db, 'users', user.uid, 'events', eId), { _deleted: true, isDeleted: true }, { merge: true });
          } catch {}
        }
      }
    }
    markSynced();
  };

  const reorderCourses = async (newOrderedList: Course[]) => {
    if (!user) return;
    lastLocalCourseReorderTimeRef.current = Date.now();
    const nowIso = new Date().toISOString();
    const reindexed = newOrderedList.map((c, idx) => ({ ...c, orderIndex: idx, updatedAt: nowIso }));
    
    // 1. Instant local update
    setCourses(reindexed);
    setLocalData(localCourseKey, reindexed);
    setLocalData(fallbackActiveCourseKey, reindexed);

    // 2. Debounced batch commit
    if (!user.isDemo) {
      if (reorderCoursesTimerRef.current) clearTimeout(reorderCoursesTimerRef.current);
      reorderCoursesTimerRef.current = setTimeout(async () => {
        try {
          markSyncing();
          const batch = writeBatch(db);
          reindexed.forEach((course) => {
            const ref = doc(db, 'users', user.uid, 'courses', course.id);
            batch.set(ref, sanitizeForFirestore(course), { merge: true });
          });
          await batch.commit();
          markSynced();
        } catch (err) {
          console.warn('Reorder sync error:', err);
          markSyncError();
        }
      }, 2000);
    }
  };

  // Material actions
  const addMaterial = async (materialData: Omit<CourseMaterial, 'id' | 'createdAt' | 'orderIndex'>) => {
    if (!user) throw new Error('User not authenticated');
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

    // 1. Update state and localStorage immediately
    const updated = [...materials, newMaterial];
    setMaterials(updated);
    setLocalData(localMatKey, updated);
    setLocalData(fallbackActiveMatKey, updated);

    // 2. Persist to Firestore asynchronously without blocking UI
    if (!user.isDemo) {
      const matDocRef = doc(db, 'users', user.uid, 'materials', newId);
      setDoc(matDocRef, sanitizeForFirestore(newMaterial), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.warn('Notice saving material to Firestore:', err?.message);
        });
    } else {
      markSynced();
    }
    return newId;
  };

  const updateMaterial = async (id: string, data: Partial<CourseMaterial>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    setMaterials(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedFields };
        return next;
      }
      return prev;
    });

    const currentCached = getLocalData<CourseMaterial[]>(localMatKey, []);
    const cachedIdx = currentCached.findIndex(m => m.id === id);
    let updatedMatObj: CourseMaterial;
    if (cachedIdx >= 0) {
      updatedMatObj = { ...currentCached[cachedIdx], ...updatedFields };
      currentCached[cachedIdx] = updatedMatObj;
    } else {
      const fromState = materials.find(m => m.id === id);
      updatedMatObj = fromState 
        ? { ...fromState, ...updatedFields } 
        : ({ id, ...updatedFields } as CourseMaterial);
      currentCached.push(updatedMatObj);
    }
    setLocalData(localMatKey, currentCached);
    setLocalData(fallbackActiveMatKey, currentCached);

    if (!user.isDemo) {
      const matDocRef = doc(db, 'users', user.uid, 'materials', id);
      try {
        await setDoc(matDocRef, sanitizeForFirestore(updatedMatObj), { merge: true });
        markSynced();
      } catch (err: any) {
        console.warn('Notice updating material in Firestore:', err?.message);
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    markIdsAsDeleted([id]);

    setMaterials(prev => {
      const updated = prev.filter(m => m.id !== id);
      setLocalData(localMatKey, updated);
      setLocalData(fallbackActiveMatKey, updated);
      return updated;
    });

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'materials', id));
      } catch {
        try {
          await setDoc(doc(db, 'users', user.uid, 'materials', id), { _deleted: true, isDeleted: true }, { merge: true });
        } catch {}
      }
    }
    markSynced();
  };

  const toggleMaterialCompleted = async (id: string, current: boolean) => {
    await updateMaterial(id, { isCompleted: !current });
  };

  const reorderMaterials = async (courseId: string, newOrderedList: CourseMaterial[]) => {
    if (!user) return;
    lastLocalMaterialReorderTimeRef.current = Date.now();
    const nowIso = new Date().toISOString();
    const reindexedCourseItems = newOrderedList.map((m, idx) => ({ ...m, orderIndex: idx, updatedAt: nowIso }));
    const otherItems = materials.filter(m => m.courseId !== courseId);
    const allMaterials = [...otherItems, ...reindexedCourseItems];

    // 1. Update state & localStorage immediately
    setMaterials(allMaterials);
    setLocalData(localMatKey, allMaterials);
    setLocalData(fallbackActiveMatKey, allMaterials);

    // 2. Debounced batch commit to Firestore with atomic set merge
    if (!user.isDemo) {
      if (reorderMaterialsTimerRef.current) {
        clearTimeout(reorderMaterialsTimerRef.current);
      }
      reorderMaterialsTimerRef.current = setTimeout(async () => {
        try {
          markSyncing();
          const batch = writeBatch(db);
          reindexedCourseItems.forEach((mat) => {
            const ref = doc(db, 'users', user.uid, 'materials', mat.id);
            batch.set(ref, { orderIndex: mat.orderIndex, updatedAt: mat.updatedAt }, { merge: true });
          });
          await batch.commit();
          markSynced();
        } catch (err) {
          console.warn('Notice reordering materials in Firestore:', err);
        }
      }, 180);
    }
  };

  // Event actions
  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const newId = 'ev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const nowIso = new Date().toISOString();
    const newEvent: CalendarEvent = {
      ...eventData,
      id: newId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [...events, newEvent];
    setEvents(updated);
    setLocalData(localEvKey, updated);
    setLocalData(fallbackActiveEvKey, updated);

    if (!user.isDemo) {
      const evDocRef = doc(db, 'users', user.uid, 'events', newId);
      setDoc(evDocRef, sanitizeForFirestore(newEvent), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.warn('Notice saving event to Firestore:', err?.message);
        });
    } else {
      markSynced();
    }
    return newId;
  };

  const updateEvent = async (id: string, data: Partial<CalendarEvent>) => {
    if (id.startsWith('tcas70-')) {
      if (data.isCompleted !== undefined) {
        toggleTCASCompleted(id);
      }
      return;
    }
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedFields };
        return next;
      }
      return prev;
    });

    const currentCached = getLocalData<CalendarEvent[]>(localEvKey, []);
    const cachedIdx = currentCached.findIndex(e => e.id === id);
    let updatedEvObj: CalendarEvent;
    if (cachedIdx >= 0) {
      updatedEvObj = { ...currentCached[cachedIdx], ...updatedFields };
      currentCached[cachedIdx] = updatedEvObj;
    } else {
      const fromState = events.find(e => e.id === id);
      updatedEvObj = fromState 
        ? { ...fromState, ...updatedFields } 
        : ({ id, ...updatedFields } as CalendarEvent);
      currentCached.push(updatedEvObj);
    }
    setLocalData(localEvKey, currentCached);
    setLocalData(fallbackActiveEvKey, currentCached);

    if (!user.isDemo) {
      const evDocRef = doc(db, 'users', user.uid, 'events', id);
      try {
        await setDoc(evDocRef, sanitizeForFirestore(updatedEvObj), { merge: true });
        markSynced();
      } catch (err: any) {
        console.warn('Notice updating event in Firestore:', err?.message);
        markSynced();
      }
    } else {
      markSynced();
    }
  };

  const deleteEvent = async (id: string) => {
    if (id.startsWith('tcas70-')) {
      hideTCASEvent(id);
      return;
    }
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    markIdsAsDeleted([id]);

    setEvents(prev => {
      const updated = prev.filter(e => e.id !== id);
      setLocalData(localEvKey, updated);
      setLocalData(fallbackActiveEvKey, updated);
      return updated;
    });

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'events', id));
      } catch {
        try {
          await setDoc(doc(db, 'users', user.uid, 'events', id), { _deleted: true, isDeleted: true }, { merge: true });
        } catch {}
      }
    }
    markSynced();
  };

  const toggleEventCompleted = async (id: string, current: boolean) => {
    if (id.startsWith('tcas70-')) {
      toggleTCASCompleted(id);
      return;
    }
    await updateEvent(id, { isCompleted: !current });
  };

  // Community Operations
  const addCommunityPost = async (
    content: string, 
    tags: string[], 
    imageUrl?: string, 
    sharedItem?: SharedItemPayload
  ): Promise<string> => {
    const newId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Sanitize sharedItem to keep it lightweight (<200KB)
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

    // 1. Immediately display locally (0ms)
    setCommunityPosts(prev => [newPost, ...prev]);

    // 2. Persist to Express backend /api/community/posts (works 100% reliably for all students)
    try {
      await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
    } catch (err) {
      console.warn('Server post error:', err);
    }

    // 3. Persist to Firestore cloud in parallel
    try {
      const sanitized = sanitizeForFirestore(newPost);
      setDoc(doc(db, 'community_posts', newId), sanitized).catch(err => {
        console.warn('Firestore community post notice:', err?.message);
      });
    } catch (err) {
      console.warn('Could not sync post to Firestore cloud:', err);
    }

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
      return {
        ...p,
        likedBy: updatedLikedBy,
        likes: updatedLikes
      };
    }));

    // Sync to Express backend API
    fetch(`/api/community/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: currentUid }),
    }).catch(err => console.warn('Server like notice:', err));

    // Sync to Firestore in parallel
    try {
      updateDoc(doc(db, 'community_posts', postId), {
        likedBy: updatedLikedBy,
        likes: updatedLikes
      }).catch(() => {});
    } catch (err) {
      console.warn('Firestore like update notice:', err);
    }
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
      return {
        ...p,
        comments: updatedComments
      };
    }));

    // Sync to Express backend API
    fetch(`/api/community/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment),
    }).catch(err => console.warn('Server comment notice:', err));

    // Sync to Firestore so all users see the comment
    try {
      const sanitizedComments = updatedComments.map(c => sanitizeForFirestore(c));
      updateDoc(doc(db, 'community_posts', postId), {
        comments: sanitizedComments
      }).catch(() => {});
    } catch (err) {
      console.warn('Firestore comment update notice:', err);
    }
  };

  const deleteCommunityPost = async (postId: string) => {
    deletedPostIdsRef.current.add(postId);
    setCommunityPosts(prev => prev.filter(p => p.id !== postId));

    fetch(`/api/community/posts/${postId}`, {
      method: 'DELETE',
    }).catch(err => console.warn('Server delete post notice:', err));

    try {
      deleteDoc(doc(db, 'community_posts', postId)).catch(() => {});
    } catch (err) {
      console.warn('Firestore delete post notice:', err);
    }
  };

  // Import Shared Item (Course or Material) directly into personal collection
  const importSharedItem = async (sharedItem: SharedItemPayload): Promise<{ success: boolean; message: string; courseId?: string }> => {
    if (!user) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำการบันทึกวิชาหรือเอกสาร' };
    }

    markSyncing();
    try {
      if (sharedItem.type === 'course') {
        // Create new course
        const newCourseId = await addCourse({
          title: sharedItem.title,
          code: 'TCAS-SHARE',
          instructor: sharedItem.instructor || 'ครูผู้แชร์จากชุมชน',
          category: sharedItem.category || 'general',
          color: '#2563EB',
          description: sharedItem.description || `บันทึกมาจากชุมชน Lukmoo Tutor เมื่อ ${new Date().toLocaleDateString('th-TH')}`,
          roomOrPlatform: 'คอร์สแชร์จากชุมชน',
        });

        // Import all attached materials (files, YouTube clips, sheets, documents)
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
        // Material import
        // Find if user already has a course matching category
        let targetCourseId = courses.find(c => 
          (sharedItem.category && c.category === sharedItem.category) ||
          c.title.toLowerCase().includes(sharedItem.title.toLowerCase().slice(0, 5))
        )?.id;

        // If no matching course, create a dedicated Shared Materials course
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

  // Portfolio CRUD actions
  const addPortfolioItem = async (itemData: Omit<PortfolioItem, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const newId = 'port_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newItem: PortfolioItem = {
      ...itemData,
      id: newId,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...portfolioItems];
    setPortfolioItems(updated);
    setLocalData(localPortKey, updated);

    if (!user.isDemo) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'portfolio_items', newId), newItem);
      } catch (err) {
        console.error('Save portfolio item error:', err);
      }
    }
    markSynced();
    return newId;
  };

  const updatePortfolioItem = async (id: string, data: Partial<PortfolioItem>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const nowIso = new Date().toISOString();
    const updatedFields = { ...data, updatedAt: nowIso };

    setPortfolioItems(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedFields };
        return next;
      }
      return prev;
    });

    const currentCached = getLocalData<PortfolioItem[]>(localPortKey, []);
    const cachedIdx = currentCached.findIndex(p => p.id === id);
    let updatedPortObj: PortfolioItem;
    if (cachedIdx >= 0) {
      updatedPortObj = { ...currentCached[cachedIdx], ...updatedFields };
      currentCached[cachedIdx] = updatedPortObj;
    } else {
      const fromState = portfolioItems.find(p => p.id === id);
      updatedPortObj = fromState 
        ? { ...fromState, ...updatedFields } 
        : ({ id, ...updatedFields } as PortfolioItem);
      currentCached.push(updatedPortObj);
    }
    setLocalData(localPortKey, currentCached);

    if (!user.isDemo) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'portfolio_items', id), sanitizeForFirestore(updatedPortObj), { merge: true });
      } catch (err) {
        console.error('Update portfolio item error:', err);
      }
    }
    markSynced();
  };

  const deletePortfolioItem = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updated = portfolioItems.filter(item => item.id !== id);
    setPortfolioItems(updated);
    setLocalData(localPortKey, updated);

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'portfolio_items', id));
      } catch (err) {
        console.error('Delete portfolio item error:', err);
      }
    }
    markSynced();
  };

  // Private share link creation with short 6-character code (optimized for instant 0ms generation)
  const createPrivateShareLink = async (
    payload: SharedItemPayload, 
    note?: string,
    presetCode?: string
  ): Promise<{ url: string; shareCode: string; shareId: string }> => {
    // Generate or use preset sleek, memorable 6-char share code e.g. LM-8K39
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

    // Sanitize payload to keep it ultra-lightweight (<200KB) for instant network transport and Firestore 1MB limits
    const lightweightPayload: SharedItemPayload = {
      ...payload,
      fileData: payload.fileData && payload.fileData.length < 250000 ? payload.fileData : undefined,
      materials: payload.materials?.map(m => ({
        ...m,
        // If file data exceeds 150KB, omit heavy base64 so upload and download are blazing fast
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

    // 1. Instant local storage cache under all alias keys (0ms access)
    const suffixOnly = cleanCode.startsWith('LM') && cleanCode.length === 6 ? cleanCode.substring(2) : '';
    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    localShares[shareCode] = record;
    localShares[cleanCode] = record;
    localShares[formattedCode] = record;
    localShares[shareId] = record;
    if (suffixOnly) {
      localShares[suffixOnly] = record;
    }
    setLocalData('lukmoo_private_shares', localShares);

    // 2. Persist to Express backend /api/shared-links (100% reliable for cross-device sharing)
    try {
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
      }).catch(err => console.warn('Server shared link save notice:', err));
    } catch {}

    // 3. Persist to Firestore cleanCode document in background (single write to minimize quota usage)
    const sanitized = sanitizeForFirestore(record);
    setDoc(doc(db, 'shared_links', cleanCode), sanitized).catch((e) => {
      console.warn('Firestore shared_links save notice:', e?.message);
    });

    const encoded = encodeSharedPayload(lightweightPayload);
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = encoded 
      ? `${baseUrl}#code=${formattedCode}&import=${encoded}`
      : `${baseUrl}?code=${formattedCode}`;

    return {
      url: shareUrl,
      shareCode: formattedCode,
      shareId,
    };
  };

  const resolvePrivateShare = async (shareCodeOrQuery?: string, shareId?: string): Promise<SharedItemPayload | null> => {
    if (!shareCodeOrQuery && !shareId) return null;

    let queryStr = (shareCodeOrQuery || shareId || '').trim();

    // 0. Immediate decode if input contains self-contained payload (0ms, 100% reliable, no server quota needed)
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

    // 1. Intelligently extract code from Thai invite message, Line message, or raw text
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
    } else {
      const fourMatch = queryStr.match(/\b([A-Z0-9]{4})\b/i);
      if (fourMatch && queryStr.length > 4) {
        queryStr = fourMatch[1];
      }
    }

    const upper = queryStr.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const cleanNoHyphen = upper.replace(/-/g, '');
    const formattedHyphen = upper.includes('-') 
      ? upper 
      : (upper.startsWith('LM') && upper.length === 6 ? `LM-${upper.substring(2)}` : upper);

    const withLm = cleanNoHyphen.length === 4 ? `LM${cleanNoHyphen}` : '';
    const withLmHyphen = cleanNoHyphen.length === 4 ? `LM-${cleanNoHyphen}` : '';
    const suffixOnly = cleanNoHyphen.startsWith('LM') && cleanNoHyphen.length === 6 ? cleanNoHyphen.substring(2) : '';

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

    // 2. Check local cache (instant 0ms)
    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    const localFound = localShares[queryStr] || 
                       localShares[upper] || 
                       localShares[cleanNoHyphen] || 
                       localShares[formattedHyphen] || 
                       (withLm ? localShares[withLm] : null) ||
                       (withLmHyphen ? localShares[withLmHyphen] : null) ||
                       (suffixOnly ? localShares[suffixOnly] : null) ||
                       (shareId ? localShares[shareId] : null);

    if (localFound) {
      const parsedLocal = parseDocPayload(localFound);
      if (parsedLocal) return parsedLocal;
    }

    // 2.5 Check Express backend /api/shared-links/:code (reliable across all browsers and devices)
    try {
      for (const k of [formattedHyphen, cleanNoHyphen, upper, queryStr]) {
        if (!k) continue;
        const res = await fetch(`/api/shared-links/${encodeURIComponent(k)}`);
        if (res.ok) {
          const serverData = await res.json();
          const parsed = parseDocPayload(serverData);
          if (parsed) {
            localShares[k] = serverData;
            setLocalData('lukmoo_private_shares', localShares);
            return parsed;
          }
        }
      }
    } catch {}

    // 3. Check Firestore collection 'shared_links' by Document ID in parallel
    const lookupKeys = Array.from(new Set([
      cleanNoHyphen, 
      formattedHyphen, 
      withLm,
      withLmHyphen,
      suffixOnly,
      upper, 
      queryStr, 
      shareId
    ].filter(Boolean))) as string[];

    try {
      const snaps = await Promise.all(
        lookupKeys.map(k => getDoc(doc(db, 'shared_links', k)).catch(() => null))
      );
      for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i];
        if (snap && snap.exists()) {
          const data = snap.data();
          const parsed = parseDocPayload(data);
          if (parsed) {
            localShares[lookupKeys[i]] = data;
            setLocalData('lukmoo_private_shares', localShares);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('Firestore parallel shared link fetch error:', err);
    }

    // 4. Fallback: Query Firestore by fields ('cleanCode' or 'shareCode')
    try {
      const searchTerms = Array.from(new Set([cleanNoHyphen, formattedHyphen, withLm, suffixOnly].filter(Boolean)));
      if (searchTerms.length > 0) {
        const qClean = query(collection(db, 'shared_links'), where('cleanCode', 'in', searchTerms.slice(0, 10)));
        const snapClean = await getDocs(qClean).catch(() => null);
        if (snapClean && !snapClean.empty) {
          const parsed = parseDocPayload(snapClean.docs[0].data());
          if (parsed) return parsed;
        }

        const qShare = query(collection(db, 'shared_links'), where('shareCode', 'in', searchTerms.slice(0, 10)));
        const snapShare = await getDocs(qShare).catch(() => null);
        if (snapShare && !snapShare.empty) {
          const parsed = parseDocPayload(snapShare.docs[0].data());
          if (parsed) return parsed;
        }
      }
    } catch (err) {
      console.warn('Firestore field query error:', err);
    }

    // 5. Check community_posts collection as fallback (in case user pasted a community post ID or reference)
    try {
      for (const k of lookupKeys.slice(0, 3)) {
        const postSnap = await getDoc(doc(db, 'community_posts', k)).catch(() => null);
        if (postSnap && postSnap.exists()) {
          const postData = postSnap.data();
          if (postData?.sharedItem && postData.sharedItem.title) {
            return postData.sharedItem as SharedItemPayload;
          }
        }
      }
    } catch {}

    // 6. Backward compatibility: Base64 decode for older long share codes
    if (queryStr.length > 25) {
      try {
        const decoded = decodeURIComponent(
          Array.prototype.map.call(atob(decodeURIComponent(queryStr)), (c: string) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.title) {
          return {
            ...parsed,
            type: parsed.type || 'course',
          } as SharedItemPayload;
        }
      } catch {}
    }

    return null;
  };

  // Export / Import
  const exportBackupData = (): string => {
    const backup = {
      version: '1.0',
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
    if (!user) throw new Error('User not authenticated');
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
      // 1. Sync collections
      const cachedCourses = getLocalData<Course[]>(localCourseKey, []).filter(c => !deletedIdsRef.current.has(c.id));
      for (const c of cachedCourses) {
        await setDoc(doc(db, 'users', user.uid, 'courses', c.id), sanitizeForFirestore(c), { merge: true });
      }

      const cachedMaterials = getLocalData<CourseMaterial[]>(localMatKey, []).filter(m => !deletedIdsRef.current.has(m.id));
      for (const m of cachedMaterials) {
        await setDoc(doc(db, 'users', user.uid, 'materials', m.id), sanitizeForFirestore(m), { merge: true });
      }

      const cachedEvents = getLocalData<CalendarEvent[]>(localEvKey, []).filter(e => !deletedIdsRef.current.has(e.id));
      for (const e of cachedEvents) {
        await setDoc(doc(db, 'users', user.uid, 'events', e.id), sanitizeForFirestore(e), { merge: true });
      }

      const cachedPortfolio = getLocalData<PortfolioItem[]>(localPortKey, []);
      for (const p of cachedPortfolio) {
        await setDoc(doc(db, 'users', user.uid, 'portfolio_items', p.id), sanitizeForFirestore(p), { merge: true });
      }

      // 2. Sync Profile / Settings
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        tcasCompletedIds,
        hiddenTcasIds,
        showPinnedTCAS,
        updatedAt: new Date().toISOString(),
      });

      markSynced();
    } catch (err) {
      console.error('Manual sync error:', err);
      markSyncError();
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
