import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  Flag, 
  FileText 
} from 'lucide-react';
import { Course, CalendarEvent, EventType, PriorityLevel } from '../types';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedDate?: string;
  selectedCourseId?: string;
  onSave: (data: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  initialData?: CalendarEvent | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  courses,
  selectedDate,
  selectedCourseId,
  onSave,
  initialData,
}) => {
  const [courseId, setCourseId] = useState(selectedCourseId || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('exam');
  const [date, setDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCourseId(initialData.courseId || '');
      setTitle(initialData.title);
      setType(initialData.type);
      setDate(initialData.date);
      setTime(initialData.time || '09:00');
      setPriority(initialData.priority);
      setNotes(initialData.notes || '');
    } else {
      setCourseId(selectedCourseId || '');
      setTitle('');
      setType('exam');
      setDate(selectedDate || new Date().toISOString().split('T')[0]);
      setTime('09:00');
      setPriority('high');
      setNotes('');
    }
    setError(null);
  }, [initialData, isOpen, selectedDate, selectedCourseId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('กรุณาระบุหัวข้อวันสอบหรือกำหนดส่งงาน');
      return;
    }
    if (!date) {
      setError('กรุณาเลือกวันที่');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        courseId: courseId || undefined,
        title: title.trim(),
        type,
        date,
        time: time || undefined,
        priority,
        isCompleted: initialData ? initialData.isCompleted : false,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถบันทึกกำหนดการได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="event-modal-card"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-purple-600" />
            <span>{initialData ? 'แก้ไขกำหนดการ' : 'บันทึกวันสอบ / ส่งงาน'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ประเภทกิจกรรม
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="event-type-exam"
                onClick={() => setType('exam')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'exam'
                    ? 'bg-red-50 border-red-400 text-red-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📝 วันสอบ (Exam)
              </button>
              <button
                type="button"
                id="event-type-assignment"
                onClick={() => setType('assignment')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  type === 'assignment'
                    ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📋 ส่งงาน / ชีท
              </button>
              <button
                type="button"
                id="event-type-quiz"
                onClick={() => setType('quiz')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'quiz'
                    ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⏱️ ควิซ / รายงาน
              </button>
            </div>
          </div>

          {/* Course linkage */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วิชาที่เกี่ยวข้อง
            </label>
            <select
              id="event-course-select"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            >
              <option value="">(กำหนดการทั่วไป / ไม่ระบุวิชา)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.instructor ? `— ${c.instructor}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หัวข้อ / รายละเอียดสั้น <span className="text-red-500">*</span>
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'exam'
                  ? 'เช่น สอบกลางภาค บทที่ 1-4, สอบ A-Level Math 1'
                  : 'เช่น ส่งแบบฝึกหัดโจทย์ท้ายบทกลศาสตร์'
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่ <span className="text-red-500">*</span>
              </label>
              <input
                id="event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เวลา
              </label>
              <input
                id="event-time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ระดับความสำคัญ
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-1.5 rounded-xl border text-xs font-medium ${
                  priority === 'high'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔴 สำคัญมาก / ด่วน
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-1.5 rounded-xl border text-xs font-medium ${
                  priority === 'medium'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔵 ปานกลาง
              </button>
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-1.5 rounded-xl border text-xs font-medium ${
                  priority === 'low'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🟢 ปกติ
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              โน้ตเพิ่มเติม / สถานที่สอบ
            </label>
            <textarea
              id="event-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ห้องสอบ 421 ตึก 4, นำเครื่องคิดเลขเข้าได้"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="event-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : initialData ? 'อัปเดตกำหนดการ' : 'บันทึกลงปฏิทิน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
