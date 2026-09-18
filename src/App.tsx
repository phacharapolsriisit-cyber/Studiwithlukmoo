import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
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
import { UnauthenticatedView } from './components/UnauthenticatedView';
import { ActiveTab, Course, CourseMaterial, CalendarEvent, SharedItemPayload } from './types';
import { Cloud, Loader2, Download, CheckCircle2, X } from 'lucide-react';

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
    resolvePrivateShare
  } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
  // Detect incoming private share link (?share_code=... or ?share_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get('share_code');
    const shareId = params.get('share_id');
    if (shareCode || shareId) {
      resolvePrivateShare(shareCode || undefined, shareId || undefined).then((item) => {
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

      // Clean up URL parameters without refreshing page
      const url = new URL(window.location.href);
      url.searchParams.delete('share_code');
      url.searchParams.delete('share_id');
      window.history.replaceState({}, '', url.toString());
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
    } else {
      await addCourse(courseData);
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
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <span className="text-sm font-semibold text-slate-700">กำลังเชื่อมต่อระบบ Lukmoo Tutor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {!user ? (
          /* Unauthenticated state: Shows welcome hero and prompts login */
          <UnauthenticatedView onOpenAuthModal={() => setIsAuthModalOpen(true)} />
        ) : (
          /* Authenticated views */
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenCourseModal={() => handleOpenCourseModal()}
                onOpenMaterialModal={(courseId) => handleOpenMaterialModal(courseId)}
                onOpenEventModal={(date) => handleOpenEventModal(date)}
                onOpenYouTubePlayer={handleOpenYouTubePlayer}
                setActiveTab={setActiveTab}
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
              />
            )}

            {activeTab === 'materials' && (
              <MaterialsView
                courses={courses}
                materials={materials}
                selectedCourseIdFilter={selectedCourseFilterForMaterials}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">มีคนแชร์เนื้อหาให้คุณแบบส่วนตัว!</h3>
                  <p className="text-xs text-amber-100">คลิกลิงก์เพื่อรับวิชาหรือไฟล์เข้าสู่บัญชีของคุณ</p>
                </div>
              </div>
              <button
                onClick={handleDismissIncomingShare}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-800">
                    {incomingSharedItem.payload.type === 'course' ? 'คอร์ส / วิชาเรียน' : 'ชีทสรุป / วิดีโอ'}
                  </span>
                  {incomingSharedItem.payload.category && (
                    <span className="text-xs text-slate-500">
                      • {incomingSharedItem.payload.category}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
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

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDismissIncomingShare}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isImportingShared}
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
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
      <footer className="mt-auto border-t border-slate-200/80 bg-white/70 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Lukmoo Tutor</span>
            <span>•</span>
            <span>ระบบจัดเก็บคอร์สติวและคลังความรู้ส่วนบุคคล</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Cloud className="w-3.5 h-3.5 text-amber-500" />
            <span>Firebase Firestore: lukmoo-tutor</span>
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
        material={youtubePlayer.material}
        course={youtubePlayer.course}
        onToggleComplete={toggleMaterialCompleted}
        onUpdateNotes={handleUpdateYouTubeNotes}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
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
