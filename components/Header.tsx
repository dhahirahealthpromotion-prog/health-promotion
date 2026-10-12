import React, { useContext } from 'react';
import { User, UserRole } from '../types';
import Logo from './Logo';
import { AppContext } from '../App';

interface HeaderProps {
  user: User;
  onShowHelp: () => void;
  onInitiateLogoutCheck: () => void;
  onShowMobileInstallModal: () => void;
  onShowChangePassword: () => void;
  onGoToChoiceScreen?: () => void; 
  onShowDbHelp?: () => void;
}

const roleMap = {
  [UserRole.SUPERVISOR]: 'المشرف العام',
  [UserRole.INSTITUTION]: 'المؤسسة الصحية',
  [UserRole.IMMUNIZATION]: 'قسم تعزيز الصحة',
};

const Header: React.FC<HeaderProps> = ({ user, onShowHelp, onInitiateLogoutCheck, onShowMobileInstallModal, onShowChangePassword, onGoToChoiceScreen, onShowDbHelp }) => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { appName, darkMode, toggleDarkMode, firebaseConnectionStatus } = context;

  const isSupervisor = user.role === UserRole.SUPERVISOR;

  const resolvedAppName = (!appName || appName === 'Expand Program on Immunization' || appName.includes('Immunization') || appName.includes('EPI'))
    ? 'برنامج الإجادة المؤسسية' 
    : (appName || 'برنامج الإجادة المؤسسية');

  const iconBtnClass = "min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm font-bold text-blue-950 bg-white rounded-xl hover:bg-gray-100 active:scale-95 focus:outline-none transition-all dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 shadow-sm";

  return (
    <header className="sticky top-0 z-40 bg-blue-900 text-white shadow-md dark:bg-gray-900 dark:text-gray-100 border-b border-blue-950/40 dark:border-gray-800">
      <div className="container mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Slot */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 space-x-reverse min-w-0">
            <div className="flex-shrink-0">
              <Logo className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 drop-shadow" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] xs:text-xs sm:text-sm md:text-base font-black text-white leading-tight whitespace-nowrap">
                {resolvedAppName}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-blue-200 font-bold whitespace-nowrap">قسم تعزيز الصحة</span>
                <span className="hidden xs:inline text-[9px] bg-blue-950/60 dark:bg-blue-950 px-1.5 py-0.2 rounded text-blue-100 font-semibold truncate">
                  {roleMap[user.role as keyof typeof roleMap] || user.name}
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions Slot */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 space-x-reverse flex-shrink-0">
            {isSupervisor && onGoToChoiceScreen && (
              <button
                onClick={onGoToChoiceScreen}
                className="min-h-[38px] flex items-center justify-center px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-amber-900 bg-amber-100 rounded-xl hover:bg-amber-200 active:scale-95 transition-all dark:bg-amber-800 dark:text-amber-100 shadow-sm"
                title="القائمة الرئيسية"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="hidden sm:inline">القائمة</span>
              </button>
            )}

            {/* Cloud Realtime Sync Status Indicator */}
            <button
              onClick={onShowDbHelp}
              className="flex items-center gap-1.5 px-2 py-1 bg-blue-950/70 hover:bg-blue-950 rounded-xl border border-blue-400/30 text-[11px] font-bold text-white transition-all active:scale-95 shadow-inner"
              title="حالة المزامنة السحابية اللحظية Firebase"
              aria-label="حالة المزامنة السحابية"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${firebaseConnectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]' : firebaseConnectionStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-rose-400'}`}></span>
              <span className="hidden sm:inline">
                {firebaseConnectionStatus === 'connected' ? '⚡ سحابي مباشر' : 'جاري الاتصال'}
              </span>
            </button>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={iconBtnClass}
              title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
              aria-label="تبديل المظهر"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h1M3 12H2m15.364 6.364l-.707.707M6.343 6.343l-.707-.707m12.728 0l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              <span className="hidden lg:inline mr-1">{darkMode ? "نهاري" : "ليلي"}</span>
            </button>
            
            {/* Password Management */}
            <button
              onClick={onShowChangePassword}
              className={iconBtnClass}
              title="تغيير كلمة المرور"
              aria-label="تغيير كلمة المرور"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="hidden lg:inline mr-1">كلمة المرور</span>
            </button>

            {/* Help Modal (Supervisor) */}
            {isSupervisor && (
              <button
                onClick={onShowHelp}
                className={iconBtnClass}
                title="دليل المستخدم والمساعدة"
                aria-label="المساعدة"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden lg:inline mr-1">المساعدة</span>
              </button>
            )}
            
            {/* User Info (Desktop) */}
            <div className="text-right px-2 hidden md:block">
              <div className="font-bold text-xs truncate max-w-[120px]">{user.name}</div>
              <div className="text-[10px] text-blue-200 dark:text-gray-400">{roleMap[user.role as keyof typeof roleMap]}</div>
            </div>

            {/* Logout CTA */}
            <button
              onClick={onInitiateLogoutCheck}
              className="min-h-[38px] flex items-center justify-center px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 active:scale-95 transition-all sm:gap-1 shadow-sm"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
