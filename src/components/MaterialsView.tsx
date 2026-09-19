import React, { useState } from 'react';
import { 
  FileText, 
  Youtube, 
  FileCode, 
  BookOpen, 
  Plus, 
  Search, 
  GripVertical, 
  Play, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Trash2, 
  Edit, 
  Clock, 
  Tag, 
  Filter,
  Share2,
  History,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Course, CourseMaterial, MaterialType } from '../types';
import { getYouTubeThumbnail, formatVideoTime } from '../utils/youtube';

interface MaterialsViewProps {
  courses: Course[];
  materials: CourseMaterial[];
  selectedCourseIdFilter?: string;
  onOpenMaterialModal: (courseId?: string, initialData?: CourseMaterial) => void;
  onOpenYouTubePlayer: (material: CourseMaterial, course?: Course) => void;
  onToggleMaterialComplete: (id: string, current: boolean) => void;
  onDeleteMaterial: (id: string) => void;
  onReorderMaterials: (courseId: string, materials: CourseMaterial[]) => void;
  onShareMaterial?: (material: CourseMaterial, course?: Course) => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  courses,
  materials,
  selectedCourseIdFilter,
  onOpenMaterialModal,
  onOpenYouTubePlayer,
  onToggleMaterialComplete,
  onDeleteMaterial,
  onReorderMaterials,
  onShareMaterial,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>(selectedCourseIdFilter || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'history' | 'order' | 'newest' | 'title'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Filter materials
  const filteredMaterials = materials.filter((m) => {
    const matchesCourse = courseFilter === 'all' || m.courseId === courseFilter;
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCourse && matchesType && matchesSearch;
  });

  // Sort materials
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (sortBy === 'history') {
      // Prioritize items with view history / recent interaction
      const timeA = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : (a.playbackPosition ? 1000 : 0);
      const timeB = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : (b.playbackPosition ? 1000 : 0);
      if (timeA !== timeB) return timeB - timeA;
      // Secondary sort: recently created or updated
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return createdB - createdA;
    }
    if (sortBy === 'order') {
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title, 'th');
    }
    return 0;
  });

  // Reorder drag handlers (within selected course and when in 'order' sort mode)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (courseFilter === 'all') return;

    const currentCourseMaterials = materials.filter(m => m.courseId === courseFilter);
    const reordered = [...currentCourseMaterials];
    const item = reordered.splice(draggedIndex, 1)[0];
    reordered.splice(index, 0, item);
    setDraggedIndex(index);
    onReorderMaterials(courseFilter, reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Download handler for uploaded file data URL
  const handleDownloadFile = (material: CourseMaterial) => {
    if (material.fileData) {
      const link = document.createElement('a');
      link.href = material.fileData;
      link.download = material.fileName || `${material.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (material.url) {
      window.open(material.url, '_blank');
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            <span>คลังเอกสารและสื่อการเรียน (Media Library)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เรียงตามประวัติการเข้าชมล่าสุดอัตโนมัติ เล่นวิดีโอต่อจากที่ดูค้างไว้ได้ทันที
          </p>
        </div>

        <button
          id="add-material-main-btn"
          onClick={() => onOpenMaterialModal(courseFilter !== 'all' ? courseFilter : undefined)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มชีท / ยูทูปใหม่</span>
        </button>
      </div>

      {/* Filter, Search and Sorting Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="search-material-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อชีท, คลิป YouTube, หรือคำในโน้ต..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {/* Select Course Filter */}
          <div className="w-full md:w-56">
            <select
              id="filter-course-select"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer"
            >
              <option value="all">ทุกวิชา ({materials.length})</option>
              {courses.map((c) => {
                const count = materials.filter(m => m.courseId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.title} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="w-full md:w-56">
            <select
              id="sort-material-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-amber-50/50 text-amber-950 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer"
            >
              <option value="history">⏱️ ประวัติการเข้าชมล่าสุด</option>
              <option value="order">📌 ตามลำดับที่จัดเรียง</option>
              <option value="newest">✨ เพิ่มล่าสุด</option>
              <option value="title">🔤 ตามชื่อ ก-ฮ</option>
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({materials.length})
          </button>
          <button
            onClick={() => setTypeFilter('video')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'video'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>คลิป YouTube ({materials.filter(m => m.type === 'video').length})</span>
          </button>
          <button
            onClick={() => setTypeFilter('sheet')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'sheet'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ชีทเรียน ({materials.filter(m => m.type === 'sheet').length})</span>
          </button>
          <button
            onClick={() => setTypeFilter('document')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'document'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>สไลด์/เอกสาร ({materials.filter(m => m.type === 'document').length})</span>
          </button>
          <button
            onClick={() => setTypeFilter('note')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'note'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>โน้ตสรุป ({materials.filter(m => m.type === 'note').length})</span>
          </button>
        </div>

        {courseFilter !== 'all' && sortBy === 'order' && (
          <div className="text-[11px] text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5" />
            <span>คุณสามารถคลิกค้างแล้วลากแถบเพื่อจัดลำดับชีทหรือคลิปในวิชานี้ได้</span>
          </div>
        )}
      </div>

      {/* Materials List */}
      {sortedMaterials.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'ไม่พบเอกสารหรือวิดีโอที่ค้นหา' : 'ยังไม่มีชีทหรือคลิปในหมวดนี้'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            {courses.length === 0
              ? 'กรุณาสร้างวิชาก่อน จึงจะสามารถเพิ่มชีทและคลิปได้'
              : 'เริ่มเพิ่มชีทสรุป หรือแปะลิงก์ YouTube เพื่อดูคลิปผ่านเว็บได้เลย'}
          </p>
          <button
            onClick={() => onOpenMaterialModal(courseFilter !== 'all' ? courseFilter : undefined)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            + เพิ่มชีท / คลิปใหม่
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMaterials.map((mat, idx) => {
            const course = courses.find(c => c.id === mat.courseId);
            const isVideo = mat.type === 'video' && mat.youtubeId;

            // Video progress calculation
            const playbackPos = mat.playbackPosition || 0;
            const durationSec = mat.durationSeconds || 0;
            const videoProgressPercent = durationSec > 0 
              ? Math.min(100, Math.round((playbackPos / durationSec) * 100))
              : (mat.isCompleted ? 100 : 0);

            const relativeTimeStr = formatRelativeTime(mat.lastWatchedAt);

            return (
              <div
                key={mat.id}
                draggable={courseFilter !== 'all' && sortBy === 'order'}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group ${
                  draggedIndex === idx ? 'opacity-50 ring-2 ring-amber-500' : ''
                } ${mat.isCompleted ? 'bg-slate-50/70 border-slate-200' : ''}`}
              >
                {/* YouTube Video Preview / Thumbnail */}
                {isVideo && mat.youtubeId && (
                  <div 
                    onClick={() => onOpenYouTubePlayer(mat, course)}
                    className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer group/vid"
                  >
                    <img 
                      src={getYouTubeThumbnail(mat.youtubeId)} 
                      alt={mat.title}
                      className="w-full h-full object-cover group-hover/vid:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover/vid:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {mat.duration && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono font-medium">
                        {mat.duration}
                      </span>
                    )}

                    {/* Progress Bar overlay on thumbnail bottom */}
                    {(videoProgressPercent > 0 || mat.isCompleted) && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        <div 
                          className={`h-full ${mat.isCompleted ? 'bg-emerald-500' : 'bg-red-600'}`} 
                          style={{ width: `${mat.isCompleted ? 100 : videoProgressPercent}%` }}
                        />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold">
                        YouTube
                      </span>
                      {mat.isCompleted && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>จบแล้ว</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Top Row: Course Tag, Type Tag, Drag Grip */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        {courseFilter !== 'all' && sortBy === 'order' && (
                          <span className="text-slate-300 hover:text-slate-500 cursor-grab" title="ลากจัดเรียง">
                            <GripVertical className="w-4 h-4" />
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
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          mat.type === 'sheet'
                            ? 'bg-amber-100 text-amber-800'
                            : mat.type === 'video'
                            ? 'bg-red-100 text-red-800'
                            : mat.type === 'document'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {mat.type === 'sheet' ? 'ชีทเรียน' : mat.type === 'video' ? 'วิดีโอ' : mat.type === 'document' ? 'สไลด์' : 'โน้ต'}
                        </span>
                      </div>

                      {/* Action buttons: Share, Edit, Delete */}
                      <div className="flex items-center gap-1">
                        {onShareMaterial && (
                          <button
                            onClick={() => onShareMaterial(mat, course)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="แชร์เอกสาร/คลิปนี้ไปยังชุมชน"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenMaterialModal(mat.courseId, mat)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMaterial(mat.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`font-bold text-sm text-slate-900 leading-snug line-clamp-2 ${
                      mat.isCompleted ? 'text-slate-500 line-through' : ''
                    }`}>
                      {mat.title}
                    </h3>

                    {/* Video Playback Progress Status */}
                    {isVideo && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {mat.isCompleted ? (
                              <span className="text-emerald-700 font-semibold">เรียนจบแล้ว</span>
                            ) : playbackPos > 5 ? (
                              <span>ดูค้างไว้ที่ <strong className="text-amber-700 font-mono">{formatVideoTime(playbackPos)}</strong></span>
                            ) : (
                              <span className="text-slate-500">ยังไม่เคยเปิดดู</span>
                            )}
                          </span>

                          {durationSec > 0 && (
                            <span className="font-mono text-slate-400">
                              {formatVideoTime(durationSec)}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {(videoProgressPercent > 0 || mat.isCompleted) && (
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                mat.isCompleted ? 'bg-emerald-500' : 'bg-amber-600'
                              }`}
                              style={{ width: `${mat.isCompleted ? 100 : videoProgressPercent}%` }}
                            />
                          </div>
                        )}

                        {relativeTimeStr && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <History className="w-3 h-3" />
                            <span>เปิดดูล่าสุด {relativeTimeStr}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* File name / info */}
                    {mat.fileName && (
                      <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{mat.fileName}</span>
                        {mat.fileSize && <span className="text-slate-400">({mat.fileSize})</span>}
                      </div>
                    )}

                    {/* Notes preview */}
                    {mat.notes && (
                      <p className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                        💡 {mat.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Mark Complete Checkbox */}
                    <button
                      onClick={() => onToggleMaterialComplete(mat.id, !!mat.isCompleted)}
                      className={`flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                        mat.isCompleted ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${mat.isCompleted ? 'fill-emerald-100 text-emerald-600' : ''}`} />
                      <span className="text-[11px]">{mat.isCompleted ? 'เรียนจบแล้ว' : 'ยังไม่จบ'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Video: Watch in Website */}
                      {isVideo ? (
                        <button
                          onClick={() => onOpenYouTubePlayer(mat, course)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                            playbackPos > 5 && !mat.isCompleted
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{playbackPos > 5 && !mat.isCompleted ? `เล่นต่อ (${formatVideoTime(playbackPos)})` : 'ดูคลิปในเว็บ'}</span>
                        </button>
                      ) : (
                        <>
                          {/* Sheet / Document: Download or Open Link */}
                          {(mat.fileData || mat.url) && (
                            <button
                              onClick={() => handleDownloadFile(mat)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              {mat.fileData ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                              <span>{mat.fileData ? 'ดาวน์โหลด' : 'เปิดดูชีท'}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
