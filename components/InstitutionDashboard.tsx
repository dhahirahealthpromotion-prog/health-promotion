import React, { useState } from 'react';
import { MonthlyEntryForm } from './MonthlyEntryForm';
import { ReportsTable } from './ReportsTable';

interface InstitutionDashboardProps {
  institutionId: number;
}

export const InstitutionDashboard: React.FC<InstitutionDashboardProps> = ({ institutionId }) => {
  const [activeTab, setActiveTab] = useState<'entry' | 'reports'>('entry');

  return (
    <div className="container mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 sm:pb-4 dark:border-gray-700">
          <div>
              <h2 className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-300 leading-tight">لوحة تحكم المؤسسة الصحية</h2>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">برنامج الإجادة المؤسسية - إدخال المبادرات والشراكات ومراجعتها</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl sm:rounded-2xl w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('entry')} 
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold transition-all text-xs sm:text-sm min-h-[38px] flex items-center justify-center gap-1.5 ${
                  activeTab === 'entry' 
                  ? 'bg-white text-blue-900 shadow-md dark:bg-gray-800 dark:text-blue-300' 
                  : 'text-gray-600 hover:text-blue-800 dark:text-gray-300'
                }`}
              >
                <span>إدخال البيانات</span>
                <span>📝</span>
              </button>
              <button 
                onClick={() => setActiveTab('reports')} 
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold transition-all text-xs sm:text-sm min-h-[38px] flex items-center justify-center gap-1.5 ${
                  activeTab === 'reports' 
                  ? 'bg-white text-blue-900 shadow-md dark:bg-gray-800 dark:text-blue-300' 
                  : 'text-gray-600 hover:text-blue-800 dark:text-gray-300'
                }`}
              >
                <span>التقارير</span>
                <span>📊</span>
              </button>
          </div>
      </div>

      <div className="animate-fade-in">
        {activeTab === 'entry' ? (
            <MonthlyEntryForm institutionId={institutionId} />
        ) : (
            <ReportsTable defaultShowAllRecords={true} />
        )}
      </div>
    </div>
  );
};

export default InstitutionDashboard;
