import React, { useState, useEffect, useMemo } from 'react';
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
  Globe2,
  Tag,
  KeyRound,
  ArrowRight,
  Zap,
  MessageSquareShare,
  ExternalLink
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
  // Default to community share as it is the fastest 1-click approach
  const [shareMode, setShareMode] = useState<'community' | 'private'>('community');
  const [content, setContent] = useState('');
  const [freeTagInput, setFreeTagInput] = useState('Dek68, แชร์วิชาเรียน');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
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

  // 1. Instant 0ms synchronous share code generation (No async delay, no spinner!)
  const instantCode = useMemo(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `LM-${rand}`;
  }, [isOpen, course?.id, material?.id]);

  const [shareCode, setShareCode] = useState(instantCode);

  useEffect(() => {
    if (isOpen && targetItem) {
      setShareCode(instantCode);
      setCopiedCode(false);
      setCopiedMessage(false);
      setSuccessNotice(false);
      setContent('');

      // Non-blocking instant persistence in background
      createPrivateShareLink(targetItem, privateNote, instantCode).catch((err) => {
        console.warn('Background share link sync:', err);
      });
    }
  }, [isOpen, instantCode, course?.id, material?.id]);

  if (!isOpen || !targetItem) return null;

  const handleCopyCode = async () => {
    if (!shareCode || !targetItem) return;
    createPrivateShareLink(targetItem, privateNote, shareCode).catch(console.error);
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    }
  };

  const handleCopyChatInvite = async () => {
    if (!targetItem || !shareCode) return;
    createPrivateShareLink(targetItem, privateNote, shareCode).catch(console.error);
    const message = `ฉันแชร์${isCourse ? 'วิชา' : 'เอกสาร'} "${targetItem.title}" ในเว็บ Lukmoo Tutor ให้แล้วนะ!\nนำรหัสนี้: ${shareCode}\nไปกรอกที่ปุ่ม "ใส่โค้ดรับคอร์ส" บนเว็บเพื่อรับเข้าคลังของคุณได้ทันที`;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3000);
    } catch {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3000);
    }
  };

  const handleCommunityShare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetItem) return;
    try {
      setIsSubmitting(true);
      const postText = content.trim() || (isCourse 
        ? `แชร์คอร์สติว "${course?.title || ''}" ให้เพื่อนๆ ทุกคนในชุมชน สามารถกดบันทึกเข้าคลังวิชาไปทบทวนได้เลยครับ!`
        : `แชร์เอกสาร/คลิป "${material?.title || ''}" จากวิชา ${courseOfMaterial?.title || ''} ทุกคนสามารถกดบันทึกไปอ่านได้เลยครับ!`
      );
      
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
      }, 1200);
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
                เลือกวิธีแชร์ที่สะดวกและรวดเร็วที่สุด
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

        {/* Mode Selector Tabs (Public Community as Tab 1 vs Private Code as Tab 2) */}
        <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={() => setShareMode('community')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              shareMode === 'community'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>แชร์ลงชุมชนทันที (1 คลิก - เร็วที่สุด)</span>
          </button>

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
            <span>รหัสแชร์ 6 หลัก (ส่งแชท)</span>
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
                  แนบเนื้อหาไปด้วย <strong>{targetItem.materials.length} รายการ</strong> ({targetItem.materials.filter(m => m.type === 'video').length} คลิป, {targetItem.materials.filter(m => m.type !== 'video').length} ชีท)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: 1-Click Community Sharing (THE FASTEST OPTION) */}
        {shareMode === 'community' && (
          <div>
            {successNotice ? (
              <div className="p-8 text-center space-y-3 animate-fadeIn">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">แชร์ลงชุมชนสำเร็จแล้ว!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ผู้ใช้งานทุกคนที่เปิดเว็บไซต์จะมองเห็นโพสต์นี้ทันที และสามารถกดปุ่ม <strong>"บันทึกลงคลัง" (1 คลิก)</strong> เพื่อดึงเนื้อหาเข้าบัญชีได้ทันทีโดยไม่ต้องใช้รหัส
                </p>
              </div>
            ) : (
              <form onSubmit={handleCommunityShare} className="p-5 space-y-4">
                {/* 1-Click Fast Recommendation Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>แนวทางที่แชร์ไวและสะดวกที่สุด (Fastest Approach):</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    เมื่อกดปุ่มด้านล่าง โพสต์จะขึ้นบอร์ดชุมชนทันที เพื่อนหรือทุกคนที่เปิดเว็บสามารถกด <strong>"บันทึกลงคลัง" ได้ใน 1 คลิกเดียว</strong> ไม่ต้องรอรหัส ไม่ต้องก็อปปี้ และไม่ต้องสลับไปเปิดแอปแชท
                  </p>
                </div>

                {/* Instant 1-Click Big Button */}
                <button
                  type="button"
                  onClick={() => handleCommunityShare()}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isSubmitting ? 'กำลังแชร์...' : '🚀 กดแชร์ลงชุมชนทันที (1 คลิก)'}</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">หรือปรับแต่งข้อความก่อนโพสต์</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Optional Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ข้อความแนะนำเพิ่มเติม (ไม่จำเป็นต้องใส่)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      isCourse
                        ? 'เช่น คอร์สนี้สรุปเข้มข้นมาก มีโจทย์ย้อนหลัง 5 ปีครบเลย เซฟไปอ่านกันนะ!'
                        : 'เช่น ชีทสรุปสูตรฟิสิกส์เตรียมสอบปลายภาค พร้อมจุดที่ชอบหลอก'
                    }
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder:text-slate-400"
                  />
                </div>

                {/* Free Text Tag Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>แท็กค้นหาอิสระ</span>
                  </label>
                  <input
                    type="text"
                    value={freeTagInput}
                    onChange={(e) => setFreeTagInput(e.target.value)}
                    placeholder="เช่น Dek68, สรุปฟิสิกส์, สอบเข้ามหาวิทยาลัย"
                    className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Share Code 6 Digits (Instant 0ms) */}
        {shareMode === 'private' && (
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>รหัสแชร์ 6 หลัก (สร้างเสร็จทันที 0ms)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                คัดลอกรหัสนี้ส่งให้เพื่อนทางแชท โดยเพื่อนสามารถกดปุ่ม <strong>"ใส่โค้ดรับคอร์ส"</strong> เพื่อรับเข้าคลังได้ทันที
              </p>
            </div>

            {/* Prominent Share Code Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 space-y-3 text-center">
              <div className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>รหัสแชร์ของคุณ (พร้อมส่งทันที)</span>
              </div>

              {/* Big Monospace Code Display */}
              <div className="bg-white border-2 border-blue-400/80 rounded-2xl py-3 px-6 tracking-[0.25em] font-mono text-2xl sm:text-3xl font-black text-blue-700 shadow-sm select-all inline-block">
                {shareCode}
              </div>

              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>รหัสพร้อมใช้งาน • กดคัดลอกส่งให้เพื่อนได้ทันที</span>
                </span>
              </div>

              {/* 2 Quick Copy Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>คัดลอกรหัสแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>คัดลอกรหัส ({shareCode})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyChatInvite}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs border ${
                    copiedMessage
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-[0.99]'
                  }`}
                >
                  {copiedMessage ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>คัดลอกข้อความแชทแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <MessageSquareShare className="w-4 h-4 text-blue-600" />
                      <span>คัดลอกข้อความส่ง Line</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step-by-step Guide */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                วิธีใช้งาน:
              </span>
              <p>ส่งรหัสให้เพื่อน ➔ เพื่อนกดปุ่ม <strong>"ใส่โค้ดรับคอร์ส"</strong> บนแถบเมนู ➔ ระบบดึงข้อมูลเข้าคลังทันที</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

