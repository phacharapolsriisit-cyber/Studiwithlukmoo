import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit, 
  Filter, 
  Tag,
  ListTodo,
  Sparkles,
  Pin,
  ExternalLink,
  Table
} from 'lucide-react';
import { CalendarEvent, Course, EventType } from '../types';
import { TCASScheduleModal } from './TCASScheduleModal';
import { TCAS70_METADATA, TCAS70_SCHEDULE_ITEMS } from '../data/tcas70Schedule';

interface CalendarViewProps {
  courses: Course[];
  events: CalendarEvent[];
  onOpenEventModal: (date?: string, initialData?: CalendarEvent) => void;
  onToggleEventComplete: (id: string, current: boolean) => void;
  onDeleteEvent: (id: string) => void;
  showPinnedTCAS?: boolean;
  onToggleShowPinnedTCAS?: (show: boolean) => void;
  tcasCompletedIds?: string[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  courses,
  events,
  onOpenEventModal,
  onToggleEventComplete,
  onDeleteEvent,
  showPinnedTCAS = true,
  onToggleShowPinnedTCAS,
  tcasCompletedIds = [],
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isTCASModalOpen, setIsTCASModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

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

  const jumpToMonth = (targetYear: number, targetMonthIndex: number, specificDateStr?: string) => {
    setCurrentDate(new Date(targetYear, targetMonthIndex, 1));
    if (specificDateStr) {
      setSelectedDateStr(specificDateStr);
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (selectedCourseFilter === 'tcas') {
      if (!e.isPinned && !e.id.startsWith('tcas70-')) return false;
    } else if (selectedCourseFilter !== 'all') {
      if (e.courseId !== selectedCourseFilter) return false;
    }

    if (selectedTypeFilter !== 'all' && e.type !== selectedTypeFilter) {
      return false;
    }

    return true;
  });

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const today = new Date(todayStr).getTime();
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  const renderCountdown = (dateStr: string, isCompleted: boolean) => {
    if (isCompleted) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          เสร็จสิ้นแล้ว
        </span>
      );
    }
    const diff = getDaysDiff(dateStr);
    if (diff < 0) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
          เลยกำหนด {Math.abs(diff)} วัน
        </span>
      );
    }
    if (diff === 0) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
          วันนี้!
        </span>
      );
    }
    if (diff === 1) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
          พรุ่งนี้!
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
        อีก {diff} วัน
      </span>
    );
  };

  // Find upcoming TCAS milestones
  const upcomingTCAS = TCAS70_SCHEDULE_ITEMS
    .filter(item => item.date >= todayStr)
    .slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-purple-600" />
            <span>ปฏิทินวันสอบและกำหนดการ TCAS70</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            พร้อมตารางกำหนดการ TCAS70 ส่วนกลาง ปักหมุดสำหรับทุกคน ตามตาราง ทปอ. & SmartMathPro
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Button to open full TCAS schedule table */}
          <button
            onClick={() => setIsTCASModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Table className="w-4 h-4" />
            <span>ดูตาราง TCAS70 ฉบับเต็ม</span>
          </button>

          {/* View mode toggle */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              รายการนัดหมาย
            </button>
          </div>

          <button
            id="add-event-main-btn"
            onClick={() => onOpenEventModal(selectedDateStr)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มนัดส่วนตัว</span>
          </button>
        </div>
      </div>

      {/* Pinned TCAS70 Schedule Banner (Pinned for Everyone) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/70 to-purple-50/50 border border-blue-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Pin className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  กำหนดการ TCAS70 (ปักหมุดสำหรับทุกคน ตามตาราง)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  Official
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {TCAS70_METADATA.note} • อ้างอิงจาก {TCAS70_METADATA.credit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsTCASModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-blue-700 font-bold text-xs border border-blue-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>เปิดตารางแบบภาพ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Month Jump Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">วาร์ปไปดูช่วงสอบ:</span>
          <button
            onClick={() => jumpToMonth(2026, 8, '2026-09-01')}
            className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-700 font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            ก.ย. 69 (สมัคร TPAT1)
          </button>
          <button
            onClick={() => jumpToMonth(2026, 10, '2026-11-04')}
            className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-700 font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            พ.ย. 69 (สมัคร TGAT/TPAT)
          </button>
          <button
            onClick={() => jumpToMonth(2027, 0, '2027-01-30')}
            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>🔥 30 ม.ค. 70 (สอบ TGAT/TPAT)</span>
          </button>
          <button
            onClick={() => jumpToMonth(2027, 1, '2027-02-13')}
            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>🔥 13 ก.พ. 70 (สอบ TPAT1 กสพท)</span>
          </button>
          <button
            onClick={() => jumpToMonth(2027, 2, '2027-03-13')}
            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>🔥 13-15 มี.ค. 70 (สอบ A-Level)</span>
          </button>
          <button
            onClick={() => jumpToMonth(2027, 4, '2027-05-07')}
            className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-700 font-medium border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            พ.ค. 70 (รอบ 3 Admission)
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">ตัวกรอง:</span>
          </div>

          {/* Course Filter */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-medium"
          >
            <option value="all">ทุกกำหนดการ ({events.length})</option>
            <option value="tcas">📌 กำหนดการ TCAS70 ส่วนกลาง</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedTypeFilter('exam')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === 'exam' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              วันสอบ
            </button>
            <button
              onClick={() => setSelectedTypeFilter('assignment')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTypeFilter === 'assignment' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ส่งงาน/สมัคร
            </button>
          </div>
        </div>

        {/* Total stats */}
        <div className="text-xs text-slate-500 font-medium">
          แสดง <span className="font-bold text-slate-800">{filteredEvents.length}</span> รายการ
        </div>
      </div>

      {/* Main View Body */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 cols) */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>{monthNames[month]} พ.ศ. {year + 543}</span>
                <span className="text-xs font-normal text-slate-400">({year})</span>
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  วันนี้
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((d, idx) => (
                <div 
                  key={d} 
                  className={`font-semibold py-2 ${idx === 0 ? 'text-red-500' : 'text-slate-500'}`}
                >
                  <span className="hidden sm:inline">{d}</span>
                  <span className="sm:hidden">{d.slice(0, 2)}</span>
                </div>
              ))}

              {/* Empty leading days */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/40 border border-slate-100" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = filteredEvents.filter(e => e.date === dateStr);
                const isSelected = selectedDateStr === dateStr;
                const isToday = dateStr === todayStr;
                const hasExamHighlight = dayEvents.some(e => e.isExamHighlight);

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`h-20 sm:h-24 rounded-xl p-1.5 flex flex-col justify-between cursor-pointer transition-all border text-left overflow-hidden ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                        : isToday
                        ? 'border-blue-400 bg-blue-50/40'
                        : hasExamHighlight
                        ? 'border-red-300 bg-red-50/30 hover:border-red-400'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        isToday ? 'text-blue-600' : hasExamHighlight ? 'text-red-600' : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                          hasExamHighlight 
                            ? 'bg-red-600 text-white' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event pills on cell */}
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[9px] sm:text-[10px] truncate px-1 py-0.5 rounded font-medium flex items-center gap-0.5 ${
                            ev.isCompleted
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : ev.isExamHighlight
                              ? 'bg-red-600 text-white font-bold'
                              : ev.isPinned
                              ? 'bg-indigo-600 text-white'
                              : ev.type === 'exam'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {ev.isPinned && <Pin className="w-2.5 h-2.5 fill-white shrink-0" />}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-semibold pl-1 block">
                          +{dayEvents.length - 2} รายการ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (4 cols): Selected Day's Agenda */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  กำหนดการวันที่ {selectedDateStr}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedDateStr === todayStr ? '✨ วันนี้' : ''}
                </p>
              </div>
              <button
                onClick={() => onOpenEventModal(selectedDateStr)}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มนัด</span>
              </button>
            </div>

            {/* List for selected date */}
            {filteredEvents.filter(e => e.date === selectedDateStr).length === 0 ? (
              <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">ไม่มีนัดสอบหรือกำหนดการในวันนี้</p>
                <button
                  onClick={() => onOpenEventModal(selectedDateStr)}
                  className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
                >
                  + คลิกเพื่อเพิ่มกำหนดการส่วนตัว
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.filter(e => e.date === selectedDateStr).map((ev) => {
                  const course = courses.find(c => c.id === ev.courseId);
                  const isTCAS = ev.isPinned || ev.id.startsWith('tcas70-');

                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                        ev.isCompleted 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : ev.isExamHighlight
                          ? 'bg-red-50/70 border-red-200'
                          : isTCAS
                          ? 'bg-blue-50/40 border-blue-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            onClick={() => onToggleEventComplete(ev.id, ev.isCompleted)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                            title={ev.isCompleted ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${ev.isCompleted ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                          </button>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {isTCAS && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  <Pin className="w-2.5 h-2.5 fill-indigo-700" />
                                  <span>TCAS70 ปักหมุด</span>
                                </span>
                              )}
                              {ev.isNew && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-600 text-white">
                                  (New)
                                </span>
                              )}
                              {ev.isExamHighlight && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                  ⚠️ วันสอบจริง
                                </span>
                              )}
                            </div>

                            <h4 className={`font-bold text-xs text-slate-900 leading-snug ${ev.isCompleted ? 'line-through' : ''}`}>
                              {ev.title}
                            </h4>

                            {course && (
                              <span 
                                className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.2 rounded-full text-white"
                                style={{ backgroundColor: course.color }}
                              >
                                {course.title}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!isTCAS && (
                            <button
                              onClick={() => onOpenEventModal(ev.date, ev)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                              title="แก้ไข"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title={isTCAS ? 'ซ่อนจากปฏิทินของฉัน' : 'ลบ'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{ev.rawDateThai || (ev.time ? `${ev.time} น.` : 'ตามประกาศ ทปอ.')}</span>
                        </span>
                        {renderCountdown(ev.date, ev.isCompleted)}
                      </div>

                      {ev.notes && (
                        <p className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-100 leading-relaxed">
                          {ev.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Agenda / Timeline View */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">
              รายการกำหนดการทั้งหมดเรียงตามวันที่ ({filteredEvents.length} รายการ)
            </h2>
            <button
              onClick={() => setIsTCASModalOpen(true)}
              className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>เปิดตาราง TCAS70 ฉบับเต็ม</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              ไม่มีกำหนดการที่ตรงกับตัวกรอง
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const course = courses.find(c => c.id === ev.courseId);
                const isTCAS = ev.isPinned || ev.id.startsWith('tcas70-');

                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                      ev.isCompleted 
                        ? 'bg-slate-50 border-slate-200 opacity-60' 
                        : ev.isExamHighlight
                        ? 'bg-red-50/50 border-red-200'
                        : isTCAS
                        ? 'bg-blue-50/30 border-blue-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggleEventComplete(ev.id, ev.isCompleted)}
                        className="text-slate-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                      >
                        <CheckCircle2 className={`w-5 h-5 ${ev.isCompleted ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isTCAS && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <Pin className="w-2.5 h-2.5 fill-indigo-700" />
                              <span>TCAS70 ปักหมุด</span>
                            </span>
                          )}
                          <h4 className={`font-bold text-sm text-slate-900 ${ev.isCompleted ? 'line-through' : ''}`}>
                            {ev.title}
                          </h4>
                          {ev.isNew && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-600 text-white">
                              (New)
                            </span>
                          )}
                          {ev.isExamHighlight && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              ⚠️ วันสอบจริง
                            </span>
                          )}
                          {course && (
                            <span 
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: course.color }}
                            >
                              {course.title}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>📅 {ev.rawDateThai ? ev.rawDateThai : `วันที่ ${ev.date}`}</span>
                          {ev.time && <span>⏰ {ev.time} น.</span>}
                          {ev.notes && <span className="truncate max-w-sm text-slate-500">({ev.notes})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {renderCountdown(ev.date, ev.isCompleted)}
                      {!isTCAS && (
                        <button
                          onClick={() => onOpenEventModal(ev.date, ev)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title={isTCAS ? 'ซ่อนจากปฏิทินของฉัน' : 'ลบ'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full TCAS Schedule Table Modal */}
      <TCASScheduleModal
        isOpen={isTCASModalOpen}
        onClose={() => setIsTCASModalOpen(false)}
        onSelectDate={(targetDate) => {
          setSelectedDateStr(targetDate);
          const parts = targetDate.split('-');
          if (parts.length === 3) {
            jumpToMonth(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, targetDate);
          }
        }}
        completedIds={tcasCompletedIds}
        onToggleComplete={(id) => onToggleEventComplete(id, tcasCompletedIds.includes(id))}
      />
    </div>
  );
};
