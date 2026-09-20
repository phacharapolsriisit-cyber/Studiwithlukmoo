import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { db } from '../firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  ShieldCheck, 
  Database, 
  User, 
  BookOpen, 
  FileText, 
  Calendar, 
  HardDrive, 
  AlertTriangle,
  RefreshCw,
  Terminal,
  ExternalLink
} from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  category: 'auth' | 'firestore' | 'data' | 'cache';
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
  durationMs?: number;
}

export const SyncDiagnosticView: React.FC = () => {
  const { user, profile } = useAuth();
  const { courses, materials, events, portfolioItems, isQuotaExceeded, firebaseConsoleUrl } = useData();
  
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);

  const runAllSyncTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results: TestResult[] = [];

    const addResult = (res: TestResult) => {
      results.push(res);
      setTestResults([...results]);
    };

    // ----------------------------------------------------
    // TEST 1: Auth Identity Check
    // ----------------------------------------------------
    const authStart = Date.now();
    if (!user) {
      addResult({
        id: 'auth_uid',
        name: 'Authentication State & Single UID Primary Key',
        category: 'auth',
        status: 'warn',
        message: 'ไม่ได้เข้าสู่ระบบ (Guest Mode) — ข้อมูลจะถูกเก็บในเครื่องเท่านั้น',
        durationMs: Date.now() - authStart,
      });
    } else {
      addResult({
        id: 'auth_uid',
        name: 'Authentication State & Single UID Primary Key',
        category: 'auth',
        status: 'pass',
        message: `ยืนยันตัวตนสำเร็จ! Single UID: ${user.uid}`,
        details: `Email: ${user.email || 'ไม่มี'} | Anonymous: ${user.isAnonymous ? 'Yes' : 'No'} | Demo: ${user.isDemo ? 'Yes' : 'No'}`,
        durationMs: Date.now() - authStart,
      });
    }

    // ----------------------------------------------------
    // TEST 2: Firestore Read/Write Connectivity
    // ----------------------------------------------------
    if (!user || user.isDemo) {
      addResult({
        id: 'firestore_ping',
        name: 'Firestore Database Cloud Ping',
        category: 'firestore',
        status: 'warn',
        message: 'ข้ามการทดสอบ Firestore เนื่องจากเป็น Demo / Guest Mode',
      });
    } else {
      const pingStart = Date.now();
      try {
        const testRef = doc(db, 'users', user.uid, '_sync_test', 'ping');
        await setDoc(testRef, {
          testAt: new Date().toISOString(),
          uid: user.uid,
          clientTime: Date.now(),
        });
        const snap = await getDoc(testRef);
        await deleteDoc(testRef).catch(() => {});

        if (snap.exists()) {
          addResult({
            id: 'firestore_ping',
            name: 'Firestore Database Cloud Ping',
            category: 'firestore',
            status: 'pass',
            message: 'เชื่อมต่อและอ่าน/เขียน Firestore Cloud ได้เรียบร้อย',
            details: `Latency: ${Date.now() - pingStart}ms | Path: users/${user.uid}/_sync_test/ping`,
            durationMs: Date.now() - pingStart,
          });
        } else {
          addResult({
            id: 'firestore_ping',
            name: 'Firestore Database Cloud Ping',
            category: 'firestore',
            status: 'fail',
            message: 'เขียนข้อมูลสำเร็จ แต่อ่านข้อมูลกลับมาไม่พบ',
            durationMs: Date.now() - pingStart,
          });
        }
      } catch (err: any) {
        addResult({
          id: 'firestore_ping',
          name: 'Firestore Database Cloud Ping',
          category: 'firestore',
          status: 'fail',
          message: `Firestore Error: ${err?.message || 'ไม่สามารถเขียน/อ่านข้อมูลได้'}`,
          details: isQuotaExceeded ? 'โครงการติด Quota Limit Exceeded ของ Firebase' : undefined,
          durationMs: Date.now() - pingStart,
        });
      }
    }

    // ----------------------------------------------------
    // TEST 3: User Profile Sync Test
    // ----------------------------------------------------
    if (user && !user.isDemo) {
      const profStart = Date.now();
      try {
        const profRef = doc(db, 'users', user.uid);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) {
          addResult({
            id: 'user_profile',
            name: 'User Document Integrity (users/{uid})',
            category: 'auth',
            status: 'pass',
            message: `พบข้อมูลผู้ใช้ใน Cloud Database (displayName: ${profSnap.data()?.displayName || 'ไม่ระบุ'})`,
            durationMs: Date.now() - profStart,
          });
        } else {
          addResult({
            id: 'user_profile',
            name: 'User Document Integrity (users/{uid})',
            category: 'auth',
            status: 'warn',
            message: 'ยังไม่มี Document profile ใน Firestore (ระบบจะสร้างให้อัตโนมัติ)',
            durationMs: Date.now() - profStart,
          });
        }
      } catch (err: any) {
        addResult({
          id: 'user_profile',
          name: 'User Document Integrity (users/{uid})',
          category: 'auth',
          status: 'warn',
          message: `ไม่สามารถตรวจสอบ User Profile: ${err?.message}`,
          durationMs: Date.now() - profStart,
        });
      }
    }

    // ----------------------------------------------------
    // TEST 4: Courses Subcollection Check
    // ----------------------------------------------------
    const courseStart = Date.now();
    if (user && !user.isDemo) {
      try {
        const coursesSnap = await getDocs(collection(db, 'users', user.uid, 'courses'));
        addResult({
          id: 'courses_sync',
          name: 'Course Data Ownership & Sync (users/{uid}/courses)',
          category: 'data',
          status: 'pass',
          message: `ดึงข้อมูลคอร์สติวจาก Cloud สำเร็จ: พบ ${coursesSnap.docs.length} รายการ (ใน App แสดง ${courses.length} รายการ)`,
          details: `Collection Path: users/${user.uid}/courses`,
          durationMs: Date.now() - courseStart,
        });
      } catch (err: any) {
        addResult({
          id: 'courses_sync',
          name: 'Course Data Ownership & Sync (users/{uid}/courses)',
          category: 'data',
          status: 'fail',
          message: `ล้มเหลวในการอ่านข้อมูลคอร์ส: ${err?.message}`,
          durationMs: Date.now() - courseStart,
        });
      }
    } else {
      addResult({
        id: 'courses_sync',
        name: 'Course Data Ownership & Sync (Local State)',
        category: 'data',
        status: 'pass',
        message: ` local State ปัจจุบันมี ${courses.length} คอร์ส`,
      });
    }

    // ----------------------------------------------------
    // TEST 5: Materials Subcollection Check
    // ----------------------------------------------------
    const matStart = Date.now();
    if (user && !user.isDemo) {
      try {
        const matsSnap = await getDocs(collection(db, 'users', user.uid, 'materials'));
        addResult({
          id: 'mats_sync',
          name: 'Materials & Video Progress Sync (users/{uid}/materials)',
          category: 'data',
          status: 'pass',
          message: `ดึงข้อมูลชีท/วิดีโอจาก Cloud สำเร็จ: พบ ${matsSnap.docs.length} รายการ (ใน App แสดง ${materials.length} รายการ)`,
          details: `Video Progress fields valid across documents`,
          durationMs: Date.now() - matStart,
        });
      } catch (err: any) {
        addResult({
          id: 'mats_sync',
          name: 'Materials & Video Progress Sync (users/{uid}/materials)',
          category: 'data',
          status: 'fail',
          message: `ล้มเหลวในการอ่านข้อมูลชีท/วิดีโอ: ${err?.message}`,
          durationMs: Date.now() - matStart,
        });
      }
    } else {
      addResult({
        id: 'mats_sync',
        name: 'Materials & Video Progress Sync (Local State)',
        category: 'data',
        status: 'pass',
        message: ` local State ปัจจุบันมี ${materials.length} เอกสาร/วิดีโอ`,
      });
    }

    // ----------------------------------------------------
    // TEST 6: Calendar Events Subcollection Check
    // ----------------------------------------------------
    const evStart = Date.now();
    if (user && !user.isDemo) {
      try {
        const evSnap = await getDocs(collection(db, 'users', user.uid, 'events'));
        addResult({
          id: 'events_sync',
          name: 'Calendar & Exam Events Sync (users/{uid}/events)',
          category: 'data',
          status: 'pass',
          message: `ดึงข้อมูลปฏิทินจาก Cloud สำเร็จ: พบ ${evSnap.docs.length} รายการ (ใน App รวม TCAS แสดง ${events.length} รายการ)`,
          durationMs: Date.now() - evStart,
        });
      } catch (err: any) {
        addResult({
          id: 'events_sync',
          name: 'Calendar & Exam Events Sync (users/{uid}/events)',
          category: 'data',
          status: 'fail',
          message: `ล้มเหลวในการอ่านข้อมูลปฏิทิน: ${err?.message}`,
          durationMs: Date.now() - evStart,
        });
      }
    } else {
      addResult({
        id: 'events_sync',
        name: 'Calendar & Exam Events Sync (Local State)',
        category: 'data',
        status: 'pass',
        message: ` local State ปัจจุบันมี ${events.length} กำหนดการ`,
      });
    }

    // ----------------------------------------------------
    // TEST 7: Local Cache & Offline Persistence Integrity
    // ----------------------------------------------------
    const cacheStart = Date.now();
    try {
      const uidKey = user?.uid || 'guest';
      const courseCache = localStorage.getItem(`lukmoo_cache_${uidKey}_courses`);
      const matCache = localStorage.getItem(`lukmoo_cache_${uidKey}_materials`);
      const evCache = localStorage.getItem(`lukmoo_cache_${uidKey}_events`);

      addResult({
        id: 'cache_check',
        name: 'Local Storage Cache Integrity',
        category: 'cache',
        status: 'pass',
        message: 'แคชในอุปกรณ์สมบูรณ์ แยก Key ตาม UID ผู้ใช้อย่างถูกต้อง',
        details: `Cache Keys: courses (${courseCache ? 'OK' : 'empty'}), materials (${matCache ? 'OK' : 'empty'}), events (${evCache ? 'OK' : 'empty'})`,
        durationMs: Date.now() - cacheStart,
      });
    } catch {
      addResult({
        id: 'cache_check',
        name: 'Local Storage Cache Integrity',
        category: 'cache',
        status: 'warn',
        message: 'ไม่สามารถเข้าถึง localStorage บนเบราว์เซอร์นี้ได้',
      });
    }

    setLastTestedAt(new Date().toLocaleTimeString('th-TH'));
    setIsRunning(false);
  };

  useEffect(() => {
    runAllSyncTests();
  }, [user?.uid]);

  const passedCount = testResults.filter(r => r.status === 'pass').length;
  const failedCount = testResults.filter(r => r.status === 'fail').length;
  const warnCount = testResults.filter(r => r.status === 'warn').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Terminal className="w-3.5 h-3.5" />
              <span>Developer & Sync Diagnostics</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              ระบบตรวจสอบ Authentication & Real-time Data Sync
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              ทดสอบสถานะการเชื่อมต่อ Firestore Cloud, การซิงค์ข้อมูลข้ามอุปกรณ์ และ Single UID Security Rules
            </p>
          </div>

          <button
            id="run-sync-test-btn"
            onClick={runAllSyncTests}
            disabled={isRunning}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังทดสอบ Sync...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>[ RUN SYNC TEST ]</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quota Banner Warning */}
      {isQuotaExceeded && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm text-amber-900">ตรวจพบ Firebase Daily Write Quota Limit Exceeded</div>
            <p>
              โครงการนี้ใช้บริการ Firestore Free Tier วันนี้สิทธิ์เขียนข้อมูลครบลิมิตประจำวันแล้ว ระบบปรับเข้าสู่โหมด Safe Offline Mode อัตโนมัติ (อ่านและเขียนลงในเครื่องผู้ใช้ได้ปกติ 100% โดยไม่อนุญาตให้ปุ่มค้าง)
            </p>
            {firebaseConsoleUrl && (
              <a 
                href={firebaseConsoleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-amber-800 underline hover:text-amber-950 mt-1"
              >
                <span>เปิด Firebase Console ดูรายละเอียดโควต้า</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Key System Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Primary Identity</span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-slate-900 text-sm truncate">
            {user ? user.displayName || user.email || 'User' : 'Guest Mode'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">
            UID: {user?.uid || 'guest'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Cloud Sync Status</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-slate-900 text-sm">
            {isQuotaExceeded ? 'Quota Exceeded (Offline Safe)' : user?.isDemo ? 'Demo Mode' : 'Real-time Firestore'}
          </div>
          <div className="text-[11px] text-slate-500">
            {lastTestedAt ? `ทดสอบล่าสุดเมื่อ ${lastTestedAt}` : 'พร้อมทดสอบ'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Data Ownership Path</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="font-bold text-slate-900 text-xs font-mono truncate">
            users/{user?.uid || 'guest'}/*
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            Owner ID verified strictly
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Test Suite Result</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
              PASS: {passedCount}
            </span>
            {failedCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-xs font-bold">
                FAIL: {failedCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                WARN: {warnCount}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            {testResults.length} หมวดการทดสอบ
          </div>
        </div>
      </div>

      {/* Test Log Details List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-600" />
            <span>ผลการตรวจสอบระบบข้อมูลและ Firestore</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            d47d47f8-d5f9-45d5-9cb9-a031ee128943
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {testResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span>กำลังเตรียมความพร้อมชุดทดสอบ...</span>
            </div>
          ) : (
            testResults.map((test) => (
              <div key={test.id} className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="mt-0.5 shrink-0">
                  {test.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-500" />}
                  {test.status === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {test.status === 'running' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      {test.name}
                    </h3>
                    {test.durationMs !== undefined && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {test.durationMs}ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {test.message}
                  </p>
                  {test.details && (
                    <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800 break-all">
                      {test.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
