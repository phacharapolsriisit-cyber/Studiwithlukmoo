import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Youtube, 
  FileText, 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Bell,
  ExternalLink,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Course, CalendarEvent, CourseMaterial, ActiveTab } from '../types';
import { CATEGORIES } from '../utils/categories';

interface DashboardViewProps {
  onOpenCourseModal: () => void;
  onOpenMaterialModal: (courseId?: string) => void;
  onOpenEventModal: (date?: string) => void;
  onOpenYouTubePlayer: (material: CourseMaterial, course?: Course) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectCourseMaterials?: (courseId: string) => void;
  onOpenRedeemModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCourseModal,
  onOpenMaterialModal,
  onOpenEventModal,
  onOpenYouTubePlayer,
  setActiveTab,
  onSelectCourseMaterials,
  onOpenRedeemModal,
}) => {
  const { profile, user } = useAuth();
  const { courses, materials, events, reorderCourses, toggleEventCompleted } = useData();

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Drag and drop state for courses
  const [draggedCourseIndex, setDraggedCourseIndex] = useState<number | null>(null);

  // Stats
  const totalCourses = courses.length;
  const totalSheets = materials.filter(m => m.type === 'sheet' || m.type === 'document').length;
  const totalVideos = materials.filter(m => m.type === 'video').length;
  const completedVideos = materials.filter(m => m.type === 'video' && m.isCompleted).length;

  // Upcoming events calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(e => !e.isCompleted && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Urgent events (within next 3 days)
  const urgentEvents = upcomingEvents.filter(e => {
    const diffTime = new Date(e.date).getTime() - new Date(todayStr).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Drag and drop handlers for courses
  const handleDragStart = (index: number) => {
    setDraggedCourseIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCourseIndex === null || draggedCourseIndex === index) return;
    const reordered = [...courses];
    const item = reordered.splice(draggedCourseIndex, 1)[0];
    reordered.splice(index, 0, item);
    setDraggedCourseIndex(index);
    reorderCourses(reordered);
  };

  const handleDragEnd = () => {
    setDraggedCourseIndex(null);
  };

  // Events for selected date in calendar
  const eventsOnSelectedDate = events.filter(e => e.date === selectedDateStr);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
              สวัสดี, {profile?.displayName || user?.displayName || 'นักเรียน'}!
            </h1>
            <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-medium backdrop-blur-xs">
              {profile?.targetExam || 'เตรียมสอบ A-Level'}
            </span>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            {profile?.bio || 'ระบบจัดการคอร์สติว ชีทเรียน วิดีโอ และปฏิทินเตือนสอบส่วนตัวของคุณพร้อมใช้งานแล้ว'}
          </p>
        </div>

        {/* Quick Add & Redeem Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {onOpenRedeemModal && (
            <button
              id="dash-redeem-btn"
              onClick={onOpenRedeemModal}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              title="กรอกโค้ด 6 หลักเพื่อรับคอร์สติวจากเพื่อน"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-900" />
              <span>ใส่โค้ดรับคอร์ส</span>
            </button>
          )}
          <button
            id="dash-add-course-btn"
            onClick={onOpenCourseModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>เพิ่มคอร์สติว</span>
          </button>
          <button
            id="dash-add-material-btn"
            onClick={() => onOpenMaterialModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/20 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-100" />
            <span>เพิ่มชีท/คลิป</span>
          </button>
          <button
            id="dash-add-event-btn"
            onClick={() => onOpenEventModal(selectedDateStr)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/20 transition-colors cursor-pointer"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-blue-100" />
            <span>ลงวันสอบ</span>
          </button>
        </div>
      </div>

      {/* Community Teaser Banner */}
      <div 
        onClick={() => setActiveTab('news')}
        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                ชุมชนแบ่งปันคอร์ส & ชีทสรุป (Community)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                New
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              แลกเปลี่ยนวิชาเรียน ชีทสรุปสูตร และคลิปวิดีโอ YouTube กับเพื่อนๆ ทั่วประเทศ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform self-end sm:self-auto">
          <span>เข้าสู่ชุมชน</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Urgent Reminders Banner (If exams or deadlines in <= 3 days) */}
      {urgentEvents.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500 text-white animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-red-900">
                แจ้งเตือนกำหนดการใกล้ถึงกำหนด ({urgentEvents.length} รายการ)!
              </h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {urgentEvents.map((ev) => {
                  const course = courses.find(c => c.id === ev.courseId);
                  const isToday = ev.date === todayStr;
                  return (
                    <span 
                      key={ev.id}
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md font-semibold ${
                        isToday 
                          ? 'bg-red-600 text-white' 
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <span>{ev.title}</span>
                      {course && <span className="opacity-80">({course.title})</span>}
                      <span className="font-bold underline">
                        {isToday ? 'วันนี้!' : ev.date}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('calendar')}
            className="text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1 shrink-0"
          >
            <span>ดูปฏิทินทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stat Cards - Fluid and minimal on iPad/tablet & Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4">
        <div 
          onClick={() => setActiveTab('courses')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">คอร์สและวิชาติว</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{totalCourses}</span>
            <span className="text-xs text-slate-400">วิชา</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('materials')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ชีทและเอกสาร</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{totalSheets}</span>
            <span className="text-xs text-slate-400">ไฟล์/ชีท</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('materials')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">คลิป YouTube</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Youtube className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{totalVideos}</span>
            <span className="text-xs text-slate-400">คลิป ({completedVideos} จบ)</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('calendar')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 shadow-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">กำหนดการสอบ</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{upcomingEvents.length}</span>
            <span className="text-xs text-slate-400">รายการเร็วๆ นี้</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar System & Course Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Interactive Dashboard Calendar */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-base">
                ปฏิทินวันสอบและกำหนดส่งงาน
              </h2>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 min-w-[120px] text-center">
                {monthNames[month]} {year + 543}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d, i) => (
              <div 
                key={d} 
                className={`font-semibold py-1.5 ${i === 0 ? 'text-red-500' : 'text-slate-500'}`}
              >
                {d}
              </div>
            ))}

            {/* Empty days before 1st */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-10 rounded-xl bg-slate-50/50" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter(e => e.date === dateStr);
              const isSelected = selectedDateStr === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-11 rounded-xl p-1 flex flex-col items-center justify-between cursor-pointer transition-colors border ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-950 shadow-xs'
                      : isToday
                      ? 'border-blue-300 bg-blue-50/40 text-blue-900 font-medium'
                      : 'border-transparent hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-[11px] leading-tight">{dayNum}</span>
                  {/* Event indicator dots */}
                  <div className="flex gap-0.5 items-center overflow-hidden max-w-full">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          ev.type === 'exam'
                            ? 'bg-red-500'
                            : ev.type === 'assignment'
                            ? 'bg-blue-600'
                            : 'bg-purple-500'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-slate-400 font-bold">+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Date Events & Quick Add */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>กำหนดการวันที่ {selectedDateStr}:</span>
                <span className="text-slate-400">({eventsOnSelectedDate.length} รายการ)</span>
              </div>
              <button
                onClick={() => onOpenEventModal(selectedDateStr)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มนัดวันนี้</span>
              </button>
            </div>

            {eventsOnSelectedDate.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                ไม่มีนัดสอบหรือส่งงานในวันนี้ (คลิก "เพิ่มนัดวันนี้" เพื่อบันทึก)
              </div>
            ) : (
              <div className="space-y-2">
                {eventsOnSelectedDate.map((ev) => {
                  const course = courses.find(c => c.id === ev.courseId);
                  return (
                    <div
                      key={ev.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        ev.isCompleted
                          ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                          : ev.type === 'exam'
                          ? 'bg-red-50/40 border-red-200 text-slate-800'
                          : 'bg-blue-50/40 border-blue-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => toggleEventCompleted(ev.id, ev.isCompleted)}
                          className="shrink-0 text-slate-400 hover:text-emerald-600 cursor-pointer"
                        >
                          <CheckCircle2 className={`w-4 h-4 ${ev.isCompleted ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">{ev.title}</span>
                            {course && (
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded-full font-medium text-white shrink-0"
                                style={{ backgroundColor: course.color }}
                              >
                                {course.title}
                              </span>
                            )}
                          </div>
                          {ev.time && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>เวลา {ev.time} น.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        ev.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ev.type === 'exam' ? 'วันสอบ' : 'ส่งงาน'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Course List with Drag & Drop Reordering */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                คอร์สติวของฉัน
              </h2>
              <p className="text-[11px] text-slate-400">
                คลิกค้างแล้วลากแถบวิชาเพื่อจัดเรียงลำดับได้
              </p>
            </div>
            <button
              onClick={() => setActiveTab('courses')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>ดูทั้งหมด ({courses.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">ยังไม่มีวิชาหรือคอร์สติว</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                เพิ่มวิชาแรกของคุณเพื่อเริ่มเก็บชีทและคลิปเรียน
              </p>
              <button
                onClick={onOpenCourseModal}
                className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + เพิ่มวิชาใหม่
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {courses.map((course, idx) => {
                const courseMaterials = materials.filter(m => m.courseId === course.id);
                const videos = courseMaterials.filter(m => m.type === 'video');
                const sheets = courseMaterials.filter(m => m.type === 'sheet' || m.type === 'document');
                const completed = courseMaterials.filter(m => m.isCompleted);
                const courseProgressPercent = courseMaterials.length > 0 
                  ? Math.round((completed.length / courseMaterials.length) * 100) 
                  : 0;

                return (
                  <div
                    key={course.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing hover:border-slate-300 ${
                      draggedCourseIndex === idx
                        ? 'border-blue-500 bg-blue-50/40 opacity-70 shadow-md'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-slate-300 hover:text-slate-500 shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div 
                        className="w-2.5 h-8 rounded-full shrink-0" 
                        style={{ backgroundColor: course.color }}
                      />
                      <div 
                        className="min-w-0 flex-1 cursor-pointer group"
                        onClick={() => onSelectCourseMaterials && onSelectCourseMaterials(course.id)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                            {course.title}
                          </h4>
                          {course.code && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {course.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span className="truncate">{course.instructor || 'ติวเตอร์'}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span>{sheets.length} ชีท</span>
                            <span>•</span>
                            <span>{videos.length} คลิป</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {courseMaterials.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100/80">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>ความคืบหน้าการเรียน</span>
                          <span className="font-mono font-semibold text-emerald-600">{courseProgressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              courseProgressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${courseProgressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Quick add material for this course */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {CATEGORIES[course.category]?.label || 'ทั่วไป'}
                      </span>
                      <button
                        onClick={() => onOpenMaterialModal(course.id)}
                        className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>เพิ่มชีท/คลิป</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
