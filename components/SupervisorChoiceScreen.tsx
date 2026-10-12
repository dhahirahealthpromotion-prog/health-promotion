import React, { useContext } from 'react';
import { User } from '../types';
import Logo from './Logo';
import { AppContext } from '../App';

interface SupervisorChoiceScreenProps {
  user: User;
  onSelectDashboard: () => void;
  onLogout: () => void;
}

const SupervisorChoiceScreen: React.FC<SupervisorChoiceScreenProps> = ({ user, onSelectDashboard, onLogout }) => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { appName } = context;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl text-center bg-white dark:bg-gray-800 p-10 rounded-3xl golden-frame shadow-2xl">
        <div className="flex justify-center mb-6">
          <Logo className="h-28 w-28 drop-shadow-md" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-blue-950 dark:text-blue-300 mb-2">{appName}</h1>
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6">قسم تعزيز الصحة</p>
        
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-10 border-t border-gray-200 dark:border-gray-700 pt-4 font-bold">
            مرحباً بك، {user.name} 👋<br/>
            <span className="text-sm text-gray-500 font-normal">الرجاء اختيار الواجهة المطلوبة للمتابعة</span>
        </p>
        
        <div className="flex justify-center">
          <button
            onClick={onSelectDashboard}
            className="group flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-700/60 rounded-3xl border-2 border-blue-600/30 hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-xl w-72"
          >
            <div className="p-4 bg-blue-100 dark:bg-blue-950/60 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-700 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">لوحة التحكم</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">إدارة الشراكات والمبادرات والتقارير</p>
          </button>
        </div>

        <div className="mt-12">
          <button onClick={onLogout} className="px-6 py-2.5 text-base font-bold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-200 dark:bg-red-950/40 dark:text-red-300">
            تسجيل الخروج 🚪
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorChoiceScreen;
