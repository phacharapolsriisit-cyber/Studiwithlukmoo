import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  GripVertical, 
  Edit, 
  Trash2, 
  FileText, 
  Youtube, 
  Calendar as CalendarIcon, 
  ArrowRight,
  BookOpen,
  Filter,
  ExternalLink,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { Course, CourseMaterial, CalendarEvent, SubjectCategory } from '../types';
import { CATEGORIES } from '../utils/categories';

interface CoursesViewProps {
  courses: Course[];
  materials: CourseMaterial[];
  events: CalendarEvent[];
  onOpenCourseModal: (course?: Course) => void;
  onOpenMaterialModal: (courseId: string) => void;
  onSelectCourseMaterials: (courseId: string) => void;
  onDeleteCourse: (id: string) => void;
  onReorderCourses: (courses: Course[]) => void;
  onShareCourse?: (course: Course) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  courses,
  materials,
  events,
  onOpenCourseModal,
  onOpenMaterialModal,
  onSelectCourseMaterials,
  onDeleteCourse,
  onReorderCourses,
  onShareCourse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.instructor && c.instructor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...courses];
    const item = reordered.splice(draggedIndex, 1)[0];
    reordered.splice(index, 0, item);
    setDraggedIndex(index);
    onReorderCourses(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>คอร์สติวและวิชาเรียนของฉัน</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดเก็บวิชาเรียน ชีท และคลิปติวแยกตามวิชา (คลิกค้างเพื่อลากจัดลำดับวิชาได้)
          </p>
        </div>

        <button
          id="add-course-main-btn"
          onClick={() => onOpenCourseModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มคอร์สติว / วิชาใหม่</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="search-course-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อวิชา, รหัสวิชา, หรือชื่อติวเตอร์..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({courses.length})
          </button>
          {Object.values(CATEGORIES).map((cat) => {
            const count = courses.filter(c => c.category === cat.id).length;
            if (count === 0 && selectedCategory !== cat.id) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label.split(' ')[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses List / Grid */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'ไม่พบวิชาที่ตรงกับคำค้นหา' : 'ยังไม่มีคอร์สติวในระบบ'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            {searchQuery
              ? 'ลองค้นหาด้วยคำอื่น หรือล้างตัวกรอง'
              : 'เริ่มต้นสร้างวิชาแรกเพื่อจัดเก็บชีทเรียน คลิปยูทูป และวันสอบ'}
          </p>
          <button
            onClick={() => onOpenCourseModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            + เพิ่มวิชาแรกของคุณ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course, idx) => {
            const courseMaterials = materials.filter(m => m.courseId === course.id);
            const videos = courseMaterials.filter(m => m.type === 'video');
            const sheets = courseMaterials.filter(m => m.type === 'sheet' || m.type === 'document');
            const completedMaterials = courseMaterials.filter(m => m.isCompleted);
            const progressPercent = courseMaterials.length > 0 
              ? Math.round((completedMaterials.length / courseMaterials.length) * 100) 
              : 0;
            const courseEvents = events.filter(e => e.courseId === course.id && !e.isCompleted);
            const categoryObj = CATEGORIES[course.category] || CATEGORIES.general;

            return (
              <div
                key={course.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing ${
                  draggedIndex === idx ? 'opacity-50 ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Card Top Accent Bar */}
                <div 
                  className="h-2 w-full" 
                  style={{ backgroundColor: course.color }} 
                />

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Header: drag icon, category, and action buttons */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 hover:text-slate-500 cursor-grab" title="ลากเพื่อจัดลำดับ">
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span 
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${course.color}15`,
                            color: course.color
                          }}
                        >
                          {categoryObj.label.split(' ')[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onShareCourse && (
                          <button
                            onClick={() => onShareCourse(course)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="แชร์วิชานี้ไปยังชุมชน"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenCourseModal(course)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="แก้ไขวิชา"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCourseToDelete(course)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="ลบวิชา"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Course Title & Code */}
                    <div 
                      className="cursor-pointer group"
                      onClick={() => onSelectCourseMaterials(course.id)}
                    >
                      <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {course.title}
                      </h3>
                      {course.code && (
                        <span className="inline-block text-[11px] font-mono text-slate-400 font-semibold mt-0.5">
                          รหัส: {course.code}
                        </span>
                      )}
                    </div>

                    {/* Instructor & Platform */}
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-medium truncate">
                        ติวเตอร์: {course.instructor || 'ไม่ระบุ'}
                      </span>
                      {course.roomOrPlatform && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                          {course.roomOrPlatform}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {course.description && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>

                  {/* Badges: Sheets, Videos, Upcoming Exam */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-blue-50/60 text-blue-900">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">{sheets.length} ชีท/เอกสาร</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-red-50/60 text-red-900">
                        <Youtube className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="truncate">{videos.length} คลิปยูทูป</span>
                      </div>
                    </div>

                    {/* Course Study Progress Bar */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${progressPercent === 100 ? 'text-emerald-600 fill-emerald-100' : 'text-slate-400'}`} />
                          <span>ความคืบหน้าการเรียน</span>
                        </span>
                        <span className={`font-bold font-mono ${progressPercent === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {completedMaterials.length}/{courseMaterials.length} ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Upcoming Exam Badge if any */}
                    {courseEvents.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-medium">
                        <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                        <span className="truncate">
                          มีนัดหมายเร็วๆ นี้: {courseEvents[0].title} ({courseEvents[0].date})
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onSelectCourseMaterials(course.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <span>เปิดคลังชีท & วิดีโอ</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenMaterialModal(course.id)}
                        className="p-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                        title="เพิ่มชีทหรือคลิปใหม่ในวิชานี้"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-sm w-full p-6 rounded-2xl shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">ยืนยันการลบคอร์สติว?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              คุณต้องการลบวิชา <span className="font-bold text-slate-800">"{courseToDelete.title}"</span> หรือไม่? ชีทและวิดีโอที่ผูกอยู่จะถูกลบไปด้วย
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCourseToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  onDeleteCourse(courseToDelete.id);
                  setCourseToDelete(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
