import React, { useState, useContext, useEffect, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { COMMUNITY_SERVICE_OPTIONS, OTHER_ACTIVITIES_CATEGORIES, MONTHS_AR, PARTNERSHIP_ENTITIES } from '../constants';
import { MonthlyReport, UserRole } from '../types';
import { isSmartMatch } from '../utils/searchUtils';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';

declare var XLSX: any;

interface MonthlyEntryFormProps {
  institutionId?: number; 
  allowInstitutionSelection?: boolean; 
}

const LOCAL_STORAGE_RECORDER_KEY = 'saved_data_recorder_name';

const getTodayString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const MonthlyEntryForm: React.FC<MonthlyEntryFormProps> = ({ institutionId, allowInstitutionSelection = false }) => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { reports, addReport, updateReport, deleteReport, users, dropdownConfig } = context;
    
    const [activeInstitutionId, setActiveInstitutionId] = useState<number | undefined>(institutionId);
    const [instSearchTerm, setInstSearchTerm] = useState('');
    
    useEffect(() => {
        if (!allowInstitutionSelection && institutionId) {
            setActiveInstitutionId(institutionId);
        }
    }, [institutionId, allowInstitutionSelection]);

    const activeInstitution = useMemo(() => users.find(u => u.id === activeInstitutionId), [users, activeInstitutionId]);
    
    const availableInstitutions = useMemo(() => {
        return users
            .filter(u => u.role === UserRole.INSTITUTION)
            .filter(u => isSmartMatch(u.name, instSearchTerm) || isSmartMatch(u.state || '', instSearchTerm))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [users, instSearchTerm]);

    // Dynamic Partnerships Entities List from dropdownConfig
    const dynamicPartnershipOptions = useMemo(() => {
        if (!dropdownConfig?.partnershipsCategories || dropdownConfig.partnershipsCategories.length === 0) {
            return PARTNERSHIP_ENTITIES.map(ent => ({
                value: ent,
                label: ent,
                icon: '🏛️'
            }));
        }
        const list: { value: string; label: string; subLabel?: string; icon?: string }[] = [];
        const seen = new Set<string>();
        dropdownConfig.partnershipsCategories.forEach(cat => {
            cat.items.forEach(item => {
                if (item && !seen.has(item)) {
                    seen.add(item);
                    list.push({
                        value: item,
                        label: item,
                        subLabel: cat.name,
                        icon: cat.icon || '🏛️'
                    });
                }
            });
        });
        return list.length > 0 ? list : PARTNERSHIP_ENTITIES.map(ent => ({ value: ent, label: ent, icon: '🏛️' }));
    }, [dropdownConfig]);

    // Dynamic Initiatives - Community Service options
    const communityServiceCategory = useMemo(() => {
        return dropdownConfig?.initiativesCategories?.find(c => c.name.includes('خدمة المجتمع') || c.id === 'init_cat_community_service');
    }, [dropdownConfig]);

    const dynamicCommunityServiceOptions = useMemo(() => {
        if (communityServiceCategory && communityServiceCategory.items.length > 0) {
            return communityServiceCategory.items;
        }
        return COMMUNITY_SERVICE_OPTIONS;
    }, [communityServiceCategory]);

    // Dynamic Other Activities Categories
    const dynamicOtherCategoriesList = useMemo(() => {
        if (!dropdownConfig?.initiativesCategories) return [];
        return dropdownConfig.initiativesCategories.filter(c => c.id !== communityServiceCategory?.id && !c.name.includes('خدمة المجتمع'));
    }, [dropdownConfig, communityServiceCategory]);

    // Refs for smooth auto-scroll to center of screen when each step appears
    const stepCategoryRef = useRef<HTMLDivElement>(null);
    const stepDateAndTypeRef = useRef<HTMLDivElement>(null);
    const stepPartnershipsRef = useRef<HTMLDivElement>(null);
    const stepCommunityRef = useRef<HTMLDivElement>(null);
    const stepOtherCategoryRef = useRef<HTMLDivElement>(null);
    const stepOtherSubItemRef = useRef<HTMLDivElement>(null);
    const stepBeneficiariesRef = useRef<HTMLDivElement>(null);

    // Form fields state
    const todayStr = useMemo(() => getTodayString(), []);
    const [editingReportId, setEditingReportId] = useState<number | null>(null);

    // 1. Data recorder name + Remember on device checkbox + Ref for focus/scroll
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [nameError, setNameError] = useState(false);
    const [entryPerson, setEntryPerson] = useState<string>(() => {
        return localStorage.getItem(LOCAL_STORAGE_RECORDER_KEY) || '';
    });
    const [saveNameToDevice, setSaveNameToDevice] = useState<boolean>(() => {
        return !!localStorage.getItem(LOCAL_STORAGE_RECORDER_KEY);
    });

    const handleNameChange = (val: string) => {
        setEntryPerson(val);
        if (val.trim()) {
            setNameError(false);
        }
        if (saveNameToDevice) {
            if (val.trim()) {
                localStorage.setItem(LOCAL_STORAGE_RECORDER_KEY, val.trim());
            } else {
                localStorage.removeItem(LOCAL_STORAGE_RECORDER_KEY);
            }
        }
    };

    const handleToggleSaveName = (checked: boolean) => {
        setSaveNameToDevice(checked);
        if (checked && entryPerson.trim()) {
            localStorage.setItem(LOCAL_STORAGE_RECORDER_KEY, entryPerson.trim());
        } else if (!checked) {
            localStorage.removeItem(LOCAL_STORAGE_RECORDER_KEY);
        }
    };
    
    // 2. Category selection: "الشراكات" أو "المبادرات" (NO default selection)
    const [categoryType, setCategoryType] = useState<'' | 'initiatives' | 'partnerships'>('');

    // 3. Date selection (defaults to today, allows past dates, no future dates)
    const [entryDate, setEntryDate] = useState<string>(todayStr);

    // حقول استمارة الشراكات (Partnerships fields)
    const [partnershipTitle, setPartnershipTitle] = useState('');
    const [partnershipEntity, setPartnershipEntity] = useState('');
    const [partnershipGoal, setPartnershipGoal] = useState('');

    // 4. Initiative Type dropdown: "خدمة المجتمع" أو "الأنشطة والفعاليات الأخرى" (NO default selection)
    const [initiativeType, setInitiativeType] = useState<'' | 'community_service' | 'other_activities'>('');

    // 5. Dependent dropdown selections for Initiatives:
    // If "خدمة المجتمع": (NO default selection)
    const [communityServiceSubItem, setCommunityServiceSubItem] = useState<string>('');

    // If "الأنشطة والفعاليات الأخرى":
    const otherActivityCategoryNames = useMemo(() => {
        if (dynamicOtherCategoriesList.length > 0) {
            return dynamicOtherCategoriesList.map(c => c.name);
        }
        return Object.keys(OTHER_ACTIVITIES_CATEGORIES);
    }, [dynamicOtherCategoriesList]);

    // Main Category: (NO default selection)
    const [otherCategory, setOtherCategory] = useState<string>('');
    const availableSubItems = useMemo(() => {
        if (!otherCategory) return [];
        const found = dynamicOtherCategoriesList.find(c => c.name === otherCategory);
        if (found) return found.items;
        return OTHER_ACTIVITIES_CATEGORIES[otherCategory] || [];
    }, [otherCategory, dynamicOtherCategoriesList]);
    // Sub-item: (NO default selection)
    const [otherSubItem, setOtherSubItem] = useState<string>('');

    // 6. Beneficiaries count for Initiatives (numeric input)
    const [beneficiariesCount, setBeneficiariesCount] = useState<number | ''>('');

    // 7. Notes
    const [notes, setNotes] = useState('');

    // Feedback & confirmation states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Table view: separate logs for Initiatives and Partnerships
    const [activeLogTab, setActiveLogTab] = useState<'initiatives' | 'partnerships'>('initiatives');
    const [tableSearchTerm, setTableSearchTerm] = useState('');

    // Auto-switch log tab when user selects category
    useEffect(() => {
        if (categoryType) {
            setActiveLogTab(categoryType);
        }
    }, [categoryType]);

    // Progressive Smooth Scrolling effects
    useEffect(() => {
        if (categoryType === 'initiatives') {
            const timer = setTimeout(() => {
                stepDateAndTypeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 120);
            return () => clearTimeout(timer);
        } else if (categoryType === 'partnerships') {
            const timer = setTimeout(() => {
                stepPartnershipsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [categoryType]);

    useEffect(() => {
        if (initiativeType === 'community_service') {
            const timer = setTimeout(() => {
                stepCommunityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
            return () => clearTimeout(timer);
        } else if (initiativeType === 'other_activities') {
            const timer = setTimeout(() => {
                stepOtherCategoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [initiativeType]);

    useEffect(() => {
        if (otherCategory) {
            setOtherSubItem('');
            const timer = setTimeout(() => {
                stepOtherSubItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [otherCategory]);

    useEffect(() => {
        const hasFinishedSubItem = 
            (initiativeType === 'community_service' && communityServiceSubItem) ||
            (initiativeType === 'other_activities' && otherSubItem);

        if (hasFinishedSubItem) {
            const timer = setTimeout(() => {
                stepBeneficiariesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 120);
            return () => clearTimeout(timer);
        }
    }, [communityServiceSubItem, otherSubItem, initiativeType]);

    // Separate Reports Logs: Independent for Initiatives and Partnerships
    const institutionReports = useMemo(() => {
        if (!activeInstitutionId) return [];
        return reports
            .filter(r => r.institutionId === activeInstitutionId)
            .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0));
    }, [reports, activeInstitutionId]);

    // Filter by currently selected log tab ('initiatives' vs 'partnerships')
    const activeTabReports = useMemo(() => {
        return institutionReports.filter(r => {
            if (activeLogTab === 'partnerships') {
                return r.categoryType === 'partnerships';
            }
            // For initiatives: either explicit or legacy default
            return r.categoryType === 'initiatives' || !r.categoryType;
        });
    }, [institutionReports, activeLogTab]);

    const filteredReports = useMemo(() => {
        if (!tableSearchTerm.trim()) return activeTabReports;
        return activeTabReports.filter(r => 
            isSmartMatch(r.entryPerson || '', tableSearchTerm) ||
            isSmartMatch(r.categoryName || '', tableSearchTerm) ||
            isSmartMatch(r.subItem || '', tableSearchTerm) ||
            isSmartMatch(r.date || '', tableSearchTerm) ||
            isSmartMatch(r.notes || '', tableSearchTerm) ||
            isSmartMatch(r.partnershipTitle || '', tableSearchTerm) ||
            isSmartMatch(r.partnershipEntity || '', tableSearchTerm) ||
            isSmartMatch(r.partnershipGoal || '', tableSearchTerm)
        );
    }, [activeTabReports, tableSearchTerm]);

    const totalBeneficiaries = useMemo(() => {
        return activeTabReports.reduce((sum, r) => sum + Number(r.beneficiariesCount ?? r.initiatives_field_1 ?? 0), 0);
    }, [activeTabReports]);

    // Reset form for a fresh entry
    const resetForm = () => {
        setEditingReportId(null);
        setNameError(false);
        setCategoryType('');
        setEntryDate(todayStr);
        setPartnershipTitle('');
        setPartnershipEntity('');
        setPartnershipGoal('');
        setInitiativeType('');
        setCommunityServiceSubItem('');
        setOtherCategory('');
        setOtherSubItem('');
        setBeneficiariesCount('');
        setNotes('');
        stepCategoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Return to name input field with smooth scroll & focus
    const returnToNameInput = () => {
        setNameError(true);
        alert('⚠️ تنبيه: يرجى كتابة اسم مسجل البيانات أولاً لحفظ السجل!');
        nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }, 150);
    };

    // Load a report into form for editing
    const handleEditReport = (rep: MonthlyReport) => {
        setEditingReportId(rep.id);
        setNameError(false);
        if (rep.entryPerson) setEntryPerson(rep.entryPerson);
        const cat = rep.categoryType || 'initiatives';
        setCategoryType(cat);
        if (rep.date) setEntryDate(rep.date);
        
        if (cat === 'partnerships') {
            setPartnershipTitle(rep.partnershipTitle || '');
            setPartnershipEntity(rep.partnershipEntity || '');
            setPartnershipGoal(rep.partnershipGoal || '');
            setInitiativeType('');
            setCommunityServiceSubItem('');
            setOtherCategory('');
            setOtherSubItem('');
            setBeneficiariesCount('');
        } else {
            setPartnershipTitle('');
            setPartnershipEntity('');
            setPartnershipGoal('');
            if (rep.initiativeType) {
                setInitiativeType(rep.initiativeType);
                if (rep.initiativeType === 'community_service') {
                    setCommunityServiceSubItem(rep.subItem || '');
                } else {
                    setOtherCategory(rep.categoryName || '');
                    setOtherSubItem(rep.subItem || '');
                }
            }
            setBeneficiariesCount(rep.beneficiariesCount ?? rep.initiatives_field_1 ?? '');
        }
        setNotes(rep.notes || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeInstitutionId) {
            alert('⚠️ يرجى اختيار المؤسسة الصحية أولاً!');
            return;
        }

        if (!entryPerson || entryPerson.trim() === '') {
            returnToNameInput();
            return;
        }

        if (!categoryType) {
            alert('⚠️ يرجى اختيار التصنيف أولاً (المبادرات أو الشراكات)!');
            return;
        }

        // مسار حفظ استمارة الشراكات
        if (categoryType === 'partnerships') {
            if (!entryDate) {
                alert('⚠️ يرجى تحديد تاريخ الشراكة!');
                return;
            }

            if (entryDate > todayStr) {
                alert('⚠️ لا يمكن اختيار تاريخ مستقبلي! يرجى اختيار تاريخ اليوم أو يوم سابق.');
                return;
            }

            if (!partnershipTitle.trim()) {
                alert('⚠️ يرجى كتابة عنوان الشراكة!');
                return;
            }

            if (!partnershipEntity) {
                alert('⚠️ يرجى اختيار الجهة من القائمة المنسدلة!');
                return;
            }

            if (!partnershipGoal.trim()) {
                alert('⚠️ يرجى كتابة الهدف من الشراكة!');
                return;
            }

            const parsedDate = new Date(entryDate);
            const parsedYear = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : new Date().getFullYear();
            const parsedMonth = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() + 1 : new Date().getMonth() + 1;

            setIsSubmitting(true);

            const reportPayload: Omit<MonthlyReport, 'id' | 'updatedAt'> = {
                institutionId: activeInstitutionId,
                year: parsedYear,
                month: parsedMonth,
                date: entryDate,
                entryPerson: entryPerson.trim(),
                categoryType: 'partnerships',
                partnershipTitle: partnershipTitle.trim(),
                partnershipEntity: partnershipEntity.trim(),
                partnershipGoal: partnershipGoal.trim(),
                notes: notes.trim(),
                categoryName: 'الشراكات',
                subItem: `${partnershipTitle.trim()} (${partnershipEntity.trim()})`,
                partnerships_field_1: 1, // Legacy aggregate counter
            };

            if (editingReportId) {
                updateReport({
                    ...reportPayload,
                    id: editingReportId,
                    updatedAt: Date.now()
                });
                setSubmitMessage('تم تحديث الشراكة بنجاح! ✅');
            } else {
                addReport(reportPayload);
                setSubmitMessage('تم حفظ الشراكة بنجاح! ✅');
            }

            resetForm();

            setTimeout(() => {
                setIsSubmitting(false);
                setTimeout(() => setSubmitMessage(null), 3500);
            }, 300);
            return;
        }

        // مسار حفظ استمارة المبادرات
        if (!entryDate) {
            alert('⚠️ يرجى تحديد تاريخ المبادرة!');
            return;
        }

        if (entryDate > todayStr) {
            alert('⚠️ لا يمكن اختيار تاريخ مستقبلي! يرجى اختيار تاريخ اليوم أو يوم سابق.');
            return;
        }

        if (!initiativeType) {
            alert('⚠️ يرجى اختيار نوع المبادرة من القائمة المنسدلة!');
            return;
        }

        if (initiativeType === 'community_service' && !communityServiceSubItem) {
            alert('⚠️ يرجى تحديد خيار خدمة المجتمع من القائمة المنسدلة!');
            return;
        }

        if (initiativeType === 'other_activities') {
            if (!otherCategory) {
                alert('⚠️ يرجى تحديد المجال / الفئة من القائمة المنسدلة!');
                return;
            }
            if (!otherSubItem) {
                alert('⚠️ يرجى تحديد البند الفرعي من القائمة المنسدلة!');
                return;
            }
        }

        if (beneficiariesCount === '') {
            alert('⚠️ يرجى كتابة عدد المستفيدين!');
            return;
        }

        const selectedSubItem = initiativeType === 'community_service' 
            ? communityServiceSubItem 
            : otherSubItem;

        const selectedCategoryName = initiativeType === 'community_service'
            ? 'خدمة المجتمع'
            : otherCategory;

        const countNum = Math.max(0, Number(beneficiariesCount));

        const parsedDate = new Date(entryDate);
        const parsedYear = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : new Date().getFullYear();
        const parsedMonth = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() + 1 : new Date().getMonth() + 1;

        setIsSubmitting(true);

        const reportPayload: Omit<MonthlyReport, 'id' | 'updatedAt'> = {
            institutionId: activeInstitutionId,
            year: parsedYear,
            month: parsedMonth,
            date: entryDate,
            entryPerson: entryPerson.trim(),
            categoryType: 'initiatives',
            initiativeType: initiativeType,
            initiativeTypeLabel: initiativeType === 'community_service' ? 'خدمة المجتمع' : 'الأنشطة والفعاليات الأخرى',
            categoryName: selectedCategoryName,
            subItem: selectedSubItem,
            beneficiariesCount: countNum,
            notes: notes.trim(),
            initiatives_field_1: countNum, // Legacy aggregate compatibility
        };

        if (editingReportId) {
            updateReport({
                ...reportPayload,
                id: editingReportId,
                updatedAt: Date.now()
            });
            setSubmitMessage('تم تحديث المبادرة بنجاح! ✅');
        } else {
            addReport(reportPayload);
            setSubmitMessage('تم حفظ المبادرة بنجاح! ✅');
        }

        resetForm();

        setTimeout(() => {
            setIsSubmitting(false);
            setTimeout(() => setSubmitMessage(null), 3500);
        }, 300);
    };

    const handleDeleteReport = (id: number) => {
        setConfirmationModal({
            isOpen: true,
            title: activeLogTab === 'partnerships' ? 'تأكيد حذف الشراكة' : 'تأكيد حذف المبادرة',
            message: 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذه العملية.',
            onConfirm: () => {
                deleteReport(id);
                if (editingReportId === id) {
                    resetForm();
                }
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                setSubmitMessage('تم حذف السجل بنجاح 🗑️');
                setTimeout(() => setSubmitMessage(null), 3000);
            }
        });
    };

    const handleExportExcel = () => {
        if (activeTabReports.length === 0) {
            alert('لا توجد سجلات مسجلة في هذا القسم لتصديرها.');
            return;
        }

        let data: any[];
        if (activeLogTab === 'partnerships') {
            data = activeTabReports.map((r, i) => ({
                'م': i + 1,
                'المؤسسة': activeInstitution?.name || '',
                'الولاية': activeInstitution?.state || '',
                'التصنيف': 'الشراكات',
                'التاريخ': r.date || `${r.year || ''}-${r.month || ''}`,
                'عنوان الشراكة': r.partnershipTitle || r.subItem || '—',
                'الجهة': r.partnershipEntity || '—',
                'الهدف': r.partnershipGoal || '—',
                'مسجل البيانات': r.entryPerson || '',
                'الملاحظات': r.notes || '',
            }));
        } else {
            data = activeTabReports.map((r, i) => ({
                'م': i + 1,
                'المؤسسة': activeInstitution?.name || '',
                'الولاية': activeInstitution?.state || '',
                'التصنيف': 'المبادرات',
                'التاريخ': r.date || `${r.year || ''}-${r.month || ''}`,
                'مسجل البيانات': r.entryPerson || '',
                'نوع المبادرة': r.initiativeTypeLabel || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : 'الأنشطة والفعاليات الأخرى'),
                'المجال / الفئة': r.categoryName || '',
                'البند الفرعي': r.subItem || '',
                'عدد المستفيدين': r.beneficiariesCount ?? r.initiatives_field_1 ?? 0,
                'الملاحظات': r.notes || '',
            }));
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        const sheetTitle = activeLogTab === 'partnerships' ? "سجل الشراكات" : "سجل المبادرات";
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
        XLSX.writeFile(wb, `${sheetTitle}_${activeInstitution?.name || 'مؤسسة'}.xlsx`);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
            return;
        }

        const isPartnership = activeLogTab === 'partnerships';
        const logTitle = isPartnership ? 'سجل الشراكات المجتمعية' : 'سجل المبادرات والأنشطة الصحية';

        const tableHeadersHtml = isPartnership ? `
            <tr>
                <th style="width: 35px;">م</th>
                <th>التاريخ</th>
                <th>عنوان الشراكة</th>
                <th>الجهة</th>
                <th>الهدف</th>
                <th>مسجل البيانات</th>
                <th>الملاحظات</th>
            </tr>
        ` : `
            <tr>
                <th style="width: 35px;">م</th>
                <th>التاريخ</th>
                <th>نوع المبادرة</th>
                <th>المجال / الفئة</th>
                <th>البند الفرعي</th>
                <th>عدد المستفيدين</th>
                <th>مسجل البيانات</th>
                <th>الملاحظات</th>
            </tr>
        `;

        const rowsHtml = activeTabReports.map((r, i) => {
            if (isPartnership) {
                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${r.date || '—'}</td>
                        <td style="font-weight: bold; color: #1E3A8A;">${r.partnershipTitle || r.subItem || '—'}</td>
                        <td style="font-weight: bold;">${r.partnershipEntity || '—'}</td>
                        <td>${r.partnershipGoal || '—'}</td>
                        <td>${r.entryPerson || '—'}</td>
                        <td>${r.notes || '—'}</td>
                    </tr>
                `;
            }
            return `
                <tr>
                    <td>${i + 1}</td>
                    <td>${r.date || '—'}</td>
                    <td>${r.initiativeTypeLabel || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : 'الأنشطة والفعاليات الأخرى')}</td>
                    <td>${r.categoryName || '—'}</td>
                    <td style="font-weight: bold;">${r.subItem || '—'}</td>
                    <td style="font-weight: bold; background: #EFF6FF;">${r.beneficiariesCount ?? r.initiatives_field_1 ?? 0}</td>
                    <td>${r.entryPerson || '—'}</td>
                    <td>${r.notes || '—'}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>${logTitle} - ${activeInstitution?.name}</title>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4 landscape; margin: 1cm; }
                    body { font-family: 'Tajawal', sans-serif; background: white; margin: 0; padding: 0; color: #111827; }
                    .header-box { text-align: center; border-bottom: 2px solid #1E3A8A; padding-bottom: 15px; margin-bottom: 20px; }
                    .title { font-size: 24px; font-weight: 800; color: #1E3A8A; margin: 0; }
                    .subtitle { font-size: 16px; color: #4B5563; margin-top: 5px; font-weight: 600; }
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB; }
                    .meta-item { font-size: 13px; }
                    .meta-label { font-weight: 700; color: #374151; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                    th, td { border: 1px solid #000; padding: 8px 6px; text-align: center; }
                    th { background-color: #EFF6FF; font-weight: 800; }
                    .footer-box { margin-top: 30px; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <h1 class="title">برنامج الإجادة المؤسسية</h1>
                    <div class="subtitle">${logTitle}</div>
                </div>

                <div class="meta-grid">
                    <div class="meta-item"><span class="meta-label">المؤسسة الصحية:</span> ${activeInstitution?.name || '—'}</div>
                    <div class="meta-item"><span class="meta-label">الولاية:</span> ${activeInstitution?.state || '—'}</div>
                    <div class="meta-item"><span class="meta-label">إجمالي السجلات:</span> ${activeTabReports.length}</div>
                    ${!isPartnership ? `<div class="meta-item"><span class="meta-label">إجمالي المستفيدين:</span> ${totalBeneficiaries}</div>` : ''}
                    <div class="meta-item"><span class="meta-label">تاريخ الطباعة:</span> ${getTodayString()}</div>
                </div>

                <table>
                    <thead>
                        ${tableHeadersHtml}
                    </thead>
                    <tbody>
                        ${rowsHtml || `<tr><td colspan="${isPartnership ? 7 : 8}">لا توجد سجلات مسجلة</td></tr>`}
                    </tbody>
                </table>

                <div class="footer-box">
                    <div>توقيع مسجل البيانات: ___________________</div>
                    <div>اعتماد مدير / مسؤول المؤسسة: ___________________</div>
                </div>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 600);
    };

    if (!activeInstitutionId && !allowInstitutionSelection) {
        return <div className="p-8 text-center text-red-600 font-bold">لا يوجد مؤسسة صحية محددة</div>;
    }

    return (
        <div className="space-y-6">
            {confirmationModal.isOpen && (
                <Modal 
                    title={confirmationModal.title} 
                    onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} 
                    hideDefaultCloseButton={true}
                >
                    <p className="py-4 text-base sm:text-lg font-bold text-red-800 dark:text-red-400 text-center leading-relaxed">
                        {confirmationModal.message}
                    </p>
                    <div className="flex justify-center gap-3 pt-4 border-t dark:border-gray-700">
                        <button 
                            type="button"
                            onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} 
                            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="button"
                            onClick={confirmationModal.onConfirm} 
                            className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md transition-all active:scale-95"
                        >
                            تأكيد الحذف
                        </button>
                    </div>
                </Modal>
            )}

            {/* Main Form Card with Progressive Step-by-Step Flow */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl border border-gray-100 dark:border-gray-700">
                {/* Form Header */}
                <header className="bg-white dark:bg-gray-900 border-b p-3.5 sm:p-5 dark:border-gray-700 rounded-t-2xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-700 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm">
                                📋
                            </div>
                            <div>
                                <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                                    {editingReportId ? 'تعديل بيانات الاستمارة' : 'استمارة إدخال البيانات'}
                                </h1>
                                <p className="text-[11px] sm:text-xs font-semibold text-blue-700 dark:text-blue-400">
                                    برنامج الإجادة المؤسسية - متابعة الشراكات والمبادرات
                                </p>
                            </div>
                        </div>

                        {submitMessage && (
                            <div className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm animate-fade-in ${
                                submitMessage.includes('حذف') 
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                                {submitMessage}
                            </div>
                        )}
                    </div>
                </header>

                <form noValidate onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-6">
                    {/* Top Row: Institution Selector + Data Registrar Name with Device Save Checkbox */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Institution Selection */}
                        <div>
                            <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                المؤسسة الصحية:
                            </label>
                            {allowInstitutionSelection ? (
                                <SearchableSelect 
                                    value={activeInstitutionId ? String(activeInstitutionId) : ''} 
                                    onChange={(val) => setActiveInstitutionId(val ? Number(val) : undefined)} 
                                    options={availableInstitutions.map(inst => ({
                                        value: String(inst.id),
                                        label: inst.name,
                                        subLabel: inst.state ? `الولاية: ${inst.state}` : undefined
                                    }))}
                                    placeholder="اختر المؤسسة..."
                                    searchPlaceholder="ابحث باسم المؤسسة أو الولاية..."
                                    icon="🏢"
                                    buttonClassName="rounded-2xl"
                                />
                            ) : (
                                <input 
                                    type="text" 
                                    value={activeInstitution ? `${activeInstitution.name} ${activeInstitution.state ? `(${activeInstitution.state})` : ''}` : ''} 
                                    readOnly 
                                    className="input-style bg-gray-100 dark:bg-gray-700 text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 cursor-not-allowed min-h-[48px] rounded-2xl" 
                                />
                            )}
                        </div>

                        {/* 1. اسم مسجل البيانات + مربع وضع إشارة صح لحفظ الاسم في الجهاز */}
                        <div className={nameError ? 'p-1 rounded-2xl bg-red-50/70 dark:bg-red-950/30' : ''}>
                            <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                                <span className={nameError ? 'text-red-600 dark:text-red-400 font-black' : ''}>
                                    1. اسم مسجل البيانات: <span className="text-red-600">*</span>
                                </span>
                                {nameError ? (
                                    <span className="text-xs text-red-600 dark:text-red-400 font-extrabold animate-bounce">
                                        ⚠️ يرجى كتابة الاسم هنا لحفظ المبادرة
                                    </span>
                                ) : !entryPerson ? (
                                    <span className="text-[11px] text-red-500 font-bold">إلزامي للمتابعة</span>
                                ) : null}
                            </label>
                            <input 
                                ref={nameInputRef}
                                type="text" 
                                value={entryPerson} 
                                onChange={(e) => handleNameChange(e.target.value)} 
                                placeholder="اكتب اسم مسجل البيانات بالكامل..." 
                                required
                                className={`input-style text-sm sm:text-base font-bold min-h-[48px] rounded-2xl border-2 transition-all ${
                                    nameError 
                                        ? 'border-red-500 ring-2 ring-red-400 dark:ring-red-600 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 placeholder-red-400' 
                                        : 'focus:border-blue-600'
                                }`}
                            />
                            
                            {/* مربع حفظ بيانات الاسم في الجهاز */}
                            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-bold hover:text-blue-700 dark:hover:text-blue-400 transition">
                                <input 
                                    type="checkbox" 
                                    checked={saveNameToDevice} 
                                    onChange={(e) => handleToggleSaveName(e.target.checked)} 
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-700"
                                />
                                <span>حفظ بيانات الاسم في هذا الجهاز (تذكر الاسم تلقائياً) 💾</span>
                            </label>
                        </div>
                    </div>

                    {/* 2. زر اختيار "الشراكات" أو "المبادرات" كقائمة منسدلة قابلة للبحث (بدون اختيار افتراضي) */}
                    <div ref={stepCategoryRef} className="pt-2">
                        <label className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-100 mb-1.5 block">
                            2. تصنيف الاستمارة (الشراكات أو المبادرات): <span className="text-red-600">*</span>
                        </label>
                        <SearchableSelect 
                            value={categoryType}
                            onChange={(val) => {
                                const v = val as '' | 'initiatives' | 'partnerships';
                                setCategoryType(v);
                                if (v !== 'initiatives') {
                                    setInitiativeType('');
                                    setCommunityServiceSubItem('');
                                    setOtherCategory('');
                                    setOtherSubItem('');
                                    setBeneficiariesCount('');
                                }
                                if (v !== 'partnerships') {
                                    setPartnershipTitle('');
                                    setPartnershipEntity('');
                                    setPartnershipGoal('');
                                }
                            }}
                            options={[
                                { value: 'initiatives', label: 'المبادرات', icon: '🚀' },
                                { value: 'partnerships', label: 'الشراكات', icon: '🤝' }
                            ]}
                            placeholder="اختر التصنيف"
                            searchPlaceholder="ابحث في التصنيف..."
                            icon="📌"
                            required
                        />
                    </div>

                    {/* حالة اختيار الشراكات: استمارة إدخال بيانات الشراكة كاملة */}
                    {categoryType === 'partnerships' && (
                        <div ref={stepPartnershipsRef} className="space-y-5 border-t border-gray-200 dark:border-gray-700 pt-5 animate-fade-in">
                            <div className="bg-blue-50/60 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-800 space-y-4">
                                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 pb-2 border-b border-blue-200 dark:border-blue-800">
                                    <span className="text-xl">🤝</span>
                                    <h3 className="text-sm sm:text-base font-black">بيانات استمارة الشراكة</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 3. التأريخ */}
                                    <div>
                                        <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                                            <span>3. التأريخ: <span className="text-red-600">*</span></span>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400">اليوم الحالي أو سابق فقط</span>
                                        </label>
                                        <input 
                                            type="date" 
                                            value={entryDate} 
                                            max={todayStr}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val > todayStr) {
                                                    alert('⚠️ لا يمكن اختيار يوم لاحق! تم إعادة التاريخ لليوم الحالي.');
                                                    setEntryDate(todayStr);
                                                } else {
                                                    setEntryDate(val);
                                                }
                                            }}
                                            required
                                            className="input-style text-sm sm:text-base font-bold min-h-[48px] sm:min-h-[52px] rounded-2xl border-2 border-blue-500/80 focus:border-blue-700"
                                        />
                                    </div>

                                    {/* 4. عنوان الشراكة (خانة نصية) */}
                                    <div>
                                        <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                            4. عنوان الشراكة: <span className="text-red-600">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={partnershipTitle} 
                                            onChange={(e) => setPartnershipTitle(e.target.value)} 
                                            placeholder="اكتب عنوان الشراكة..." 
                                            required
                                            className="input-style text-sm sm:text-base font-bold min-h-[48px] sm:min-h-[52px] rounded-2xl border-2 border-blue-500/80 focus:border-blue-700"
                                        />
                                    </div>
                                </div>

                                {/* 5. الجهة (زر قائمة منسدلة قابلة للبحث) */}
                                <div>
                                    <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                        5. الجهة: <span className="text-red-600">*</span>
                                    </label>
                                    <SearchableSelect 
                                        value={partnershipEntity} 
                                        onChange={(val) => setPartnershipEntity(val)}
                                        options={dynamicPartnershipOptions}
                                        placeholder="اختر الجهة"
                                        searchPlaceholder="ابحث باسم الجهة أو الوزارة أو التصنيف..."
                                        icon="🏛️"
                                        required
                                    />
                                </div>

                                {/* 6. الهدف (خانة نصية) */}
                                <div>
                                    <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                        6. الهدف: <span className="text-red-600">*</span>
                                    </label>
                                    <textarea 
                                        rows={2}
                                        value={partnershipGoal} 
                                        onChange={(e) => setPartnershipGoal(e.target.value)} 
                                        placeholder="اكتب الهدف من الشراكة..." 
                                        required
                                        className="input-style text-sm sm:text-base font-bold min-h-[48px] sm:min-h-[52px] rounded-2xl border-2 border-blue-500/80 focus:border-blue-700 resize-y"
                                    />
                                </div>

                                {/* 7. ملاحظات */}
                                <div>
                                    <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                        7. ملاحظات:
                                    </label>
                                    <textarea 
                                        rows={2} 
                                        value={notes} 
                                        onChange={(e) => setNotes(e.target.value)} 
                                        placeholder="اكتب أي ملاحظات إضافية حول الشراكة..." 
                                        className="input-style text-sm resize-y rounded-2xl border-2 min-h-[48px] sm:min-h-[52px]"
                                    />
                                </div>

                                {/* Action Buttons for Partnerships */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {editingReportId && (
                                            <button 
                                                type="button" 
                                                onClick={resetForm}
                                                className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-300 transition"
                                            >
                                                إلغاء التعديل ✕
                                            </button>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={resetForm}
                                            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                        >
                                            تفريغ الحقول 🔄
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            onClick={(e) => {
                                                if (!entryPerson || entryPerson.trim() === '') {
                                                    e.preventDefault();
                                                    returnToNameInput();
                                                }
                                            }}
                                            className="flex-1 sm:flex-none bg-blue-700 text-white px-8 sm:px-12 py-3 sm:py-3.5 rounded-2xl shadow-lg font-black text-sm sm:text-base hover:bg-blue-800 transition active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[48px]"
                                        >
                                            {isSubmitting ? 'جاري الحفظ...' : (editingReportId ? 'تحديث الشراكة 💾' : 'حفظ الشراكة 💾')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: إذا تم اختيار المبادرات -> يظهر فقط التاريخ + زر اختيار نوع المبادرة (بدون افتراضي) */}
                    {categoryType === 'initiatives' && (
                        <div ref={stepDateAndTypeRef} className="space-y-5 border-t border-gray-200 dark:border-gray-700 pt-5 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* التاريخ */}
                                <div>
                                    <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                                        <span>3. تاريخ المبادرة: <span className="text-red-600">*</span></span>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">اليوم الحالي أو سابق فقط</span>
                                    </label>
                                    <input 
                                        type="date" 
                                        value={entryDate} 
                                        max={todayStr}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val > todayStr) {
                                                alert('⚠️ لا يمكن اختيار يوم لاحق! تم إعادة التاريخ لليوم الحالي.');
                                                setEntryDate(todayStr);
                                            } else {
                                                setEntryDate(val);
                                            }
                                        }}
                                        required
                                        className="input-style text-sm sm:text-base font-bold min-h-[48px] sm:min-h-[52px] rounded-2xl border-2 border-blue-500/80 focus:border-blue-700"
                                    />
                                </div>

                                {/* نوع المبادرة (قائمة منسدلة قابلة للبحث - لا يوجد اختيار افتراضي) */}
                                <div>
                                    <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                        4. نوع المبادرة: <span className="text-red-600">*</span>
                                    </label>
                                    <SearchableSelect 
                                        value={initiativeType} 
                                        onChange={(val) => {
                                            const v = val as '' | 'community_service' | 'other_activities';
                                            setInitiativeType(v);
                                            setCommunityServiceSubItem('');
                                            setOtherCategory('');
                                            setOtherSubItem('');
                                        }}
                                        options={[
                                            { value: 'community_service', label: 'خدمة المجتمع', icon: '🩺' },
                                            { value: 'other_activities', label: 'الأنشطة والفعاليات الأخرى', icon: '✨' }
                                        ]}
                                        placeholder="اختر نوع المبادرة"
                                        searchPlaceholder="ابحث في نوع المبادرة..."
                                        icon="🎯"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Step 4A: إذا تم اختيار خدمة المجتمع -> يظهر زر القائمة المنسدلة لخدمة المجتمع (بدون افتراضي) */}
                            {initiativeType === 'community_service' && (
                                <div ref={stepCommunityRef} className="p-4 sm:p-5 bg-blue-50/70 dark:bg-slate-900/70 rounded-2xl border-2 border-blue-300 dark:border-blue-700 space-y-2 animate-fade-in">
                                    <label className="font-extrabold text-xs sm:text-sm text-blue-950 dark:text-blue-200 block">
                                        5. اختر خدمة المجتمع: <span className="text-red-600">*</span>
                                    </label>
                                    <SearchableSelect 
                                        value={communityServiceSubItem} 
                                        onChange={(val) => setCommunityServiceSubItem(val)}
                                        options={dynamicCommunityServiceOptions.map(opt => ({
                                            value: opt,
                                            label: opt,
                                            icon: '🩺'
                                        }))}
                                        placeholder="اختر خدمة المجتمع"
                                        searchPlaceholder="ابحث في خدمات المجتمع..."
                                        icon="🩺"
                                        autoOpen={!editingReportId && !communityServiceSubItem}
                                        required
                                    />
                                </div>
                            )}

                            {/* Step 4B: إذا تم اختيار الأنشطة والفعاليات الأخرى -> يظهر أولاً زر اختيار الفئة/المجال (بدون افتراضي) */}
                            {initiativeType === 'other_activities' && (
                                <div className="space-y-4">
                                    <div ref={stepOtherCategoryRef} className="p-4 sm:p-5 bg-blue-50/70 dark:bg-slate-900/70 rounded-2xl border-2 border-blue-300 dark:border-blue-700 space-y-2 animate-fade-in">
                                        <label className="font-extrabold text-xs sm:text-sm text-blue-950 dark:text-blue-200 block">
                                            5. اختر المجال / الفئة: <span className="text-red-600">*</span>
                                        </label>
                                        <SearchableSelect 
                                            value={otherCategory} 
                                            onChange={(val) => {
                                                setOtherCategory(val);
                                                setOtherSubItem('');
                                            }}
                                            options={otherActivityCategoryNames.map(cat => {
                                                const matchingCat = dynamicOtherCategoriesList.find(c => c.name === cat);
                                                const count = matchingCat ? matchingCat.items.length : (OTHER_ACTIVITIES_CATEGORIES[cat] || []).length;
                                                return {
                                                    value: cat,
                                                    label: cat,
                                                    subLabel: `${count} بنود فرعية`,
                                                    icon: matchingCat?.icon || '🏷️'
                                                };
                                            })}
                                            placeholder="اختر المجال / الفئة"
                                            searchPlaceholder="ابحث في المجالات والفئات..."
                                            icon="🏷️"
                                            autoOpen={!editingReportId && !otherCategory}
                                            required
                                        />
                                    </div>

                                    {/* Step 4C: بعد اختيار المجال يظهر الزر التالي وسط الشاشة لاختيار البند الفرعي (بدون افتراضي) */}
                                    {otherCategory && (
                                        <div ref={stepOtherSubItemRef} className="p-4 sm:p-5 bg-blue-50/70 dark:bg-slate-900/70 rounded-2xl border-2 border-blue-300 dark:border-blue-700 space-y-2 animate-fade-in">
                                            <label className="font-extrabold text-xs sm:text-sm text-blue-950 dark:text-blue-200 block">
                                                6. اختر البند الفرعي المحدد ({otherCategory}): <span className="text-red-600">*</span>
                                            </label>
                                            <SearchableSelect 
                                                value={otherSubItem} 
                                                onChange={(val) => setOtherSubItem(val)}
                                                options={availableSubItems.map(sub => ({
                                                    value: sub,
                                                    label: sub,
                                                    icon: '✨'
                                                }))}
                                                placeholder="اختر البند الفرعي"
                                                searchPlaceholder="ابحث في البنود الفرعية..."
                                                icon="✨"
                                                autoOpen={!editingReportId && !otherSubItem}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 5: يظهر بعد اختيار البند المحدد: عدد المستفيدين (يتحدد كاملاً بالنقر) + الملاحظات + زر الحفظ */}
                            {(
                                (initiativeType === 'community_service' && communityServiceSubItem) ||
                                (initiativeType === 'other_activities' && otherCategory && otherSubItem)
                            ) && (
                                <div ref={stepBeneficiariesRef} className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-5 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                        {/* خانة رقمية لعدد المستفيدين: عند النقر عليها أو تحديدها يتم تحديد الرقم كاملاً للتعديل الفوري */}
                                        <div>
                                            <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                                عدد المستفيدين: <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    min="0"
                                                    value={beneficiariesCount} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setBeneficiariesCount(val === '' ? '' : Math.max(0, Number(val)));
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                                    placeholder="0" 
                                                    required
                                                    className="w-full text-center text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100 py-3 rounded-2xl border-2 border-blue-500 focus:border-blue-700 focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[48px] sm:min-h-[52px]"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs pointer-events-none">
                                                    مستفيد
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                                                💡 انقر على الرقم لتحديده وكتابة الرقم الجديد مباشرة
                                            </p>
                                        </div>

                                        {/* خانة الملاحظات */}
                                        <div className="md:col-span-2">
                                            <label className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-1.5 block">
                                                الملاحظات:
                                            </label>
                                            <textarea 
                                                rows={2} 
                                                value={notes} 
                                                onChange={(e) => setNotes(e.target.value)} 
                                                placeholder="اكتب أي تفاصيل إضافية أو ملاحظات حول المبادرة..." 
                                                className="input-style text-sm resize-y rounded-2xl border-2 min-h-[48px] sm:min-h-[52px]"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {editingReportId && (
                                                <button 
                                                    type="button" 
                                                    onClick={resetForm}
                                                    className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-300 transition"
                                                >
                                                    إلغاء التعديل ✕
                                                </button>
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={resetForm}
                                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                            >
                                                تفريغ الحقول 🔄
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                onClick={(e) => {
                                                    if (!entryPerson || entryPerson.trim() === '') {
                                                        e.preventDefault();
                                                        returnToNameInput();
                                                    }
                                                }}
                                                className="flex-1 sm:flex-none bg-blue-700 text-white px-8 sm:px-12 py-3 sm:py-3.5 rounded-2xl shadow-lg font-black text-sm sm:text-base hover:bg-blue-800 transition active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[48px]"
                                            >
                                                {isSubmitting ? 'جاري الحفظ...' : (editingReportId ? 'تحديث المبادرة 💾' : 'حفظ المبادرة 💾')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>

            {/* Separate Records Logs: المبادرات في سجل مستقل والشراكات في سجل مستقل */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 p-3.5 sm:p-6 space-y-4">
                {/* Independent Log Switcher Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 dark:border-gray-700">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">📁</span>
                            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
                                {activeLogTab === 'partnerships' ? 'سجل الشراكات المستقل' : 'سجل المبادرات المستقل'}
                            </h2>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                            مؤسسة: <span className="font-bold text-gray-800 dark:text-gray-200">{activeInstitution?.name || '—'}</span> | إجمالي المستفيدين: <span className="font-bold text-blue-700 dark:text-blue-400">{totalBeneficiaries}</span>
                        </p>
                    </div>

                    {/* Independent Log Tabs Switcher */}
                    <div className="bg-gray-100 dark:bg-gray-700/80 p-1 rounded-xl flex w-full sm:w-auto">
                        <button 
                            type="button" 
                            onClick={() => setActiveLogTab('initiatives')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 ${
                                activeLogTab === 'initiatives' 
                                ? 'bg-blue-700 text-white shadow-md' 
                                : 'text-gray-700 dark:text-gray-200 hover:text-blue-700 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            <span>🚀 سجل المبادرات</span>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold ${
                                activeLogTab === 'initiatives' 
                                ? 'bg-blue-900/60 text-white' 
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200'
                            }`}>
                                {institutionReports.filter(r => r.categoryType === 'initiatives' || !r.categoryType).length}
                            </span>
                        </button>

                        <button 
                            type="button" 
                            onClick={() => setActiveLogTab('partnerships')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 ${
                                activeLogTab === 'partnerships' 
                                ? 'bg-blue-700 text-white shadow-md' 
                                : 'text-gray-700 dark:text-gray-200 hover:text-blue-700 hover:bg-gray-200/50 dark:hover:bg-gray-600/50'
                            }`}
                        >
                            <span>🤝 سجل الشراكات</span>
                            <span className={`font-mono text-xs px-2 py-0.5 rounded-full font-bold ${
                                activeLogTab === 'partnerships' 
                                ? 'bg-blue-900/60 text-white' 
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}>
                                {institutionReports.filter(r => r.categoryType === 'partnerships').length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Search & Actions Bar for the Active Independent Log */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2.5">
                    <div className="relative w-full sm:w-72">
                        <input 
                            type="text" 
                            placeholder={activeLogTab === 'partnerships' ? "بحث في سجل الشراكات..." : "بحث في سجل المبادرات..."} 
                            value={tableSearchTerm} 
                            onChange={(e) => setTableSearchTerm(e.target.value)} 
                            className="input-style py-2 px-3 text-xs sm:text-sm w-full rounded-xl"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button 
                            type="button" 
                            onClick={handleExportExcel} 
                            disabled={activeTabReports.length === 0} 
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                            title="تصدير Excel"
                        >
                            <span>Excel</span>
                            <span>📊</span>
                        </button>
                        <button 
                            type="button" 
                            onClick={handlePrint} 
                            disabled={activeTabReports.length === 0} 
                            className="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                            title="طباعة"
                        >
                            <span>طباعة</span>
                            <span>🖨️</span>
                        </button>
                    </div>
                </div>

                {/* Table Data */}
                {filteredReports.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 dark:text-gray-500 font-bold text-sm bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        {activeTabReports.length === 0 
                            ? (activeLogTab === 'partnerships' ? 'لا توجد شراكات مسجلة لهذه المؤسسة حتى الآن.' : 'لا توجد مبادرات مسجلة لهذه المؤسسة حتى الآن.') 
                            : 'لا توجد نتائج مطابقة لبحثك.'}
                    </div>
                ) : activeLogTab === 'partnerships' ? (
                    /* جدول سجل الشراكات المستقل */
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-right text-xs sm:text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-extrabold border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="p-3 text-center w-10">م</th>
                                    <th className="p-3 whitespace-nowrap">التأريخ</th>
                                    <th className="p-3 whitespace-nowrap">عنوان الشراكة</th>
                                    <th className="p-3 whitespace-nowrap">الجهة</th>
                                    <th className="p-3 whitespace-nowrap">الهدف</th>
                                    <th className="p-3 whitespace-nowrap">مسجل البيانات</th>
                                    <th className="p-3 whitespace-nowrap">ملاحظات</th>
                                    <th className="p-3 text-center w-24">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredReports.map((r, idx) => (
                                    <tr 
                                        key={r.id} 
                                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition ${
                                            editingReportId === r.id ? 'bg-amber-50 dark:bg-amber-950/30' : ''
                                        }`}
                                    >
                                        <td className="p-3 text-center font-mono font-bold text-gray-500">{idx + 1}</td>
                                        <td className="p-3 whitespace-nowrap font-mono font-bold text-gray-800 dark:text-gray-200">
                                            {r.date || `${r.year || ''}-${r.month || ''}`}
                                        </td>
                                        <td className="p-3 font-black text-blue-950 dark:text-blue-200">
                                            {r.partnershipTitle || r.subItem || '—'}
                                        </td>
                                        <td className="p-3 font-bold text-blue-800 dark:text-blue-400">
                                            <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl text-xs sm:text-sm">
                                                🏛️ {r.partnershipEntity || '—'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300 max-w-xs">
                                            {r.partnershipGoal || '—'}
                                        </td>
                                        <td className="p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                            {r.entryPerson || '—'}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={r.notes}>
                                            {r.notes || '—'}
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleEditReport(r)} 
                                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 transition" 
                                                    title="تعديل"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteReport(r.id)} 
                                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 transition" 
                                                    title="حذف"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* جدول سجل المبادرات المستقل */
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-right text-xs sm:text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-extrabold border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="p-3 text-center w-10">م</th>
                                    <th className="p-3 whitespace-nowrap">التاريخ</th>
                                    <th className="p-3 whitespace-nowrap">نوع المبادرة</th>
                                    <th className="p-3 whitespace-nowrap">المجال / الفئة</th>
                                    <th className="p-3 whitespace-nowrap">البند الفرعي</th>
                                    <th className="p-3 text-center whitespace-nowrap">المستفيدون</th>
                                    <th className="p-3 whitespace-nowrap">مسجل البيانات</th>
                                    <th className="p-3 whitespace-nowrap">ملاحظات</th>
                                    <th className="p-3 text-center w-24">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredReports.map((r, idx) => (
                                    <tr 
                                        key={r.id} 
                                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition ${
                                            editingReportId === r.id ? 'bg-amber-50 dark:bg-amber-950/30' : ''
                                        }`}
                                    >
                                        <td className="p-3 text-center font-mono font-bold text-gray-500">{idx + 1}</td>
                                        <td className="p-3 whitespace-nowrap font-mono font-bold text-gray-800 dark:text-gray-200">
                                            {r.date || `${r.year || ''}-${r.month || ''}`}
                                        </td>
                                        <td className="p-3 whitespace-nowrap font-bold text-blue-800 dark:text-blue-400">
                                            {r.initiativeTypeLabel || (r.initiativeType === 'community_service' ? 'خدمة المجتمع' : 'الأنشطة والفعاليات الأخرى')}
                                        </td>
                                        <td className="p-3 whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">
                                            {r.categoryName || '—'}
                                        </td>
                                        <td className="p-3 font-bold text-gray-900 dark:text-gray-100">
                                            {r.subItem || '—'}
                                        </td>
                                        <td className="p-3 text-center font-mono font-black text-blue-700 dark:text-blue-300">
                                            {r.beneficiariesCount ?? r.initiatives_field_1 ?? 0}
                                        </td>
                                        <td className="p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                            {r.entryPerson || '—'}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate" title={r.notes}>
                                            {r.notes || '—'}
                                        </td>
                                        <td className="p-3 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleEditReport(r)} 
                                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 transition" 
                                                    title="تعديل"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteReport(r.id)} 
                                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 transition" 
                                                    title="حذف"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthlyEntryForm;
