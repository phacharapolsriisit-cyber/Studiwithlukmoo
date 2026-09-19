import React from 'react';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  FolderKanban, 
  Cloud, 
  CloudCheck, 
  LogIn, 
  User as UserIcon,
  ChevronDown,
  GraduationCap,
  Bell,
  FolderHeart,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuthModal,
  onOpenProfileModal,
}) => {
  const { user, profile, syncStatus, lastSyncTime } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                  Lukmoo<span className="text-blue-600">Tutor</span>
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">คลังคอร์สติว & ปฏิทินสอบอัจฉริยะ</p>
            </div>
          </div>

          {/* Navigation Items (Only when logged in) */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 shrink-0">
              <button
                id="nav-dashboard-btn"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600" />
                <span>แดชบอร์ด</span>
              </button>
              <button
                id="nav-courses-btn"
                onClick={() => setActiveTab('courses')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'courses'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600" />
                <span>คอร์สติว</span>
              </button>
              <button
                id="nav-materials-btn"
                onClick={() => setActiveTab('materials')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'materials'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600" />
                <span>ชีท & คลิป</span>
              </button>
              <button
                id="nav-calendar-btn"
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-purple-600" />
                <span>ปฏิทิน</span>
              </button>
              <button
                id="nav-portfolio-btn"
                onClick={() => setActiveTab('portfolio')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'portfolio'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-rose-500" />
                <span>Portfolio</span>
              </button>
              <button
                id="nav-news-btn"
                onClick={() => setActiveTab('news')}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                  activeTab === 'news'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-500" />
                <span>ชุมชน</span>
              </button>
            </nav>
          )}

          {/* Right Actions: Cloud Sync & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Sync Status */}
            {user && (
              <div 
                className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600"
                title={`เชื่อมต่อ Firebase: lukmoo-tutor (${lastSyncTime ? 'ซิงค์เมื่อ ' + lastSyncTime.toLocaleTimeString('th-TH') : 'กำลังซิงค์'})`}
              >
                {syncStatus === 'syncing' ? (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                ) : syncStatus === 'error' ? (
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
                <span className="font-medium text-slate-700">lukmoo-tutor</span>
                <span className="text-[11px] text-slate-400">
                  {syncStatus === 'syncing' ? 'กำลังบันทึก...' : 'คลาวด์พร้อม'}
                </span>
              </div>
            )}

            {/* User Profile or Login Button */}
            {user ? (
              <button
                id="user-profile-btn"
                onClick={onOpenProfileModal}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Profile'} 
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {(profile?.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 max-w-[110px] md:max-w-[130px] truncate leading-tight">
                    {profile?.displayName || user.displayName || 'นักเรียน'}
                  </div>
                  <div className="text-[10px] text-slate-500 max-w-[110px] md:max-w-[130px] truncate">
                    {user.email}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>
            ) : (
              <button
                id="open-login-btn"
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ / ลงทะเบียน</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        {user && (
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-0.5 text-[11px] py-1 px-1.5 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              แดชบอร์ด
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex flex-col items-center gap-0.5 text-[11px] py-1 px-1.5 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'courses' ? 'text-blue-600 font-bold' : 'text-slate-500'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              คอร์สติว
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex flex-col items-center gap-0.5 text-[11px] py-1 px-1.5 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'materials' ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              ชีท & ยูทูป
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center gap-0.5 text-[11px] py-1 px-1.5 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'calendar' ? 'text-purple-600 font-bold' : 'text-slate-500'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              ปฏิทิน
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex flex-col items-center gap-0.5 text-[11px] py-1 px-1.5 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'portfolio' ? 'text-rose-600 font-bold' : 'text-slate-500'
              }`}
            >
              <FolderHeart className="w-4 h-4" />
              Portfolio
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`flex flex-col items-center gap-0.5 text-[11px] py-1 px-1.5 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'news' ? 'text-orange-500 font-bold' : 'text-slate-500'
              }`}
            >
              <Users className="w-4 h-4" />
              ชุมชน
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
