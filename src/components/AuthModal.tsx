import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  GraduationCap, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  Cloud,
  CheckCircle2,
  Play,
  ArrowRight,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  canDismiss = true 
}) => {
  const { loginWithGoogle, loginWithGoogleRedirect, loginWithEmail, registerWithEmail, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMobileDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isInAppBrowser = typeof navigator !== 'undefined' && /Line|FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(navigator.userAgent);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('หน้าต่างเข้าสู่ระบบของ Google ถูกปิดก่อนทำรายการสำเร็จ บนมือถือสามารถกดปุ่ม "เข้าสู่ระบบ Google (แบบเปลี่ยนหน้า)" หรือกด "เข้าใช้งานแบบ Demo Student" ได้เลย');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('เบราว์เซอร์บนมือถือบล็อกป๊อปอัป กรุณากดปุ่ม "เข้าสู่ระบบ Google (แบบเปลี่ยนหน้า)" หรือใช้ปุ่ม "Demo Student" ด้านล่าง');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage('โดเมนนี้ยังไม่ได้เพิ่มใน Authorized Domains ของ Firebase Console (lukmoo-tutor) กรุณากดปุ่ม "เข้าใช้งานแบบ Demo Student" ด้านล่างเพื่อเข้าสู่ระบบทันที');
      } else {
        setErrorMessage(err?.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ คุณสามารถกดปุ่ม "เข้าใช้งานแบบ Demo Student" เพื่อเข้าใช้งานได้ทันที');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await loginWithGoogleRedirect();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage('โดเมนนี้ยังไม่ได้เพิ่มใน Authorized Domains ของ Firebase Console กรุณาใช้ปุ่ม "เข้าใช้งานแบบ Demo Student" ด้านล่างเพื่อเข้าสู่ระบบทันที');
      } else {
        setErrorMessage(err?.message || 'ไม่สามารถเปิดหน้าล็อกอินของ Google ได้ กรุณาลองใช้ปุ่ม "เข้าใช้งานแบบ Demo Student"');
      }
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          setErrorMessage('กรุณาระบุชื่อของคุณ');
          setIsSubmitting(false);
          return;
        }
        await registerWithEmail(email, password, displayName.trim());
      }
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        setErrorMessage('ผู้ให้บริการ Email/Password ยังไม่ได้เปิดใช้งานใน Firebase Console สำหรับโปรเจกต์ lukmoo-tutor กรุณาใช้ปุ่ม "เข้าสู่ระบบด้วย Google" หรือกด "เข้าใช้งานแบบ Demo Student" ด้านล่างเพื่อเริ่มใช้งานได้ทันที');
      } else if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง หรือสร้างบัญชีใหม่');
      } else if (err?.code === 'auth/email-already-in-use') {
        setErrorMessage('อีเมลนี้ถูกใช้งานแล้ว กรุณาสลับไปที่แท็บ "เข้าสู่ระบบ"');
      } else if (err?.code === 'auth/invalid-email') {
        setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกใหม่อีกครั้ง');
      } else {
        setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await loginAsDemo();
      onClose();
    } catch (err: any) {
      setErrorMessage('เข้าสู่ระบบแบบ Demo ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="auth-modal-card"
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button (if dismissible) */}
        {canDismiss && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
            title="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white text-center relative overflow-hidden">
          <div className="inline-flex p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner mb-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Lukmoo Tutor
          </h2>
          <p className="text-blue-100 text-xs mt-1 max-w-xs mx-auto">
            เข้าสู่ระบบเพื่อจัดการคอร์สติว ชีทเรียน วิดีโอยูทูป และปฏิทินสอบส่วนบุคคล
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-medium text-white backdrop-blur-xs">
            <Cloud className="w-3.5 h-3.5 text-blue-200" />
            <span>เชื่อมต่อกับ Firebase: lukmoo-tutor</span>
          </div>
        </div>

        <div className="p-6">
          {/* Mobile In-App Browser (LINE / Facebook) Notice */}
          {isInAppBrowser && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-blue-900">ตรวจพบการเปิดผ่านแอป LINE / Facebook:</span>
                <p className="text-[11px] text-blue-800">
                  Google ไม่อนุญาตให้ล็อกอินในเบราว์เซอร์ของแอป (Error 403 Disallowed Useragent)
                </p>
                <div className="text-[11px] font-medium text-slate-700 space-y-0.5 pt-1">
                  <div>👉 <strong>วิธีที่ 1:</strong> แตะปุ่ม <strong>⋮</strong> หรือแชร์ที่มุมจอ แล้วเลือก <strong>"เปิดใน Safari / Chrome"</strong></div>
                  <div>👉 <strong>วิธีที่ 2:</strong> หรือกดปุ่ม <strong>"เข้าใช้งานแบบ Demo Student"</strong> ด้านล่างเพื่อเริ่มใช้งานได้ทันที</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice with clear guidance */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-shake leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-2 flex-1">
                <span className="font-semibold block text-red-800">แจ้งเตือน:</span>
                <p className="text-slate-700">{errorMessage}</p>

                {/* Instant 1-Click Action if Email/Password is not enabled */}
                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>กดตรงนี้เพื่อเข้าใช้งานทันที (Demo Student)</span>
                  </button>
                  {isMobileDevice && (
                    <button
                      type="button"
                      onClick={handleGoogleRedirectLogin}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>ลอง Google แบบเปลี่ยนหน้า (Redirect)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sign-In Buttons */}
          <div className="space-y-2">
            <button
              id="google-login-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>

            {/* Mobile-Friendly Alternative: Redirect without Popup */}
            {isMobileDevice && (
              <button
                id="google-redirect-login-btn"
                type="button"
                onClick={handleGoogleRedirectLogin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 font-medium text-xs transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>เข้าสู่ระบบด้วย Google (แบบเปลี่ยนหน้า ไม่ใช้ป๊อปอัป)</span>
              </button>
            )}
          </div>

          {/* Quick Demo Student Button */}
          <div className="mt-3">
            <button
              id="demo-login-btn"
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 text-blue-900 font-semibold text-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>เข้าใช้งานทันทีในฐานะนักเรียน (Demo Student)</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">หรือใช้อีเมลและรหัสผ่าน</span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ลงทะเบียนใหม่
            </button>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อ-นามสกุล / ชื่อเล่น
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="เช่น น้องแพรว หรือ พี่ลูกหมู"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                อีเมล (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting
                ? 'กำลังดำเนินการ...'
                : mode === 'login'
                ? 'เข้าสู่ระบบ'
                : 'สร้างบัญชีผู้ใช้งาน'}
            </button>
          </form>

          {/* Privacy & Cloud sync note */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              ข้อมูลคอร์สติวและปฏิทินสอบจะถูกแยกเป็นส่วนตัวเฉพาะบัญชีของคุณ และบันทึกอัตโนมัติ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
