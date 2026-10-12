import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { MonthlyEntryForm } from './MonthlyEntryForm';
import { ReportsTable } from './ReportsTable';
import { OverviewTable } from './OverviewTable';
import DashboardStats from './DashboardStats';
import PasswordManagement from './PasswordManagement';
import InstitutionManagement from './InstitutionManagement';
import { Settings } from './Settings';
import SearchableSelect from './SearchableSelect';
import { DropdownManagement } from './DropdownManagement';

export const HealthPromotionDashboard: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const [activeTab, setActiveTab] = useState<'entry' | 'reports' | 'overview' | 'dropdowns' | 'passwords' | 'management' | 'settings'>('reports');

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'reports', label: 'التقارير 📊' },
    { id: 'entry', label: 'إدخال البيانات 📝' },
    { id: 'dropdowns', label: 'تعديل القوائم 📑' },
    { id: 'overview', label: 'نظرة عامة 👁️' },
    { id: 'passwords', label: 'كلمات المرور 🔑' },
    { id: 'management', label: 'إدارة المؤسسات 🏢' },
    { id: 'settings', label: 'الإعدادات والنسخ ⚙️' },
  ];

  return (
    <div className="container mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 sm:pb-4 dark:border-gray-700 relative z-30">
          <div>
              <h2 className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-300 leading-tight">لوحة تحكم قسم تعزيز الصحة</h2>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">برنامج الإجادة المؤسسية - متابعة وإدخال الشراكات والمبادرات</p>
          </div>

          {/* Mobile Dropdown Menu (قائمة منسدلة قابلة للبحث في وضع الهاتف) */}
          <div className="w-full sm:hidden">
              <SearchableSelect
                  id="health-promotion-tab-select"
                  value={activeTab}
                  onChange={(val) => setActiveTab(val as any)}
                  options={tabs.map(tab => ({
                      value: tab.id,
                      label: tab.label
                  }))}
                  placeholder="اختر القسم"
                  searchPlaceholder="ابحث في الأقسام..."
              />
          </div>

          {/* Horizontally scrollable desktop/tablet tabs */}
          <div className="hidden sm:flex overflow-x-auto scrollbar-hidden gap-1.5 sm:gap-2 pb-1 w-full sm:w-auto">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)} 
                  className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all text-xs sm:text-sm whitespace-nowrap min-h-[40px] flex items-center justify-center flex-shrink-0 ${
                    activeTab === tab.id 
                    ? 'bg-blue-800 text-white shadow-md transform scale-[1.02]' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
      </div>

      {activeTab === 'entry' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <MonthlyEntryForm allowInstitutionSelection={true} />
          </div>
      )}

      {activeTab === 'dropdowns' && (
          <div className="animate-fade-in">
              <DropdownManagement />
          </div>
      )}

      {activeTab === 'reports' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="no-print">
                  <DashboardStats />
              </div>
              <ReportsTable />
          </div>
      )}

      {activeTab === 'overview' && (
          <div className="animate-fade-in">
              <OverviewTable />
          </div>
      )}

      {activeTab === 'passwords' && (
          <div className="animate-fade-in">
              <PasswordManagement />
          </div>
      )}

      {activeTab === 'management' && (
          <div className="animate-fade-in">
              <InstitutionManagement />
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="animate-fade-in">
              <Settings />
          </div>
      )}
    </div>
  );
};

export default HealthPromotionDashboard;
