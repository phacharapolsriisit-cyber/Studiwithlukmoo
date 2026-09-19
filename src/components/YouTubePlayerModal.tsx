import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Edit3, 
  Save,
  RotateCcw,
  Play,
  BookmarkCheck
} from 'lucide-react';
import { CourseMaterial, Course } from '../types';
import { getYouTubeEmbedUrl, formatVideoTime } from '../utils/youtube';

interface YouTubePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: CourseMaterial | null;
  course?: Course | null;
  onToggleComplete: (id: string, current: boolean) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdatePlaybackPosition?: (id: string, position: number, duration?: number) => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  isOpen,
  onClose,
  material,
  course,
  onToggleComplete,
  onUpdateNotes,
  onUpdatePlaybackPosition,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(material?.notes || '');
  const [startSeconds, setStartSeconds] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [hasCompletedAutoMark, setHasCompletedAutoMark] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Initialize playback position from material or localStorage
  useEffect(() => {
    if (material) {
      setNotesText(material.notes || '');
      const localResume = Number(localStorage.getItem(`yt_resume_${material.id}`) || 0);
      const savedPos = Math.max(material.playbackPosition || 0, localResume);
      setStartSeconds(savedPos);
      setCurrentTime(savedPos);
      if (material.durationSeconds) {
        setDuration(material.durationSeconds);
      }
      setHasCompletedAutoMark(!!material.isCompleted);
    }
  }, [material?.id]);

  // YouTube postMessage polling to track currentTime & duration
  useEffect(() => {
    if (!isOpen || !material) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            const cur = Math.floor(data.info.currentTime);
            setCurrentTime(cur);
            localStorage.setItem(`yt_resume_${material.id}`, cur.toString());
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(Math.floor(data.info.duration));
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);

    // Ping iframe to enable listening
    const interval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
      }
    }, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, [isOpen, material]);

  // Auto-mark completed when watched >= 85%
  useEffect(() => {
    if (duration > 30 && currentTime > 0 && !hasCompletedAutoMark && material && !material.isCompleted) {
      if (currentTime / duration >= 0.85) {
        setHasCompletedAutoMark(true);
        onToggleComplete(material.id, false);
      }
    }
  }, [currentTime, duration, hasCompletedAutoMark, material, onToggleComplete]);

  if (!isOpen || !material || !material.youtubeId) return null;

  const embedUrl = getYouTubeEmbedUrl(material.youtubeId, startSeconds);

  const handleRestartFromBeginning = () => {
    setStartSeconds(0);
    setCurrentTime(0);
    localStorage.setItem(`yt_resume_${material.id}`, '0');
    if (onUpdatePlaybackPosition) {
      onUpdatePlaybackPosition(material.id, 0, duration);
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(material.id, notesText);
    setIsEditingNotes(false);
  };

  const handleCloseAndSave = () => {
    if (onUpdatePlaybackPosition && currentTime > 0) {
      onUpdatePlaybackPosition(material.id, currentTime, duration || undefined);
    }
    onClose();
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div 
        id="youtube-player-card"
        className="bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[96vh]"
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
              onClick={handleCloseAndSave}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="บันทึกเวลาเรียนและปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resume status banner if started from mid-video */}
        {startSeconds > 5 && (
          <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-800/30 flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>
                กำลังเล่นต่อจากที่คุณดูค้างไว้ที่ <strong>{formatVideoTime(startSeconds)}</strong>
              </span>
            </div>
            <button
              onClick={handleRestartFromBeginning}
              className="flex items-center gap-1 text-[11px] font-medium text-blue-300 hover:text-white bg-blue-900/60 hover:bg-blue-800/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>เริ่มใหม่ตั้งแต่ต้น (0:00)</span>
            </button>
          </div>
        )}

        {/* Video Embed Frame (Responsive 16:9) */}
        <div className="relative w-full pb-[56.25%] bg-black">
          <iframe
            ref={iframeRef}
            key={`yt-frame-${material.id}-${startSeconds}`}
            src={embedUrl}
            title={material.title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Video Playback Progress Bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>ตำแหน่งปัจจุบัน: <strong className="text-white font-mono">{formatVideoTime(currentTime)}</strong></span>
            {duration > 0 && (
              <>
                <span>/</span>
                <span className="font-mono">{formatVideoTime(duration)}</span>
                <span className="text-emerald-400 font-semibold">({progressPercent}%)</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleCloseAndSave}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              บันทึกเวลาเรียน & ปิด
            </button>
          </div>
        </div>

        {/* Video Info & Notes Bar */}
        <div className="p-4 sm:p-5 bg-slate-900/90 overflow-y-auto max-h-48 text-slate-300 text-xs border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-slate-200">บันทึกช่วยจำ / โน้ตสรุปประจำคลิป</span>
            </div>
            {!isEditingNotes ? (
              <button
                onClick={() => {
                  setNotesText(material.notes || '');
                  setIsEditingNotes(true);
                }}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
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
                <span>บันทึกโน้ต</span>
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="พิมพ์สรุปเนื้อหา สูตรสำคัญ หรือนาทีสำคัญ (เช่น 12:45 อธิบายตัวอย่างข้อสอบ..."
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
