import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  FileText, 
  Edit3, 
  Save 
} from 'lucide-react';
import { CourseMaterial, Course } from '../types';
import { getYouTubeEmbedUrl } from '../utils/youtube';

interface YouTubePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: CourseMaterial | null;
  course?: Course | null;
  onToggleComplete: (id: string, current: boolean) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  isOpen,
  onClose,
  material,
  course,
  onToggleComplete,
  onUpdateNotes,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(material?.notes || '');

  if (!isOpen || !material || !material.youtubeId) return null;

  const embedUrl = getYouTubeEmbedUrl(material.youtubeId);

  const handleSaveNotes = () => {
    onUpdateNotes(material.id, notesText);
    setIsEditingNotes(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="youtube-player-card"
        className="bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            {course && (
              <span 
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 text-white"
                style={{ backgroundColor: course.color }}
              >
                {course.title}
              </span>
            )}
            <h3 className="font-semibold text-sm sm:text-base text-slate-100 truncate">
              {material.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Mark complete toggle */}
            <button
              id="yt-toggle-complete-btn"
              onClick={() => onToggleComplete(material.id, !!material.isCompleted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                material.isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{material.isCompleted ? 'เรียนจบบทนี้แล้ว' : 'ทำเครื่องหมายว่าเรียนจบ'}</span>
            </button>

            {/* External link */}
            {material.url && (
              <a
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="เปิดในแอป YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="ปิดวิดีโอ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Embed Frame (Responsive 16:9) */}
        <div className="relative w-full pb-[56.25%] bg-black">
          <iframe
            src={embedUrl}
            title={material.title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video Info & Notes Bar */}
        <div className="p-4 sm:p-5 bg-slate-900/90 overflow-y-auto max-h-48 text-slate-300 text-xs border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-slate-200">บันทึกช่วยจำ / โน้ตสรุปประจำคลิป</span>
            </div>
            {!isEditingNotes ? (
              <button
                onClick={() => {
                  setNotesText(material.notes || '');
                  setIsEditingNotes(true);
                }}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไขโน้ต</span>
              </button>
            ) : (
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึก</span>
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="พิมพ์สรุปเนื้อหา สูตรสำคัญ หรือนาทีสำคัญ (เช่น 12:45 อธิบายตัวอย่างข้อสอบ..."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          ) : (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-wrap">
              {material.notes ? material.notes : 'ยังไม่มีโน้ตย่อสำหรับวิดีโอนี้ (คลิก "แก้ไขโน้ต" เพื่อเพิ่มสรุปหรือสูตรย่อ)'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
