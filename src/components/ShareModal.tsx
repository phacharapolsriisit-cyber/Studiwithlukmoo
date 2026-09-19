import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  BookOpen, 
  FileText, 
  Youtube, 
  Sparkles, 
  Send,
  CheckCircle2,
  Copy,
  Lock,
  Globe2,
  Tag,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { Course, CourseMaterial, SharedItemPayload } from '../types';
import { useData } from '../context/DataContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course | null;
  material?: CourseMaterial | null;
  courseOfMaterial?: Course | null;
  onSharedSuccess?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  course,
  material,
  courseOfMaterial,
  onSharedSuccess,
}) => {
  const { materials, addCommunityPost, createPrivateShareLink } = useData();
  const [shareMode, setShareMode] = useState<'private' | 'community'>('private');
  const [content, setContent] = useState('');
  const [freeTagInput, setFreeTagInput] = useState('Dek68, แชร์วิชาเรียน');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [privateNote, setPrivateNote] = useState('');

  const isCourse = Boolean(course);
  const courseMaterials = course ? materials.filter(m => m.courseId === course.id) : [];

  const targetItem: SharedItemPayload | null = course
    ? {
        type: 'course',
        title: course.title || '',
        category: course.category,
        instructor: course.instructor,
        description: course.description,
        courseTitle: course.title,
        materials: courseMaterials.map(m => ({
          title: m.title,
          type: m.type,
          url: m.url,
          youtubeId: m.youtubeId,
          fileData: m.fileData,
          fileName: m.fileName,
          fileSize: m.fileSize,
          notes: m.notes,
          duration: m.duration,
          orderIndex: m.orderIndex,
        })),
      }
    : material
    ? {
        type: 'material',
        title: material.title || '',
        category: courseOfMaterial?.category,
        instructor: courseOfMaterial?.instructor,
        materialType: material.type,
        youtubeId: material.youtubeId,
        url: material.url,
        fileData: material.fileData,
        fileName: material.fileName,
        fileSize: material.fileSize,
        notes: material.notes,
        courseTitle: courseOfMaterial?.title,
      }
    : null;

  useEffect(() => {
    if (isOpen && targetItem) {
      // Automatically generate 6-character short share code instantly
      createPrivateShareLink(targetItem, privateNote).then((res) => {
        setShareCode(res.shareCode);
      });
      setCopiedCode(false);
      setSuccessNotice(false);
      setContent('');
    }
  }, [isOpen, course?.id, material?.id]);

  if (!isOpen || !targetItem) return null;

  const handleCopyCode = async () => {
    if (!shareCode) return;
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      // Fallback
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  const handleCommunityShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    try {
      setIsSubmitting(true);
      const postText = content.trim() || (isCourse 
        ? `แชร์คอร์สติว "${course?.title || ''}" ให้เพื่อนๆ ทุกคนในชุมชน สามารถกดบันทึกเข้าคลังวิชาไปทบทวนได้เลยครับ!`
        : `แชร์เอกสาร/คลิป "${material?.title || ''}" จากวิชา ${courseOfMaterial?.title || ''} ทุกคนสามารถกดบันทึกไปอ่านได้เลยครับ!`
      );
      
      // Parse free text tags (split by comma or spaces, ensure clean tags)
      const parsedTags = freeTagInput
        .split(/[,#\s]+/)
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => t.startsWith('#') ? t : `#${t}`);

      const finalTags = parsedTags.length > 0 ? parsedTags : ['#แชร์วิชาเรียน'];
      await addCommunityPost(postText, finalTags, undefined, targetItem);
      
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        setContent('');
        onClose();
        if (onSharedSuccess) onSharedSuccess();
      }, 1000);
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                {isCourse ? 'แชร์วิชาเรียน' : 'แชร์ไฟล์ / วิดีโอ'}
              </h2>
              <p className="text-xs text-slate-500">
                เลือกรหัสแชร์ 6 หลัก หรือโพสต์ลงกระดานชุมชนที่เห็นทุกคน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Private Code vs Public Community) */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={() => setShareMode('private')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              shareMode === 'private'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span>รหัสแชร์ 6 หลัก (Share Code)</span>
          </button>

          <button
            type="button"
            onClick={() => setShareMode('community')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              shareMode === 'community'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5 text-blue-600" />
            <span>โพสต์ลงชุมชน (ทุกคนเห็น)</span>
          </button>
        </div>

        {/* Target Item Preview */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
            {isCourse ? (
              <BookOpen className="w-5 h-5 text-blue-600" />
            ) : material?.type === 'video' ? (
              <Youtube className="w-5 h-5 text-red-600" />
            ) : (
              <FileText className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                {isCourse ? 'คอร์สติว' : material?.type === 'video' ? 'วิดีโอ YouTube' : 'เอกสาร / ชีทสรุป'}
              </span>
              {courseOfMaterial && (
                <span className="text-[11px] text-slate-500 truncate">
                  จากวิชา: {courseOfMaterial.title}
                </span>
              )}
            </div>
            <h4 className="font-bold text-sm text-slate-900 mt-1 truncate">
              {isCourse ? course?.title : material?.title}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {isCourse 
                ? `ผู้สอน: ${course?.instructor || 'ไม่ระบุ'}` 
                : material?.notes || (material?.fileName ? `ไฟล์: ${material.fileName}` : 'พร้อมนำเข้า')}
            </p>

            {isCourse && targetItem.materials && targetItem.materials.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-900 bg-blue-100/80 px-2.5 py-1 rounded-lg font-medium">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  แนบไฟล์และคลิปไปด้วย <strong>{targetItem.materials.length} รายการ</strong> ({targetItem.materials.filter(m => m.type === 'video').length} วิดีโอ, {targetItem.materials.filter(m => m.type !== 'video').length} ชีท/เอกสาร)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Share Code Only (ไม่มีการสร้างลิงก์ ใช้โค้ดเพียวๆ) */}
        {shareMode === 'private' && (
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>รหัสแชร์ 6 หลัก (ส่งโค้ดให้เพื่อนใช้งานได้ทันที)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                คัดลอกรหัสนี้ส่งให้เพื่อนในแชท โดยเพื่อนสามารถนำไปกรอกที่ปุ่ม <strong>"ใส่โค้ดรับคอร์ส"</strong> เพื่อรับวิชาหรือเอกสารทั้งหมดเข้าสู่ระบบทันที
              </p>
            </div>

            {/* Prominent Share Code Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 space-y-3 text-center">
              <div className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>รหัสแชร์ของคุณ</span>
              </div>

              {/* Big Monospace Code Display */}
              <div className="bg-white border-2 border-blue-400/80 rounded-2xl py-3.5 px-6 tracking-[0.25em] font-mono text-2xl sm:text-3xl font-black text-blue-700 shadow-sm select-all inline-block">
                {shareCode || 'LM-....'}
              </div>

              {/* Copy Code Button */}
              <div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>คัดลอกรหัสแชร์แล้ว! พร้อมส่งให้เพื่อน</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>คัดลอกรหัสแชร์ ({shareCode || 'LM-....'})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step-by-step Guide */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs text-slate-600">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                วิธีให้เพื่อนใช้งานโค้ดนี้:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
                <li>ส่งรหัส 6 หลักนี้ให้เพื่อนทาง Line, Messenger หรือ Discord</li>
                <li>บอกให้เพื่อนกดปุ่ม <strong>"ใส่โค้ดรับคอร์ส"</strong> หรือ <strong>"กรอกรหัสรับชีท"</strong> บนแถบเมนู</li>
                <li>วางรหัสนี้ลงไป ระบบจะนำเข้าเนื้อหาเข้าคลังของเพื่อนอัตโนมัติทันที</li>
              </ol>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ข้อความโน้ตสั้นๆ แนบไปด้วย (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น สรุปฟิสิกส์เตรียมสอบปลายภาค, การบ้านบทที่ 2..."
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Public Community Posting (เห็นทุกคนที่ใช้เว็บ) */}
        {shareMode === 'community' && (
          <div>
            {successNotice ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">โพสต์ลงชุมชนสำเร็จแล้ว!</h3>
                <p className="text-xs text-slate-500">ทุกคนที่ใช้ระบบสามารถเห็นโพสต์และกดบันทึกเนื้อหาได้ทันที</p>
              </div>
            ) : (
              <form onSubmit={handleCommunityShare} className="p-5 space-y-4">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2">
                  <Globe2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>บอร์ดชุมชนสาธารณะ:</strong> เมื่อคุณโพสต์ ทุกคนที่ใช้งานเว็บไซต์ Lukmoo Tutor จะสามารถมองเห็นและกดบันทึกวิชาหรือชีทของคุณได้ทันทีแบบเรียลไทม์
                  </span>
                </div>

                {/* Content Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ข้อความแนะนำ หรือคำอธิบายถึงเพื่อนๆ
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      isCourse
                        ? 'เช่น คอร์สนี้เน้นเทคนิคทำโจทย์เลขเร็ว ครูสอนเข้าใจง่ายมาก ลองกดเซฟไปดูกันนะ!'
                        : 'เช่น ชีทสรุปสูตรฟิสิกส์บทนี้ออกสอบบ่อยมาก มีสรุปจุดที่ชอบหลอกไว้ให้ด้วยครับ'
                    }
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder:text-slate-400"
                  />
                </div>

                {/* Free Text Tag Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>แท็กและหัวข้ออิสระ (พิมพ์ได้อย่างอิสระ คั่นด้วยเครื่องหมายจุลภาค)</span>
                  </label>
                  <input
                    type="text"
                    value={freeTagInput}
                    onChange={(e) => setFreeTagInput(e.target.value)}
                    placeholder="เช่น Dek68, สรุปฟิสิกส์, สอบเข้าจุฬา, เคมีอินทรีย์..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    * พิมพ์หัวข้อหรือวิชาที่ต้องการให้เพื่อนค้นหาเจอได้ง่ายๆ
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'กำลังโพสต์...' : 'โพสต์ลงชุมชน (ทุกคนเห็น)'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

