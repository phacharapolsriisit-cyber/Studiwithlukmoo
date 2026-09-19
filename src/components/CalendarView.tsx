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
  Sparkles
} from 'lucide-react';
import { CalendarEvent, Course, EventType } from '../types';

interface CalendarViewProps {
  courses: Course[];
  events: CalendarEvent[];
  onOpenEventModal: (date?: string, initialData?: CalendarEvent) => void;
  onToggleEventComplete: (id: string, current: boolean) => void;
  onDeleteEvent: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  courses,
  events,
  onOpenEventModal,
  onToggleEventComplete,
  onDeleteEvent,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

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

  // Filter events
  const filteredEvents = events.filter((e) => {
    const matchesCourse = selectedCourseFilter === 'all' || e.courseId === selectedCourseFilter;
    const matchesType = selectedTypeFilter === 'all' || e.type === selectedTypeFilter;
    return matchesCourse && matchesType;
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-purple-600" />
            <span>ปฏิทินวันสอบและกำหนดส่งงาน</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            บันทึกวันสอบกลางภาค-ปลายภาค และกำหนดส่งการบ้านของแต่ละคอร์ส พร้อมระบบนับถอยหลัง
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              รายการนัดหมาย
            </button>
          </div>

          <button
            id="add-event-main-btn"
            onClick={() => onOpenEventModal(selectedDateStr)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกวันสอบ / ส่งงาน</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">ตัวกรอง:</span>
        </div>

        {/* Course Filter */}
        <select
          value={selectedCourseFilter}
          onChange={(e) => setSelectedCourseFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        >
          <option value="all">ทุกวิชา ({events.length})</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setSelectedTypeFilter('exam')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedTypeFilter === 'exam' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            วันสอบ
          </button>
          <button
            onClick={() => setSelectedTypeFilter('assignment')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedTypeFilter === 'assignment' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            ส่งงาน
          </button>
        </div>
      </div>

      {/* Main View Body */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid (8 cols) */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base">
                {monthNames[month]} พ.ศ. {year + 543}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  เดือนปัจจุบัน
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
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

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`h-20 sm:h-24 rounded-xl p-1.5 flex flex-col justify-between cursor-pointer transition-all border text-left overflow-hidden ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20'
                        : isToday
                        ? 'border-blue-400 bg-blue-50/40'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 rounded-full bg-purple-100 text-purple-800">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event pills on cell */}
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[9px] sm:text-[10px] truncate px-1 py-0.5 rounded font-medium ${
                            ev.isCompleted
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : ev.type === 'exam'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-semibold pl-1 block">
                          +{dayEvents.length - 2} เพิ่มเติม
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
              <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">ไม่มีนัดสอบหรือส่งงานในวันนี้</p>
                <button
                  onClick={() => onOpenEventModal(selectedDateStr)}
                  className="mt-2 text-xs font-semibold text-purple-600 hover:underline"
                >
                  + คลิกเพื่อเพิ่มกำหนดการ
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.filter(e => e.date === selectedDateStr).map((ev) => {
                  const course = courses.find(c => c.id === ev.courseId);
                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border space-y-2 ${
                        ev.isCompleted ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            onClick={() => onToggleEventComplete(ev.id, ev.isCompleted)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600"
                          >
                            <CheckCircle2 className={`w-4 h-4 ${ev.isCompleted ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                          </button>
                          <div className="min-w-0">
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

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenEventModal(ev.date, ev)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="แก้ไข"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{ev.time ? `${ev.time} น.` : 'ไม่ระบุเวลา'}</span>
                        </span>
                        {renderCountdown(ev.date, ev.isCompleted)}
                      </div>

                      {ev.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg">
                          📝 {ev.notes}
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
          <h2 className="font-bold text-slate-900 text-base">
            รายการกำหนดการทั้งหมดเรียงตามวันที่ ({filteredEvents.length} รายการ)
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              ไม่มีกำหนดการที่ตรงกับตัวกรอง
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const course = courses.find(c => c.id === ev.courseId);
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      ev.isCompleted ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggleEventComplete(ev.id, ev.isCompleted)}
                        className="text-slate-400 hover:text-emerald-600 shrink-0"
                      >
                        <CheckCircle2 className={`w-5 h-5 ${ev.isCompleted ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-sm text-slate-900 truncate ${ev.isCompleted ? 'line-through' : ''}`}>
                            {ev.title}
                          </h4>
                          {course && (
                            <span 
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: course.color }}
                            >
                              {course.title}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ev.type === 'exam' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ev.type === 'exam' ? 'วันสอบ' : 'ส่งงาน'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>📅 วันที่ {ev.date}</span>
                          {ev.time && <span>⏰ {ev.time} น.</span>}
                          {ev.notes && <span className="truncate max-w-xs text-slate-400">({ev.notes})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {renderCountdown(ev.date, ev.isCompleted)}
                      <button
                        onClick={() => onOpenEventModal(ev.date, ev)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="แก้ไข"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="ลบ"
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
    </div>
  );
};
