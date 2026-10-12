import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users, FileText } from 'lucide-react';
import { EnrichedRecord } from './PivotTableEngine';

interface StandardTableEngineProps {
  type: 'initiatives' | 'partnerships';
  records: EnrichedRecord[];
}

export const StandardTableEngine: React.FC<StandardTableEngineProps> = ({
  type,
  records,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase().trim();
    return records.filter(r => {
      const matchInst = (r.institutionName || '').toLowerCase().includes(term);
      const matchState = (r.state || '').toLowerCase().includes(term);
      const matchPerson = (r.entryPerson || '').toLowerCase().includes(term);
      const matchNotes = (r.notes || '').toLowerCase().includes(term);

      if (type === 'initiatives') {
        const matchType = (r.initiativeTypeLabel || '').toLowerCase().includes(term);
        const matchCat = (r.categoryName || '').toLowerCase().includes(term);
        const matchSub = (r.subItem || '').toLowerCase().includes(term);
        return matchInst || matchState || matchPerson || matchNotes || matchType || matchCat || matchSub;
      } else {
        const matchTitle = (r.partnershipTitle || '').toLowerCase().includes(term);
        const matchEntity = (r.partnershipEntity || '').toLowerCase().includes(term);
        const matchGoal = (r.partnershipGoal || '').toLowerCase().includes(term);
        return matchInst || matchState || matchPerson || matchNotes || matchTitle || matchEntity || matchGoal;
      }
    });
  }, [records, searchTerm, type]);

  // Sort records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField as keyof EnrichedRecord] ?? '';
      let valB: any = b[sortField as keyof EnrichedRecord] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA);
      valB = String(valB);
      const cmp = valA.localeCompare(valB, 'ar');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return sortedRecords;
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Aggregate totals
  const totalBeneficiaries = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.beneficiariesCount) || 0), 0);
  }, [filteredRecords]);

  // Toggle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search and Pagination bar */}
      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              type === 'initiatives'
                ? "ابحث باسم المؤسسة، الولاية، الفئة، البند، أو مسجل البيانات..."
                : "ابحث باسم المؤسسة، عنوان الشراكة، الجهة، أو الهدف..."
            }
            className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-100 font-medium"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1">
            <span>عدد النتائج:</span>
            <span className="font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-lg">
              {filteredRecords.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="hidden xs:inline">عرض:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value={10}>10 صفوف</option>
              <option value={25}>25 صفاً</option>
              <option value={50}>50 صفاً</option>
              <option value={100}>100 صف</option>
              <option value={-1}>الكل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-200">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>إجمالي السجلات المسجلة:</span>
          <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">{filteredRecords.length}</span>
        </div>

        {type === 'initiatives' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>إجمالي عدد المستفيدين:</span>
            <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">{totalBeneficiaries.toLocaleString('ar-EG')}</span>
          </div>
        )}
      </div>

      {/* Standard Table View */}
      <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md bg-white dark:bg-slate-900">
        <table className="w-full border-collapse text-right text-xs sm:text-sm">
          <thead>
            <tr className="bg-blue-800 text-white dark:bg-blue-950">
              <th className="border border-blue-700 dark:border-slate-700 p-2 text-center w-10 sticky right-0 bg-blue-800 dark:bg-blue-950 z-20">
                م
              </th>

              <th 
                onClick={() => handleSort('date')}
                className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[90px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>التاريخ</span>
                  <ArrowUpDown className="w-3 h-3 opacity-70" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('institutionName')}
                className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[140px] sm:min-w-[170px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>المؤسسة الصحية</span>
                  <ArrowUpDown className="w-3 h-3 opacity-70" />
                </div>
              </th>

              <th 
                onClick={() => handleSort('state')}
                className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[90px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>الولاية</span>
                  <ArrowUpDown className="w-3 h-3 opacity-70" />
                </div>
              </th>

              {type === 'initiatives' ? (
                <>
                  <th 
                    onClick={() => handleSort('initiativeTypeLabel')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[110px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>نوع المبادرة</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('categoryName')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[130px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>المجال / الفئة</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('subItem')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[140px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>البند الفرعي</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('beneficiariesCount')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition text-center min-w-[100px] bg-blue-700 dark:bg-blue-900"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>المستفيدين</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>
                </>
              ) : (
                <>
                  <th 
                    onClick={() => handleSort('partnershipTitle')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[150px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>عنوان الشراكة</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('partnershipEntity')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[150px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>الجهة الشريكة</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('partnershipGoal')}
                    className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[160px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>الهدف من الشراكة</span>
                      <ArrowUpDown className="w-3 h-3 opacity-70" />
                    </div>
                  </th>
                </>
              )}

              <th 
                onClick={() => handleSort('entryPerson')}
                className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold cursor-pointer hover:bg-blue-700 transition min-w-[110px]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>مدخل البيانات</span>
                  <ArrowUpDown className="w-3 h-3 opacity-70" />
                </div>
              </th>

              <th className="border border-blue-700 dark:border-slate-700 p-2 sm:p-2.5 font-bold min-w-[140px]">
                الملاحظات
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td 
                  colSpan={type === 'initiatives' ? 10 : 9} 
                  className="p-8 text-center text-slate-500 font-bold"
                >
                  لا توجد سجلات مطابقة للبحث أو التصفية
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const globalIndex = (currentPage - 1) * (pageSize === -1 ? 0 : pageSize) + idx + 1;
                return (
                  <tr 
                    key={r.id || idx}
                    className={`border-b dark:border-slate-800 transition ${
                      idx % 2 === 0
                        ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono font-bold text-slate-400 sticky right-0 bg-inherit z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.04)]">
                      {globalIndex}
                    </td>

                    <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                      {r.date || `${r.year}-${r.month}`}
                    </td>

                    <td className="border border-slate-200 dark:border-slate-700 p-2 font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                      {r.institutionName}
                    </td>

                    <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {r.state}
                    </td>

                    {type === 'initiatives' ? (
                      <>
                        <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            r.initiativeType === 'community_service' 
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}>
                            {r.initiativeTypeLabel || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : 'الأنشطة الأخرى')}
                          </span>
                        </td>

                        <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {r.categoryName || '—'}
                        </td>

                        <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {r.subItem || '—'}
                        </td>

                        <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono font-bold text-sm text-blue-800 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                          {(r.beneficiariesCount || 0).toLocaleString('ar-EG')}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-slate-200 dark:border-slate-700 p-2 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                          {r.partnershipTitle || '—'}
                        </td>

                        <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                          {r.partnershipEntity || '—'}
                        </td>

                        <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs text-slate-600 dark:text-slate-300">
                          {r.partnershipGoal || '—'}
                        </td>
                      </>
                    )}

                    <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs text-slate-600 dark:text-slate-300">
                      {r.entryPerson || '—'}
                    </td>

                    <td className="border border-slate-200 dark:border-slate-700 p-2 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={r.notes}>
                      {r.notes || '—'}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Total Row at Bottom (الصف الأخير: الإجمالي) */}
            <tr className="bg-blue-100 dark:bg-blue-950/80 font-black text-blue-950 dark:text-blue-100 border-t-2 border-blue-800">
              <td colSpan={4} className="border border-blue-300 dark:border-slate-700 p-2.5 sm:p-3 text-right pr-4">
                المجموع العام: {filteredRecords.length} سجل
              </td>

              {type === 'initiatives' ? (
                <>
                  <td colSpan={3} className="border border-blue-300 dark:border-slate-700 p-2 text-left pl-3 text-xs">
                    إجمالي عدد المستفيدين:
                  </td>
                  <td className="border border-blue-300 dark:border-slate-700 p-2 text-center font-mono font-black text-sm sm:text-base text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40">
                    {totalBeneficiaries.toLocaleString('ar-EG')}
                  </td>
                  <td colSpan={2} className="border border-blue-300 dark:border-slate-700 p-2"></td>
                </>
              ) : (
                <td colSpan={5} className="border border-blue-300 dark:border-slate-700 p-2 text-left pl-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                  إجمالي الشراكات المسجلة: {filteredRecords.length}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pageSize !== -1 && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 pt-1">
          <div>
            صفحة {currentPage} من {totalPages}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg border ${currentPage > 1 ? 'bg-white dark:bg-slate-700 hover:bg-slate-100 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100' : 'opacity-40 border-slate-200'}`}
            >
              السابق
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pNum = currentPage - 2 + i;
                if (pNum > totalPages) pNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-7 h-7 rounded-lg border font-mono ${
                    currentPage === pNum
                      ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                      : 'bg-white dark:bg-slate-700 hover:bg-slate-100 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg border ${currentPage < totalPages ? 'bg-white dark:bg-slate-700 hover:bg-slate-100 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100' : 'opacity-40 border-slate-200'}`}
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
