import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData, decodeSharedPayload } from './context/DataContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { CoursesView } from './components/CoursesView';
import { MaterialsView } from './components/MaterialsView';
import { CalendarView } from './components/CalendarView';
import { CourseModal } from './components/CourseModal';
import { MaterialModal } from './components/MaterialModal';
import { EventModal } from './components/EventModal';
import { YouTubePlayerModal } from './components/YouTubePlayerModal';
import { ProfileModal } from './components/ProfileModal';
import { NewsCommunityView } from './components/NewsCommunityView';
import { PortfolioView } from './components/PortfolioView';
import { ShareModal } from './components/ShareModal';
import { RedeemShareCodeModal } from './components/RedeemShareCodeModal';
import { UnauthenticatedView } from './components/UnauthenticatedView';
import { SyncDiagnosticView } from './components/SyncDiagnosticView';
import { ActiveTab, Course, CourseMaterial, CalendarEvent, SharedItemPayload } from './types';
import { Cloud, Loader2, Download, CheckCircle2, X, AlertTriangle, ExternalLink, HardDrive, Terminal } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading: authLoading, syncStatus } = useAuth();
  const { 
    courses, 
    materials, 
    events, 
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
    importSharedItem,
    resolvePrivateShare,
    isQuotaExceeded,
    quotaDismissed,
    dismissQuotaBanner,
    firebaseConsoleUrl
  } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showDebugSync, setShowDebugSync] = useState(false);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#debug-sync' || window.location.pathname.endsWith('/debug/sync')) {
        setShowDebugSync(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialCourseId, setMaterialCourseId] = useState<string | undefined>(undefined);
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventDate, setEventDate] = useState<string | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Incoming private share link handling
  const [incomingSharedItem, setIncomingSharedItem] = useState<{
    payload: SharedItemPayload;
    shareId?: string;
  } | null>(null);
  const [isImportingShared, setIsImportingShared] = useState(false);
  const [importedToast, setImportedToast] = useState<string | null>(null);

  // Toast auto-dismiss
  useEffect(() => {
    if (importedToast) {
      const timer = setTimeout(() => setImportedToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [importedToast]);

  const [youtubePlayer, setYoutubePlayer] = useState<{
    isOpen: boolean;
    material: CourseMaterial | null;
    course?: Course | null;
  }>({
    isOpen: false,
    material: null,
    course: null,
  });

  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    course?: Course | null;
    material?: CourseMaterial | null;
    courseOfMaterial?: Course | null;
  }>({
    isOpen: false,
    course: null,
    material: null,
    courseOfMaterial: null,
  });

  // Selected course filter when jumping from Courses view to Materials view
  const [selectedCourseFilterForMaterials, setSelectedCourseFilterForMaterials] = useState<string>('all');

  // Requirement: "และเปิดมาไม่ให้มีวิชาไหนเลย จนกว่าจะล็อคอิน และมีหน้าต่างล็อคอินด้วยตอนเข้าครั้งแรก"
  useEffect(() => {
    if (!authLoading && !user) {
      setIsAuthModalOpen(true);
    } else if (user) {
      setIsAuthModalOpen(false);
    }
  }, [user, authLoading]);

  // Requirement: "ส่วนแชร์วิชาเรียนขอมีการใส่ลิ้งค์เพิ่มแทนการลงชุมชนด้วยเผื่อต้องการแบบความเป็นส่วนตัว"
  // Detect incoming private share link (#import=... or ?import=... or ?code=... or #code=...)
  useEffect(() => {
    // 1. Check hash params (e.g. #code=...&import=...)
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const hashImport = hashParams.get('import');
    const hashCode = hashParams.get('code');

    // 2. Check query params (e.g. ?code=...&import=...)
    const searchParams = new URLSearchParams(window.location.search);
    const searchImport = searchParams.get('import');
    const searchCode = searchParams.get('code') || searchParams.get('c') || searchParams.get('share_code');
    const shareId = searchParams.get('share_id');

    const rawImport = hashImport || searchImport;
    if (rawImport) {
      const decoded = decodeSharedPayload(decodeURIComponent(rawImport));
      if (decoded && decoded.title) {
        setIncomingSharedItem({ payload: decoded, shareId: hashCode || searchCode || undefined });
        return;
      }
    }

    const codeToResolve = hashCode || searchCode;
    if (codeToResolve || shareId) {
      resolvePrivateShare(codeToResolve || undefined, shareId || undefined).then((item) => {
        if (item) {
          setIncomingSharedItem({ payload: item, shareId: shareId || undefined });
        }
      });
    }
  }, [resolvePrivateShare]);

  const handleConfirmImport = async () => {
    if (!incomingSharedItem) return;
    try {
      setIsImportingShared(true);
      await importSharedItem(incomingSharedItem.payload);
      setImportedToast(`บันทึก "${incomingSharedItem.payload.title}" สู่คลังของคุณเรียบร้อยแล้ว!`);
      setTimeout(() => setImportedToast(null), 4000);
      
      if (incomingSharedItem.payload.type === 'course') {
        setActiveTab('courses');
      } else {
        setActiveTab('materials');
      }
      setIncomingSharedItem(null);

      // Clean up URL parameters and hash without refreshing page
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('c');
      url.searchParams.delete('share_code');
      url.searchParams.delete('share_id');
      url.searchParams.delete('import');
      url.hash = '';
      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsImportingShared(false);
    }
  };

  const handleDismissIncomingShare = () => {
    setIncomingSharedItem(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('share_code');
    url.searchParams.delete('share_id');
    window.history.replaceState({}, '', url.toString());
  };

  // Handlers for Course
  const handleOpenCourseModal = (course?: Course) => {
    setEditingCourse(course || null);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'orderIndex'>) => {
    if (editingCourse) {
      await updateCourse(editingCourse.id, courseData);
      setImportedToast(`อัปเดตวิชา "${courseData.title}" เรียบร้อยแล้ว`);
    } else {
      await addCourse(courseData);
      setImportedToast(`เพิ่มวิชา "${courseData.title}" สำเร็จแล้ว!`);
      setActiveTab('courses');
    }
  };

  // Handlers for Material
  const handleOpenMaterialModal = (courseId?: string, initialData?: CourseMaterial) => {
    setMaterialCourseId(courseId || courses[0]?.id);
    setEditingMaterial(initialData || null);
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (data: Omit<CourseMaterial, 'id' | 'createdAt' | 'orderIndex'>) => {
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, data);
    } else {
      await addMaterial(data);
    }
  };

  // Handlers for Event
  const handleOpenEventModal = (date?: string, initialData?: CalendarEvent) => {
    setEventDate(date);
    setEditingEvent(initialData || null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (data: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
    } else {
      await addEvent(data);
    }
  };

  // Handlers for YouTube Player
  const handleOpenYouTubePlayer = (material: CourseMaterial, course?: Course) => {
    setYoutubePlayer({
      isOpen: true,
      material,
      course: course || courses.find(c => c.id === material.courseId) || null,
    });
  };

  const handleUpdateYouTubeNotes = async (materialId: string, notes: string) => {
    await updateMaterial(materialId, { notes });
    if (youtubePlayer.material && youtubePlayer.material.id === materialId) {
      setYoutubePlayer(prev => ({
        ...prev,
        material: prev.material ? { ...prev.material, notes } : null
      }));
    }
  };

  const handleUpdatePlaybackPosition = async (materialId: string, position: number, duration?: number) => {
    await updateMaterial(materialId, {
      playbackPosition: position,
      durationSeconds: duration,
      lastWatchedAt: new Date().toISOString()
    });
  };

  const handleSelectCourseMaterials = (courseId: string) => {
    setSelectedCourseFilterForMaterials(courseId);
    setActiveTab('materials');
  };

  const handleShareCourse = (course: Course) => {
    setShareModal({
      isOpen: true,
      course,
      material: null,
      courseOfMaterial: null,
    });
  };

  const handleShareMaterial = (material: CourseMaterial, course?: Course) => {
    setShareModal({
      isOpen: true,
      course: null,
      material,
      courseOfMaterial: course || courses.find(c => c.id === material.courseId) || null,
    });
  };

  // Loading state on initial bootstrap
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-700">กำลังเชื่อมต่อระบบ Lukmoo Tutor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Quota Exceeded Notification Banner */}
      {isQuotaExceeded && !quotaDismissed && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm border-b border-amber-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1 rounded-md bg-amber-400/30 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <p className="leading-snug text-white/95">
                <strong className="font-semibold text-white">โควตา Cloud Firestore ฟรีประจำวันเต็มแล้ว:</strong> ข้อมูลของคุณยังถูกบันทึกในเครื่องนี้ (Local Cache) อย่างปลอดภัย ใช้งานได้ครบ 100%
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <a
                href={firebaseConsoleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white text-amber-900 font-semibold text-xs shadow-xs hover:bg-amber-50 transition-colors"
              >
                <span>จัดการโควตา / อัปเกรด</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={dismissQuotaBanner}
                className="p-1 rounded-md hover:bg-amber-700/50 text-white/80 hover:text-white transition-colors"
                title="ปิดการแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {showDebugSync ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowDebugSync(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>← กลับสู่หน้าหลัก</span>
            </button>
            <SyncDiagnosticView />
          </div>
        ) : !user ? (
          /* Unauthenticated state: Shows welcome hero and prompts login */
          <UnauthenticatedView onOpenAuthModal={() => setIsAuthModalOpen(true)} />
        ) : (
          /* Authenticated views */
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenCourseModal={handleOpenCourseModal}
                onOpenMaterialModal={(courseId) => handleOpenMaterialModal(courseId)}
                onOpenEventModal={(date) => handleOpenEventModal(date)}
                onOpenYouTubePlayer={handleOpenYouTubePlayer}
                setActiveTab={setActiveTab}
                onSelectCourseMaterials={handleSelectCourseMaterials}
                onOpenRedeemModal={() => setIsRedeemModalOpen(true)}
              />
            )}

            {activeTab === 'courses' && (
              <CoursesView
                courses={courses}
                materials={materials}
                events={events}
                onOpenCourseModal={handleOpenCourseModal}
                onOpenMaterialModal={(courseId) => handleOpenMaterialModal(courseId)}
                onSelectCourseMaterials={handleSelectCourseMaterials}
                onDeleteCourse={deleteCourse}
                onReorderCourses={reorderCourses}
                onShareCourse={handleShareCourse}
                onOpenRedeemModal={() => setIsRedeemModalOpen(true)}
              />
            )}

            {activeTab === 'materials' && (
              <MaterialsView
                courses={courses}
                materials={materials}
                selectedCourseIdFilter={selectedCourseFilterForMaterials}
                onOpenCourseModal={handleOpenCourseModal}
                onOpenMaterialModal={handleOpenMaterialModal}
                onOpenYouTubePlayer={handleOpenYouTubePlayer}
                onToggleMaterialComplete={toggleMaterialCompleted}
                onDeleteMaterial={deleteMaterial}
                onReorderMaterials={reorderMaterials}
                onShareMaterial={handleShareMaterial}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                courses={courses}
                events={events}
                onOpenEventModal={handleOpenEventModal}
                onToggleEventComplete={toggleEventCompleted}
                onDeleteEvent={deleteEvent}
              />
            )}

            {activeTab === 'portfolio' && (
              <PortfolioView />
            )}

            {activeTab === 'news' && (
              <NewsCommunityView
                onOpenYouTubePlayer={handleOpenYouTubePlayer}
                onNavigateToCourses={() => setActiveTab('courses')}
                onNavigateToMaterials={() => setActiveTab('materials')}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Notification Toast */}
      {importedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{importedToast}</span>
        </div>
      )}

      {/* Incoming Private Share Receiver Modal */}
      {incomingSharedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">มีคนแชร์เนื้อหาให้คุณ</h3>
                  <p className="text-xs text-slate-400">คลิกเพื่อรับวิชาหรือไฟล์เข้าสู่บัญชีของคุณ</p>
                </div>
              </div>
              <button
                onClick={handleDismissIncomingShare}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                    {incomingSharedItem.payload.type === 'course' ? 'คอร์ส / วิชาเรียน' : 'ชีทสรุป / วิดีโอ'}
                  </span>
                  {incomingSharedItem.payload.category && (
                    <span className="text-xs text-slate-500">
                      • {incomingSharedItem.payload.category}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm sm:text-base mb-1">
                  {incomingSharedItem.payload?.title || 'เนื้อหาที่แชร์'}
                </h4>
                {incomingSharedItem.payload.courseTitle && incomingSharedItem.payload.type === 'material' && (
                  <p className="text-xs text-slate-500 mb-1">
                    จากวิชา: <span className="font-medium text-slate-700">{incomingSharedItem.payload.courseTitle}</span>
                  </p>
                )}
                {incomingSharedItem.payload.instructor && (
                  <p className="text-xs text-slate-500 mb-1">
                    อาจารย์/ผู้สอน: <span className="font-medium text-slate-700">{incomingSharedItem.payload.instructor}</span>
                  </p>
                )}
                {incomingSharedItem.payload.description && (
                  <p className="text-xs text-slate-600 line-clamp-3 mt-1">
                    {incomingSharedItem.payload.description}
                  </p>
                )}
                {incomingSharedItem.payload.notes && (
                  <p className="text-xs text-slate-600 line-clamp-3 mt-1 italic">
                    "{incomingSharedItem.payload.notes}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDismissIncomingShare}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isImportingShared}
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isImportingShared ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isImportingShared ? 'กำลังบันทึก...' : 'บันทึกเข้าคลังของฉัน'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Lukmoo Tutor</span>
            <span>•</span>
            <span>ระบบจัดเก็บคอร์สติวและคลังความรู้</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Firebase Firestore</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">สำรองข้อมูลอัตโนมัติ</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {shareModal.isOpen && (
        <ShareModal
          isOpen={shareModal.isOpen}
          onClose={() => setShareModal({ isOpen: false, course: null, material: null, courseOfMaterial: null })}
          course={shareModal.course}
          material={shareModal.material}
          courseOfMaterial={shareModal.courseOfMaterial}
          onSharedSuccess={() => setActiveTab('news')}
        />
      )}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        canDismiss={!!user}
      />

      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onSave={handleSaveCourse}
        initialData={editingCourse}
      />

      <MaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        courses={courses}
        selectedCourseId={materialCourseId}
        onSave={handleSaveMaterial}
        initialData={editingMaterial}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        courses={courses}
        selectedDate={eventDate}
        onSave={handleSaveEvent}
        initialData={editingEvent}
      />

      <YouTubePlayerModal
        isOpen={youtubePlayer.isOpen}
        onClose={() => setYoutubePlayer({ isOpen: false, material: null, course: null })}
        material={youtubePlayer.material ? (materials.find(m => m.id === youtubePlayer.material!.id) || youtubePlayer.material) : null}
        course={youtubePlayer.course}
        onToggleComplete={toggleMaterialCompleted}
        onUpdateNotes={handleUpdateYouTubeNotes}
        onUpdatePlaybackPosition={handleUpdatePlaybackPosition}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Redeem Share Code Modal */}
      <RedeemShareCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        onSuccess={(courseId) => {
          setImportedToast('นำเข้าคอร์สติวเรียบร้อยแล้ว!');
          setActiveTab('courses');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
