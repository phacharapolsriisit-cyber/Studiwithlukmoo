import React from 'react';
import { 
  GraduationCap, 
  Youtube, 
  FileText, 
  Calendar as CalendarIcon, 
  Cloud, 
  Lock, 
  LogIn, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UnauthenticatedViewProps {
  onOpenAuthModal: () => void;
}

export const UnauthenticatedView: React.FC<UnauthenticatedViewProps> = ({ onOpenAuthModal }) => {
  const { loginAsDemo } = useAuth();
  const isInAppBrowser = typeof navigator !== 'undefined' && /Line|FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(navigator.userAgent);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xs">
          <GraduationCap className="w-8 h-8" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>เชื่อมต่อกับ Cloud Firestore</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            ยินดีต้อนรับสู่ <span className="text-blue-600">Lukmoo Tutor</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
            ระบบจัดเก็บคอร์สติวแต่ละวิชา ชีทเรียน สรุปสูตร ดูคลิป YouTube ในเว็บได้ทันที 
            พร้อมปฏิทินเตือนวันสอบและกำหนดส่งงาน
          </p>
        </div>

        {/* LINE / Facebook in-app browser alert if detected */}
        {isInAppBrowser && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-left space-y-1.5 text-xs text-blue-950 max-w-md mx-auto">
            <div className="flex items-center gap-2 font-semibold text-blue-900">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>ตรวจพบว่าเปิดผ่าน LINE / Facebook บนมือถือ</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              หากต้องการล็อกอินด้วย Google แนะนำให้กดปุ่ม <strong>⋮</strong> ที่มุมจอ แล้วเลือก <strong>"เปิดใน Safari / Chrome"</strong> หรือกดปุ่ม <strong>"เข้าใช้งานโหมดทดลอง (Demo Student)"</strong> ด้านล่างเพื่อเริ่มใช้งานได้ทันที
            </p>
          </div>
        )}

        {/* Security / Privacy guarantee box */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs max-w-md mx-auto text-left space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>ระบบซิงค์ข้อมูลและคลาวด์</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            กรุณาเข้าสู่ระบบเพื่อ <strong>ซิงค์ข้อมูลคอร์สเรียนและงานต่างๆ ของคุณไปยังทุกอุปกรณ์</strong> (คอมพิวเตอร์, มือถือ, แท็บเล็ต) อัตโนมัติ ข้อมูลจะถูกแยกเป็นส่วนตัวเฉพาะเจ้าของบัญชีเท่านั้น
          </p>
        </div>

        {/* Primary and Secondary CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="login-landing-btn"
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบ / ลงทะเบียน</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            id="demo-landing-btn"
            onClick={() => loginAsDemo()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>เข้าใช้งานโหมดทดลอง (Demo Student)</span>
          </button>
          <p className="text-[10px] text-slate-400 mt-1 sm:mt-0">
            *โหมดทดลองจะไม่เชื่อมต่อข้อมูลกับอุปกรณ์อื่น
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-8 text-left max-w-2xl mx-auto">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-slate-800">จัดเก็บคอร์ส & ชีท</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              เพิ่มวิชาเองได้ไม่จำกัด อัปโหลดชีทงาน และลากแถบวิชาเพื่อจัดลำดับได้
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <Youtube className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">ดูคลิป YouTube ในเว็บ</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              แปะลิงก์ YouTube แล้วเปิดรับชมได้เลย พร้อมระบบจดโน้ตสรุปประจำคลิป
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">ปฏิทินวันสอบ & ส่งงาน</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              นับถอยหลังวันสอบ แจ้งเตือนงานด่วน และเห็นเฉพาะงานของตัวเอง
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
