import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { UserRole } from '../types';
import { MONTHS_AR } from '../constants';
import { 
  Check, 
  Printer, 
  FileSpreadsheet, 
  TableProperties, 
  Table as TableIcon,
  Sparkles,
  Handshake,
  Calendar,
  Filter
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { PivotTableEngine, EnrichedRecord, DimensionConfig } from './PivotTableEngine';
import { StandardTableEngine } from './StandardTableEngine';

declare const XLSX: any;

// تعريف الأرباع السنوية المخصصة:
// الربع الأول (Q1): يبدأ من بداية شهر 12 للعام الماضي إلى نهاية شهر 2 (أشهر 12، 1، 2)
// الربع الثاني (Q2): من بداية شهر 3 إلى نهاية شهر 5 (أشهر 3، 4، 5)
// الربع الثالث (Q3): من بداية شهر 6 إلى نهاية شهر 8 (أشهر 6، 7، 8)
// الربع الرابع (Q4): من بداية شهر 9 إلى نهاية شهر 11 (أشهر 9، 10، 11)
export interface CustomQuarter {
  id: string;
  name: string;
  label: string;
  months: number[]; // الشهور التابعة للربع
  spansLastYearDecember?: boolean; // هل شهر 12 تابع للعام السابق
}

export const CUSTOM_QUARTERS: CustomQuarter[] = [
  { id: 'q1', name: 'الربع الأول', label: 'الربع الأول (ديسمبر العام الماضي - فبراير)', months: [12, 1, 2], spansLastYearDecember: true },
  { id: 'q2', name: 'الربع الثاني', label: 'الربع الثاني (مارس - مايو)', months: [3, 4, 5] },
  { id: 'q3', name: 'الربع الثالث', label: 'الربع الثالث (يونيو - أغسطس)', months: [6, 7, 8] },
  { id: 'q4', name: 'الربع الرابع', label: 'الربع الرابع (سبتمبر - نوفمبر)', months: [9, 10, 11] },
];

const HALVES = [
  { id: 'h1', label: 'النصف الأول (ديسمبر - مايو)', months: [12, 1, 2, 3, 4, 5] },
  { id: 'h2', label: 'النصف الثاني (يونيو - نوفمبر)', months: [6, 7, 8, 9, 10, 11] },
];

/**
 * حساب الربع السابق والسنة التابعة له بناءً على التاريخ الحالي:
 * الربع 1 (12، 1، 2) -> الحالي في هذه الأشهر، والربع السابق هو Q4 (سبتمبر-نوفمبر) للعام الماضي
 * الربع 2 (3، 4، 5)   -> الحالي في هذه الأشهر، والربع السابق هو Q1
 * الربع 3 (6، 7، 8)   -> الحالي في هذه الأشهر، والربع السابق هو Q2
 * الربع 4 (9، 10، 11) -> الحالي في هذه الأشهر، والربع السابق هو Q3
 * مثال: 12 أكتوبر 2026 يقع في الربع الرابع (أشهر 9-11)، وبالتالي الربع الماضي هو الربع الثالث (يونيو-أغسطس 2026).
 */
export function getPreviousQuarterInfo(now: Date = new Date()): { quarterId: string; targetYear: number; months: number[] } {
  const currentMonth = now.getMonth() + 1; // 1 - 12
  const currentYear = now.getFullYear();

  if (currentMonth === 12 || currentMonth === 1 || currentMonth === 2) {
    // نحن الآن في الربع الأول، فالربع الماضي هو الربع الرابع للعام الحالي (إذا كنا في 12) أو للعام الماضي (إذا كنا في 1 أو 2)
    const targetYear = currentMonth === 12 ? currentYear : currentYear - 1;
    return { quarterId: 'q4', targetYear, months: [9, 10, 11] };
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    // نحن الآن في الربع الثاني، فالربع الماضي هو الربع الأول
    return { quarterId: 'q1', targetYear: currentYear, months: [12, 1, 2] };
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    // نحن الآن في الربع الثالث، فالربع الماضي هو الربع الثاني
    return { quarterId: 'q2', targetYear: currentYear, months: [3, 4, 5] };
  } else {
    // currentMonth 9, 10, 11 (الربع الرابع مثل 12 أكتوبر 2026): فالربع الماضي هو الربع الثالث
    return { quarterId: 'q3', targetYear: currentYear, months: [6, 7, 8] };
  }
}

const INITIATIVES_DIMENSIONS: DimensionConfig[] = [
  { id: 'state', label: 'الولاية', icon: '📍', hasBranches: true, getValue: r => r.state },
  { id: 'institution', label: 'المؤسسة الصحية', icon: '🏢', getValue: r => r.institutionName },
  { id: 'initiativeType', label: 'نوع المبادرة', icon: '🎯', hasBranches: true, getValue: r => r.initiativeTypeLabel || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : 'الأنشطة والفعاليات الأخرى') },
  { id: 'categoryName', label: 'المجال / الفئة', icon: '🏷️', hasBranches: true, getValue: r => r.categoryName || 'غير محدد' },
  { id: 'subItem', label: 'البند الفرعي', icon: '📌', getValue: r => r.subItem || 'غير محدد' },
  { id: 'year', label: 'السنة', icon: '🗓️', hasBranches: true, getValue: r => String(r.operationalYear || r.year) },
  { id: 'quarter', label: 'الربع السنوي', icon: '📊', hasBranches: true, getValue: r => r.quarterName || 'غير محدد' },
  { id: 'month', label: 'الشهر', icon: '📅', getValue: r => r.monthQuarterLabel || r.monthName || String(r.month) },
  { id: 'entryPerson', label: 'مدخل البيانات', icon: '👤', getValue: r => r.entryPerson || 'غير محدد' },
];

const PARTNERSHIPS_DIMENSIONS: DimensionConfig[] = [
  { id: 'state', label: 'الولاية', icon: '📍', hasBranches: true, getValue: r => r.state },
  { id: 'institution', label: 'المؤسسة الصحية', icon: '🏢', getValue: r => r.institutionName },
  { id: 'partnershipEntity', label: 'الجهة الشريكة', icon: '🏛️', hasBranches: true, getValue: r => r.partnershipEntity || 'غير محدد' },
  { id: 'partnershipTitle', label: 'عنوان الشراكة', icon: '📝', getValue: r => r.partnershipTitle || 'غير محدد' },
  { id: 'year', label: 'السنة', icon: '🗓️', hasBranches: true, getValue: r => String(r.operationalYear || r.year) },
  { id: 'quarter', label: 'الربع السنوي', icon: '📊', hasBranches: true, getValue: r => r.quarterName || 'غير محدد' },
  { id: 'month', label: 'الشهر', icon: '📅', getValue: r => r.monthQuarterLabel || r.monthName || String(r.month) },
  { id: 'entryPerson', label: 'مدخل البيانات', icon: '👤', getValue: r => r.entryPerson || 'غير محدد' },
];

export interface ReportsTableProps {
  defaultShowAllRecords?: boolean;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({ defaultShowAllRecords = false }) => {
  const context = useContext(AppContext);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!context) return null;
  const { reports, users, currentUser } = context;

  const isInstitutionUser = currentUser?.role === UserRole.INSTITUTION;

  // هل الافتراضي إظهار جميع السجلات (في صفحة المؤسسات أو عبر الخاصية defaultShowAllRecords)
  const shouldShowAllByDefault = defaultShowAllRecords || isInstitutionUser;

  // حساب الربع الماضي الافتراضي
  const prevQuarterInfo = useMemo(() => getPreviousQuarterInfo(), []);

  // 1. التبويبان الأساسيان للتقرير (الشراكات، المبادرات)
  const [activeTab, setActiveTab] = useState<'initiatives' | 'partnerships'>('initiatives');

  // 2. طريقة العرض لكل تبويب (جداول محورية: صفوف وأعمدة، أو جداول عادية: صف للعناوين وبالباقي للبيانات)
  const [displayMode, setDisplayMode] = useState<'pivot' | 'standard'>('pivot');

  // Initiatives metric selector in pivot
  const [initiativeMetric, setInitiativeMetric] = useState<'sum_beneficiaries' | 'count'>('sum_beneficiaries');

  // Filter state: في صفحة المؤسسات الافتراضي إظهار الكل ('all_years' أو جميع الأشهر)، وفي باقي الصفحات الافتراضي إظهار الربع الماضي
  const [selectedYear, setSelectedYear] = useState<string>(
    shouldShowAllByDefault ? 'all' : String(prevQuarterInfo.targetYear)
  );
  const [selectedState, setSelectedState] = useState<string>('all');
  
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
      isInstitutionUser && currentUser ? String(currentUser.id) : 'all'
  );

  // Timeframe mode:
  // في صفحة المؤسسة الافتراضي 'months' مع اختيار جميع الأشهر (1-12) لعرض كافة السجلات
  // في غيرها الافتراضي 'quarters' مع اختيار الربع الماضي (مثلا الربع الثالث في أكتوبر 2026)
  const [timeframeMode, setTimeframeMode] = useState<'months' | 'quarters' | 'halves'>(
    shouldShowAllByDefault ? 'months' : 'quarters'
  );

  const [selectedQuarterId, setSelectedQuarterId] = useState<string>(
    prevQuarterInfo.quarterId
  );

  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    shouldShowAllByDefault 
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] 
      : prevQuarterInfo.months
  );

  // Dynamic years list
  const availableYears = useMemo(() => {
      const yearsFromReports = Array.from(new Set(reports.map(r => r.year).filter(Boolean)));
      if (!yearsFromReports.includes(prevQuarterInfo.targetYear)) {
          yearsFromReports.push(prevQuarterInfo.targetYear);
      }
      return yearsFromReports.sort((a: number, b: number) => b - a).map(String);
  }, [reports, prevQuarterInfo.targetYear]);

  const availableStates = useMemo(() => {
    const states = Array.from(new Set(users.filter(u => u.role === UserRole.INSTITUTION && u.state).map(u => u.state))).sort();
    return states as string[];
  }, [users]);

  // Handlers for month selection
  const toggleMonth = (m: number) => {
      setSelectedMonths(prev => {
          if (prev.includes(m)) {
              if (prev.length === 1) return prev;
              return prev.filter(x => x !== m);
          } else {
              return [...prev, m].sort((a: number, b: number) => a - b);
          }
      });
  };

  const selectAllMonths = () => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const clearAllMonths = () => setSelectedMonths(prevQuarterInfo.months);

  const selectQuarter = (qId: string) => {
      const q = CUSTOM_QUARTERS.find(x => x.id === qId);
      if (q) {
        setSelectedQuarterId(q.id);
        setSelectedMonths(q.months);
      }
  };

  const selectHalf = (hId: string) => {
      const h = HALVES.find(x => x.id === hId);
      if (h) setSelectedMonths(h.months);
  };

  // Filter institutions based on selections
  const filteredInstitutions = useMemo(() => {
    let list = users.filter(u => u.role === UserRole.INSTITUTION);
    if (isInstitutionUser && currentUser) {
        return list.filter(u => u.id === currentUser.id);
    }
    if (selectedState !== 'all') {
        list = list.filter(u => u.state === selectedState);
    }
    if (selectedInstitutionId !== 'all') {
        list = list.filter(u => u.id.toString() === selectedInstitutionId);
    }
    return list.sort((a, b) => (a.state || '').localeCompare(b.state || '', 'ar') || a.name.localeCompare(b.name, 'ar'));
  }, [users, selectedState, selectedInstitutionId, isInstitutionUser, currentUser]);

  // Institution map for fast lookup
  const institutionsMap = useMemo(() => {
    const map = new Map<number, { name: string; state: string }>();
    users.filter(u => u.role === UserRole.INSTITUTION).forEach(u => {
      map.set(u.id, { name: u.name, state: u.state || 'غير محدد' });
    });
    return map;
  }, [users]);

  // Enriched reports matching active filters
  const enrichedReports = useMemo<EnrichedRecord[]>(() => {
    const targetInstIds = new Set(filteredInstitutions.map(u => u.id));
    const isAllYears = selectedYear === 'all';
    const yearNum = isAllYears ? 0 : parseInt(selectedYear);
    
    // فحص ما إذا كان التقرير مصفى بالربع الأول الممتد (شهر 12 من العام الماضي)
    const isQ1Selected = timeframeMode === 'quarters' && selectedQuarterId === 'q1';

    return reports
      .filter(r => {
        if (!targetInstIds.has(r.institutionId)) return false;
        
        // التحقق من السنة والشهر
        if (!isAllYears) {
          if (isQ1Selected) {
            // الربع الأول يشمل: شهر 12 من العام الماضي (yearNum - 1)، وشهري 1 و 2 من العام الحالي (yearNum)
            const rYear = r.year || yearNum;
            const rMonth = r.month || 1;
            const isPrevYearDec = rMonth === 12 && rYear === yearNum - 1;
            const isCurrentYearJanFeb = (rMonth === 1 || rMonth === 2) && rYear === yearNum;
            if (!isPrevYearDec && !isCurrentYearJanFeb) return false;
          } else {
            if (r.year && r.year !== yearNum) return false;
            if (r.month && !selectedMonths.includes(r.month)) return false;
          }
        } else {
          // في حال اختيار جميع السنوات
          if (r.month && !selectedMonths.includes(r.month)) return false;
        }

        return true;
      })
      .map(r => {
        const inst = institutionsMap.get(r.institutionId);
        const m = r.month || 1;
        const isPartnership = r.categoryType === 'partnerships' || !!(r.partnershipTitle || r.partnershipEntity);
        const recYear = r.year || (isAllYears ? new Date().getFullYear() : yearNum);

        // حساب السنة والربع والشهر التشغيلي المخصص
        let operationalYear = recYear;
        let quarterId = 'q1';
        let quarterName = 'الربع الأول';
        let monthQuarterLabel = MONTHS_AR[m - 1] || String(m);

        if (m === 12) {
          operationalYear = recYear + 1;
          quarterId = 'q1';
          quarterName = 'الربع الأول';
          monthQuarterLabel = `ديسمبر ${recYear}`;
        } else if (m === 1 || m === 2) {
          operationalYear = recYear;
          quarterId = 'q1';
          quarterName = 'الربع الأول';
          monthQuarterLabel = MONTHS_AR[m - 1];
        } else if (m >= 3 && m <= 5) {
          operationalYear = recYear;
          quarterId = 'q2';
          quarterName = 'الربع الثاني';
          monthQuarterLabel = MONTHS_AR[m - 1];
        } else if (m >= 6 && m <= 8) {
          operationalYear = recYear;
          quarterId = 'q3';
          quarterName = 'الربع الثالث';
          monthQuarterLabel = MONTHS_AR[m - 1];
        } else if (m >= 9 && m <= 11) {
          operationalYear = recYear;
          quarterId = 'q4';
          quarterName = 'الربع الرابع';
          monthQuarterLabel = MONTHS_AR[m - 1];
        }

        return {
          id: r.id,
          institutionId: r.institutionId,
          institutionName: inst?.name || `مؤسسة #${r.institutionId}`,
          state: inst?.state || 'غير محدد',
          year: recYear,
          operationalYear,
          quarterId,
          quarterName,
          month: m,
          monthName: MONTHS_AR[m - 1] || String(m),
          monthQuarterLabel,
          date: r.date || `${recYear}-${String(m).padStart(2, '0')}-01`,
          entryPerson: r.entryPerson || 'غير محدد',
          categoryType: isPartnership ? 'partnerships' : 'initiatives',
          partnershipTitle: r.partnershipTitle,
          partnershipEntity: r.partnershipEntity,
          partnershipGoal: r.partnershipGoal,
          initiativeType: r.initiativeType,
          initiativeTypeLabel: r.initiativeTypeLabel || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : r.initiativeType === 'other_activities' ? 'الأنشطة والفعاليات الأخرى' : 'عام'),
          categoryName: r.categoryName || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : 'عام'),
          subItem: r.subItem || '—',
          beneficiariesCount: Number(r.beneficiariesCount ?? r.initiatives_field_1 ?? 0),
          notes: r.notes || '',
          updatedAt: r.updatedAt,
        };
      });
  }, [reports, filteredInstitutions, selectedYear, selectedMonths, institutionsMap, timeframeMode, selectedQuarterId]);

  // Split into initiatives and partnerships
  const initiativesRecords = useMemo(() => {
    return enrichedReports.filter(r => r.categoryType === 'initiatives');
  }, [enrichedReports]);

  const partnershipsRecords = useMemo(() => {
    return enrichedReports.filter(r => r.categoryType === 'partnerships');
  }, [enrichedReports]);

  // Current active records
  const currentRecords = activeTab === 'initiatives' ? initiativesRecords : partnershipsRecords;

  // Submission statistics
  const submissionStats = useMemo(() => {
    const isAllYears = selectedYear === 'all';
    const year = isAllYears ? 0 : parseInt(selectedYear);
    const totalCount = filteredInstitutions.length;
    const targetInstIds = new Set(filteredInstitutions.map(u => u.id));
    const isQ1Selected = timeframeMode === 'quarters' && selectedQuarterId === 'q1';
    
    const submittedInstIds = new Set(
        reports.filter(r => {
            if (!targetInstIds.has(r.institutionId)) return false;
            
            if (!isAllYears) {
              if (isQ1Selected) {
                const rYear = r.year || year;
                const rMonth = r.month || 1;
                const isPrevYearDec = rMonth === 12 && rYear === year - 1;
                const isCurrentYearJanFeb = (rMonth === 1 || rMonth === 2) && rYear === year;
                if (!isPrevYearDec && !isCurrentYearJanFeb) return false;
              } else {
                if (r.year && r.year !== year) return false;
                if (r.month && !selectedMonths.includes(r.month)) return false;
              }
            } else {
              if (r.month && !selectedMonths.includes(r.month)) return false;
            }

            return (activeTab === 'initiatives' 
              ? (r.categoryType === 'initiatives' || !r.categoryType) 
              : (r.categoryType === 'partnerships' || r.partnershipTitle || r.partnershipEntity));
        }).map(r => r.institutionId)
    );

    const yearLabel = isAllYears ? 'جميع السنوات' : selectedYear;
    let periodDesc = selectedMonths.map(m => MONTHS_AR[m - 1]).join('، ');
    if (timeframeMode === 'quarters') {
      const q = CUSTOM_QUARTERS.find(x => x.id === selectedQuarterId);
      if (q) periodDesc = q.name;
    }

    return {
        total: totalCount,
        submitted: submittedInstIds.size,
        periodLabel: `${periodDesc} (${yearLabel})`
    };
  }, [filteredInstitutions, reports, selectedYear, selectedMonths, activeTab, timeframeMode, selectedQuarterId]);

  // Excel Export Handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (displayMode === 'standard') {
      // Export Standard Table
      if (activeTab === 'initiatives') {
        const rows = initiativesRecords.map((r, i) => ({
          'م': i + 1,
          'التاريخ': r.date,
          'المؤسسة الصحية': r.institutionName,
          'الولاية': r.state,
          'نوع المبادرة': r.initiativeTypeLabel,
          'المجال / الفئة': r.categoryName,
          'البند الفرعي': r.subItem,
          'عدد المستفيدين': r.beneficiariesCount,
          'مدخل البيانات': r.entryPerson,
          'الملاحظات': r.notes,
        }));
        const totalBeneficiaries = initiativesRecords.reduce((s, r) => s + (r.beneficiariesCount || 0), 0);
        rows.push({
          'م': 'المجموع',
          'التاريخ': '—',
          'المؤسسة الصحية': `إجمالي السجلات: ${initiativesRecords.length}`,
          'الولاية': '—',
          'نوع المبادرة': '—',
          'المجال / الفئة': '—',
          'البند الفرعي': '—',
          'عدد المستفيدين': totalBeneficiaries,
          'مدخل البيانات': '—',
          'الملاحظات': '—',
        } as any);

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "تقرير_المبادرات");
        XLSX.writeFile(wb, `تقرير_المبادرات_${selectedYear}.xlsx`);
      } else {
        const rows = partnershipsRecords.map((r, i) => ({
          'م': i + 1,
          'التاريخ': r.date,
          'المؤسسة الصحية': r.institutionName,
          'الولاية': r.state,
          'عنوان الشراكة': r.partnershipTitle,
          'الجهة الشريكة': r.partnershipEntity,
          'الهدف من الشراكة': r.partnershipGoal,
          'مدخل البيانات': r.entryPerson,
          'الملاحظات': r.notes,
        }));
        rows.push({
          'م': 'المجموع',
          'التاريخ': '—',
          'المؤسسة الصحية': `إجمالي الشراكات: ${partnershipsRecords.length}`,
          'الولاية': '—',
          'عنوان الشراكة': '—',
          'الجهة الشريكة': '—',
          'الهدف من الشراكة': '—',
          'مدخل البيانات': '—',
          'الملاحظات': '—',
        } as any);

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "تقرير_الشراكات");
        XLSX.writeFile(wb, `تقرير_الشراكات_${selectedYear}.xlsx`);
      }
    } else {
      // Export Pivot Table as rendered matrix
      const tableElem = document.getElementById('report-printable-area')?.querySelector('table');
      if (tableElem) {
        const ws = XLSX.utils.table_to_sheet(tableElem);
        const sheetName = activeTab === 'initiatives' ? 'جدول_محوري_المبادرات' : 'جدول_محوري_الشراكات';
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${sheetName}_${selectedYear}.xlsx`);
      }
    }
  };

  // Print Preview / PDF Handler
  const handlePrint = () => {
    const printWrapper = document.getElementById('report-printable-area');
    if (!printWrapper) return;

    const w = window.open('', '_blank');
    if (w) {
        const tabTitle = activeTab === 'initiatives' ? 'المبادرات' : 'الشراكات';
        const modeTitle = displayMode === 'pivot' ? 'جدول محوري' : 'جدول عادي';

        const htmlContent = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
              <meta charset="UTF-8">
              <title>تقرير برنامج الإجادة المؤسسية - ${tabTitle} (${selectedYear})</title>
              <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
              <style>
                  @page { size: A4 landscape; margin: 1cm; }
                  body { font-family: 'Tajawal', sans-serif; background: white; margin: 0; padding: 0; color: #111827; }
                  .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1E3A8A; padding-bottom: 10px; }
                  .print-header h1 { font-size: 24px; font-weight: 800; color: #1E3A8A; margin: 0; }
                  .print-header p { font-size: 14px; color: #4B5563; margin-top: 5px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                  th, td { border: 1px solid #334155; padding: 6px 8px; text-align: center; }
                  th { background-color: #1E3A8A !important; color: white !important; font-weight: 800; }
                  .bg-amber-600, .bg-amber-500 { background-color: #D97706 !important; color: white !important; font-weight: bold; }
                  tr:nth-child(even) { background-color: #F8FAFC; }
              </style>
          </head>
          <body>
              <div class="print-header">
                  <h1>برنامج الإجادة المؤسسية - تقرير ${tabTitle} (${modeTitle})</h1>
                  <p>الفترة: ${selectedMonths.map(m => MONTHS_AR[m - 1]).join('، ')} ${selectedYear} | الولاية: ${selectedState === 'all' ? 'جميع الولايات' : selectedState}</p>
              </div>
              ${printWrapper.innerHTML}
          </body>
          </html>
        `;
        w.document.write(htmlContent);
        w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 800);
    }
  };

  return (
    <div className="bg-white p-3 sm:p-6 rounded-2xl shadow-xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800" ref={containerRef}>
      {/* Top Header & Export Buttons */}
      <div className="no-print space-y-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 sm:pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-300 leading-tight flex items-center gap-2">
              <span>تقارير برنامج الإجادة المؤسسية</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 hidden sm:inline-block">
                محدث ومخصص
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              استعراض تحليلي متكامل للشراكات والمبادرات بجداول محورية متقدمة وجداول بيانات عادية
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExportExcel} 
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 min-h-[40px]"
            >
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
              <span>تصدير Excel</span>
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-800 transition shadow-sm active:scale-95 min-h-[40px]"
            >
              <Printer className="w-4 h-4 flex-shrink-0" />
              <span>طباعة / PDF</span>
            </button>
          </div>
        </div>

        {/* 1. التبويبان الأساسيان في التقرير (الشراكات والمبادرات) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          {/* Main Tabs (المبادرات vs الشراكات) */}
          <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-900 p-1 flex-1 sm:max-w-md shadow-inner">
            <button
              onClick={() => setActiveTab('initiatives')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-black transition-all min-h-[38px] ${
                activeTab === 'initiatives'
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>المبادرات</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'initiatives' ? 'bg-white/25 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {initiativesRecords.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('partnerships')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-black transition-all min-h-[38px] ${
                activeTab === 'partnerships'
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-700'
              }`}
            >
              <Handshake className="w-4 h-4 text-emerald-300" />
              <span>الشراكات</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'partnerships' ? 'bg-white/25 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {partnershipsRecords.length}
              </span>
            </button>
          </div>

          {/* 2. طريقة العرض لكل تبويب (جداول محورية vs جداول عادية) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden lg:inline">طريقة العرض:</span>
            <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 p-0.5 sm:p-1 w-full sm:w-auto shadow-sm">
              <button
                onClick={() => setDisplayMode('pivot')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all min-h-[34px] ${
                  displayMode === 'pivot'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>جداول محورية (صفوف وأعمدة)</span>
              </button>

              <button
                onClick={() => setDisplayMode('standard')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all min-h-[34px] ${
                  displayMode === 'standard'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-700'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جداول عادية (عناوين وبيانات)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Filters Bar: السنة، الولاية، المؤسسة، وطريقة التصفية الزمنية */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-3">
            {/* 1. السنة */}
            <div className="col-span-1">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">السنة:</label>
              <SearchableSelect
                value={selectedYear}
                onChange={(val) => setSelectedYear(val)}
                options={[
                  { value: 'all', label: 'جميع السنوات' },
                  ...availableYears.map(y => ({ value: String(y), label: String(y) }))
                ]}
                placeholder="اختر السنة"
                searchPlaceholder="ابحث عن سنة..."
                buttonClassName="min-h-[40px] py-1.5 px-3 text-xs sm:text-sm"
              />
            </div>

            {/* 2. الولاية */}
            <div className="col-span-1">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">الولاية:</label>
              {isInstitutionUser ? (
                <div className="input-style py-1 px-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold min-h-[40px] flex items-center">
                  {currentUser?.state || 'ولايتك'}
                </div>
              ) : (
                <SearchableSelect
                  value={selectedState}
                  onChange={(val) => {
                    setSelectedState(val);
                    setSelectedInstitutionId('all');
                  }}
                  options={[
                    { value: 'all', label: 'جميع الولايات' },
                    ...availableStates.map(s => ({ value: s, label: s }))
                  ]}
                  placeholder="اختر الولاية"
                  searchPlaceholder="ابحث عن ولاية..."
                  buttonClassName="min-h-[40px] py-1.5 px-3 text-xs sm:text-sm"
                />
              )}
            </div>

            {/* 3. المؤسسة */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">المؤسسة:</label>
              {isInstitutionUser ? (
                <div className="input-style py-1 px-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold truncate min-h-[40px] flex items-center">
                  {currentUser?.name}
                </div>
              ) : (
                <SearchableSelect
                  value={selectedInstitutionId}
                  onChange={(val) => setSelectedInstitutionId(val)}
                  options={[
                    { value: 'all', label: 'جميع المؤسسات' },
                    ...users
                      .filter(u => u.role === UserRole.INSTITUTION && (selectedState === 'all' || u.state === selectedState))
                      .sort((a,b) => a.name.localeCompare(b.name, 'ar'))
                      .map(u => ({
                        value: String(u.id),
                        label: u.name,
                        subLabel: u.state ? `الولاية: ${u.state}` : undefined
                      }))
                  ]}
                  placeholder="اختر المؤسسة"
                  searchPlaceholder="ابحث عن مؤسسة بالاسم أو الولاية..."
                  buttonClassName="min-h-[40px] py-1.5 px-3 text-xs sm:text-sm"
                />
              )}
            </div>
          </div>

          {/* Timeframe Mode Toggle (بالأشهر، بأرباع سنوية، نصف سنوية) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] sm:text-xs font-black text-slate-600 dark:text-slate-300">طريقة التصفية:</span>
                <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-600 p-0.5 sm:p-1">
                  <button 
                    onClick={() => setTimeframeMode('months')} 
                    className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all min-h-[32px] ${timeframeMode === 'months' ? 'bg-blue-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    بالأشهر
                  </button>
                  <button 
                    onClick={() => {
                      setTimeframeMode('quarters');
                      selectQuarter(selectedQuarterId || prevQuarterInfo.quarterId);
                    }} 
                    className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all min-h-[32px] ${timeframeMode === 'quarters' ? 'bg-blue-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    أرباع سنوية
                  </button>
                  <button 
                    onClick={() => {
                      setTimeframeMode('halves');
                      selectHalf('h1');
                    }} 
                    className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all min-h-[32px] ${timeframeMode === 'halves' ? 'bg-blue-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    نصف سنوية
                  </button>
                </div>
              </div>

              {timeframeMode === 'months' && (
                <div className="flex gap-2">
                  <button onClick={selectAllMonths} className="flex-1 sm:flex-none px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-blue-100 transition min-h-[32px]">جميع الأشهر</button>
                  <button onClick={() => {
                    const lastMonth = new Date().getMonth(); // الشهر الماضي (0-11)
                    const m = lastMonth === 0 ? 12 : lastMonth;
                    setSelectedMonths([m]);
                  }} className="flex-1 sm:flex-none px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] sm:text-xs font-bold hover:bg-slate-200 transition min-h-[32px]">الشهر الماضي</button>
                </div>
              )}
            </div>

            {/* Months picker buttons */}
            {timeframeMode === 'months' && (
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 sm:gap-2 animate-fade-in">
                {MONTHS_AR.map((m, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => toggleMonth(idx + 1)} 
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all text-center min-h-[38px] flex items-center justify-center ${
                      selectedMonths.includes(idx + 1) 
                      ? 'bg-blue-700 text-white border-blue-800 shadow-md font-black' 
                      : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* Quarters buttons */}
            {timeframeMode === 'quarters' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 animate-fade-in">
                {CUSTOM_QUARTERS.map(q => {
                  const isSelected = selectedQuarterId === q.id;
                  const isDefaultPastQuarter = q.id === prevQuarterInfo.quarterId;
                  return (
                    <button 
                      key={q.id} 
                      onClick={() => selectQuarter(q.id)} 
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all min-h-[46px] text-center flex flex-col items-center justify-center gap-1 ${
                        isSelected 
                        ? 'bg-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-400 font-black' 
                        : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{q.name}</span>
                        {isDefaultPastQuarter && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-amber-400 text-slate-900 font-black' : 'bg-amber-100 text-amber-800'}`}>
                            الربع السابق
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {q.label.replace(q.name, '').trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Halves buttons */}
            {timeframeMode === 'halves' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 animate-fade-in">
                {HALVES.map(h => (
                  <button 
                    key={h.id} 
                    onClick={() => selectHalf(h.id)} 
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all min-h-[38px] text-center ${
                      JSON.stringify(selectedMonths) === JSON.stringify(h.months) 
                      ? 'bg-blue-700 text-white border-blue-800 shadow-md font-black' 
                      : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission stats banner */}
      {submissionStats && !isInstitutionUser && (
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-200 dark:border-blue-800/60 flex items-center justify-between mb-4 sm:mb-6 no-print shadow-sm gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-700 text-white p-2 rounded-xl shadow-md flex-shrink-0">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-blue-950 dark:text-blue-300 leading-tight">
                تسليم تقارير {activeTab === 'initiatives' ? 'المبادرات' : 'الشراكات'} للفترة المحددة
              </h4>
              <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-400 font-bold">{submissionStats.periodLabel}</p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 items-baseline flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden xs:inline">المؤسسات:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black text-blue-800 dark:text-blue-300 font-mono">{submissionStats.submitted}</span>
              <span className="text-xs sm:text-sm font-bold text-slate-400">/ {submissionStats.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Printable / Viewable Report Area */}
      <div id="report-printable-area">
        {displayMode === 'pivot' ? (
          activeTab === 'initiatives' ? (
            /* جداول محورية للمبادرات (افتراضيا الصفوف: نوع المبادرة والحقول الفرعية التي تليها: المجال ثم البند الفرعي، وفي الأعمدة: الأرباع) */
            <PivotTableEngine
              title="الجدول المحوري للمبادرات"
              records={initiativesRecords}
              allInstitutions={filteredInstitutions}
              availableDimensions={INITIATIVES_DIMENSIONS}
              defaultRowDimensions={['initiativeType', 'categoryName', 'subItem']}
              defaultColDimensions={['quarter']}
              metricType={initiativeMetric}
              onMetricTypeChange={setInitiativeMetric}
              showMetricSelector={true}
              themeColor="blue"
            />
          ) : (
            /* جداول محورية للشراكات (افتراضيا في الأعمدة: الأرباع وفي الصفوف: الجهة الشريكة وعنوان الشراكة) */
            <PivotTableEngine
              title="الجدول المحوري للشراكات"
              records={partnershipsRecords}
              allInstitutions={filteredInstitutions}
              availableDimensions={PARTNERSHIPS_DIMENSIONS}
              defaultRowDimensions={['partnershipEntity', 'partnershipTitle']}
              defaultColDimensions={['quarter']}
              metricType="count"
              showMetricSelector={false}
              themeColor="blue"
            />
          )
        ) : (
          /* جداول عادية: صف للعناوين وبالباقي للبيانات */
          <StandardTableEngine
            type={activeTab}
            records={currentRecords}
          />
        )}
      </div>
    </div>
  );
};

export default ReportsTable;
