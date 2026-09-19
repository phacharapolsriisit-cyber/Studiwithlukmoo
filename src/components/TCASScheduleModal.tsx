import React, { useState } from 'react';
import { 
  X, 
  Pin, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  ExternalLink,
  ChevronRight,
  Download,
  Share2
} from 'lucide-react';
import { 
  TCAS70_SCHEDULE_ITEMS, 
  TCAS70_METADATA, 
  getTCASGroupedByMonth 
} from '../data/tcas70Schedule';
import { TCASScheduleItem } from '../types';

interface TCASScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate?: (date: string) => void;
  onAddEventToPersonal?: (item: TCASScheduleItem) => void;
  completedIds?: string[];
  onToggleComplete?: (id: string) => void;
}

export const TCASScheduleModal: React.FC<TCASScheduleModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  onAddEventToPersonal,
  completedIds = [],
  onToggleComplete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const getDaysDiff = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const today = new Date(todayStr).getTime();
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  // Grouped data
  const monthGroups = getTCASGroupedByMonth();

  const filteredGroups = monthGroups.map((group) => {
    const matchedItems = group.items.filter((item) => {
      const matchesSearch = 
        !searchTerm.trim() || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rawDateThai.includes(searchTerm) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRound = 
        selectedRoundFilter === 'all' || 
        item.roundCategory === selectedRoundFilter;

      const matchesMonth = 
        selectedMonthFilter === 'all' || 
        group.monthThai === selectedMonthFilter;

      return matchesSearch && matchesRound && matchesMonth;
    });

    return {
      ...group,
      items: matchedItems,
    };
  }).filter(group => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header matching the graphic aesthetic */}
        <div className="relative bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 p-5 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold tracking-wide text-white border border-white/30">
              <Pin className="w-3.5 h-3.5 fill-white" />
              <span>ปักหมุดสำหรับทุกคน (Official Schedule)</span>
            </span>
            <span className="text-[11px] text-sky-100 bg-black/15 px-2.5 py-0.5 rounded-full font-medium">
              ปีการศึกษา 2570
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-xs flex items-center gap-2">
            <span>กำหนดการ</span>
            <span className="text-amber-300 font-black">TCAS70</span>
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-2xl">
            ตารางกำหนดการคัดเลือกบุคคลเข้าศึกษาในสถาบันอุดมศึกษา (myTCAS) ครบทุกรอบ พร้อมแจ้งเตือนวันสอบสำคัญ
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา เช่น กสพท, ยืนยันสิทธิ์, A-Level, TGAT..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Month */}
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">ทุกเดือน (ก.ค. 69 - มิ.ย. 70)</option>
              {monthGroups.map((g) => (
                <option key={g.monthThai} value={g.monthThai}>
                  {g.monthThai} ({g.items.length} รายการ)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Round Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1">หมวดหมู่:</span>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'TGAT_TPAT', label: 'TGAT / TPAT2-5' },
              { id: 'TPAT1', label: 'TPAT1 (กสพท)' },
              { id: 'A_Level', label: 'A-Level' },
              { id: 'Portfolio', label: 'รอบ 1 Portfolio' },
              { id: 'Quota', label: 'รอบ 2 Quota' },
              { id: 'Admission', label: 'รอบ 3 Admission' },
              { id: 'Direct_Admission', label: 'รอบ 4 Direct Admission' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoundFilter(r.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedRoundFilter === r.id
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Table Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">ไม่พบกำหนดการที่ตรงกับคำค้นหา</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRoundFilter('all');
                  setSelectedMonthFilter('all');
                }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                ล้างการค้นหาทั้งหมด
              </button>
            </div>
          ) : (
            <div className="border border-blue-200 rounded-2xl overflow-hidden shadow-xs">
              {/* Table Header */}
              <div className="grid grid-cols-12 bg-blue-600 text-white font-bold text-xs sm:text-sm py-3 px-4">
                <div className="col-span-3 sm:col-span-2 text-center tracking-wider">
                  เดือน
                </div>
                <div className="col-span-9 sm:col-span-10 pl-2">
                  รายละเอียดกำหนดการ
                </div>
              </div>

              {/* Month Rows */}
              <div className="divide-y divide-blue-100 bg-white">
                {filteredGroups.map((group, idx) => {
                  const isPinkBg = group.monthThai === 'พ.ย. 69' || group.monthThai === 'มี.ค. 70' || group.monthThai === 'พ.ค. 70';
                  return (
                    <div 
                      key={group.monthThai}
                      className={`grid grid-cols-12 transition-colors ${
                        isPinkBg ? 'bg-pink-50/40 hover:bg-pink-50/70' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Month Column */}
                      <div className={`col-span-3 sm:col-span-2 p-3 sm:p-4 border-r border-blue-100 flex flex-col items-center justify-start text-center ${
                        isPinkBg ? 'bg-pink-100/50' : 'bg-blue-50/50'
                      }`}>
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          {group.monthThai}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {group.items.length} รายการ
                        </span>
                      </div>

                      {/* Items Column */}
                      <div className="col-span-9 sm:col-span-10 p-3 sm:p-4 space-y-3">
                        {group.items.map((item) => {
                          const isDone = completedIds.includes(item.id);
                          const daysDiff = getDaysDiff(item.date);

                          return (
                            <div 
                              key={item.id}
                              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-xl transition-all ${
                                item.isExamHighlight 
                                  ? 'bg-red-50/60 border border-red-200' 
                                  : 'hover:bg-white/80'
                              } ${isDone ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                {onToggleComplete && (
                                  <button
                                    onClick={() => onToggleComplete(item.id)}
                                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                                    title={isDone ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'ทำเครื่องหมายว่าเสร็จแล้ว'}
                                  >
                                    <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                                  </button>
                                )}

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-slate-700 shrink-0">
                                      • {item.rawDateThai} :
                                    </span>
                                    <span className={`font-bold ${
                                      item.isExamHighlight 
                                        ? 'text-red-600' 
                                        : 'text-slate-900'
                                    } ${isDone ? 'line-through' : ''}`}>
                                      {item.title}
                                    </span>

                                    {/* (New) Badge */}
                                    {item.isNew && (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-red-600 text-white tracking-wider">
                                        (New)
                                      </span>
                                    )}

                                    {/* Exam highlight badge */}
                                    {item.isExamHighlight && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 border border-red-200">
                                        ⚠️ วันสอบจริง
                                      </span>
                                    )}
                                  </div>

                                  {item.notes && (
                                    <p className="text-[11px] text-slate-500 mt-1 pl-3 border-l-2 border-slate-200">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Countdown and Action */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pl-6 sm:pl-0">
                                {daysDiff >= 0 && daysDiff <= 180 && !isDone && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    daysDiff <= 3
                                      ? 'bg-red-600 text-white animate-pulse'
                                      : daysDiff <= 14
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                    {daysDiff === 0 ? 'วันนี้!' : `อีก ${daysDiff} วัน`}
                                  </span>
                                )}

                                {onSelectDate && (
                                  <button
                                    onClick={() => {
                                      onSelectDate(item.date);
                                      onClose();
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="เปิดดูในปฏิทิน"
                                  >
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info & citation */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{TCAS70_METADATA.note}</span>
          </div>

          <div className="flex items-center gap-2 font-medium text-[11px] text-slate-600">
            <span>แหล่งข้อมูลอ้างอิง:</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
              {TCAS70_METADATA.credit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
