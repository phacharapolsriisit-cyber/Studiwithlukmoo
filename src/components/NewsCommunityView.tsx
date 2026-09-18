import React, { useState } from 'react';
import { 
  Bell, 
  Users, 
  Building2, 
  ExternalLink, 
  Search, 
  Heart, 
  MessageSquare, 
  Share2, 
  Image as ImageIcon, 
  Send, 
  Calendar, 
  CheckCircle2, 
  Tag, 
  Sparkles, 
  BookmarkPlus, 
  BookOpen, 
  FileText, 
  Youtube, 
  ArrowRight,
  Filter,
  Phone,
  Trash2,
  X,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UNIVERSITY_ADMISSIONS } from '../data/tcasData';
import { 
  UniversityAdmission, 
  CommunityPost, 
  ThaiRegion, 
  SharedItemPayload,
  Course,
  CourseMaterial 
} from '../types';

type NewsSubTab = 'community' | 'universities';

interface NewsCommunityViewProps {
  onOpenYouTubePlayer?: (material: CourseMaterial, course?: Course) => void;
  onNavigateToCourses?: () => void;
  onNavigateToMaterials?: () => void;
}

export const NewsCommunityView: React.FC<NewsCommunityViewProps> = ({
  onOpenYouTubePlayer,
  onNavigateToCourses,
  onNavigateToMaterials,
}) => {
  const { user, profile } = useAuth();
  const { 
    communityPosts, 
    addCommunityPost, 
    likeCommunityPost, 
    addCommentToPost, 
    deleteCommunityPost, 
    importSharedItem,
    courses,
    materials
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<NewsSubTab>('community');

  // University Directory filters
  const [univSearch, setUnivSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // Community State
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [isAttachingImage, setIsAttachingImage] = useState(false);
  const [freeTagInput, setFreeTagInput] = useState<string>('Dek68, แชร์วิชาเรียน');
  const [communitySearch, setCommunitySearch] = useState<string>('');
  const [selectedSharedType, setSelectedSharedType] = useState<'none' | 'course' | 'material'>('none');
  const [selectedSharedCourseId, setSelectedSharedCourseId] = useState<string>('');
  const [selectedSharedMaterialId, setSelectedSharedMaterialId] = useState<string>('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [communityFilter, setCommunityFilter] = useState<'all' | 'shared' | 'chat'>('all');
  const [isPosting, setIsPosting] = useState(false);

  // Trigger temporary notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter Universities
  const filteredUniversities = UNIVERSITY_ADMISSIONS.filter((univ) => {
    const query = univSearch.toLowerCase();
    const matchesSearch = 
      univ.nameTh.toLowerCase().includes(query) ||
      univ.nameEn.toLowerCase().includes(query) ||
      univ.abbr.toLowerCase().includes(query) ||
      univ.highlights.some(h => h.toLowerCase().includes(query));
    const matchesRegion = selectedRegion === 'all' || univ.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  // Filter Community Posts with Free Search Bar
  const filteredPosts = communityPosts.filter((post) => {
    if (communityFilter === 'shared' && !post.sharedItem) return false;
    if (communityFilter === 'chat' && post.sharedItem) return false;

    if (communitySearch.trim()) {
      const q = communitySearch.toLowerCase();
      const matchContent = post.content.toLowerCase().includes(q);
      const matchAuthor = post.authorName.toLowerCase().includes(q);
      const matchTags = post.tags.some(t => t.toLowerCase().includes(q));
      const matchShared = Boolean(post.sharedItem) && (
        Boolean(post.sharedItem?.title?.toLowerCase().includes(q)) ||
        Boolean(post.sharedItem?.courseTitle?.toLowerCase().includes(q)) ||
        Boolean(post.sharedItem?.instructor?.toLowerCase().includes(q)) ||
        Boolean(post.sharedItem?.notes?.toLowerCase().includes(q))
      );
      if (!matchContent && !matchAuthor && !matchTags && !matchShared) {
        return false;
      }
    }
    return true;
  });

  // Handle creating new community post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !postImageUrl && selectedSharedType === 'none') {
      showToast('กรุณากรอกข้อความ หรือแนบรูปภาพ/วิชาที่ต้องการแชร์');
      return;
    }

    try {
      setIsPosting(true);
      let sharedPayload: SharedItemPayload | undefined = undefined;

      if (selectedSharedType === 'course' && selectedSharedCourseId) {
        const foundCourse = courses.find(c => c.id === selectedSharedCourseId);
        if (foundCourse) {
          sharedPayload = {
            type: 'course',
            title: foundCourse.title,
            category: foundCourse.category,
            instructor: foundCourse.instructor,
            description: foundCourse.description,
            courseTitle: foundCourse.title,
          };
        }
      } else if (selectedSharedType === 'material' && selectedSharedMaterialId) {
        const foundMat = materials.find(m => m.id === selectedSharedMaterialId);
        const parentCourse = courses.find(c => c.id === foundMat?.courseId);
        if (foundMat) {
          sharedPayload = {
            type: 'material',
            title: foundMat.title,
            materialType: foundMat.type,
            category: parentCourse?.category,
            instructor: parentCourse?.instructor,
            youtubeId: foundMat.youtubeId,
            url: foundMat.url,
            fileData: foundMat.fileData,
            fileName: foundMat.fileName,
            fileSize: foundMat.fileSize,
            notes: foundMat.notes,
            courseTitle: parentCourse?.title,
          };
        }
      }

      // Parse free-text tags freely without rigid hashtag select
      const parsedTags = freeTagInput
        .split(/[,#\s]+/)
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => t.startsWith('#') ? t : `#${t}`);

      const finalTags = parsedTags.length > 0 ? parsedTags : ['#Dek68'];

      await addCommunityPost(
        postContent,
        finalTags,
        postImageUrl || undefined,
        sharedPayload
      );

      // Reset form
      setPostContent('');
      setPostImageUrl('');
      setIsAttachingImage(false);
      setSelectedSharedType('none');
      setSelectedSharedCourseId('');
      setSelectedSharedMaterialId('');
      showToast('โพสต์ข้อความลงหน้าชุมชนเรียบร้อยแล้ว!');
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการโพสต์');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle local image file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('ไฟล์รูปภาพมีขนาดเกิน 2MB กรุณาเลือกไฟล์ที่เล็กลง');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPostImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle adding comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await addCommentToPost(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
    showToast('ส่งความคิดเห็นแล้ว');
  };

  // Handle 1-click import of shared course/material
  const handleImport = async (sharedItem: SharedItemPayload) => {
    const result = await importSharedItem(sharedItem);
    showToast(result.message);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-slideUp text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-6 sm:p-8 shadow-lg shadow-orange-500/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ชุมชนเด็กสายติว & แลกเปลี่ยนชีท</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ชุมชนเด็กติว & กระดานแลกเปลี่ยนชีทสรุป
          </h1>
          <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
            พื้นที่พูดคุย ถามโจทย์การบ้าน แลกเปลี่ยนชีท สรุปสูตร และวิดีโอ YouTube ติวฟรีกับเพื่อนๆ 
            พร้อมลิงก์ตรงระบบ Admission มหาวิทยาลัยทั่วประเทศ
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          id="tab-community-feed"
          onClick={() => setActiveSubTab('community')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            activeSubTab === 'community'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ชุมชน & ฟีดนักเรียน ({communityPosts.length})</span>
        </button>

        <button
          id="tab-universities-dir"
          onClick={() => setActiveSubTab('universities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            activeSubTab === 'universities'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>เว็บ Admission มหาลัยทั่วประเทศ ({UNIVERSITY_ADMISSIONS.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* COMMUNITY FEED & RESOURCE SHARING (POST/COMMENT)             */}
      {/* ============================================================ */}
      {activeSubTab === 'community' && (
        <div className="space-y-6">
          {/* Post Creation Box */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-2xl object-cover ring-1 ring-amber-500/30 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {(profile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  พูดคุย ถามข้อสอบ หรือแชร์ชีท/คลิปให้เพื่อนๆ
                </h3>
                <p className="text-xs text-slate-400">
                  โพสต์ข้อความ แนบรูปภาพ หรือแนบวิชา/ชีทเพื่อแบ่งปันในชุมชน
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3 pt-1">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="มีคำถามข้อสอบ, อยากรีวิวคอร์ส, หรืออยากบอกต่อสูตรลัด พิมพ์ที่นี่ได้เลย..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400 bg-slate-50/50"
              />

              {/* Image Preview if attached */}
              {postImageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-60 bg-slate-100">
                  <img src={postImageUrl} alt="attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPostImageUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Image Attachment Input Box */}
              {isAttachingImage && !postImageUrl && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-700">แนบรูปภาพประกอบ:</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>เลือกไฟล์รูปภาพจากอุปกรณ์ (PNG/JPG)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageFileChange}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="หรือวางลิงก์รูปภาพ (Image URL)..."
                      value={postImageUrl}
                      onChange={(e) => setPostImageUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIsAttachingImage(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Share from My Collection */}
              {selectedSharedType !== 'none' && (
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">
                      แนบวิชาหรือเอกสารจากคลังของฉัน:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSharedType('none');
                        setSelectedSharedCourseId('');
                        setSelectedSharedMaterialId('');
                      }}
                      className="text-amber-700 hover:text-amber-900 font-semibold"
                    >
                      นำออก
                    </button>
                  </div>

                  {selectedSharedType === 'course' ? (
                    <select
                      value={selectedSharedCourseId}
                      onChange={(e) => setSelectedSharedCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-slate-800 text-xs font-medium focus:outline-none"
                    >
                      <option value="">-- เลือกวิชาเรียนที่ต้องการแชร์ --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.instructor || 'ไม่มีผู้สอน'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={selectedSharedMaterialId}
                      onChange={(e) => setSelectedSharedMaterialId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-slate-800 text-xs font-medium focus:outline-none"
                    >
                      <option value="">-- เลือกชีทสรุปหรือคลิปที่ต้องการแชร์ --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.type === 'video' ? '📺 ' : '📄 '} {m.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Tag & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Attach Image Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsAttachingImage(!isAttachingImage)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      isAttachingImage || postImageUrl
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>แนบรูปภาพ</span>
                  </button>

                  {/* Share My Course Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (courses.length === 0) {
                        showToast('คุณยังไม่มีคอร์สติวในคลัง กรุณาเพิ่มคอร์สก่อนทำการแชร์');
                        return;
                      }
                      setSelectedSharedType('course');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      selectedSharedType === 'course'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>แนบคอร์สของฉัน</span>
                  </button>

                  {/* Share My Material Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (materials.length === 0) {
                        showToast('คุณยังไม่มีชีทหรือคลิปในคลัง กรุณาเพิ่มชีทก่อนทำการแชร์');
                        return;
                      }
                      setSelectedSharedType('material');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      selectedSharedType === 'material'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>แนบชีท/คลิปของฉัน</span>
                  </button>

                  {/* Free-text Tag / Topic input - User requested free typing without rigid hashtag select */}
                  <div className="flex-1 min-w-[180px]">
                    <input
                      type="text"
                      placeholder="พิมพ์แท็กหรือหัวข้ออิสระ (เช่น Dek68, สรุปฟิสิกส์)..."
                      value={freeTagInput}
                      onChange={(e) => setFreeTagInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPosting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPosting ? 'กำลังโพสต์...' : 'โพสต์'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Community Search & Feed Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Search Input for Community */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์ค้นหากระทู้, คำถาม, ชีทที่แชร์, หรือแท็ก..."
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/60"
              />
              {communitySearch && (
                <button
                  onClick={() => setCommunitySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              <button
                onClick={() => setCommunityFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  communityFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setCommunityFilter('shared')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  communityFilter === 'shared'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                เฉพาะคอร์ส & ชีทที่แชร์
              </button>
              <button
                onClick={() => setCommunityFilter('chat')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  communityFilter === 'chat'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                กระทู้พูดคุย
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const currentUid = user?.uid || 'guest-user';
              const hasLiked = post.likedBy.includes(currentUid);
              const isCommentsOpen = !!expandedComments[post.id];
              const isAuthor = user && post.authorId === user.uid;

              return (
                <div 
                  key={post.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                >
                  {/* Author Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {post.authorAvatar ? (
                        <img 
                          src={post.authorAvatar} 
                          alt={post.authorName} 
                          className="w-10 h-10 rounded-2xl object-cover ring-1 ring-amber-500/20 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {post.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{post.authorName}</h4>
                          {post.authorTag && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              {post.authorTag}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString('th-TH', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </span>
                      </div>
                    </div>

                    {isAuthor && (
                      <button
                        onClick={() => deleteCommunityPost(post.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="ลบโพสต์ของฉัน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Post Content */}
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Attached Image */}
                  {post.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200/80 max-h-96 bg-slate-50">
                      <img 
                        src={post.imageUrl} 
                        alt="Post attachment" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* SHARED RESOURCE CARD (Course or Material/Video) */}
                  {post.sharedItem && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                            {post.sharedItem.type === 'course' ? (
                              <BookOpen className="w-5 h-5 text-blue-600" />
                            ) : post.sharedItem.materialType === 'video' ? (
                              <Youtube className="w-5 h-5 text-red-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                {post.sharedItem.type === 'course' ? 'คอร์สติวที่แชร์' : post.sharedItem.materialType === 'video' ? 'คลิป YouTube ที่แชร์' : 'ชีทสรุปที่แชร์'}
                              </span>
                              {post.sharedItem.courseTitle && (
                                <span className="text-[11px] text-slate-500">
                                  {post.sharedItem.courseTitle}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-sm text-slate-900 mt-1">
                              {post.sharedItem?.title || 'เนื้อหาที่แชร์'}
                            </h5>
                            {post.sharedItem.instructor && (
                              <p className="text-xs text-slate-500">ผู้สอน: {post.sharedItem.instructor}</p>
                            )}
                            {post.sharedItem.notes && (
                              <p className="text-xs text-slate-600 mt-1 italic">
                                "{post.sharedItem.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 1-Click Import Button */}
                        <button
                          onClick={() => handleImport(post.sharedItem!)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                          <span>บันทึกลงคลัง</span>
                        </button>
                      </div>

                      {/* If shared item has a YouTube video and preview handler */}
                      {post.sharedItem.youtubeId && onOpenYouTubePlayer && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <button
                            onClick={() => {
                              onOpenYouTubePlayer({
                                id: `preview-${post.id}`,
                                courseId: 'shared',
                                title: post.sharedItem!.title,
                                type: 'video',
                                youtubeId: post.sharedItem!.youtubeId,
                                url: post.sharedItem!.url,
                                orderIndex: 0,
                                notes: post.sharedItem!.notes,
                                createdAt: new Date().toISOString(),
                              });
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                          >
                            <Youtube className="w-4 h-4" />
                            <span>ดูคลิปในหน้าต่างลอยตัว</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((t, idx) => (
                        <span key={idx} className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Like & Comment Stats Bar */}
                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs font-medium text-slate-500">
                    <button
                      onClick={() => likeCommunityPost(post.id)}
                      className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors cursor-pointer ${
                        hasLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likes} ไลก์</span>
                    </button>

                    <button
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex items-center gap-1.5 p-1 rounded-lg hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments?.length || 0} ความคิดเห็น</span>
                    </button>
                  </div>

                  {/* Expandable Comments Drawer */}
                  {isCommentsOpen && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
                      {/* Existing Comments */}
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {post.comments.map((comm) => (
                            <div key={comm.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{comm.authorName}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(comm.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap">{comm.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">
                          ยังไม่มีความคิดเห็น เป็นคนแรกที่เริ่มตอบกลับเลย!
                        </p>
                      )}

                      {/* Comment Input Box */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="เขียนความคิดเห็นหรือคำถาม..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer"
                          title="ส่งความคิดเห็น"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SUB-TAB: UNIVERSITY ADMISSIONS DIRECTORY (NATIONWIDE)     */}
      {/* ============================================================ */}
      {activeSubTab === 'universities' && (
        <div className="space-y-6">
          {/* Search & Region Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อมหาวิทยาลัย หรือตัวย่อ (เช่น CU, มธ, มหิดล, KMUTT, มช, มข, แพทย์)..."
                value={univSearch}
                onChange={(e) => setUnivSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/60"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'ทุกภาค' },
                { id: 'central', label: 'กรุงเทพฯ & ภาคกลาง' },
                { id: 'northern', label: 'ภาคเหนือ' },
                { id: 'northeastern', label: 'ภาคอีสาน' },
                { id: 'southern', label: 'ภาคใต้' },
                { id: 'eastern', label: 'ภาคตะวันออก' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegion(r.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedRegion === r.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Universities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUniversities.map((univ) => (
              <div 
                key={univ.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Header with University Logo Brand */}
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-md shrink-0"
                      style={{ backgroundColor: univ.color }}
                    >
                      {univ.logoText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {univ.abbr}
                        </span>
                        {univ.phone && (
                          <a 
                            href={`tel:${univ.phone}`}
                            className="text-[11px] text-slate-400 hover:text-amber-600 flex items-center gap-1"
                            title="โทรสอบถามฝ่ายรับสมัคร"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{univ.phone}</span>
                          </a>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1 truncate">
                        {univ.nameTh}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">
                        {univ.nameEn}
                      </p>
                    </div>
                  </div>

                  {/* Highlights / Special Projects */}
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div className="font-semibold text-[11px] text-slate-700">จุดเด่น & โครงการรับสมัคร:</div>
                    <ul className="space-y-0.5 pl-1">
                      {univ.highlights.map((h, i) => (
                        <li key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Rounds Information */}
                  <div className="text-[11px] space-y-1 text-slate-600">
                    <div className="flex items-start gap-1">
                      <strong className="text-slate-800 shrink-0">รอบ 1:</strong>
                      <span className="text-slate-500 line-clamp-1">{univ.roundsInfo.round1}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <strong className="text-slate-800 shrink-0">รอบ 2:</strong>
                      <span className="text-slate-500 line-clamp-1">{univ.roundsInfo.round2}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Link Buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <a
                    href={univ.admissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
                  >
                    <span>เว็บไซต์รับสมัคร (Admission)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {univ.regSysUrl && (
                    <a
                      href={univ.regSysUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
                    >
                      <span>ประกาศระเบียบการ / ระบบรับตรง</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
