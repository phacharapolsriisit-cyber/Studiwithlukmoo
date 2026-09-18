import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  Calendar, 
  Building2, 
  FileText, 
  Sparkles, 
  Clock, 
  Link as LinkIcon, 
  Image as ImageIcon,
  CheckCircle2,
  FolderHeart
} from 'lucide-react';
import { PortfolioItem, PortfolioCategory } from '../types';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<PortfolioItem, 'id' | 'createdAt'>) => Promise<void>;
  editingItem?: PortfolioItem | null;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PortfolioCategory>('activity');
  const [date, setDate] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [reflection, setReflection] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [hours, setHours] = useState<number | ''>('');
  const [level, setLevel] = useState<'school' | 'district' | 'province' | 'national' | 'international'>('school');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setCategory(editingItem.category);
      setDate(editingItem.date || '');
      setOrganization(editingItem.organization || '');
      setDescription(editingItem.description || '');
      setReflection(editingItem.reflection || '');
      setImageUrl(editingItem.imageUrl || '');
      setLinkUrl(editingItem.linkUrl || '');
      setHours(editingItem.hours ?? '');
      setLevel(editingItem.level || 'school');
    } else {
      setTitle('');
      setCategory('activity');
      setDate(new Date().toISOString().split('T')[0]);
      setOrganization('');
      setDescription('');
      setReflection('');
      setImageUrl('');
      setLinkUrl('');
      setHours('');
      setLevel('school');
    }
    setErrorMsg('');
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่อผลงานหรือกิจกรรม');
      return;
    }
    if (!organization.trim()) {
      setErrorMsg('กรุณาระบุหน่วยงานหรือสถาบันที่จัด');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSave({
        title: title.trim(),
        category,
        date: date || new Date().toISOString().split('T')[0],
        organization: organization.trim(),
        description: description.trim(),
        reflection: reflection.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        hours: category === 'volunteer' && typeof hours === 'number' ? hours : undefined,
        level,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">
                {editingItem ? 'แก้ไขผลงานสะสม' : 'เพิ่มผลงานสะสม Portfolio'}
              </h2>
              <p className="text-xs text-slate-500">
                จัดเก็บข้อมูลตามโครงสร้าง TCAS 4 ด้านเพื่อเตรียมยื่นแฟ้มสะสมผลงาน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              หมวดหมู่ด้านผลงาน (เลือก 1 ด้าน) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'activity' as PortfolioCategory, label: 'ด้านกิจกรรม', desc: 'ผู้นำ/สโมสร/กีฬา', icon: '🎪' },
                { id: 'academic' as PortfolioCategory, label: 'ด้านวิชาการ', desc: 'โอลิมปิก/โครงงาน', icon: '🔬' },
                { id: 'volunteer' as PortfolioCategory, label: 'ด้านจิตอาสา', desc: 'บำเพ็ญประโยชน์/ค่าย', icon: '🤝' },
                { id: 'certificate' as PortfolioCategory, label: 'เกียรติบัตร', desc: 'รางวัล/ใบรับรอง', icon: '🏆' },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    category === cat.id
                      ? 'border-amber-500 bg-amber-50/80 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-bold text-slate-900">{cat.label}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อผลงาน / กิจกรรม / รางวัล *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ประธานโครงการค่ายวิทยาศาสตร์สู่ชุมชน, เหรียญทองโครงงาน AI..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Organization & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                สถาบัน / หน่วยงานที่จัดหรือมอบ *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="เช่น สมาคมดาราศาสตร์ไทย, โรงเรียน..."
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่หรือช่วงเวลาที่เข้าร่วม
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Level & Volunteer Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ระดับของผลงาน (Level)
              </label>
              <select
                value={level}
                onChange={(e: any) => setLevel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="school">ระดับโรงเรียน / ภายในสถานศึกษา</option>
                <option value="district">ระดับกลุ่มโรงเรียน / อำเภอ / สพม.</option>
                <option value="province">ระดับจังหวัด / ภูมิภาค</option>
                <option value="national">ระดับประเทศ (National)</option>
                <option value="international">ระดับนานาชาติ (International)</option>
              </select>
            </div>

            {category === 'volunteer' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  จำนวนชั่วโมงจิตอาสา (สะสม)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    placeholder="เช่น 12 หรือ 24 ชั่วโมง"
                    value={hours}
                    onChange={(e) => setHours(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รายละเอียดบทบาทและหน้าที่ (Description)
            </label>
            <textarea
              rows={3}
              placeholder="ระบุว่าคุณได้ทำอะไร รับผิดชอบหน้าที่อะไรในกิจกรรมนี้..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Reflection / Learning Outcomes (TCAS standard) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>สิ่งที่ได้เรียนรู้และทักษะที่พัฒนา (สำคัญมากสำหรับการยื่นพอร์ต!)</span>
            </div>
            <textarea
              rows={2}
              placeholder="เช่น ได้ฝึกภาวะผู้นำ, การทำงานเป็นทีม, การแก้ไขปัญหาเฉพาะหน้า, ทักษะการวิจัย..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs focus:outline-none focus:border-amber-500 bg-white"
            />
            <p className="text-[10px] text-amber-700">
              * กรรมการตรวจพอร์ตของมหาวิทยาลัยเน้นดูการสะท้อนตัวตนและการเติบโต (Reflection) ยิ่งกว่าจำนวนรูปถ่าย
            </p>
          </div>

          {/* Image & Proof URL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              รูปภาพกิจกรรม หรือ เกียรติบัตร
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 cursor-pointer flex items-center justify-center gap-2 transition-colors">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>เลือกรูปภาพจากเครื่อง (PNG / JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
              <input
                type="url"
                placeholder="หรือวาง URL รูปภาพ..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ลิงก์ผลงาน / หลักฐานเพิ่มเติม (ถ้ามี)
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                placeholder="เช่น ลิงก์ Google Drive, ลิงก์ข่าว, หรือเว็บไซต์โครงการ..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingItem ? 'บันทึกการแก้ไข' : 'บันทึกเข้า Portfolio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
