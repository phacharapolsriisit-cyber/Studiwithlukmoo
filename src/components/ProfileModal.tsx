import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  School, 
  Award, 
  LogOut, 
  Cloud, 
  Download, 
  Upload, 
  Check, 
  Save,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfileData, logout, syncStatus, lastSyncTime } = useAuth();
  const { exportBackupData, importBackupData, courses, materials, events } = useData();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [schoolOrUniv, setSchoolOrUniv] = useState('');
  const [targetExam, setTargetExam] = useState('');
  const [studyGoalHours, setStudyGoalHours] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setPhotoURL(profile.photoURL || user?.photoURL || '');
      setBio(profile.bio || '');
      setSchoolOrUniv(profile.schoolOrUniv || '');
      setTargetExam(profile.targetExam || 'TCAS / A-Level');
      setStudyGoalHours(profile.studyGoalHours || 15);
    }
  }, [profile, user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateProfileData({
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        bio: bio.trim(),
        schoolOrUniv: schoolOrUniv.trim(),
        targetExam: targetExam.trim(),
        studyGoalHours: Number(studyGoalHours) || 15,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = () => {
    const jsonString = exportBackupData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `lukmoo-tutor-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        setImportStatus('กำลังนำเข้าข้อมูล...');
        await importBackupData(text);
        setImportStatus('นำเข้าข้อมูลสำเร็จแล้ว!');
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        setImportStatus(`ผิดพลาด: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="profile-modal-card"
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg text-slate-900">จัดการโปรไฟล์ผู้เรียน (User Profile)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Cloud Info & Firebase Sync Badge */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">Firebase Firestore</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    lukmoo-tutor
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  สำรองข้อมูลอัตโนมัติ • บันทึกล่าสุด:{' '}
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString('th-TH') : 'กำลังซิงค์'}
                </p>
              </div>
            </div>

            <div className="text-xs font-medium text-slate-600 bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 text-center">
              {courses.length} วิชา • {materials.length} ชีท/คลิป • {events.length} นัดหมาย
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อที่ต้องการให้แสดง
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น พี่ลูกหมู ติวเตอร์"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมลประจำตัว (ลงทะเบียน)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled
                    value={user.email || 'ไม่มีอีเมล'}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  โรงเรียน / มหาวิทยาลัย / ระดับชั้น
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="profile-school-input"
                    type="text"
                    value={schoolOrUniv}
                    onChange={(e) => setSchoolOrUniv(e.target.value)}
                    placeholder="เช่น เตรียมอุดมศึกษา / จุฬาฯ"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เป้าหมายสนามสอบ / คณะที่อยากเข้า
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="profile-target-input"
                    type="text"
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                    placeholder="เช่น แพทย์ กสพท / วิศวะ / A-Level"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เป้าหมายชั่วโมงอ่านหนังสือ / ติวต่อสัปดาห์ (ชั่วโมง)
              </label>
              <input
                id="profile-hours-input"
                type="number"
                min="1"
                max="100"
                value={studyGoalHours}
                onChange={(e) => setStudyGoalHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คติประจำใจ / บันทึกเป้าหมาย
              </label>
              <textarea
                id="profile-bio-input"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="เช่น ไม่มีความสำเร็จใด ที่ได้มาโดยไม่ต้องพยายาม"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                {savedSuccess && (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว</span>
                  </>
                )}
              </div>
              <button
                id="profile-save-btn"
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}</span>
              </button>
            </div>
          </form>

          {/* Backup & Portability Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-600" />
              <span>การสำรองข้อมูลและความปลอดภัย (Cloud Backup)</span>
            </h4>
            <p className="text-xs text-slate-500">
              ข้อมูลทั้งหมดจะซิงค์ไปยัง Cloud Firestore ของคุณโดยอัตโนมัติ และคุณสามารถสำรองไฟล์ JSON เพิ่มเติมได้
            </p>

            {importStatus && (
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700 text-xs border border-blue-200">
                {importStatus}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                id="export-backup-btn"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>ดาวน์โหลดสำรองข้อมูล (JSON)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>นำเข้าข้อมูลจากไฟล์สำรอง</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Logout button */}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              id="profile-logout-btn"
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ (Log out)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
