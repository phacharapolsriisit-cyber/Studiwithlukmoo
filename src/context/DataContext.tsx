import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  onSnapshot,
  writeBatch
} from '../firebase';
import { useAuth } from './AuthContext';
import { Course, CourseMaterial, CalendarEvent, CommunityPost, PostComment, SharedItemPayload, PortfolioItem } from '../types';
import { INITIAL_COMMUNITY_POSTS } from '../data/mockCommunity';
import { INITIAL_PORTFOLIO_ITEMS } from '../data/mockPortfolio';

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
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
  createPrivateShareLink: (payload: SharedItemPayload, note?: string) => Promise<{ url: string; shareCode: string; shareId: string }>;
  resolvePrivateShare: (shareCode?: string, shareId?: string) => Promise<SharedItemPayload | null>;
  exportBackupData: () => string;
  importBackupData: (jsonData: string) => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// LocalStorage helpers for offline or demo user persistence
const getLocalData = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setLocalData = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, markSyncing, markSynced } = useAuth();
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

  const localCourseKey = user ? `lukmoo_data_${user.uid}_courses` : '';
  const localMatKey = user ? `lukmoo_data_${user.uid}_materials` : '';
  const localEvKey = user ? `lukmoo_data_${user.uid}_events` : '';
  const localPortKey = user ? `lukmoo_data_${user.uid}_portfolio` : '';

  // Timer refs for high-speed debounced Firestore batch writes
  const reorderCoursesTimerRef = useRef<any>(null);
  const reorderMaterialsTimerRef = useRef<any>(null);
  const lastLocalCourseReorderTimeRef = useRef<number>(0);
  const lastLocalMaterialReorderTimeRef = useRef<number>(0);

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

    // 1. Instantly hydrate from local storage so refreshing the page never flashes blank or reverts
    const localC = getLocalData<Course[]>(localCourseKey, []).filter(c => !deletedIdsRef.current.has(c.id));
    const localM = getLocalData<CourseMaterial[]>(localMatKey, []).filter(m => !deletedIdsRef.current.has(m.id));
    const localE = getLocalData<CalendarEvent[]>(localEvKey, []).filter(e => !deletedIdsRef.current.has(e.id));
    const localP = getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS);

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

    try {
      const coursesRef = collection(db, 'users', user.uid, 'courses');
      unsubCourses = onSnapshot(coursesRef, (snapshot) => {
        const list: Course[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!deletedIdsRef.current.has(docSnap.id) && !data._deleted && !data.isDeleted) {
            list.push({ id: docSnap.id, ...data } as Course);
          }
        });

        // If local user reordered items within the last 2.5s, preserve the local orderIndex
        const timeSinceLocalReorder = Date.now() - lastLocalCourseReorderTimeRef.current;
        if (timeSinceLocalReorder < 2500) {
          const currentLocal = getLocalData<Course[]>(localCourseKey, []);
          const orderMap = new Map<string, number>(currentLocal.map((c, i) => [c.id, c.orderIndex ?? i]));
          list.forEach((item) => {
            const preservedOrder = orderMap.get(item.id);
            if (preservedOrder !== undefined) {
              item.orderIndex = preservedOrder;
            }
          });
        }

        // Sort by orderIndex first, tiebreak with createdAt (chronological time)
        list.sort((a, b) => {
          const orderDiff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        setCourses(list);
        setLocalData(localCourseKey, list);
        markSynced();
        setIsLoadingData(false);
      }, (err) => {
        console.warn('Courses listener error, falling back to cache:', err);
        const cached = getLocalData<Course[]>(localCourseKey, []).filter(c => !deletedIdsRef.current.has(c.id));
        setCourses(cached);
        setIsLoadingData(false);
      });

      const materialsRef = collection(db, 'users', user.uid, 'materials');
      unsubMaterials = onSnapshot(materialsRef, (snapshot) => {
        const list: CourseMaterial[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!deletedIdsRef.current.has(docSnap.id) && !data._deleted && !data.isDeleted) {
            list.push({ id: docSnap.id, ...data } as CourseMaterial);
          }
        });

        // Preserve local orderIndex if user just reordered
        const timeSinceLocalReorder = Date.now() - lastLocalMaterialReorderTimeRef.current;
        if (timeSinceLocalReorder < 2500) {
          const currentLocal = getLocalData<CourseMaterial[]>(localMatKey, []);
          const orderMap = new Map<string, number>(currentLocal.map((m, i) => [m.id, m.orderIndex ?? i]));
          list.forEach((item) => {
            const preservedOrder = orderMap.get(item.id);
            if (preservedOrder !== undefined) {
              item.orderIndex = preservedOrder;
            }
          });
        }

        // Sort by orderIndex first, tiebreak with createdAt (chronological time)
        list.sort((a, b) => {
          const orderDiff = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        setMaterials(list);
        setLocalData(localMatKey, list);
        markSynced();
      }, (err) => {
        console.warn('Materials listener error, falling back to cache:', err);
        const cached = getLocalData<CourseMaterial[]>(localMatKey, []).filter(m => !deletedIdsRef.current.has(m.id));
        setMaterials(cached);
      });

      const eventsRef = collection(db, 'users', user.uid, 'events');
      unsubEvents = onSnapshot(eventsRef, (snapshot) => {
        const list: CalendarEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!deletedIdsRef.current.has(docSnap.id) && !data._deleted && !data.isDeleted) {
            list.push({ id: docSnap.id, ...data } as CalendarEvent);
          }
        });
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        setEvents(list);
        setLocalData(localEvKey, list);
        markSynced();
      }, (err) => {
        console.warn('Events listener error, falling back to cache:', err);
        const cached = getLocalData<CalendarEvent[]>(localEvKey, []).filter(e => !deletedIdsRef.current.has(e.id));
        setEvents(cached);
      });

      const portRef = collection(db, 'users', user.uid, 'portfolio_items');
      unsubPortfolio = onSnapshot(portRef, (snapshot) => {
        const list: PortfolioItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PortfolioItem);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPortfolioItems(list);
        setLocalData(localPortKey, list);
        markSynced();
      }, () => {
        const cached = getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS);
        setPortfolioItems(cached);
      });
    } catch {
      // Offline fallback
      setCourses(getLocalData<Course[]>(localCourseKey, []));
      setMaterials(getLocalData<CourseMaterial[]>(localMatKey, []));
      setEvents(getLocalData<CalendarEvent[]>(localEvKey, []));
      setPortfolioItems(getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS));
      setIsLoadingData(false);
    }

    return () => {
      unsubCourses();
      unsubMaterials();
      unsubEvents();
      unsubPortfolio();
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

    // 2. Persist to Firestore asynchronously
    if (!user.isDemo) {
      const courseDocRef = doc(db, 'users', user.uid, 'courses', newId);
      setDoc(courseDocRef, sanitizeForFirestore(newCourse), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.error('Failed to save course to Firestore:', err);
        });
    } else {
      markSynced();
    }
    return newId;
  };

  const updateCourse = async (id: string, data: Partial<Course>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updatedFields = { ...data, updatedAt: new Date().toISOString() };
    const updated = courses.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setCourses(updated);
    setLocalData(localCourseKey, updated);

    if (!user.isDemo) {
      const courseRef = doc(db, 'users', user.uid, 'courses', id);
      setDoc(courseRef, sanitizeForFirestore(updatedFields), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.error('Failed to update course in Firestore:', err);
        });
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
      return updated;
    });
    setMaterials(prev => {
      const updated = prev.filter(m => m.courseId !== id);
      setLocalData(localMatKey, updated);
      return updated;
    });
    setEvents(prev => {
      const updated = prev.filter(e => e.courseId !== id);
      setLocalData(localEvKey, updated);
      return updated;
    });

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'courses', id));
      } catch (err) {
        console.warn('Failed to delete course in Firestore, marking tombstone:', err);
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
    
    // 1. Instant local state & localStorage update for 0ms lag
    setCourses(reindexed);
    setLocalData(localCourseKey, reindexed);

    // 2. Debounced batch commit to Firestore with atomic set merge
    if (!user.isDemo) {
      if (reorderCoursesTimerRef.current) {
        clearTimeout(reorderCoursesTimerRef.current);
      }
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
        } catch (err) {
          console.error('Failed to commit reorderCourses batch:', err);
        }
      }, 180);
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

    // 2. Persist to Firestore asynchronously without blocking UI
    if (!user.isDemo) {
      const matDocRef = doc(db, 'users', user.uid, 'materials', newId);
      setDoc(matDocRef, sanitizeForFirestore(newMaterial), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.error('Failed to save material to Firestore:', err);
        });
    } else {
      markSynced();
    }
    return newId;
  };

  const updateMaterial = async (id: string, data: Partial<CourseMaterial>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updatedFields = { ...data, updatedAt: new Date().toISOString() };
    const updated = materials.map(m => m.id === id ? { ...m, ...updatedFields } : m);
    setMaterials(updated);
    setLocalData(localMatKey, updated);

    if (!user.isDemo) {
      const matDocRef = doc(db, 'users', user.uid, 'materials', id);
      setDoc(matDocRef, sanitizeForFirestore(updatedFields), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.error('Failed to update material in Firestore:', err);
        });
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
      return updated;
    });

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'materials', id));
      } catch (err) {
        console.warn('Failed to delete material in Firestore, writing tombstone:', err);
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
          console.error('Failed to commit reorderMaterials batch:', err);
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

    if (!user.isDemo) {
      const evDocRef = doc(db, 'users', user.uid, 'events', newId);
      setDoc(evDocRef, sanitizeForFirestore(newEvent), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.error('Failed to save event to Firestore:', err);
        });
    } else {
      markSynced();
    }
    return newId;
  };

  const updateEvent = async (id: string, data: Partial<CalendarEvent>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updatedFields = { ...data, updatedAt: new Date().toISOString() };
    const updated = events.map(e => e.id === id ? { ...e, ...updatedFields } : e);
    setEvents(updated);
    setLocalData(localEvKey, updated);

    if (!user.isDemo) {
      const evDocRef = doc(db, 'users', user.uid, 'events', id);
      setDoc(evDocRef, sanitizeForFirestore(updatedFields), { merge: true })
        .then(() => markSynced())
        .catch((err) => {
          console.error('Failed to update event in Firestore:', err);
        });
    } else {
      markSynced();
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    markIdsAsDeleted([id]);

    setEvents(prev => {
      const updated = prev.filter(e => e.id !== id);
      setLocalData(localEvKey, updated);
      return updated;
    });

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'events', id));
      } catch (err) {
        console.warn('Failed to delete event from Firestore, writing tombstone:', err);
        try {
          await setDoc(doc(db, 'users', user.uid, 'events', id), { _deleted: true, isDeleted: true }, { merge: true });
        } catch {}
      }
    }
    markSynced();
  };

  const toggleEventCompleted = async (id: string, current: boolean) => {
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
    const newPost: CommunityPost = {
      id: newId,
      authorId: user?.uid || 'guest-user',
      authorName: profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'นักเรียนติว',
      authorAvatar: user?.photoURL || undefined,
      authorTag: profile?.targetExam || 'Dek68',
      content: content.trim(),
      imageUrl: imageUrl || undefined,
      tags: tags.length > 0 ? tags : ['#พูดคุย'],
      likes: 0,
      likedBy: [],
      comments: [],
      sharedItem: sharedItem || undefined,
      createdAt: new Date().toISOString(),
    };

    setCommunityPosts(prev => [newPost, ...prev]);

    // Try persisting to Firestore if online
    if (user && !user.isDemo) {
      try {
        await setDoc(doc(db, 'community_posts', newId), newPost);
      } catch (err) {
        console.warn('Could not sync post to Firestore cloud, stored locally:', err);
      }
    }

    return newId;
  };

  const likeCommunityPost = async (postId: string) => {
    const currentUid = user?.uid || 'guest-user';
    setCommunityPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const hasLiked = p.likedBy.includes(currentUid);
      const updatedLikedBy = hasLiked 
        ? p.likedBy.filter(uid => uid !== currentUid)
        : [...p.likedBy, currentUid];
      return {
        ...p,
        likedBy: updatedLikedBy,
        likes: updatedLikedBy.length
      };
    }));

    // Sync to Firestore if authenticated
    if (user && !user.isDemo) {
      try {
        const targetPost = communityPosts.find(p => p.id === postId);
        if (targetPost) {
          const hasLiked = targetPost.likedBy.includes(currentUid);
          const updatedLikedBy = hasLiked 
            ? targetPost.likedBy.filter(uid => uid !== currentUid)
            : [...targetPost.likedBy, currentUid];
          await updateDoc(doc(db, 'community_posts', postId), {
            likedBy: updatedLikedBy,
            likes: updatedLikedBy.length
          });
        }
      } catch {}
    }
  };

  const addCommentToPost = async (postId: string, content: string) => {
    if (!content.trim()) return;
    const commentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newComment: PostComment = {
      id: commentId,
      postId,
      authorId: user?.uid || 'guest-user',
      authorName: profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'นักเรียนติว',
      authorAvatar: user?.photoURL || undefined,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setCommunityPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: [...p.comments, newComment]
      };
    }));

    if (user && !user.isDemo) {
      try {
        const targetPost = communityPosts.find(p => p.id === postId);
        if (targetPost) {
          await updateDoc(doc(db, 'community_posts', postId), {
            comments: [...targetPost.comments, newComment]
          });
        }
      } catch {}
    }
  };

  const deleteCommunityPost = async (postId: string) => {
    setCommunityPosts(prev => prev.filter(p => p.id !== postId));
    if (user && !user.isDemo) {
      try {
        await deleteDoc(doc(db, 'community_posts', postId));
      } catch {}
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
    const updated = portfolioItems.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item);
    setPortfolioItems(updated);
    setLocalData(localPortKey, updated);

    if (!user.isDemo) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'portfolio_items', id), { ...data, updatedAt: new Date().toISOString() });
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
    note?: string
  ): Promise<{ url: string; shareCode: string; shareId: string }> => {
    // Generate sleek, memorable 6-char share code e.g. LM-8K39
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const shareCode = `LM-${rand}`;
    const cleanCode = `LM${rand}`;
    const shareId = 'shr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    // Sanitize payload to keep it ultra-lightweight (<200KB) for instant network transport
    const lightweightPayload: SharedItemPayload = {
      ...payload,
      materials: payload.materials?.map(m => ({
        ...m,
        // If file data exceeds 200KB, omit heavy base64 so upload and download are blazing fast
        fileData: m.fileData && m.fileData.length < 200000 ? m.fileData : undefined,
      }))
    };

    const record = {
      id: shareId,
      shareCode,
      cleanCode,
      authorId: user ? user.uid : 'anonymous',
      authorName: profile?.displayName || user?.displayName || 'เพื่อนเด็กติว Lukmoo',
      type: lightweightPayload.type,
      payload: lightweightPayload,
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    // 1. Instant local storage cache under all alias keys (0ms access)
    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    localShares[shareCode] = record;
    localShares[cleanCode] = record;
    localShares[shareId] = record;
    setLocalData('lukmoo_private_shares', localShares);

    // 2. Persist to Firestore asynchronously in background without blocking UI/link generation
    if (user && !user.isDemo) {
      const sanitized = sanitizeForFirestore(record);
      Promise.all([
        setDoc(doc(db, 'shared_links', cleanCode), sanitized),
        setDoc(doc(db, 'shared_links', shareCode), sanitized),
      ]).catch((e) => {
        console.warn('Firestore shared_links background save warning:', e);
      });
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?code=${shareCode}`;

    return {
      url: shareUrl,
      shareCode,
      shareId,
    };
  };

  const resolvePrivateShare = async (shareCodeOrQuery?: string, shareId?: string): Promise<SharedItemPayload | null> => {
    if (!shareCodeOrQuery && !shareId) return null;

    let query = (shareCodeOrQuery || shareId || '').trim();

    // If a full link was pasted into the input, extract query parameters
    if (query.includes('?') || query.includes('http')) {
      try {
        const urlObj = new URL(query, window.location.origin);
        query = urlObj.searchParams.get('code') || 
                urlObj.searchParams.get('share_code') || 
                urlObj.searchParams.get('share_id') || 
                query;
      } catch {}
    }

    const upper = query.toUpperCase().replace(/\s+/g, '');
    const cleanNoHyphen = upper.replace(/-/g, '');
    const formattedHyphen = upper.includes('-') 
      ? upper 
      : (upper.startsWith('LM') && upper.length === 6 ? `LM-${upper.substring(2)}` : upper);

    // 1. Check local cache (instant 0ms)
    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    const localFound = localShares[query] || 
                       localShares[upper] || 
                       localShares[cleanNoHyphen] || 
                       localShares[formattedHyphen] || 
                       (shareId ? localShares[shareId] : null);

    if (localFound?.payload && localFound.payload.title) {
      return localFound.payload as SharedItemPayload;
    }

    // 2. Check Firestore collection 'shared_links' in parallel (single roundtrip)
    const lookupKeys = Array.from(new Set([
      cleanNoHyphen, 
      formattedHyphen, 
      upper, 
      query, 
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
          if (data?.payload && data.payload.title && data.payload.type) {
            localShares[lookupKeys[i]] = data;
            setLocalData('lukmoo_private_shares', localShares);
            return data.payload as SharedItemPayload;
          }
        }
      }
    } catch (err) {
      console.warn('Firestore parallel shared link fetch error:', err);
    }

    // 3. Backward compatibility: Base64 decode for older long share codes
    if (query.length > 25) {
      try {
        const decoded = decodeURIComponent(
          Array.prototype.map.call(atob(decodeURIComponent(query)), (c: string) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.title && parsed.type) {
          return parsed as SharedItemPayload;
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

      markSynced();
    } catch (err) {
      console.error('Manual sync error:', err);
    }
  };

  return (
    <DataContext.Provider value={{
      courses,
      materials,
      events,
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
