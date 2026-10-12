import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import Logo from './Logo';
import { AppContext } from '../App';
import { isSmartMatch } from '../utils/searchUtils';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const REMEMBER_SUPERVISOR_KEY = 'hafiz_rem_sup';
const REMEMBER_IMMUNIZATION_KEY = 'hafiz_rem_imm';
const REMEMBER_INSTITUTION_PREFIX = 'hafiz_rem_inst_';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { users, supervisorPassword, immunizationPassword, appName, darkMode, toggleDarkMode, firebaseConnectionStatus } = context;

  const [mode, setMode] = useState<'initial' | 'supervisor' | 'institution' | 'immunization'>('initial');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [institutionSearchTerm, setInstitutionSearchTerm] = useState('');
  
  // Institution Login State
  const [selectedInstitution, setSelectedInstitution] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberPin, setRememberPin] = useState(false);
  
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Filter users by INSTITUTION role
  const institutions = users.filter(u => u.role === UserRole.INSTITUTION);

  useEffect(() => {
    if (mode === 'supervisor') {
      const saved = localStorage.getItem(REMEMBER_SUPERVISOR_KEY);
      if (saved) {
        setPassword(saved);
        setRememberMe(true);
      } else {
        setPassword('');
        setRememberMe(false);
        setTimeout(() => passwordInputRef.current?.focus(), 50);
      }
    } else if (mode === 'immunization') {
      const saved = localStorage.getItem(REMEMBER_IMMUNIZATION_KEY);
      if (saved) {
        setPassword(saved);
        setRememberMe(true);
      } else {
        setPassword('');
        setRememberMe(false);
        setTimeout(() => passwordInputRef.current?.focus(), 50);
      }
    }
  }, [mode]);

  useEffect(() => {
    if (selectedInstitution) {
        const savedPin = localStorage.getItem(`${REMEMBER_INSTITUTION_PREFIX}${selectedInstitution.id}`);
        if (savedPin) {
            setPinInput(savedPin);
            setRememberPin(true);
        } else {
            setPinInput('');
            setRememberPin(false);
        }
        setTimeout(() => pinInputRef.current?.focus(), 50);
    }
  }, [selectedInstitution]);

  const handleLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'supervisor') {
      if (password.trim() === supervisorPassword.trim()) {
        if (rememberMe) localStorage.setItem(REMEMBER_SUPERVISOR_KEY, password);
        else localStorage.removeItem(REMEMBER_SUPERVISOR_KEY);
        
        const supervisor = users.find(u => u.role === UserRole.SUPERVISOR);
        onLogin(supervisor || { id: 1, name: 'المشرف العام', role: UserRole.SUPERVISOR, updatedAt: Date.now() });
      } else {
        setError('كلمة مرور المشرف غير صحيحة');
      }
    } else if (mode === 'immunization') {
        if (password.trim() === immunizationPassword.trim()) {
            if (rememberMe) localStorage.setItem(REMEMBER_IMMUNIZATION_KEY, password);
            else localStorage.removeItem(REMEMBER_IMMUNIZATION_KEY);
            onLogin({ id: 999, name: 'قسم تعزيز الصحة', role: UserRole.IMMUNIZATION, updatedAt: Date.now() });
        } else {
            setError('كلمة مرور قسم تعزيز الصحة غير صحيحة');
        }
    }
  };

  const handleInstitutionPinSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedInstitution) return;
      const userPin = selectedInstitution.pin || '123';
      if (pinInput.trim() === userPin.trim()) {
          if (rememberPin) localStorage.setItem(`${REMEMBER_INSTITUTION_PREFIX}${selectedInstitution.id}`, pinInput);
          else localStorage.removeItem(`${REMEMBER_INSTITUTION_PREFIX}${selectedInstitution.id}`);
          onLogin(selectedInstitution);
      } else {
          setError('رمز الدخول (PIN) غير صحيح');
      }
  };

  const filteredInstitutions = useMemo(() => {
    return institutions
      .filter(t => isSmartMatch(t.name, institutionSearchTerm) || isSmartMatch(t.state || '', institutionSearchTerm))
      .sort((a, b) => (a.state || '').localeCompare(b.state || '', 'ar') || a.name.localeCompare(b.name, 'ar'));
  }, [institutions, institutionSearchTerm]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full p-1.5 xs:p-2.5 sm:p-6 min-h-[100dvh] bg-gradient-to-br from-slate-100 via-blue-50/60 to-slate-200/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Left Toolbar */}
      <div className="absolute top-3 left-3 sm:top-6 sm:left-6 flex items-center gap-2 sm:gap-3 z-50">
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 backdrop-blur-sm"
          title="حالة اتصال قاعدة بيانات Firebase السحابية المباشرة"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${firebaseConnectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-amber-500 animate-ping'}`}></span>
          <span className="hidden xs:inline">{firebaseConnectionStatus === 'connected' ? 'مزامنة مباشرة ⚡' : 'جاري الاتصال...'}</span>
        </div>
        <button 
            onClick={toggleDarkMode} 
            className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/90 shadow-md dark:bg-gray-800 dark:text-yellow-400 border border-gray-200 dark:border-gray-700 transition-all active:scale-90 text-base sm:text-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
            aria-label="تبديل المظهر"
        >
            {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="w-full sm:max-w-md min-h-[calc(100dvh-16px)] sm:min-h-fit flex flex-col justify-center items-center p-5 sm:p-8 md:p-10 bg-gradient-to-b from-slate-50 to-blue-50/40 rounded-2xl sm:rounded-3xl text-center golden-frame dark:from-slate-900 dark:to-slate-900/95 animate-fade-in relative shadow-2xl transition-all my-auto">
        <div className="w-full max-w-sm my-auto flex flex-col items-center">
          <Logo className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 mx-auto -mt-6 sm:-mt-10 mb-2 sm:mb-3 drop-shadow-2xl transform hover:scale-105 transition-transform duration-300" />
          <h1 className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-blue-300 mb-1 leading-tight">{appName || 'برنامج الإجادة المؤسسية'}</h1>
          <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">قسم تعزيز الصحة</p>
          
          {mode === 'initial' && (
            <div className="w-full space-y-3 sm:space-y-4">
              <button 
                  onClick={() => setMode('institution')} 
                  className="w-full py-3.5 px-4 text-base sm:text-lg font-black text-blue-900 bg-white rounded-xl sm:rounded-2xl border-2 border-blue-700 hover:bg-blue-50 transition-all dark:bg-slate-800 dark:text-blue-200 dark:border-blue-500 shadow-sm active:scale-98 min-h-[50px] flex items-center justify-center gap-2"
              >
                  <span>🏢 المؤسسات الصحية</span>
              </button>
              <button 
                  onClick={() => setMode('immunization')} 
                  className="w-full py-3.5 px-4 text-base sm:text-lg font-black text-white bg-blue-800 rounded-xl sm:rounded-2xl hover:bg-blue-900 transition-all shadow-md active:scale-98 min-h-[50px] flex items-center justify-center gap-2 border border-blue-900"
              >
                  <span>🏢 قسم تعزيز الصحة</span>
              </button>
            </div>
          )}

          {(mode === 'supervisor' || mode === 'immunization') && (
            <form onSubmit={handleLoginAttempt} className="w-full space-y-4 sm:space-y-6 animate-fade-in">
              <h3 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white border-b-2 border-blue-700 pb-2">
                  {mode === 'supervisor' ? 'دخول المشرف العام' : 'دخول قسم تعزيز الصحة'}
              </h3>
              
              <div className="space-y-2.5 text-right">
                <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      className="input-style text-center text-xl sm:text-2xl tracking-widest font-bold pr-4 pl-12"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg"
                    >
                      {showPassword ? '👁️' : '🔒'}
                    </button>
                </div>

                <div className="flex items-center justify-center px-1 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={e => setRememberMe(e.target.checked)} 
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-800" 
                    />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">تذكر كلمة المرور</span>
                  </label>
                </div>
              </div>

              {error && <p className="text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 text-sm">{error}</p>}
              
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setMode('initial'); setError(''); setPassword(''); }} 
                  className="flex-1 py-3 text-base font-bold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition"
                >
                  رجوع
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-3 text-base font-bold text-white bg-blue-800 rounded-xl shadow-lg hover:bg-blue-900 transition active:scale-95"
                >
                  تسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {mode === 'institution' && !selectedInstitution && (
            <div className="w-full space-y-4 animate-fade-in">
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">اختر المؤسسة الصحية</h3>
              <input 
                  type="text" 
                  placeholder="البحث باسم المؤسسة أو الولاية..." 
                  value={institutionSearchTerm} 
                  onChange={e => setInstitutionSearchTerm(e.target.value)} 
                  className="input-style text-sm font-semibold" 
              />
              
              <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-2xl p-1 bg-gray-50 dark:bg-slate-800 custom-scrollbar">
                {filteredInstitutions.map(t => (
                  <button 
                      key={t.id} 
                      onClick={() => setSelectedInstitution(t)} 
                      className="w-full text-right p-3 hover:bg-blue-800 hover:text-white rounded-xl font-bold text-base transition-colors truncate flex justify-between items-center group"
                  >
                      <span>{t.name}</span>
                      {t.state && (
                          <span className="text-xs bg-gray-200 group-hover:bg-blue-900 group-hover:text-blue-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-normal">
                              {t.state}
                          </span>
                      )}
                  </button>
                ))}
                {filteredInstitutions.length === 0 && (
                    <div className="p-4 text-gray-400 text-sm">لا توجد مؤسسات مطابقة</div>
                )}
              </div>
              
              <button 
                  onClick={() => setMode('initial')} 
                  className="w-full py-3 text-base font-bold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition"
              >
                  رجوع
              </button>
            </div>
          )}

          {mode === 'institution' && selectedInstitution && (
               <form onSubmit={handleInstitutionPinSubmit} className="w-full space-y-5 animate-fade-in">
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200 dark:border-blue-800">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block mb-0.5">{selectedInstitution.state || 'مؤسسة صحية'}</span>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">{selectedInstitution.name}</h3>
                  </div>

                  <div className="space-y-2.5 text-right">
                    <div className="relative">
                        <input 
                            ref={pinInputRef} 
                            type={showPin ? "text" : "password"} 
                            value={pinInput} 
                            onChange={e => setPinInput(e.target.value)} 
                            placeholder="أدخل رمز الدخول (PIN)" 
                            className="input-style text-center text-xl tracking-widest font-bold pr-4 pl-12" 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPin(!showPin)} 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg"
                        >
                            {showPin ? '👁️' : '🔒'}
                        </button>
                    </div>

                    <div className="flex items-center justify-center px-1 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={rememberPin} 
                                onChange={e => setRememberPin(e.target.checked)} 
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-800" 
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">تذكر الرمز</span>
                        </label>
                    </div>
                  </div>

                  {error && <p className="text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200 text-sm">{error}</p>}
                  
                  <div className="flex gap-3">
                      <button 
                          type="button" 
                          onClick={() => { setSelectedInstitution(null); setError(''); }} 
                          className="flex-1 py-3 text-base font-bold bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 transition"
                      >
                          تغيير المؤسسة
                      </button>
                      <button 
                          type="submit" 
                          className="flex-[2] py-3 text-base font-bold text-white bg-blue-800 rounded-xl shadow-lg hover:bg-blue-900 transition active:scale-95"
                      >
                          دخول
                      </button>
                  </div>
               </form>
          )}

          <div className="mt-6 text-[11px] font-bold text-gray-400 dark:text-gray-500 select-none">
            برنامج الإجادة المؤسسية - قسم تعزيز الصحة
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
