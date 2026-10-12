import React, { useState, useMemo } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Plus, 
  RotateCcw, 
  ArrowLeftRight, 
  Layers, 
  Check, 
  ChevronDown, 
  SlidersHorizontal,
  Hash,
  Sparkles
} from 'lucide-react';

export interface EnrichedRecord {
  id: number;
  institutionId: number;
  institutionName: string;
  state: string;
  year: number;
  operationalYear?: number;
  quarterId?: string;
  quarterName?: string;
  month: number;
  monthName: string;
  monthQuarterLabel?: string;
  date: string;
  entryPerson: string;
  categoryType: 'partnerships' | 'initiatives';
  partnershipTitle?: string;
  partnershipEntity?: string;
  partnershipGoal?: string;
  initiativeType?: string;
  initiativeTypeLabel?: string;
  categoryName?: string;
  subItem?: string;
  beneficiariesCount?: number;
  notes?: string;
  updatedAt?: number;
}

export interface DimensionConfig {
  id: string;
  label: string;
  icon: string;
  hasBranches?: boolean;
  getValue: (r: EnrichedRecord) => string;
}

interface PivotTableEngineProps {
  records: EnrichedRecord[];
  allInstitutions?: { id: number; name: string; state?: string }[];
  availableDimensions: DimensionConfig[];
  defaultRowDimensions: string[];
  defaultColDimensions: string[];
  metricType: 'sum_beneficiaries' | 'count';
  onMetricTypeChange?: (m: 'sum_beneficiaries' | 'count') => void;
  showMetricSelector?: boolean;
  themeColor?: 'blue' | 'emerald';
  title: string;
}

// دالة مقارنة وترتيب الأبعاد زمنياً وأبجدياً وهرمياً
export function compareDimensionValues(dimId: string, a: string, b: string): number {
  if (a === b) return 0;
  
  // 1. السنة: ترتيب رقمي
  if (dimId === 'year') {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  }
  
  // 2. الربع السنوي: ترتيب الأرباع الأربعة
  if (dimId === 'quarter') {
    const qOrder: Record<string, number> = {
      'الربع الأول': 1,
      'الربع الثاني': 2,
      'الربع الثالث': 3,
      'الربع الرابع': 4,
      'q1': 1, 'q2': 2, 'q3': 3, 'q4': 4
    };
    const orderA = qOrder[a] ?? 99;
    const orderB = qOrder[b] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
  }
  
  // 3. الشهر: في نظام الأرباع المخصص، شهر ديسمبر للعام الماضي يأتي أولاً في الربع الأول، ثم يناير، ثم فبراير...
  if (dimId === 'month') {
    const getMonthOrder = (str: string): number => {
      if (str.includes('ديسمبر')) return 0;
      if (str.includes('يناير')) return 1;
      if (str.includes('فبراير')) return 2;
      if (str.includes('مارس')) return 3;
      if (str.includes('أبريل')) return 4;
      if (str.includes('مايو')) return 5;
      if (str.includes('يونيو')) return 6;
      if (str.includes('يوليو')) return 7;
      if (str.includes('أغسطس')) return 8;
      if (str.includes('سبتمبر')) return 9;
      if (str.includes('أكتوبر')) return 10;
      if (str.includes('نوفمبر')) return 11;
      const parsed = parseInt(str, 10);
      if (!isNaN(parsed)) return parsed;
      return 99;
    };
    const orderA = getMonthOrder(a);
    const orderB = getMonthOrder(b);
    if (orderA !== orderB) return orderA - orderB;
  }
  
  // ترتيب نصي عربي افتراضي
  return a.localeCompare(b, 'ar');
}

export const PivotTableEngine: React.FC<PivotTableEngineProps> = ({
  records,
  allInstitutions = [],
  availableDimensions,
  defaultRowDimensions,
  defaultColDimensions,
  metricType,
  onMetricTypeChange,
  showMetricSelector = false,
  themeColor = 'blue',
  title,
}) => {
  // الحقول النشطة للصفوف والأعمدة
  const [rowDims, setRowDims] = useState<string[]>(defaultRowDimensions);
  const [colDims, setColDims] = useState<string[]>(defaultColDimensions);

  // إظهار أو إخفاء إجمالي الفروع لكل بعد
  const [showSubtotals, setShowSubtotals] = useState<Record<string, boolean>>({
    state: true,
    institution: false,
    initiativeType: false,
    categoryName: false,
    partnershipEntity: false,
    year: false,
    quarter: false,
  });

  // حالة فتح/إغلاق لوحة التخصيص
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [addingToTarget, setAddingToTarget] = useState<'rows' | 'cols' | null>(null);

  // تبديل إظهار إجمالي الفرع لبُعد معين
  const toggleSubtotal = (dimId: string) => {
    setShowSubtotals(prev => ({
      ...prev,
      [dimId]: !prev[dimId],
    }));
  };

  // ترتيب حقول الصفوف (للأعلى / للأسفل)
  const moveRowDim = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rowDims.length) return;
    const newDims = [...rowDims];
    const [moved] = newDims.splice(index, 1);
    newDims.splice(targetIdx, 0, moved);
    setRowDims(newDims);
  };

  // ترتيب حقول الأعمدة (لليمين / لليسار)
  const moveColDim = (index: number, direction: 'prev' | 'next') => {
    const targetIdx = direction === 'prev' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= colDims.length) return;
    const newDims = [...colDims];
    const [moved] = newDims.splice(index, 1);
    newDims.splice(targetIdx, 0, moved);
    setColDims(newDims);
  };

  // حذف حقل
  const removeRowDim = (dimId: string) => {
    if (rowDims.length <= 1) {
      alert('يجب الإبقاء على حقل واحد على الأقل في الصفوف');
      return;
    }
    setRowDims(rowDims.filter(id => id !== dimId));
  };

  const removeColDim = (dimId: string) => {
    if (colDims.length <= 1) {
      alert('يجب الإبقاء على حقل واحد على الأقل في الأعمدة');
      return;
    }
    setColDims(colDims.filter(id => id !== dimId));
  };

  // إضافة حقل
  const addDimension = (dimId: string, target: 'rows' | 'cols') => {
    if (target === 'rows') {
      if (!rowDims.includes(dimId)) {
        setRowDims([...rowDims, dimId]);
        setColDims(colDims.filter(id => id !== dimId));
      }
    } else {
      if (!colDims.includes(dimId)) {
        setColDims([...colDims, dimId]);
        setRowDims(rowDims.filter(id => id !== dimId));
      }
    }
    setAddingToTarget(null);
  };

  // تبديل الصفوف والأعمدة
  const handleSwap = () => {
    const tempRows = [...rowDims];
    setRowDims([...colDims]);
    setColDims(tempRows);
  };

  // إعادة التعيين للوضع الافتراضي
  const handleReset = () => {
    setRowDims(defaultRowDimensions);
    setColDims(defaultColDimensions);
  };

  // قاموس الأبعاد للوصول السريع
  const dimMap = useMemo(() => {
    const map = new Map<string, DimensionConfig>();
    availableDimensions.forEach(d => map.set(d.id, d));
    return map;
  }, [availableDimensions]);

  // الأبعاد غير المستخدمة
  const unusedDimensions = useMemo(() => {
    return availableDimensions.filter(d => !rowDims.includes(d.id) && !colDims.includes(d.id));
  }, [availableDimensions, rowDims, colDims]);

  // حساب قيمة السجل الواحد بناءً على المؤشر المختار
  const getRecordValue = (r: EnrichedRecord): number => {
    if (metricType === 'sum_beneficiaries') {
      return Number(r.beneficiariesCount || 0);
    }
    return 1;
  };

  // بناء هيكلية الجدول المحوري الكاملة هرمياً
  const pivotData = useMemo(() => {
    // -------------------------------------------------------------
    // 1. أعمدة الجدول المحوري (Columns Hierarchy Tree)
    // -------------------------------------------------------------
    const rawColCombinations: string[][] = [];

    // استخراج المسارات من السجلات
    records.forEach(r => {
      const path = colDims.map(dimId => {
        const dim = dimMap.get(dimId);
        return dim ? (dim.getValue(r) || 'غير محدد') : 'غير محدد';
      });
      if (!rawColCombinations.some(existing => existing.every((val, i) => val === path[i]))) {
        rawColCombinations.push(path);
      }
    });

    // في حال اختيار السنة ثم الأرباع ثم الأشهر في الأعمدة، نضمن ظهور شجرة الأرباع والأشهر كاملة
    const hasYearInCols = colDims.includes('year');
    const hasQuarterInCols = colDims.includes('quarter');
    const hasMonthInCols = colDims.includes('month');

    if (hasYearInCols && hasQuarterInCols) {
      // استخراج السنوات المتاحة
      const availableYears: string[] = Array.from(new Set(records.map(r => String(r.operationalYear || r.year)))).filter((y): y is string => Boolean(y));
      const targetYears: string[] = availableYears.length > 0 ? availableYears : [String(new Date().getFullYear())];

      targetYears.forEach((yStr: string) => {
        const yNum = parseInt(yStr, 10) || new Date().getFullYear();
        const prevY = yNum - 1;

        const quartersInfo = [
          { q: 'الربع الأول', months: [`ديسمبر ${prevY}`, 'يناير', 'فبراير'] },
          { q: 'الربع الثاني', months: ['مارس', 'أبريل', 'مايو'] },
          { q: 'الربع الثالث', months: ['يونيو', 'يوليو', 'أغسطس'] },
          { q: 'الربع الرابع', months: ['سبتمبر', 'أكتوبر', 'نوفمبر'] },
        ];

        quartersInfo.forEach(({ q, months }) => {
          if (hasMonthInCols) {
            months.forEach(m => {
              const path = colDims.map(dimId => {
                if (dimId === 'year') return yStr;
                if (dimId === 'quarter') return q;
                if (dimId === 'month') return m;
                return '';
              });
              if (!rawColCombinations.some(existing => existing.every((val, i) => val === path[i]))) {
                rawColCombinations.push(path);
              }
            });
          } else {
            const path = colDims.map(dimId => {
              if (dimId === 'year') return yStr;
              if (dimId === 'quarter') return q;
              return '';
            });
            if (!rawColCombinations.some(existing => existing.every((val, i) => val === path[i]))) {
              rawColCombinations.push(path);
            }
          }
        });
      });
    } else if (hasQuarterInCols && colDims.length === 1) {
      // إذا كان البعد الوحيد في الأعمدة هو الربع السنوي، نضمن ظهور الأرباع الأربعة دائماً بالترتيب القياسي
      const allFourQuarters = ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع'];
      allFourQuarters.forEach(q => {
        const path = [q];
        if (!rawColCombinations.some(existing => existing[0] === q)) {
          rawColCombinations.push(path);
        }
      });
    }

    if (rawColCombinations.length === 0) {
      const defaultPath = colDims.map(dimId => dimMap.get(dimId)?.label || 'غير محدد');
      rawColCombinations.push(defaultPath);
    }

    // ترتيب الأعمدة هرمياً وزمنياً
    rawColCombinations.sort((a, b) => {
      for (let i = 0; i < colDims.length; i++) {
        const dimId = colDims[i];
        const cmp = compareDimensionValues(dimId, a[i] || '', b[i] || '');
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    // بناء الأعمدة الطرفية (Leaf Columns)
    interface LeafCol {
      id: string;
      path: string[];
      label: string;
    }

    const leafColumns: LeafCol[] = rawColCombinations.map((path, idx) => ({
      id: `leaf_col_${idx}_${path.join('___')}`,
      path,
      label: path[path.length - 1],
    }));

    // توليد صفوف رؤوس الأعمدة (Header Rows for <thead>)
    interface ColHeaderCell {
      id: string;
      label: string;
      dimId: string;
      dimLabel: string;
      colSpan: number;
      rowSpan: number;
      fullPath: string[];
      isLeaf: boolean;
    }

    const headerRows: ColHeaderCell[][] = [];

    colDims.forEach((dimId, level) => {
      const currentLevelCells: ColHeaderCell[] = [];
      const dim = dimMap.get(dimId);

      let currentPrefix: string | null = null;
      let currentGroupLeaves = 0;
      let currentLabel = '';
      let currentPath: string[] = [];

      leafColumns.forEach((col, cIdx) => {
        const prefix = col.path.slice(0, level + 1).join('___');
        const valAtLevel = col.path[level];

        if (prefix === currentPrefix) {
          currentGroupLeaves++;
        } else {
          if (currentPrefix !== null) {
            currentLevelCells.push({
              id: `th_lvl_${level}_${currentPrefix}_${cIdx}`,
              label: currentLabel,
              dimId,
              dimLabel: dim?.label || '',
              colSpan: currentGroupLeaves,
              rowSpan: 1,
              fullPath: currentPath,
              isLeaf: level === colDims.length - 1,
            });
          }

          currentPrefix = prefix;
          currentLabel = valAtLevel;
          currentGroupLeaves = 1;
          currentPath = col.path.slice(0, level + 1);
        }
      });

      if (currentPrefix !== null) {
        currentLevelCells.push({
          id: `th_lvl_${level}_${currentPrefix}_last`,
          label: currentLabel,
          dimId,
          dimLabel: dim?.label || '',
          colSpan: currentGroupLeaves,
          rowSpan: 1,
          fullPath: currentPath,
          isLeaf: level === colDims.length - 1,
        });
      }

      headerRows.push(currentLevelCells);
    });

    // -------------------------------------------------------------
    // 2. صفوف الجدول المحوري (Rows Hierarchy Tree)
    // -------------------------------------------------------------
    const rawRowCombinations: string[][] = [];

    const hasStateInRows = rowDims.includes('state');
    const hasInstInRows = rowDims.includes('institution');

    if (hasStateInRows && hasInstInRows && allInstitutions.length > 0) {
      allInstitutions.forEach(inst => {
        const path = rowDims.map(dimId => {
          if (dimId === 'state') return inst.state || 'غير محدد';
          if (dimId === 'institution') return inst.name;
          return '';
        });
        if (rowDims.length === 2) {
          if (!rawRowCombinations.some(existing => existing.every((val, i) => val === path[i]))) {
            rawRowCombinations.push(path);
          }
        }
      });
    }

    records.forEach(r => {
      const path = rowDims.map(dimId => {
        const dim = dimMap.get(dimId);
        return dim ? (dim.getValue(r) || 'غير محدد') : 'غير محدد';
      });
      if (!rawRowCombinations.some(existing => existing.every((val, i) => val === path[i]))) {
        rawRowCombinations.push(path);
      }
    });

    if (rawRowCombinations.length === 0) {
      rawRowCombinations.push(rowDims.map(dimId => dimMap.get(dimId)?.label || 'لا توجد بيانات'));
    }

    // ترتيب الصفوف هرمياً
    rawRowCombinations.sort((a, b) => {
      for (let i = 0; i < rowDims.length; i++) {
        const dimId = rowDims[i];
        const cmp = compareDimensionValues(dimId, a[i] || '', b[i] || '');
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    // -------------------------------------------------------------
    // 3. خريطة القيم السريعة (Values Map)
    // -------------------------------------------------------------
    const cellValuesMap = new Map<string, number>();

    records.forEach(r => {
      const rPath = rowDims.map(dimId => dimMap.get(dimId)?.getValue(r) || 'غير محدد').join('___');
      const cPath = colDims.map(dimId => dimMap.get(dimId)?.getValue(r) || 'غير محدد').join('___');
      const key = `${rPath}|||${cPath}`;
      const val = getRecordValue(r);
      cellValuesMap.set(key, (cellValuesMap.get(key) || 0) + val);
    });

    // -------------------------------------------------------------
    // 4. توليد الصفوف الهرمية المعروضة بدون إزاحة وبدون أعمدة زائدة
    // -------------------------------------------------------------
    interface RenderCellHeader {
      value: string;
      rowSpan: number;
      colSpan: number;
      dimId: string;
      level: number;
      isSticky?: boolean;
    }

    interface TableOutputRow {
      id: string;
      isSubtotal?: boolean;
      subtotalLabel?: string;
      subtotalLevel?: number;
      headers: RenderCellHeader[];
      values: number[];
      rowTotal: number;
    }

    const tableOutputRows: TableOutputRow[] = [];
    const colTotals: number[] = new Array(leafColumns.length).fill(0);
    let grandTotal = 0;

    interface HierarchicalRowGroup {
      value: string;
      dimId: string;
      level: number;
      fullPath: string[];
      children: HierarchicalRowGroup[];
      leafPaths: string[][];
    }

    function buildRowGroupTree(paths: string[][], level: number, prefix: string[]): HierarchicalRowGroup[] {
      if (level >= rowDims.length) return [];
      const dimId = rowDims[level];
      const map = new Map<string, string[][]>();

      paths.forEach(p => {
        const val = p[level] || 'غير محدد';
        if (!map.has(val)) map.set(val, []);
        map.get(val)!.push(p);
      });

      const groups: HierarchicalRowGroup[] = [];
      const sortedKeys = Array.from(map.keys()).sort((a, b) => compareDimensionValues(dimId, a, b));

      sortedKeys.forEach(val => {
        const childPaths = map.get(val)!;
        const currentPath = [...prefix, val];
        const children = buildRowGroupTree(childPaths, level + 1, currentPath);

        groups.push({
          value: val,
          dimId,
          level,
          fullPath: currentPath,
          children,
          leafPaths: childPaths,
        });
      });

      return groups;
    }

    const rootGroups = buildRowGroupTree(rawRowCombinations, 0, []);

    // دالة تكرارية لمعالجة المجموعات وتوليد الأسطر
    function renderGroupToRows(
      group: HierarchicalRowGroup
    ): { renderedRowsCount: number; totals: number[]; rowTotal: number } {
      const isLeafLevel = group.children.length === 0;
      const dimId = group.dimId;
      const isSubtotalEnabled = showSubtotals[dimId] === true;

      let groupColTotals = new Array(leafColumns.length).fill(0);
      let groupTotal = 0;

      if (isLeafLevel) {
        // صف طرفي نهائي
        const rPath = group.fullPath;
        const rowVals: number[] = leafColumns.map((col, cIdx) => {
          const key = `${rPath.join('___')}|||${col.path.join('___')}`;
          const val = cellValuesMap.get(key) || 0;
          colTotals[cIdx] += val;
          groupColTotals[cIdx] += val;
          return val;
        });

        const rTotal = rowVals.reduce((a, b) => a + b, 0);
        groupTotal += rTotal;
        grandTotal += rTotal;

        const headers: RenderCellHeader[] = [
          {
            value: group.value,
            rowSpan: 1,
            colSpan: 1,
            dimId,
            level: group.level,
            isSticky: group.level === 0,
          }
        ];

        tableOutputRows.push({
          id: `row_leaf_${rPath.join('___')}`,
          isSubtotal: false,
          headers,
          values: rowVals,
          rowTotal: rTotal,
        });

        return { renderedRowsCount: 1, totals: groupColTotals, rowTotal: groupTotal };
      }

      // إذا كان مستوى أعلى يتفرع منه فروع (مثل الولاية وبداخلها المؤسسات)
      const startIndex = tableOutputRows.length;
      let childRowsCountWithoutSubtotal = 0;

      group.children.forEach(childGroup => {
        const res = renderGroupToRows(childGroup);
        childRowsCountWithoutSubtotal += res.renderedRowsCount;

        res.totals.forEach((v, i) => {
          groupColTotals[i] += v;
        });
        groupTotal += res.rowTotal;
      });

      // وضع رأس الأب في أول صف للطفل الأول
      // مهم جداً: rowSpan هنا يساوي فقط عدد صفوف أطفاله childRowsCountWithoutSubtotal
      // ولا يشمل سطر إجماليه هو، حتى لا يتداخل مع سطر الإجمالي وينتج عموداً زائداً!
      if (tableOutputRows.length > startIndex) {
        const firstRowOfGroup = tableOutputRows[startIndex];
        const parentHeader: RenderCellHeader = {
          value: group.value,
          rowSpan: childRowsCountWithoutSubtotal,
          colSpan: 1,
          dimId,
          level: group.level,
          isSticky: group.level === 0,
        };
        firstRowOfGroup.headers.unshift(parentHeader);
      }

      // إضافة سطر إجمالي الفرع إذا كان مفعلاً لهذا البعد وكان هناك أكثر من مستوى
      const shouldAddSubtotal = isSubtotalEnabled && rowDims.length > 1;

      if (shouldAddSubtotal) {
        tableOutputRows.push({
          id: `subtotal_${group.fullPath.join('___')}`,
          isSubtotal: true,
          subtotalLabel: `إجمالي ${dimMap.get(dimId)?.label || ''} (${group.value})`,
          subtotalLevel: group.level,
          headers: [
            {
              value: `إجمالي ${dimMap.get(dimId)?.label || ''} (${group.value})`,
              rowSpan: 1,
              colSpan: rowDims.length - group.level,
              dimId,
              level: group.level,
              isSticky: group.level === 0,
            }
          ],
          values: [...groupColTotals],
          rowTotal: groupTotal,
        });
      }

      const totalGroupRows = childRowsCountWithoutSubtotal + (shouldAddSubtotal ? 1 : 0);

      return {
        renderedRowsCount: totalGroupRows,
        totals: groupColTotals,
        rowTotal: groupTotal,
      };
    }

    rootGroups.forEach(rootGroup => {
      renderGroupToRows(rootGroup);
    });

    return {
      headerRows,
      leafColumns,
      tableOutputRows,
      colTotals,
      grandTotal,
    };
  }, [records, allInstitutions, rowDims, colDims, dimMap, metricType, showSubtotals]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Pivot Table Configuration Bar */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 p-3 sm:p-4 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                <span>{title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  متعدد المستويات الهرمية
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                خصص حقول الصفوف والأعمدة وتفرعاتها (مثل: الولاية ← المؤسسة، أو السنة ← الأرباع ← الأشهر)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Metric Selector if allowed */}
            {showMetricSelector && onMetricTypeChange && (
              <div className="flex items-center rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => onMetricTypeChange('count')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    metricType === 'count'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  عدد المبادرات
                </button>
                <button
                  type="button"
                  onClick={() => onMetricTypeChange('sum_beneficiaries')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    metricType === 'sum_beneficiaries'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  إجمالي المستفيدين
                </button>
              </div>
            )}

            {/* Swap Rows & Columns */}
            <button
              onClick={handleSwap}
              title="تبديل الصفوف والأعمدة"
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">عكس المحاور</span>
            </button>

            {/* Reset to default */}
            <button
              onClick={handleReset}
              title="إعادة التعيين للوضع الافتراضي"
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-bold shadow-sm transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Toggle full configuration box */}
            <button
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isControlsOpen ? 'إخفاء التخصيص' : 'تخصيص الحقول والتفرعات'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isControlsOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Fields Setup Drawer */}
        {isControlsOpen && (
          <div className="pt-3 border-t border-blue-200/80 dark:border-slate-700 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. التحكم في الصفوف والتفرعات */}
              <div className="bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-xl border-2 border-blue-200 dark:border-blue-900/40">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-blue-900 dark:text-blue-300">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>حقول وتفرعات الصفوف (Rows):</span>
                    <span className="text-[11px] text-slate-400 font-normal">({rowDims.length})</span>
                  </div>

                  {unusedDimensions.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setAddingToTarget(addingToTarget === 'rows' ? null : 'rows')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة حقل للصفوف</span>
                      </button>

                      {addingToTarget === 'rows' && (
                        <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 animate-fade-in">
                          <div className="px-3 py-1 text-[10px] font-black text-slate-400 border-b dark:border-slate-700">اختر حقلاً ليتفرع في الصفوف:</div>
                          {unusedDimensions.map(d => (
                            <button
                              key={d.id}
                              onClick={() => addDimension(d.id, 'rows')}
                              className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between"
                            >
                              <span>{d.icon} {d.label}</span>
                              <Plus className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rows active list */}
                <div className="space-y-2">
                  {rowDims.map((dimId, idx) => {
                    const dim = dimMap.get(dimId);
                    if (!dim) return null;
                    const canMoveUp = idx > 0;
                    const canMoveDown = idx < rowDims.length - 1;
                    const subtotalActive = showSubtotals[dimId] === true;

                    return (
                      <div 
                        key={dimId}
                        className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 flex items-center justify-center text-[10px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-slate-800 dark:text-slate-100">{dim.icon} {dim.label}</span>
                            {idx > 0 && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                ↳ يتفرع من: {dimMap.get(rowDims[idx - 1])?.label}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle subtotal for branches */}
                          <button
                            onClick={() => toggleSubtotal(dimId)}
                            title={subtotalActive ? 'إخفاء إجمالي الفروع لهذا الحقل' : 'إظهار إجمالي الفروع لهذا الحقل'}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                              subtotalActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            <Hash className="w-3 h-3" />
                            <span>{subtotalActive ? 'إجمالي: مفعّل' : 'إجمالي: معطل'}</span>
                          </button>

                          {/* Reorder arrows */}
                          <button
                            onClick={() => moveRowDim(idx, 'up')}
                            disabled={!canMoveUp}
                            className={`p-1 rounded-lg border ${canMoveUp ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' : 'opacity-25 border-transparent text-slate-400'}`}
                            title="تقديم الترتيب للأعلى (مستوى أب)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveRowDim(idx, 'down')}
                            disabled={!canMoveDown}
                            className={`p-1 rounded-lg border ${canMoveDown ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' : 'opacity-25 border-transparent text-slate-400'}`}
                            title="تأخير الترتيب للأسفل (مستوى فرعي)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove dimension button */}
                          <button
                            onClick={() => removeRowDim(dimId)}
                            className="p-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-200 transition"
                            title="حذف هذا الحقل من الصفوف"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. التحكم في الأعمدة والتفرعات */}
              <div className="bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/40">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-indigo-900 dark:text-indigo-300">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>حقول وتفرعات الأعمدة (Columns):</span>
                    <span className="text-[11px] text-slate-400 font-normal">({colDims.length})</span>
                  </div>

                  {unusedDimensions.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setAddingToTarget(addingToTarget === 'cols' ? null : 'cols')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة حقل للأعمدة</span>
                      </button>

                      {addingToTarget === 'cols' && (
                        <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 animate-fade-in">
                          <div className="px-3 py-1 text-[10px] font-black text-slate-400 border-b dark:border-slate-700">اختر حقلاً ليتفرع في الأعمدة:</div>
                          {unusedDimensions.map(d => (
                            <button
                              key={d.id}
                              onClick={() => addDimension(d.id, 'cols')}
                              className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between"
                            >
                              <span>{d.icon} {d.label}</span>
                              <Plus className="w-3.5 h-3.5 text-indigo-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Columns active list */}
                <div className="space-y-2">
                  {colDims.map((dimId, idx) => {
                    const dim = dimMap.get(dimId);
                    if (!dim) return null;
                    const canMovePrev = idx > 0;
                    const canMoveNext = idx < colDims.length - 1;

                    return (
                      <div 
                        key={dimId}
                        className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 flex items-center justify-center text-[10px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-slate-800 dark:text-slate-100">{dim.icon} {dim.label}</span>
                            {idx > 0 && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                ↳ يتفرع من: {dimMap.get(colDims[idx - 1])?.label}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Reorder arrows */}
                          <button
                            onClick={() => moveColDim(idx, 'prev')}
                            disabled={!canMovePrev}
                            className={`p-1 rounded-lg border ${canMovePrev ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' : 'opacity-25 border-transparent text-slate-400'}`}
                            title="تقديم الترتيب لليمين (عنوان رئيسي)"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveColDim(idx, 'next')}
                            disabled={!canMoveNext}
                            className={`p-1 rounded-lg border ${canMoveNext ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' : 'opacity-25 border-transparent text-slate-400'}`}
                            title="تأخير الترتيب لليسار (عنوان فرعي)"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove dimension button */}
                          <button
                            onClick={() => removeColDim(dimId)}
                            className="p-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-200 transition"
                            title="حذف هذا الحقل من الأعمدة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
              <span>💡 تلميح: تفرع الأعمدة مثل آلية الصفوف تماماً؛ فعند اختيار "السنة" ثم "الربع السنوي" ثم "الشهر"، ستتفرع الأعمدة تلقائياً من السنة إلى أرباعها وأشهرها.</span>
              <button 
                onClick={() => setIsControlsOpen(false)}
                className="text-blue-700 dark:text-blue-400 font-bold hover:underline self-end"
              >
                إغلاق لوحة التخصيص ▲
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Horizontal Scroll Hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium sm:hidden">
        <span className="flex items-center gap-1">
          <span>↔️</span>
          <span>اسحب أفقياً لاستعراض كافة الفروع والأعمدة وعمود الإجمالي</span>
        </span>
        <span className="font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {pivotData.tableOutputRows.length} صف • {pivotData.leafColumns.length + 1} عمود
        </span>
      </div>

      {/* Pivot Table Scrollable Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md bg-white dark:bg-slate-900">
        <table className="w-full border-collapse text-center text-xs sm:text-sm">
          <thead>
            {/* Hierarchical Column Header Rows */}
            {pivotData.headerRows.map((headerRow, lvl) => (
              <tr 
                key={`col_header_lvl_${lvl}`}
                className={lvl === 0 ? 'bg-blue-800 text-white dark:bg-blue-950' : 'bg-blue-700 text-white dark:bg-blue-900'}
              >
                {/* At level 0, render headers for row dimensions spanning vertically across all header levels */}
                {lvl === 0 && rowDims.map((dimId, rIdx) => {
                  const dim = dimMap.get(dimId);
                  return (
                    <th
                      key={`th_row_dim_${dimId}`}
                      rowSpan={colDims.length}
                      className={`border border-blue-600 dark:border-slate-700 p-2 sm:p-3 text-right pr-3 font-bold min-w-[120px] sm:min-w-[160px] ${
                        rIdx === 0 
                          ? 'sticky right-0 bg-blue-800 dark:bg-blue-950 z-30 shadow-[-2px_0_6px_rgba(0,0,0,0.15)]' 
                          : 'bg-blue-800/90 dark:bg-blue-950/90'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{dim?.icon}</span>
                        <span>{dim?.label}</span>
                      </div>
                      <span className="block text-[10px] text-blue-200 font-normal">
                        {rIdx === 0 ? 'مستوى رئيسي' : `فرع مستوى ${rIdx + 1}`}
                      </span>
                    </th>
                  );
                })}

                {/* Column Headers at this hierarchy level with appropriate colSpan */}
                {headerRow.map((cell) => (
                  <th
                    key={cell.id}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    className="border border-blue-600 dark:border-slate-700 p-2 sm:p-2.5 font-bold min-w-[90px] sm:min-w-[120px]"
                  >
                    <div className="truncate max-w-[200px] mx-auto" title={cell.label}>
                      {cell.label}
                    </div>
                    {cell.colSpan > 1 && (
                      <span className="block text-[9px] text-blue-200 dark:text-blue-300 font-normal">
                        ({cell.colSpan} فروع)
                      </span>
                    )}
                  </th>
                ))}

                {/* At level 0, render the Grand Total column header */}
                {lvl === 0 && (
                  <th
                    rowSpan={colDims.length}
                    className="border border-blue-600 dark:border-slate-700 p-2.5 sm:p-3 font-black bg-amber-600 text-white min-w-[90px] sm:min-w-[110px]"
                  >
                    الإجمالي
                  </th>
                )}
              </tr>
            ))}
          </thead>

          <tbody>
            {pivotData.tableOutputRows.length === 0 ? (
              <tr>
                <td 
                  colSpan={rowDims.length + pivotData.leafColumns.length + 1}
                  className="p-8 text-center text-slate-500 font-bold"
                >
                  لا توجد بيانات مطابقة لشروط التصفية
                </td>
              </tr>
            ) : (
              pivotData.tableOutputRows.map((row, rowIdx) => {
                const isSubtotalRow = row.isSubtotal;

                return (
                  <tr
                    key={row.id}
                    className={`border-b dark:border-slate-800 transition ${
                      isSubtotalRow
                        ? 'bg-blue-100/70 dark:bg-blue-950/50 font-black border-t-2 border-blue-300 dark:border-blue-700'
                        : rowIdx % 2 === 0
                        ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Row Dimension Values (with vertical merging via rowSpan) */}
                    {row.headers.map((hdr, hIdx) => {
                      const isFirstCol = hdr.level === 0 || hdr.isSticky;

                      return (
                        <td
                          key={`hdr_${hIdx}_${hdr.value}`}
                          rowSpan={hdr.rowSpan}
                          colSpan={hdr.colSpan}
                          className={`border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5 text-right pr-3 font-bold text-xs sm:text-sm ${
                            isSubtotalRow
                              ? 'bg-blue-100/80 dark:bg-blue-900/60 font-black text-blue-950 dark:text-blue-200'
                              : 'text-slate-800 dark:text-slate-100'
                          } ${
                            isFirstCol
                              ? `sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.06)] ${
                                  isSubtotalRow
                                    ? 'bg-blue-100 dark:bg-blue-900/90'
                                    : rowIdx % 2 === 0
                                    ? 'bg-white dark:bg-slate-900'
                                    : 'bg-slate-50 dark:bg-slate-800'
                                }`
                              : ''
                          }`}
                        >
                          <div className="truncate max-w-[220px]" title={hdr.value}>
                            {hdr.value}
                          </div>
                        </td>
                      );
                    })}

                    {/* Cell Data Values */}
                    {row.values.map((cellVal, cIdx) => (
                      <td
                        key={cIdx}
                        className={`border border-slate-200 dark:border-slate-700 p-2 font-mono text-xs sm:text-sm ${
                          cellVal > 0 
                            ? isSubtotalRow 
                              ? 'font-black text-blue-950 dark:text-blue-200 bg-blue-100/40' 
                              : 'font-bold text-slate-900 dark:text-slate-100' 
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {cellVal > 0 ? cellVal.toLocaleString('ar-EG') : '0'}
                      </td>
                    ))}

                    {/* Last Column: Row Total (الإجمالي) */}
                    <td 
                      className={`border border-slate-200 dark:border-slate-700 p-2 font-black text-xs sm:text-sm ${
                        isSubtotalRow
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 text-sm sm:text-base font-black'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300'
                      }`}
                    >
                      {row.rowTotal.toLocaleString('ar-EG')}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Last Row: Column Totals / Grand Total (الصف الأخير: الإجمالي) */}
            <tr className="bg-blue-900 text-white dark:bg-blue-950 font-black border-t-2 border-blue-700">
              <td 
                colSpan={rowDims.length}
                className="sticky right-0 bg-blue-900 dark:bg-blue-950 z-20 shadow-[-2px_0_6px_rgba(0,0,0,0.12)] border border-blue-800 dark:border-slate-700 p-2.5 sm:p-3 text-right pr-3 sm:pr-4 font-black text-xs sm:text-base"
              >
                المجموع العام (الإجمالي)
              </td>

              {/* Column Totals */}
              {pivotData.colTotals.map((colTotal, cIdx) => (
                <td
                  key={cIdx}
                  className="border border-blue-800 dark:border-slate-700 p-2 font-black text-xs sm:text-base font-mono bg-blue-800 dark:bg-blue-900 text-amber-300"
                >
                  {colTotal.toLocaleString('ar-EG')}
                </td>
              ))}

              {/* Bottom-Right Corner Grand Total */}
              <td className="border border-blue-800 dark:border-slate-700 p-2.5 sm:p-3 font-black text-sm sm:text-lg bg-amber-500 text-white font-mono shadow-inner">
                {pivotData.grandTotal.toLocaleString('ar-EG')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PivotTableEngine;
