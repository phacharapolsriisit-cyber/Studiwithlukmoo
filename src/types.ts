export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  schoolOrUniv?: string;
  targetExam?: string;
  studyGoalHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type SubjectCategory = 
  | 'math' 
  | 'physics' 
  | 'chemistry' 
  | 'biology' 
  | 'english' 
  | 'thai' 
  | 'social' 
  | 'computer' 
  | 'general' 
  | 'other';

export interface Course {
  id: string;
  title: string;
  code?: string;
  instructor: string;
  category: SubjectCategory;
  color: string;
  orderIndex: number;
  description?: string;
  roomOrPlatform?: string; // e.g. "OnDemand", "YouTube", "Zoom", "กวดวิชาสยาม"
  createdAt: string;
  updatedAt?: string;
}

export type MaterialType = 'sheet' | 'document' | 'video' | 'link' | 'note';

export interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  type: MaterialType;
  url?: string;
  youtubeId?: string;
  fileData?: string; // Data URL for uploaded sheets/files
  fileName?: string;
  fileSize?: string;
  orderIndex: number;
  notes?: string;
  isCompleted?: boolean;
  duration?: string; // e.g. "45:20"
  playbackPosition?: number; // In seconds (e.g. 145) for resuming video
  durationSeconds?: number;
  lastWatchedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type EventType = 'exam' | 'assignment' | 'quiz' | 'presentation' | 'other';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface CalendarEvent {
  id: string;
  courseId?: string;
  title: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  priority: PriorityLevel;
  isCompleted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ActiveTab = 'dashboard' | 'courses' | 'materials' | 'calendar' | 'portfolio' | 'news' | 'profile';

export type PortfolioCategory = 'activity' | 'academic' | 'volunteer' | 'certificate';

export interface PortfolioItem {
  id: string;
  userId?: string;
  title: string;
  category: PortfolioCategory;
  date: string;
  organization: string;
  description: string;
  reflection?: string;
  imageUrl?: string;
  linkUrl?: string;
  hours?: number;
  level?: 'school' | 'district' | 'province' | 'national' | 'international';
  createdAt: string;
  updatedAt?: string;
}

export interface SharedLinkRecord {
  id: string;
  authorId: string;
  authorName: string;
  type: 'course' | 'material';
  payload: SharedItemPayload;
  note?: string;
  createdAt: string;
}

export type TCASCategory = 'tcas' | 'tgat_tpat' | 'alevel' | 'portfolio' | 'quota' | 'admission';

export interface NewsAnnouncement {
  id: string;
  title: string;
  summary: string;
  category: TCASCategory;
  date: string;
  source: string;
  link: string;
  isImportant?: boolean;
  tags: string[];
}

export interface SharedItemPayload {
  type: 'course' | 'material';
  title: string;
  category?: SubjectCategory;
  instructor?: string;
  description?: string;
  materialType?: MaterialType;
  youtubeId?: string;
  url?: string;
  fileData?: string;
  fileName?: string;
  fileSize?: string;
  notes?: string;
  courseTitle?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorTag?: string; // e.g. "Dek68", "ติวเตอร์คณิต", "Dek69"
  content: string;
  imageUrl?: string;
  tags: string[];
  likes: number;
  likedBy: string[]; // array of user IDs
  comments: PostComment[];
  sharedItem?: SharedItemPayload;
  createdAt: string;
}

export type ThaiRegion = 'central' | 'northern' | 'northeastern' | 'southern' | 'eastern';

export interface UniversityAdmission {
  id: string;
  nameTh: string;
  nameEn: string;
  abbr: string;
  region: ThaiRegion;
  logoText: string;
  color: string;
  websiteUrl: string;
  admissionUrl: string;
  regSysUrl?: string;
  phone?: string;
  highlights: string[];
  roundsInfo: {
    round1?: string;
    round2?: string;
    round3?: string;
    round4?: string;
  };
}
