import React, { useState } from 'react';
import { 
  FolderHeart, 
  ExternalLink, 
  Plus, 
  Search, 
  Sparkles, 
  Award, 
  Calendar, 
  Building2, 
  Clock, 
  Edit, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Info, 
  BookOpen, 
  Share2, 
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { PortfolioItem, PortfolioCategory } from '../types';
import { PortfolioModal } from './PortfolioModal';

export const PortfolioView: React.FC = () => {
  const { portfolioItems, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } = useData();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showTcasFolioGuide, setShowTcasFolioGuide] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Counts by category
  const activityCount = portfolioItems.filter(p => p.category === 'activity').length;
  const academicCount = portfolioItems.filter(p => p.category === 'academic').length;
  const volunteerItems = portfolioItems.filter(p => p.category === 'volunteer');
  const volunteerCount = volunteerItems.length;
  const volunteerHours = volunteerItems.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const certificateCount = portfolioItems.filter(p => p.category === 'certificate').length;

  // Filter items
  const filteredItems = portfolioItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || item.level === selectedLevel;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(q) ||
      item.organization.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.reflection && item.reflection.toLowerCase().includes(q));

    return matchesCategory && matchesLevel && matchesSearch;
  });

  const handleSave = async (itemData: Omit<PortfolioItem, 'id' | 'createdAt'>) => {
    if (editingItem) {
      await updatePortfolioItem(editingItem.id, itemData);
      showToast('อัปเดตผลงานเรียบร้อยแล้ว');
    } else {
      await addPortfolioItem(itemData);
      showToast('เพิ่มผลงานใหม่เข้า Portfolio เรียบร้อยแล้ว');
    }
    setEditingItem(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผลงาน "${title}" ออกจาก Portfolio?`)) {
      await deletePortfolioItem(id);
      showToast('ลบผลงานเรียบร้อยแล้ว');
    }
  };

  const handleCopySummary = (item: PortfolioItem) => {
    const text = `【${item.category === 'activity' ? 'ด้านกิจกรรม' : item.category === 'academic' ? 'ด้านวิชาการ' : item.category === 'volunteer' ? 'ด้านจิตอาสา' : 'เกียรติบัตร'}】\n` +
      `ชื่อผลงาน: ${item.title}\n` +
      `หน่วยงาน/สถาบัน: ${item.organization}\n` +
      `วันที่: ${item.date}\n` +
      (item.hours ? `ชั่วโมงจิตอาสา: ${item.hours} ชม.\n` : '') +
      `รายละเอียด: ${item.description}\n` +
      (item.reflection ? `สิ่งที่ได้เรียนรู้/ทักษะ: ${item.reflection}\n` : '') +
      (item.linkUrl ? `ลิงก์หลักฐาน: ${item.linkUrl}\n` : '');
    
    navigator.clipboard.writeText(text);
    showToast('คัดลอกข้อมูลผลงานสำหรับใส่ใน TCASfolio แล้ว!');
  };

  const handleExportAll = () => {
    if (portfolioItems.length === 0) {
      showToast('ยังไม่มีข้อมูลผลงานให้คัดลอก');
      return;
    }
    let allText = `=== แฟ้มสะสมผลงาน (TCAS Portfolio Summary) ===\n\n`;
    portfolioItems.forEach((item, idx) => {
      allText += `${idx + 1}. [${item.category.toUpperCase()}] ${item.title}\n`;
      allText += `   สถาบัน/หน่วยงาน: ${item.organization} (${item.date})\n`;
      if (item.hours) allText += `   ชั่วโมงจิตอาสา: ${item.hours} ชั่วโมง\n`;
      allText += `   รายละเอียด: ${item.description}\n`;
      if (item.reflection) allText += `   สิ่งที่ได้เรียนรู้: ${item.reflection}\n`;
      allText += `\n`;
    });
    navigator.clipboard.writeText(allText);
    showToast('คัดลอกโครงร่างผลงานทั้งหมดเรียบร้อยแล้ว!');
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-slideUp text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-600 via-rose-600 to-purple-700 text-white p-6 sm:p-8 shadow-lg shadow-amber-600/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
              <FolderHeart className="w-3.5 h-3.5" />
              <span>TCAS Portfolio & Folio Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              คลังผลงานสะสม Portfolio รอบที่ 1
            </h1>
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
              จัดเก็บและแยกหมวดหมู่ผลงาน 4 ด้านตามมาตรฐาน ทปอ. บันทึกสิ่งที่ได้เรียนรู้ (Reflection) 
              และเชื่อมต่อตรงกับระบบแฟ้มสะสมผลงานอิเล็กทรอนิกส์ของ ทปอ. (tcasfolio.mytcas.com)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Direct Link to TCASfolio */}
            <a
              id="link-tcasfolio"
              href="https://tcasfolio.mytcas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-rose-700 font-bold text-xs sm:text-sm shadow-md hover:bg-rose-50 transition-all cursor-pointer"
            >
              <span>เชื่อมต่อเว็บ TCASfolio</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={() => setShowTcasFolioGuide(!showTcasFolioGuide)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition-all backdrop-blur-md cursor-pointer"
            >
              <Info className="w-4 h-4" />
              <span>เกณฑ์ 10 หน้า ทปอ.</span>
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผลงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* TCASfolio Guide Section (Expandable) */}
      {showTcasFolioGuide && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-rose-200 shadow-sm animate-fadeIn space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
              <Sparkles className="w-5 h-5 text-rose-600" />
              <span>ข้อกำหนดการจัดทำแฟ้มสะสมผลงาน 10 หน้า ตามเกณฑ์ ทปอ. (TCASfolio)</span>
            </div>
            <button
              onClick={() => setShowTcasFolioGuide(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            ระบบ <strong>tcasfolio.mytcas.com</strong> ของ ทปอ. 
            ได้รับการออกแบบมาเพื่อให้นักเรียนจัดเก็บและส่งผลงานไปยังมหาวิทยาลัยในรอบที่ 1 โดยจำกัดไม่เกิน 10 หน้ากระดาษ A4 (ไม่รวมปก คำนำ สารบัญ) 
            มีโครงสร้างที่แนะนำดังนี้:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1">
              <span className="font-bold text-rose-900 block">ส่วนที่ 1: ประวัติ & เป้าหมาย (1-2 หน้า)</span>
              <p className="text-slate-600">ประวัติส่วนตัว, ประวัติการศึกษา, เหตุผลที่อยากเข้าเรียน และ Statement of Purpose</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <span className="font-bold text-blue-900 block">ส่วนที่ 2: ด้านวิชาการ (3-4 หน้า)</span>
              <p className="text-slate-600">โอลิมปิก สอวน., โครงงานวิทยาศาสตร์, แข่งขันทักษะวิชาการ และผลงานวิจัย</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <span className="font-bold text-amber-900 block">ส่วนที่ 3: กิจกรรม & ผู้นำ (2-3 หน้า)</span>
              <p className="text-slate-600">กรรมการนักเรียน, การจัดค่าย, กีฬา/ดนตรี, การแสดง และการแข่งขันระดับกลุ่ม</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
              <span className="font-bold text-emerald-900 block">ส่วนที่ 4: จิตอาสา & ประโยชน์สาธารณะ (1-2 หน้า)</span>
              <p className="text-slate-600">ชั่วโมงจิตอาสา, บำเพ็ญประโยชน์, การช่วยเหลือสังคม พร้อมรูปถ่ายและลายเซ็นรับรอง</p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Category Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Activity Card */}
        <button
          onClick={() => setSelectedCategory(selectedCategory === 'activity' ? 'all' : 'activity')}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            selectedCategory === 'activity'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-amber-400 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🎪</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              selectedCategory === 'activity' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {activityCount} รายการ
            </span>
          </div>
          <h3 className="font-bold text-sm">ด้านกิจกรรม</h3>
          <p className={`text-[11px] mt-0.5 ${selectedCategory === 'activity' ? 'text-white/80' : 'text-slate-500'}`}>
            ผู้นำ, สโมสร, ชมรม, การแสดง
          </p>
        </button>

        {/* Academic Card */}
        <button
          onClick={() => setSelectedCategory(selectedCategory === 'academic' ? 'all' : 'academic')}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            selectedCategory === 'academic'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-blue-400 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🔬</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              selectedCategory === 'academic' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
            }`}>
              {academicCount} รายการ
            </span>
          </div>
          <h3 className="font-bold text-sm">ด้านวิชาการ</h3>
          <p className={`text-[11px] mt-0.5 ${selectedCategory === 'academic' ? 'text-white/80' : 'text-slate-500'}`}>
            โอลิมปิก สอวน., โครงงาน, ตอบปัญหา
          </p>
        </button>

        {/* Volunteer Card */}
        <button
          onClick={() => setSelectedCategory(selectedCategory === 'volunteer' ? 'all' : 'volunteer')}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            selectedCategory === 'volunteer'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-emerald-400 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🤝</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              selectedCategory === 'volunteer' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {volunteerHours} ชม. ({volunteerCount} งาน)
            </span>
          </div>
          <h3 className="font-bold text-sm">ด้านจิตอาสา</h3>
          <p className={`text-[11px] mt-0.5 ${selectedCategory === 'volunteer' ? 'text-white/80' : 'text-slate-500'}`}>
            บำเพ็ญประโยชน์, ค่ายอาสา, เพื่อสังคม
          </p>
        </button>

        {/* Certificate Card */}
        <button
          onClick={() => setSelectedCategory(selectedCategory === 'certificate' ? 'all' : 'certificate')}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            selectedCategory === 'certificate'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-purple-400 text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🏆</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              selectedCategory === 'certificate' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {certificateCount} ใบ
            </span>
          </div>
          <h3 className="font-bold text-sm">เกียรติบัตร & รางวัล</h3>
          <p className={`text-[11px] mt-0.5 ${selectedCategory === 'certificate' ? 'text-white/80' : 'text-slate-500'}`}>
            ประกาศนียบัตร, รางวัลการแข่งขัน
          </p>
        </button>
      </div>

      {/* Filter & Free Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="พิมพ์ค้นหาชื่อผลงาน, สถาบัน, ทักษะที่ได้เรียนรู้, หรือรายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'activity', label: 'กิจกรรม' },
              { id: 'academic', label: 'วิชาการ' },
              { id: 'volunteer', label: 'จิตอาสา' },
              { id: 'certificate', label: 'เกียรติบัตร' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="คัดลอกสรุปรายการผลงานทั้งหมดเพื่อใช้อ้างอิงหรือจัดเล่ม"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>คัดลอกสรุปทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* Portfolio Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            📁
          </div>
          <h3 className="font-bold text-base text-slate-900">ไม่พบผลงานตามเงื่อนไขที่ค้นหา</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery 
              ? `ไม่พบผลงานที่ตรงกับคำค้นหา "${searchQuery}" ลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง`
              : 'ยังไม่มีผลงานในหมวดหมู่นี้ เริ่มต้นบันทึกผลงานเพื่อนำไปจัดทำแฟ้มสะสมผลงาน TCAS กันเลย!'}
          </p>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มผลงานชิ้นแรก</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const badgeBg = item.category === 'activity' 
              ? 'bg-amber-100 text-amber-900 border-amber-200' 
              : item.category === 'academic'
              ? 'bg-blue-100 text-blue-900 border-blue-200'
              : item.category === 'volunteer'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
              : 'bg-purple-100 text-purple-900 border-purple-200';

            const categoryLabel = item.category === 'activity'
              ? '🎪 ด้านกิจกรรม'
              : item.category === 'academic'
              ? '🔬 ด้านวิชาการ'
              : item.category === 'volunteer'
              ? '🤝 ด้านจิตอาสา'
              : '🏆 เกียรติบัตร';

            return (
              <div 
                key={item.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Category & Action bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                        {categoryLabel}
                      </span>
                      {item.hours && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.hours} ชม.</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopySummary(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="คัดลอกข้อมูลสำหรับใส่ใน TCASfolio"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 cursor-pointer"
                        title="แก้ไขข้อมูลผลงาน"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="ลบผลงาน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Organization */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.organization}</span>
                      </span>
                      {item.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.date}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Image Preview if present */}
                  {item.imageUrl && (
                    <div 
                      className="relative rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-100 group cursor-pointer"
                      onClick={() => setPreviewImage(item.imageUrl!)}
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <Maximize2 className="w-4 h-4" />
                        <span>คลิกเพื่อดูรูปขยาย</span>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  )}

                  {/* Reflection Box (Crucial for TCAS) */}
                  {item.reflection && (
                    <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>สิ่งที่ได้เรียนรู้ & ทักษะที่พัฒนา:</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {item.reflection}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer with External Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  {item.linkUrl ? (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1"
                    >
                      <span>ดูหลักฐาน/ลิงก์ผลงาน</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-slate-400 text-[11px]">บันทึกเก็บไว้ในระบบ</span>
                  )}

                  <a
                    href="https://tcasfolio.mytcas.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                  >
                    <span>นำเข้าสู่ tcasfolio</span>
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <PortfolioModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        editingItem={editingItem}
      />

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Fullscreen preview" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
