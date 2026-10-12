import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { ReportsTable } from './ReportsTable';
import DashboardStats from './DashboardStats';
import InstitutionManagement from './InstitutionManagement';
import { Settings } from './Settings'; 
import { OverviewTable } from './OverviewTable';
import PasswordManagement from './PasswordManagement';
import SearchableSelect from './SearchableSelect';
import { DropdownManagement } from './DropdownManagement';

type View = 'reports' | 'management' | 'dropdowns' | 'passwords' | 'settings' | 'overview';

const NavButton: React.FC<{ 
  view: View; 
  label: string; 
  isActive: boolean; 
  onClick: (view: View) => void 
}> = ({view, label, isActive, onClick}) => {
    return (
        <button
          onClick={() => onClick(view)}
          className={`px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap min-h-[40px] flex items-center justify-center flex-shrink-0 ${
              isActive 
              ? 'bg-blue-800 text-white shadow-md transform scale-[1.02]' 
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
          }`}
        >
            {label}
        </button>
    );
};

export const SupervisorDashboard: React.FC = () => {
  const context = useContext(AppContext);
  const [activeView, setActiveView] = useState<View>('reports');

  if (!context) {
    return <div className="dark:text-gray-200 text-center py-20 font-bold">جاري تحميل البيانات...</div>;
  }
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-blue-50/90 dark:bg-slate-900/90 backdrop-blur-md -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 p-3 sm:p-5 border-b border-blue-200 dark:border-gray-800 shadow-sm no-print mb-3 sm:mb-6 relative z-30">
        <div className="container mx-auto">
            {/* Mobile Dropdown Navigation (قائمة منسدلة قابلة للبحث في وضع الهاتف) */}
            <div className="w-full sm:hidden pb-1">
                <SearchableSelect
                    id="supervisor-tab-select"
                    value={activeView}
                    onChange={(val) => setActiveView(val as View)}
                    options={[
                        { value: 'reports', label: 'التقارير الرئيسية 📊' },
                        { value: 'management', label: 'إدارة المؤسسات 🏢' },
                        { value: 'dropdowns', label: 'تعديل القوائم 📑' },
                        { value: 'passwords', label: 'كلمات المرور 🔑' },
                        { value: 'settings', label: 'الإعدادات والنسخ ⚙️' },
                        { value: 'overview', label: 'نظرة عامة على البيانات 👁️' },
                    ]}
                    placeholder="اختر القسم"
                    searchPlaceholder="ابحث في الأقسام..."
                />
            </div>

            {/* Horizontal Scrollable Nav Tabs on Desktop/Tablet */}
            <nav className="hidden sm:flex flex-nowrap overflow-x-auto scrollbar-hidden gap-1.5 sm:gap-2.5 pb-2">
                <NavButton view="reports" label="التقارير الرئيسية 📊" isActive={activeView === 'reports'} onClick={setActiveView} />
                <NavButton view="management" label="إدارة المؤسسات 🏢" isActive={activeView === 'management'} onClick={setActiveView} />
                <NavButton view="dropdowns" label="تعديل القوائم 📑" isActive={activeView === 'dropdowns'} onClick={setActiveView} />
                <NavButton view="passwords" label="كلمات المرور 🔑" isActive={activeView === 'passwords'} onClick={setActiveView} />
                <NavButton view="settings" label="الإعدادات والنسخ ⚙️" isActive={activeView === 'settings'} onClick={setActiveView} />
                <NavButton view="overview" label="نظرة عامة على البيانات 👁️" isActive={activeView === 'overview'} onClick={setActiveView} />
            </nav>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-t border-blue-200/60 dark:border-gray-700/60 pt-2.5 mt-1">
                <div>
                    <h2 className="text-lg sm:text-2xl font-black text-blue-950 dark:text-blue-300 leading-tight">لوحة تحكم المشرف العام</h2>
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400">إدارة وتقارير برنامج الإجادة المؤسسية</p>
                </div>
            </div>
        </div>
      </div>
      
      <div className="space-y-6 sm:space-y-8 pb-10">
        {activeView === 'reports' && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="no-print">
                <DashboardStats />
              </div>
              <ReportsTable />
            </div>
        )}

        {activeView === 'management' && (
          <div className="animate-fade-in">
            <InstitutionManagement />
          </div>
        )}

        {activeView === 'dropdowns' && (
          <div className="animate-fade-in">
            <DropdownManagement />
          </div>
        )}

        {activeView === 'passwords' && (
          <div className="animate-fade-in">
            <PasswordManagement />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="animate-fade-in">
            <Settings />
          </div>
        )}

        {activeView === 'overview' && (
          <div className="animate-fade-in">
            <OverviewTable />
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
