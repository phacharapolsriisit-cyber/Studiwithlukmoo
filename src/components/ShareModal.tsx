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
  Link as LinkIcon,
  Copy,
  Lock,
  Globe2,
  Tag
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
  const [privateLink, setPrivateLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
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
      // Automatically prepare private share link
      createPrivateShareLink(targetItem, privateNote).then((url) => {
        setPrivateLink(url);
      });
      setCopiedLink(false);
      setSuccessNotice(false);
      setContent('');
    }
  }, [isOpen, course, material]);

  if (!isOpen || !targetItem) return null;

  const handleCopyPrivateLink = async () => {
    if (!targetItem) return;
    try {
      const url = await createPrivateShareLink(targetItem, privateNote);
      setPrivateLink(url);
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
      if (privateLink) {
        navigator.clipboard.writeText(privateLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    }
  };

  const handleCommunityShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem) return;
    try {
      setIsSubmitting(true);
      const postText = content.trim() || (isCourse 
        ? `แชร์คอร์สติว "${course?.title || ''}" ให้เพื่อนๆ สามารถกดบันทึกเข้าคลังวิชาไปทบทวนได้เลยครับ!`
        : `แชร์เอกสาร/คลิป "${material?.title || ''}" จากวิชา ${courseOfMaterial?.title || ''} กดบันทึกไปอ่านได้เลยครับ!`
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
                เลือกสร้างลิงก์ส่วนตัว หรือแชร์ลงกระดานชุมชนสาธารณะ
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

        {/* Mode Selector Tabs (Private Link vs Public Community) */}
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
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>สร้างลิงก์ส่วนตัว (Private Link)</span>
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
            <span>โพสต์ลงชุมชนสาธารณะ</span>
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

        {/* Tab 1: Private Sharing Link (ความเป็นส่วนตัว ไม่ลงชุมชน) */}
        {shareMode === 'private' && (
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>แชร์แบบส่วนตัว (Private Direct Link)</span>
              </div>
              <p className="text-xs text-slate-600">
                ข้อมูลจะไม่แสดงบนหน้าบอร์ดชุมชนสาธารณะ เพื่อนที่ได้รับลิงก์นี้เท่านั้นที่จะสามารถกดเปิดและกดบันทึกเข้าคลังวิชาของเขาได้ทันที
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ข้อความโน้ตสั้นๆ แนบไปกับลิงก์ (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น การบ้านบทที่ 3, สรุปฟิสิกส์สำหรับสอบปลายภาค..."
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ลิงก์สำหรับส่งต่อให้เพื่อน
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    readOnly
                    value={privateLink || 'กำลังสร้างลิงก์...'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 bg-slate-50 select-all font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrivateLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {copiedLink && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>คัดลอกลิงก์เรียบร้อยแล้ว ส่งให้เพื่อนทาง Line, Messenger หรือ Discord ได้เลย!</span>
              </div>
            )}

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

        {/* Tab 2: Public Community Posting with Free-Text Tags */}
        {shareMode === 'community' && (
          <div>
            {successNotice ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">แชร์ไปยังหน้าชุมชนสำเร็จ!</h3>
                <p className="text-xs text-slate-500">กำลังนำทางไปยังหน้ากระดานข่าวสารและชุมชน...</p>
              </div>
            ) : (
              <form onSubmit={handleCommunityShare} className="p-5 space-y-4">
                {/* Content Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ข้อความแนะนำ หรือคำอธิบายเพิ่มเติมถึงเพื่อนๆ
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

                {/* Free Text Tag Input (Removed rigid # selector) */}
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
                    * ไม่จำกัดเฉพาะ # ที่กำหนดไว้ สามารถพิมพ์คำค้นหรือหัวข้อที่ต้องการได้อิสระ
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
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'กำลังโพสต์...' : 'โพสต์ลงหน้าชุมชน'}</span>
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
