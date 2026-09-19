import React, { useState, useEffect } from 'react';
import { X, BookOpen, User, Hash, Tag, Palette, Laptop } from 'lucide-react';
import { Course, SubjectCategory } from '../types';
import { CATEGORIES, COLOR_PALETTE } from '../utils/categories';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: Omit<Course, 'id' | 'createdAt' | 'orderIndex'>) => Promise<void>;
  initialData?: Course | null;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [instructor, setInstructor] = useState('');
  const [category, setCategory] = useState<SubjectCategory>('math');
  const [color, setColor] = useState('#2563eb');
  const [description, setDescription] = useState('');
  const [roomOrPlatform, setRoomOrPlatform] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setCode(initialData.code || '');
      setInstructor(initialData.instructor === 'ไม่ระบุผู้สอน' ? '' : (initialData.instructor || ''));
      setCategory(initialData.category || 'math');
      setColor(initialData.color || '#2563eb');
      setDescription(initialData.description || '');
      setRoomOrPlatform(initialData.roomOrPlatform || '');
    } else {
      setTitle('');
      setCode('');
      setInstructor('');
      setCategory('math');
      setColor('#2563eb');
      setDescription('');
      setRoomOrPlatform('');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('กรุณาระบุชื่อวิชาหรือชื่อคอร์สติว');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        code: code.trim(),
        instructor: instructor.trim() || 'ไม่ระบุผู้สอน',
        category,
        color,
        description: description.trim(),
        roomOrPlatform: roomOrPlatform.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถบันทึกข้อมูลคอร์สได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="course-modal-card"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div 
              className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 ring-slate-200"
              style={{ backgroundColor: color }}
            />
            <h3 className="font-bold text-lg text-slate-900">
              {initialData ? 'แก้ไขข้อมูลคอร์สติว' : 'เพิ่มคอร์สติว / วิชาใหม่'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อวิชา / ชื่อคอร์ส <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="course-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ตะลุยโจทย์ A-Level ฟิสิกส์ 2026, แคลคูลัส 1"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Code & Instructor in 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสวิชา (ถ้ามี)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="course-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="เช่น ว30201, PHY101"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาจารย์ผู้สอน / ติวเตอร์
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="course-instructor-input"
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="เช่น พี่ปั้น, อ.สมศรี, พี่โหน่ง"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Category & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมวดหมู่วิชา
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  id="course-category-select"
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as SubjectCategory;
                    setCategory(cat);
                    // auto pick pleasant color
                    if (CATEGORIES[cat]) {
                      setColor(CATEGORIES[cat].color);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {Object.values(CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถาบัน / ช่องทางเรียน
              </label>
              <div className="relative">
                <Laptop className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="course-platform-input"
                  type="text"
                  value={roomOrPlatform}
                  onChange={(e) => setRoomOrPlatform(e.target.value)}
                  placeholder="เช่น YouTube, OnDemand, WeByTheBrain"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Color Picker Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>โทนสีประจำวิชา</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบาย / เป้าหมายคะแนนวิชานี้
            </label>
            <textarea
              id="course-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น เน้นทำโจทย์ฟิสิกส์บทกลศาสตร์ เป้าหมายสอบได้ 70+ คะแนนขึ้นไป"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="course-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : initialData ? 'อัปเดตวิชา' : 'เพิ่มวิชานี้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
