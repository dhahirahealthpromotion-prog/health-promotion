import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { UserRole } from '../types';
import { MONTHS_AR } from '../constants';
import { ChevronDown, Search, Check, CalendarDays } from 'lucide-react';

export const OverviewTable: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { users, reports } = context;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCheckMonth, setSelectedCheckMonth] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'missed'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [monthSearchTerm, setMonthSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => set.add(`${r.year}-${r.month}`));
    const arr = Array.from(set).map(s => {
      const [y, m] = s.split('-');
      return { year: parseInt(y), month: parseInt(m) };
    });
    arr.sort((a,b) => b.year - a.year || b.month - a.month);
    return arr;
  }, [reports]);

  const overviewData = useMemo(() => {
    const institutions = users.filter(u => u.role === UserRole.INSTITUTION);
    const term = searchTerm.toLowerCase().trim();

    let data = institutions.map(inst => {
      const instReports = reports.filter(r => r.institutionId === inst.id);
      const latest = instReports.sort((a,b) => b.year - a.year || b.month - a.month)[0];
      
      const latestReportRaw = latest ? `${latest.year}-${latest.month}` : '';
      const latestReportLabel = latest ? `${MONTHS_AR[latest.month - 1]} ${latest.year}` : 'لا يوجد';
      
      let submittedTargetMonth = false;
      if (selectedCheckMonth) {
          const [checkYear, checkMonth] = selectedCheckMonth.split('-');
          submittedTargetMonth = instReports.some(r => r.year === parseInt(checkYear) && r.month === parseInt(checkMonth));
      }

      return {
        id: inst.id,
        name: inst.name,
        state: inst.state || 'غير محدد',
        reportCount: instReports.length,
        latestReportRaw,
        latestReport: latestReportLabel,
        latestEntryPerson: latest ? (latest.entryPerson || '—') : '—',
        submittedTargetMonth
      };
    }).filter(item => {
        if (selectedCheckMonth) {
            if (submissionFilter === 'submitted' && !item.submittedTargetMonth) return false;
            if (submissionFilter === 'missed' && item.submittedTargetMonth) return false;
        }

        if (!term) return true;
        return (
            item.name.toLowerCase().includes(term) ||
            item.state.toLowerCase().includes(term) ||
            item.reportCount.toString().includes(term) ||
            item.latestReport.toLowerCase().includes(term) ||
            item.latestEntryPerson.toLowerCase().includes(term)
        );
    });

    return data.sort((a, b) => a.state.localeCompare(b.state, 'ar') || a.name.localeCompare(b.name, 'ar'));
  }, [users, reports, searchTerm, selectedCheckMonth, submissionFilter]);

  const stats = useMemo(() => {
      const institutions = users.filter(u => u.role === UserRole.INSTITUTION);
      const total = institutions.length;
      
      if (!selectedCheckMonth) return { total, submitted: 0, missed: 0 };
      
      const [checkYear, checkMonth] = selectedCheckMonth.split('-');
      const submittedIds = new Set(
          reports
            .filter(r => r.year === parseInt(checkYear) && r.month === parseInt(checkMonth))
            .map(r => r.institutionId)
      );
      
      const submitted = submittedIds.size;
      const missed = total - submitted;
      return { total, submitted, missed };
  }, [users, reports, selectedCheckMonth]);

  const filteredPeriods = useMemo(() => {
    return availablePeriods.filter(p => {
        const str = `${MONTHS_AR[p.month - 1]} ${p.year}`.toLowerCase();
        return str.includes(monthSearchTerm.toLowerCase());
    });
  }, [availablePeriods, monthSearchTerm]);

  return (
    <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 border-b pb-3 sm:pb-4 dark:border-gray-700">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-blue-800 dark:text-blue-400 leading-tight">نظرة عامة على حالة تقارير المؤسسات</h3>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">متابعة تسليم التقارير الشهرية ومسجلي البيانات في المؤسسات</p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="بحث بالمؤسسة أو الولاية أو مسجل البيانات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-style text-xs sm:text-sm pr-9 min-h-[42px]"
          />
          <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
        </div>

        {/* Month Selector for Checking Submission */}
        <div className={`relative ${isDropdownOpen ? 'z-50' : 'z-auto'}`} ref={dropdownRef}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="input-style flex items-center justify-between cursor-pointer text-xs sm:text-sm font-bold bg-white dark:bg-gray-800 min-h-[42px]"
            >
                <div className="flex items-center gap-2 truncate">
                    <CalendarDays className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">
                        {selectedCheckMonth ? (
                            `${MONTHS_AR[parseInt(selectedCheckMonth.split('-')[1]) - 1]} ${selectedCheckMonth.split('-')[0]}`
                        ) : 'تحديد شهر للتحقق من التسليم...'}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
            </div>

            {isDropdownOpen && (
                <div className="absolute z-[9999] mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col left-0 right-0">
                    <div className="p-2 border-b dark:border-gray-700">
                        <input 
                            type="text" 
                            placeholder="ابحث عن شهر..." 
                            value={monthSearchTerm} 
                            onChange={e => setMonthSearchTerm(e.target.value)} 
                            className="w-full p-2 text-xs bg-gray-50 dark:bg-gray-700 border rounded-lg outline-none min-h-[38px]" 
                            autoFocus 
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <div 
                            onClick={() => { setSelectedCheckMonth(''); setIsDropdownOpen(false); }}
                            className={`p-2.5 text-xs sm:text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 min-h-[40px] flex items-center ${!selectedCheckMonth ? 'font-bold text-blue-700 bg-blue-50/50' : ''}`}
                        >
                            إلغاء تحديد الشهر (عرض الكل)
                        </div>
                        {filteredPeriods.map(p => {
                            const val = `${p.year}-${p.month}`;
                            return (
                                <div
                                    key={val}
                                    onClick={() => { setSelectedCheckMonth(val); setIsDropdownOpen(false); }}
                                    className={`p-2.5 text-xs sm:text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 flex justify-between items-center min-h-[40px] ${selectedCheckMonth === val ? 'font-bold text-blue-700 bg-blue-50/50' : ''}`}
                                >
                                    <span>{MONTHS_AR[p.month - 1]} {p.year}</span>
                                    {selectedCheckMonth === val && <Check className="w-4 h-4 text-blue-600" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* Submission Filter (الكل / تم التسليم / لم يتم التسليم) */}
        {selectedCheckMonth && (
            <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 sm:p-1 rounded-xl items-center min-h-[42px]">
                <button
                    onClick={() => setSubmissionFilter('all')}
                    className={`flex-1 py-1.5 px-1 text-xs font-bold rounded-lg transition-all min-h-[34px] ${submissionFilter === 'all' ? 'bg-white text-gray-800 shadow dark:bg-gray-800 dark:text-white' : 'text-gray-500'}`}
                >
                    الكل ({stats.total})
                </button>
                <button
                    onClick={() => setSubmissionFilter('submitted')}
                    className={`flex-1 py-1.5 px-1 text-xs font-bold rounded-lg transition-all min-h-[34px] ${submissionFilter === 'submitted' ? 'bg-blue-700 text-white shadow' : 'text-blue-700 dark:text-blue-400'}`}
                >
                    تم التسليم ({stats.submitted})
                </button>
                <button
                    onClick={() => setSubmissionFilter('missed')}
                    className={`flex-1 py-1.5 px-1 text-xs font-bold rounded-lg transition-all min-h-[34px] ${submissionFilter === 'missed' ? 'bg-red-600 text-white shadow' : 'text-red-600 dark:text-red-400'}`}
                >
                    لم يسلم ({stats.missed})
                </button>
            </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="w-full text-center text-xs sm:text-sm border-collapse">
            <thead>
                <tr className="bg-blue-800 text-white dark:bg-blue-950">
                    <th className="sticky right-0 bg-blue-800 dark:bg-blue-950 z-20 shadow-[-2px_0_4px_rgba(0,0,0,0.12)] p-2.5 sm:p-3 text-right pr-3 sm:pr-4 font-bold min-w-[140px] sm:min-w-[180px]">اسم المؤسسة</th>
                    <th className="p-2 sm:p-3 font-bold min-w-[80px]">الولاية</th>
                    <th className="p-2 sm:p-3 font-bold min-w-[70px]">عدد التقارير</th>
                    <th className="p-2 sm:p-3 font-bold min-w-[90px]">آخر تقرير مسجل</th>
                    <th className="p-2 sm:p-3 font-bold min-w-[100px]">مسجل التقرير الأخير</th>
                    {selectedCheckMonth && <th className="p-2 sm:p-3 font-bold min-w-[100px]">حالة شهر التحقق</th>}
                </tr>
            </thead>
            <tbody>
                {overviewData.map((row, idx) => (
                    <tr 
                        key={row.id}
                        className={`border-b dark:border-gray-700 transition hover:bg-blue-50/40 dark:hover:bg-gray-700/50 ${
                            idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/60'
                        }`}
                    >
                        <td className="sticky right-0 bg-white dark:bg-gray-800 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.06)] p-2 sm:p-3 text-right pr-3 sm:pr-4 font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm">{row.name}</td>
                        <td className="p-2 sm:p-3 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-semibold">{row.state}</td>
                        <td className="p-2 sm:p-3 font-mono font-bold">
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                                {row.reportCount}
                            </span>
                        </td>
                        <td className="p-2 sm:p-3 font-bold text-gray-700 dark:text-gray-300 text-xs">{row.latestReport}</td>
                        <td className="p-2 sm:p-3 text-gray-600 dark:text-gray-400 text-xs">{row.latestEntryPerson}</td>
                        {selectedCheckMonth && (
                            <td className="p-2 sm:p-3">
                                {row.submittedTargetMonth ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
                                        <Check className="w-3 h-3 stroke-[3px]" /> تم التسليم
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
                                        لم يتم التسليم
                                    </span>
                                )}
                            </td>
                        )}
                    </tr>
                ))}
                {overviewData.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                            لا توجد بيانات مطابقة للبحث
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default OverviewTable;
