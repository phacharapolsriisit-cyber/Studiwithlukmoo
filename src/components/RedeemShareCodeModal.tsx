import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Search, 
  BookOpen, 
  FileText, 
  Youtube, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Download,
  ArrowRight,
  FolderKanban
} from 'lucide-react';
import { SharedItemPayload } from '../types';
import { useData } from '../context/DataContext';

interface RedeemShareCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (courseId?: string) => void;
}

export const RedeemShareCodeModal: React.FC<RedeemShareCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { resolvePrivateShare, importSharedItem } = useData();
  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resolvedItem, setResolvedItem] = useState<SharedItemPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setResolvedItem(null);
      setErrorMessage(null);
      setIsSearching(false);
      setIsImporting(false);
      setImportSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = code.trim();
    if (!clean) {
      setErrorMessage('กรุณากรอกรหัสแชร์ 6 หลัก หรือวางลิงก์');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setResolvedItem(null);

    try {
      const payload = await resolvePrivateShare(clean);
      if (payload && payload.title) {
        setResolvedItem(payload);
      } else {
        setErrorMessage('ไม่พบข้อมูลจากรหัสนี้ กรุณาตรวจสอบรหัสอีกครั้ง หรือให้เพื่อนส่งรหัสใหม่');
      }
    } catch (err) {
      console.error('Failed to resolve share code:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการค้นหาข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!resolvedItem) return;
    try {
      setIsImporting(true);
      const res = await importSharedItem(resolvedItem);
      if (res.success) {
        setImportSuccess(true);
        setTimeout(() => {
          onSuccess?.(res.courseId);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'ไม่สามารถนำเข้าข้อมูลได้');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                ใส่โค้ดรับคอร์สติว / สื่อการเรียน
              </h2>
              <p className="text-xs text-slate-500">
                กรอกรหัส 6 หลักที่เพื่อนส่งให้เพื่อรับเข้าคลังของคุณ
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

        <div className="p-5 space-y-4">
          {/* Input Form */}
          <form onSubmit={handleSearchCode} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                รหัสแชร์ (Share Code) หรือลิงก์
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="เช่น LM-8K39 หรือวางลิงก์..."
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm uppercase tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !code.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>ค้นหา</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resolved Preview Card */}
          {resolvedItem && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {resolvedItem.type === 'course' ? 'คอร์สติว' : 'สื่อการเรียน'}
                </span>
                {resolvedItem.category && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {resolvedItem.category}
                  </span>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {resolvedItem.type === 'course' ? (
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  ) : resolvedItem.materialType === 'video' ? (
                    <Youtube className="w-5 h-5 text-red-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 truncate">
                    {resolvedItem.title}
                  </h4>
                  {resolvedItem.instructor && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      ผู้สอน: {resolvedItem.instructor}
                    </p>
                  )}
                  {resolvedItem.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                      {resolvedItem.description}
                    </p>
                  )}
                </div>
              </div>

              {resolvedItem.materials && resolvedItem.materials.length > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    มาพร้อม <strong>{resolvedItem.materials.length} สื่อการเรียน</strong> ({resolvedItem.materials.filter(m => m.type === 'video').length} คลิป, {resolvedItem.materials.filter(m => m.type !== 'video').length} ชีท/เอกสาร)
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || importSuccess}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    importSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {importSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>บันทึกเข้าคลังสำเร็จ! กำลังเปิด...</span>
                    </>
                  ) : isImporting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>บันทึกเข้าคลังของฉัน</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick Explanation */}
          {!resolvedItem && !isSearching && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-xs space-y-1">
              <p className="font-semibold text-slate-700">💡 วิธีรับคอร์สจากเพื่อน</p>
              <p>1. ขอรหัส 6 หลัก เช่น <strong className="text-blue-600 font-mono">LM-8K39</strong> จากเพื่อน</p>
              <p>2. นำมากรอกในช่องด้านบน แล้วกดค้นหา</p>
              <p>3. กดยืนยันเพื่อนำเข้าวิชาและสื่อทั้งหมดเข้าคลังส่วนตัวของคุณได้ทันที</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
