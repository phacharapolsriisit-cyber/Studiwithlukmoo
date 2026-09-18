import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  db, 
  collection, 
  doc, 
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
  createPrivateShareLink: (payload: SharedItemPayload, note?: string) => Promise<string>;
  resolvePrivateShare: (shareCode?: string, shareId?: string) => Promise<SharedItemPayload | null>;
  exportBackupData: () => string;
  importBackupData: (jsonData: string) => Promise<void>;
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

  const localCourseKey = user ? `lukmoo_data_${user.uid}_courses` : '';
  const localMatKey = user ? `lukmoo_data_${user.uid}_materials` : '';
  const localEvKey = user ? `lukmoo_data_${user.uid}_events` : '';
  const localPortKey = user ? `lukmoo_data_${user.uid}_portfolio` : '';

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

    // If demo user or without cloud auth token, load strictly from user's isolated local store
    if (user.isDemo) {
      const localC = getLocalData<Course[]>(localCourseKey, []);
      const localM = getLocalData<CourseMaterial[]>(localMatKey, []);
      const localE = getLocalData<CalendarEvent[]>(localEvKey, []);
      const localP = getLocalData<PortfolioItem[]>(localPortKey, INITIAL_PORTFOLIO_ITEMS);
      setCourses(localC);
      setMaterials(localM);
      setEvents(localE);
      setPortfolioItems(localP);
      setIsLoadingData(false);
      markSynced();
      return;
    }

    // Try cloud Firestore first
    let unsubCourses: () => void = () => {};
    let unsubMaterials: () => void = () => {};
    let unsubEvents: () => void = () => {};
    let unsubPortfolio: () => void = () => {};

    try {
      const coursesRef = collection(db, 'users', user.uid, 'courses');
      const coursesQuery = query(coursesRef, orderBy('orderIndex', 'asc'));
      unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
        const list: Course[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Course);
        });
        setCourses(list);
        setLocalData(localCourseKey, list);
        markSynced();
        setIsLoadingData(false);
      }, () => {
        // Fallback to local storage cache
        const cached = getLocalData<Course[]>(localCourseKey, []);
        setCourses(cached);
        setIsLoadingData(false);
      });

      const materialsRef = collection(db, 'users', user.uid, 'materials');
      const materialsQuery = query(materialsRef, orderBy('orderIndex', 'asc'));
      unsubMaterials = onSnapshot(materialsQuery, (snapshot) => {
        const list: CourseMaterial[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CourseMaterial);
        });
        setMaterials(list);
        setLocalData(localMatKey, list);
        markSynced();
      }, () => {
        const cached = getLocalData<CourseMaterial[]>(localMatKey, []);
        setMaterials(cached);
      });

      const eventsRef = collection(db, 'users', user.uid, 'events');
      const eventsQuery = query(eventsRef, orderBy('date', 'asc'));
      unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
        const list: CalendarEvent[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CalendarEvent);
        });
        setEvents(list);
        setLocalData(localEvKey, list);
        markSynced();
      }, () => {
        const cached = getLocalData<CalendarEvent[]>(localEvKey, []);
        setEvents(cached);
      });

      const portRef = collection(db, 'users', user.uid, 'portfolio_items');
      const portQuery = query(portRef, orderBy('createdAt', 'desc'));
      unsubPortfolio = onSnapshot(portQuery, (snapshot) => {
        const list: PortfolioItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PortfolioItem);
        });
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
    const newCourse: Course = {
      ...courseData,
      id: newId,
      orderIndex: courses.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update state immediately
    const updated = [...courses, newCourse];
    setCourses(updated);
    setLocalData(localCourseKey, updated);

    // Save to Firestore if real user
    if (!user.isDemo) {
      try {
        const courseDocRef = doc(db, 'users', user.uid, 'courses', newId);
        await setDoc(courseDocRef, newCourse);
      } catch {}
    }
    markSynced();
    return newId;
  };

  const updateCourse = async (id: string, data: Partial<Course>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updated = courses.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
    setCourses(updated);
    setLocalData(localCourseKey, updated);

    if (!user.isDemo) {
      try {
        const courseRef = doc(db, 'users', user.uid, 'courses', id);
        await updateDoc(courseRef, { ...data, updatedAt: new Date().toISOString() });
      } catch {}
    }
    markSynced();
  };

  const deleteCourse = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updatedCourses = courses.filter(c => c.id !== id);
    const updatedMaterials = materials.filter(m => m.courseId !== id);
    const updatedEvents = events.filter(e => e.courseId !== id);

    setCourses(updatedCourses);
    setMaterials(updatedMaterials);
    setEvents(updatedEvents);
    setLocalData(localCourseKey, updatedCourses);
    setLocalData(localMatKey, updatedMaterials);
    setLocalData(localEvKey, updatedEvents);

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'courses', id));
        const relatedMaterials = materials.filter(m => m.courseId === id);
        for (const m of relatedMaterials) {
          await deleteDoc(doc(db, 'users', user.uid, 'materials', m.id));
        }
        const relatedEvents = events.filter(e => e.courseId === id);
        for (const e of relatedEvents) {
          await deleteDoc(doc(db, 'users', user.uid, 'events', e.id));
        }
      } catch {}
    }
    markSynced();
  };

  const reorderCourses = async (newOrderedList: Course[]) => {
    if (!user) return;
    const reindexed = newOrderedList.map((c, idx) => ({ ...c, orderIndex: idx }));
    setCourses(reindexed);
    setLocalData(localCourseKey, reindexed);

    if (!user.isDemo) {
      try {
        const batch = writeBatch(db);
        reindexed.forEach((course) => {
          const ref = doc(db, 'users', user.uid, 'courses', course.id);
          batch.update(ref, { orderIndex: course.orderIndex });
        });
        await batch.commit();
      } catch {}
    }
  };

  // Material actions
  const addMaterial = async (materialData: Omit<CourseMaterial, 'id' | 'createdAt' | 'orderIndex'>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const newId = 'mat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newMaterial: CourseMaterial = {
      ...materialData,
      id: newId,
      orderIndex: materials.filter(m => m.courseId === materialData.courseId).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...materials, newMaterial];
    setMaterials(updated);
    setLocalData(localMatKey, updated);

    if (!user.isDemo) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'materials', newId), newMaterial);
      } catch {}
    }
    markSynced();
    return newId;
  };

  const updateMaterial = async (id: string, data: Partial<CourseMaterial>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updated = materials.map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m);
    setMaterials(updated);
    setLocalData(localMatKey, updated);

    if (!user.isDemo) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'materials', id), { ...data, updatedAt: new Date().toISOString() });
      } catch {}
    }
    markSynced();
  };

  const deleteMaterial = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updated = materials.filter(m => m.id !== id);
    setMaterials(updated);
    setLocalData(localMatKey, updated);

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'materials', id));
      } catch {}
    }
    markSynced();
  };

  const toggleMaterialCompleted = async (id: string, current: boolean) => {
    await updateMaterial(id, { isCompleted: !current });
  };

  const reorderMaterials = async (courseId: string, newOrderedList: CourseMaterial[]) => {
    if (!user) return;
    const reindexedCourseItems = newOrderedList.map((m, idx) => ({ ...m, orderIndex: idx }));
    const otherItems = materials.filter(m => m.courseId !== courseId);
    const allMaterials = [...otherItems, ...reindexedCourseItems];

    setMaterials(allMaterials);
    setLocalData(localMatKey, allMaterials);

    if (!user.isDemo) {
      try {
        const batch = writeBatch(db);
        reindexedCourseItems.forEach((mat) => {
          const ref = doc(db, 'users', user.uid, 'materials', mat.id);
          batch.update(ref, { orderIndex: mat.orderIndex });
        });
        await batch.commit();
      } catch {}
    }
  };

  // Event actions
  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const newId = 'ev_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newEvent: CalendarEvent = {
      ...eventData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...events, newEvent];
    setEvents(updated);
    setLocalData(localEvKey, updated);

    if (!user.isDemo) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'events', newId), newEvent);
      } catch {}
    }
    markSynced();
    return newId;
  };

  const updateEvent = async (id: string, data: Partial<CalendarEvent>) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updated = events.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e);
    setEvents(updated);
    setLocalData(localEvKey, updated);

    if (!user.isDemo) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'events', id), { ...data, updatedAt: new Date().toISOString() });
      } catch {}
    }
    markSynced();
  };

  const deleteEvent = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    markSyncing();
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    setLocalData(localEvKey, updated);

    if (!user.isDemo) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'events', id));
      } catch {}
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
        markSynced();
        return { success: true, message: `บันทึกคอร์ส "${sharedItem.title}" เข้าคลังวิชาของคุณสำเร็จแล้ว!`, courseId: newCourseId };
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

  // Private share link creation
  const createPrivateShareLink = async (payload: SharedItemPayload, note?: string): Promise<string> => {
    const shareId = 'shr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const record = {
      id: shareId,
      authorId: user ? user.uid : 'anonymous',
      authorName: profile?.displayName || user?.displayName || 'เพื่อนเด็กติว Lukmoo',
      type: payload.type,
      payload,
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    // Save in local storage lookup
    const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
    localShares[shareId] = record;
    setLocalData('lukmoo_private_shares', localShares);

    // Save in firestore if connected
    if (user && !user.isDemo) {
      try {
        await setDoc(doc(db, 'shared_links', shareId), record);
      } catch (e) {
        console.warn('Firestore shared_links save error', e);
      }
    }

    // Build URL with query param
    let code = '';
    try {
      // Safe base64 unicode
      const json = JSON.stringify(payload);
      code = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    } catch {}

    const baseUrl = window.location.origin + window.location.pathname;
    if (code) {
      return `${baseUrl}?share_code=${encodeURIComponent(code)}&share_id=${shareId}`;
    }
    return `${baseUrl}?share_id=${shareId}`;
  };

  const resolvePrivateShare = async (shareCode?: string, shareId?: string): Promise<SharedItemPayload | null> => {
    // 1. Try decoding share_code
    if (shareCode) {
      try {
        const decoded = decodeURIComponent(
          Array.prototype.map.call(atob(decodeURIComponent(shareCode)), (c: string) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join('')
        );
        const parsed = JSON.parse(decoded);
        if (parsed && parsed.title && parsed.type) {
          return parsed as SharedItemPayload;
        }
      } catch {}
    }

    // 2. Try looking up shareId in local cache
    const key = shareId || shareCode;
    if (key) {
      try {
        const localShares = getLocalData<Record<string, any>>('lukmoo_private_shares', {});
        if (localShares[key]?.payload) {
          return localShares[key].payload;
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
