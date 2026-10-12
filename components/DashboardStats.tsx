import React, { useContext } from 'react';
import { UserRole } from '../types';
import { AppContext } from '../App';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm flex items-center space-x-3 sm:space-x-4 space-x-reverse dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl flex-shrink-0 ${color}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5 truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100 font-mono leading-tight">{value}</p>
        </div>
    </div>
);

export const DashboardStats: React.FC = () => {
    const context = useContext(AppContext);
    const users = context ? context.users : [];
    const reports = context ? context.reports : [];

    const totalInstitutions = users.filter(u => u.role === UserRole.INSTITUTION).length;
    
    // Calculate Last Month logic
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetMonth = lastMonthDate.getMonth() + 1;
    const targetYear = lastMonthDate.getFullYear();
    
    const reportsLastMonth = reports.filter(r => r.month === targetMonth && r.year === targetYear).length;
    const totalReports = reports.length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-5">
             <StatCard 
                title="المؤسسات المسجلة" 
                value={totalInstitutions} 
                color="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-10V4a1 1 0 011-1h2a1 1 0 011 1v3M12 4v16" /></svg>} 
            />
            <StatCard 
                title="تقارير الشهر الماضي" 
                value={reportsLastMonth} 
                color="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} 
            />
            <StatCard 
                title="إجمالي التقارير المسجلة" 
                value={totalReports} 
                color="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} 
            />
        </div>
    );
};

export default DashboardStats;
