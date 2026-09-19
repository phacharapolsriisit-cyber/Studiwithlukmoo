import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Youtube, 
  FileCode, 
  Upload, 
  Link as LinkIcon, 
  BookOpen, 
  Check, 
  AlertCircle,
  Clock,
  Play
} from 'lucide-react';
import { Course, CourseMaterial, MaterialType } from '../types';
import { extractYouTubeId, getYouTubeThumbnail } from '../utils/youtube';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedCourseId?: string;
  onSave: (data: Omit<CourseMaterial, 'id' | 'createdAt' | 'orderIndex'>) => Promise<void>;
  initialData?: CourseMaterial | null;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  courses,
  selectedCourseId,
  onSave,
  initialData,
}) => {
  const [courseId, setCourseId] = useState(selectedCourseId || (courses[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MaterialType>('sheet');
  const [url, setUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCourseId(initialData.courseId);
      setTitle(initialData.title);
      setType(initialData.type);
      setUrl(initialData.url || '');
      setYoutubeId(initialData.youtubeId || (initialData.url ? extractYouTubeId(initialData.url) : null));
      setFileData(initialData.fileData);
      setFileName(initialData.fileName);
      setFileSize(initialData.fileSize);
      setNotes(initialData.notes || '');
      setDuration(initialData.duration || '');
    } else {
      setCourseId(selectedCourseId || (courses[0]?.id || ''));
      setTitle('');
      setType('sheet');
      setUrl('');
      setYoutubeId(null);
      setFileData(undefined);
      setFileName(undefined);
      setFileSize(undefined);
      setNotes('');
      setDuration('');
    }
    setError(null);
  }, [initialData, isOpen, selectedCourseId, courses]);

  // When YouTube URL changes, auto extract and validate ID
  useEffect(() => {
    if (type === 'video' || url.includes('youtube') || url.includes('youtu.be')) {
      const extracted = extractYouTubeId(url);
      setYoutubeId(extracted);
    } else {
      setYoutubeId(null);
    }
  }, [url, type]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format size
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;
    setFileSize(sizeStr);
    setFileName(file.name);

    if (!title.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }

    // If image, compress with canvas to keep size under 250KB for fast Firestore sync
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setFileData(compressed);
        };
        img.onerror = () => setFileData(uploadEvent.target?.result as string);
        img.src = uploadEvent.target?.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

    // For non-images (PDF, doc)
    if (file.size > 10 * 1024 * 1024) {
      setError('ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFileData(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      setError('กรุณาเลือกวิชา');
      return;
    }
    if (!title.trim()) {
      setError('กรุณาระบุชื่อเอกสารหรือคลิปวิดีโอ');
      return;
    }

    if (type === 'video' && !url.trim() && !youtubeId) {
      setError('กรุณาใส่ลิงก์ YouTube ที่ถูกต้อง');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        courseId,
        title: title.trim(),
        type,
        url: url.trim() || '',
        youtubeId: youtubeId || '',
        fileData: fileData || '',
        fileName: fileName || '',
        fileSize: fileSize || '',
        notes: notes.trim() || '',
        duration: duration.trim() || '',
        isCompleted: initialData ? !!initialData.isCompleted : false,
        playbackPosition: initialData?.playbackPosition || 0,
        durationSeconds: initialData?.durationSeconds || 0,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถบันทึกเอกสารได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="material-modal-card"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            {type === 'video' ? (
              <Youtube className="w-5 h-5 text-red-600" />
            ) : (
              <FileText className="w-5 h-5 text-amber-600" />
            )}
            <span>{initialData ? 'แก้ไขเอกสาร / วิดีโอ' : 'เพิ่มชีทเรียน / ลิงก์ YouTube'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Course */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              สังกัดวิชา / คอร์สติว <span className="text-red-500">*</span>
            </label>
            <select
              id="material-course-select"
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            >
              {courses.length === 0 ? (
                <option value="">(ยังไม่มีวิชา - กรุณาสร้างวิชาก่อน)</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.instructor ? `(${c.instructor})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ประเภทไฟล์หรือสื่อการเรียน
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                id="type-sheet-btn"
                onClick={() => setType('sheet')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'sheet'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>ชีทเรียน</span>
              </button>

              <button
                type="button"
                id="type-video-btn"
                onClick={() => setType('video')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'video'
                    ? 'border-red-500 bg-red-50/70 text-red-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Youtube className="w-4 h-4 text-red-600" />
                <span>คลิป YouTube</span>
              </button>

              <button
                type="button"
                id="type-doc-btn"
                onClick={() => setType('document')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'document'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileCode className="w-4 h-4 text-blue-600" />
                <span>เอกสาร/สไลด์</span>
              </button>

              <button
                type="button"
                id="type-note-btn"
                onClick={() => setType('note')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  type === 'note'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>โน้ตสรุป</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อชีทงาน หรือชื่อตอนวิดีโอ <span className="text-red-500">*</span>
            </label>
            <input
              id="material-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'video'
                  ? 'เช่น EP.1 สรุปสูตรตรีโกณมิติแบบรวบรัด'
                  : 'เช่น ชีทสรุปสูตรฟิสิกส์ ม.6 เทอม 1 พร้อมข้อสอบเก่า'
              }
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {/* Specific Inputs based on Type */}
          {type === 'video' ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-red-50/40 border border-red-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5 text-red-600" />
                    <span>ลิงก์ YouTube (URL หรือ รหัสคลิป)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">ดูในเว็บได้ทันที</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="material-youtube-url"
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... หรือ https://youtu.be/..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Live YouTube Preview if extracted */}
              {youtubeId && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                    <img 
                      src={getYouTubeThumbnail(youtubeId)} 
                      alt="YouTube Thumbnail" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      <span>พบวิดีโอ YouTube แล้ว</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">Video ID: {youtubeId}</p>
                    <p className="text-[11px] text-slate-400">พร้อมรับชมในระบบได้ทันที</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ความยาวคลิป (นาที) เช่น 45:30
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="material-duration-input"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="เช่น 1:15:00 หรือ 45 นาที"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>อัปโหลดไฟล์ชีท / เอกสาร</span>
                  </span>
                  <span className="text-[11px] text-slate-400">รองรับ PDF, รูปภาพ, สไลด์ (ไม่เกิน 12MB)</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 relative">
                  <input
                    id="material-file-input"
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {fileName ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold truncate max-w-xs">{fileName}</span>
                      <span className="text-[11px] text-slate-500">({fileSize})</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-slate-600">
                        คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, PPTX, JPG, PNG</p>
                    </div>
                  )}
                </div>
              </div>

              {/* External Cloud Link (Google Drive / OneDrive / Notion) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หรือใส่ลิงก์ภายนอก (Google Drive, Canva, Notion)
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="material-external-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... หรือ ลิงก์ดาวน์โหลด"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes / Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              โน้ตย่อ / สรุปสาระสำคัญ
            </label>
            <textarea
              id="material-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น เน้นจำสูตรหน้า 3 ข้อ 15-20 ออกสอบบ่อยมาก"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="material-submit-btn"
              type="submit"
              disabled={isSubmitting || courses.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'กำลังบันทึก...' : initialData ? 'อัปเดตข้อมูล' : 'บันทึกเอกสาร'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
