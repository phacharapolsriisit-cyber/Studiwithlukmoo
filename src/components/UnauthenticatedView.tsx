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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-orange-500/20">
          <GraduationCap className="w-9 h-9" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-semibold">
            <Cloud className="w-3.5 h-3.5 text-amber-600" />
            <span>เชื่อมต่อกับ Cloud Firestore: lukmoo-tutor</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ยินดีต้อนรับสู่ <span className="text-amber-600">Lukmoo Tutor</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
            ระบบจัดเก็บคอร์สติวแต่ละวิชา ชีทเรียน สรุปสูตร ดูคลิป YouTube ในเว็บได้ทันที 
            พร้อมปฏิทินเตือนวันสอบและกำหนดส่งงาน
          </p>
        </div>

        {/* LINE / Facebook in-app browser alert if detected */}
        {isInAppBrowser && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm max-w-md mx-auto text-left space-y-1.5 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Smartphone className="w-4 h-4 text-amber-600" />
              <span>ตรวจพบว่าเปิดผ่าน LINE / Facebook บนมือถือ</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              หากต้องการล็อกอินด้วย Google แนะนำให้กดปุ่ม <strong>⋮</strong> ที่มุมจอ แล้วเลือก <strong>"เปิดใน Safari / Chrome"</strong> หรือกดปุ่ม <strong>"เข้าใช้งานโหมดทดลอง (Demo Student)"</strong> ด้านล่างเพื่อเริ่มใช้งานได้ทันที
            </p>
          </div>
        )}

        {/* Security / Privacy guarantee box */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm max-w-md mx-auto text-left space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>ระบบความปลอดภัยและการแยกข้อมูลส่วนบุคคล</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            ตามข้อกำหนดความปลอดภัย คอร์สติวและงานทั้งหมดจะถูกแยกเป็นส่วนตัวเฉพาะเจ้าของบัญชีเท่านั้น กรุณาเข้าสู่ระบบเพื่อเข้าถึงข้อมูลของคุณ
          </p>
        </div>

        {/* Primary and Secondary CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="login-landing-btn"
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบ / ลงทะเบียน</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            id="demo-landing-btn"
            onClick={() => loginAsDemo()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>เข้าใช้งานโหมดทดลอง (Demo Student)</span>
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-8 text-left max-w-2xl mx-auto">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">จัดเก็บคอร์ส & ชีท</h3>
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
