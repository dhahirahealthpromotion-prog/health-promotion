import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { exportSheetTemplate } from '../utils/exportSheetTemplate';
import { exportFullBackup, importFullBackup } from '../utils/fullBackup';
import { FullBackupData, UserRole } from '../types';
import Modal from './Modal';
import { generateAndDownloadDistributableHtml, getDistributableHtmlString } from '../utils/distributableApp';
import { DEFAULT_APP_NAME, INITIAL_USERS } from '../constants';
import { parseFirebaseConfigString } from '../utils/firebase';

declare const XLSX: any;

export const Settings: React.FC = () => {
    const context = useContext(AppContext);
    
    if (!context) return null;

    const [activeSettingsView, setActiveSettingsView] = useState<'main' | 'customization'>('main'); 
    const [message, setMessage] = useState<{type: 'success' | 'error' | 'warning', text: string} | null>(null);
    const [confirmationModal, setConfirmationModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => Promise<void>; 
    }>({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
    
    const [isProcessing, setIsProcessing] = useState(false); 

    const { 
        setCustomLogo, deleteAllReports, deleteAllData, loadMockData,
        users,
        addInstitution, updateInstitution,
        importFullBackup: handleImportFullBackupFile,
        appName, setAppName,
        isDistributable, isPublishedConnected, 
        firebaseConfig, setFirebaseConfig,
    } = context; 

    const [appNameInput, setAppNameInput] = useState<string>(appName);
    const [firebaseConfigInput, setFirebaseConfigInput] = useState<string>(
        firebaseConfig ? JSON.stringify(firebaseConfig, null, 2) : ''
    );

    const firebaseConfigTextAreaRef = useRef<HTMLTextAreaElement>(null);
    const appNameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setAppNameInput(appName); }, [appName]);
    useEffect(() => {
        setFirebaseConfigInput(firebaseConfig ? JSON.stringify(firebaseConfig, null, 2) : '');
    }, [firebaseConfig]);

    const confirmAction = (title: string, message: string, onConfirm: () => Promise<void>) => { 
      setConfirmationModal({ isOpen: true, title, message, onConfirm });
    };

    const handleConfirm = async () => { 
      if (isProcessing) return; 
      setIsProcessing(true); 
      try { await confirmationModal.onConfirm(); } 
      finally {
        setIsProcessing(false); 
        setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
      }
    };

    const handleCancel = () => {
      if (!isProcessing) {
          setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: async () => {} });
      }
    };

    const handleDeleteReports = () => {
        confirmAction(
            'تأكيد حذف جميع التقارير', 
            'هل أنت متأكد من حذف جميع التقارير الشهرية؟ سيتم تحميل نسخة احتياطية تلقائياً قبل الحذف لضمان أمان البيانات.',
            async () => {
                setMessage({ type: 'success', text: 'جاري تنزيل النسخة الاحتياطية...' });
                await handleExportFullBackup(true);
                await deleteAllReports();
                setMessage({ type: 'success', text: 'تم حذف جميع التقارير بنجاح.' });
            }
        );
    };
    
    const handleDeleteAllData = () => {
        confirmAction(
            'تأكيد إعادة ضبط البرنامج بالكامل', 
            'تحذير: سيؤدي هذا الإجراء إلى حذف جميع بيانات المؤسسات والتقارير. سيتم تنزيل نسخة احتياطية أولاً قبل مسح البيانات.',
            async () => {
                setMessage({ type: 'success', text: 'جاري تنزيل النسخة الاحتياطية...' });
                await handleExportFullBackup(true);
                await deleteAllData();
                setMessage({ type: 'success', text: 'تمت إعادة ضبط البرنامج بنجاح.' });
            }
        );
    };

    const handleDownloadImportTemplate = () => {
        exportSheetTemplate('نموذج_استيراد_المؤسسات');
        setMessage({ type: 'success', text: '✅ بدأ تحميل نموذج استيراد المؤسسات.' });
    };

    const handleExportInstitutions = () => {
        const institutions = users.filter(u => u.role === UserRole.INSTITUTION);
        const instRows = institutions.map(i => ({
            'الولاية': i.state || '',
            'اسم المؤسسة': i.name,
            'رمز الدخول': i.pin || '123'
        }));
        
        const wb = XLSX.utils.book_new();
        const wsInst = XLSX.utils.json_to_sheet(instRows);
        XLSX.utils.book_append_sheet(wb, wsInst, 'المؤسسات');
        XLSX.writeFile(wb, `قائمة_المؤسسات_الصحية.xlsx`);
        setMessage({ type: 'success', text: '✅ تم تصدير قائمة المؤسسات بنجاح.' });
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        confirmAction(
            'تأكيد استيراد المؤسسات', 
            'سيتم استيراد المؤسسات من الملف وتحديثها. هل ترغب بالمتابعة؟',
            async () => { 
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = event.target?.result;
                        const workbook = XLSX.read(data, { type: 'array' });
                        const instSheet = workbook.Sheets['المؤسسات'] || workbook.Sheets['Institutions'] || workbook.Sheets[workbook.SheetNames[0]];
                        const instJson = XLSX.utils.sheet_to_json(instSheet);
                        
                        let addedCount = 0;
                        let updatedCount = 0;

                        instJson.forEach((row: any) => {
                            const name = (row['اسم المؤسسة'] || row['name of Institution'] || row['Institution'] || row['Name'])?.toString().trim();
                            const willayat = (row['الولاية'] || row['willayat'] || row['State'])?.toString().trim() || '';

                            if (name) {
                                const existingInst = users.find(u => u.role === UserRole.INSTITUTION && u.name.toLowerCase() === name.toLowerCase());
                                if (existingInst) {
                                    updateInstitution({
                                        ...existingInst,
                                        state: willayat || existingInst.state,
                                        updatedAt: Date.now()
                                    });
                                    updatedCount++;
                                } else {
                                    addInstitution(name, willayat, {});
                                    addedCount++;
                                }
                            }
                        });
                        
                        setMessage({ type: 'success', text: `✅ تمت إضافة ${addedCount} مؤسسة، وتم تحديث ${updatedCount} مؤسسة.` });
                    } catch (error) {
                        console.error(error);
                        setMessage({ type: 'error', text: 'حدث خطأ في قراءة ملف Excel، يرجى التأكد من تطابق الأعمدة.' });
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        );
        e.target.value = '';
    };

    const handleExportFullBackup = async (isSilent: boolean = false) => { 
        if (!context) return;
        if (!isSilent) setMessage({ type: 'success', text: 'جاري تصدير النسخة الاحتياطية الكاملة...' });
        exportFullBackup({ 
            ...context, 
            users: context.users, 
            reports: context.reports, 
            firebaseConfig: context.firebaseConfig,
            appName: context.appName
        }, 'الإجادة_المؤسسية_نسخة_احتياطية'); 
        if (!isSilent) setMessage({ type: 'success', text: '✅ تم تصدير النسخة الاحتياطية بنجاح.' });
    };

    const handleImportFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !handleImportFullBackupFile) return;
        
        confirmAction(
            'تأكيد استعادة النسخة الاحتياطية الكاملة', 
            'تحذير: سيؤدي هذا الإجراء إلى استبدال كافة البيانات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. هل ترغب بالاستمرار؟',
            async () => { 
                try {
                    setMessage({ type: 'success', text: 'جاري استيراد البيانات...' });
                    const importedData = await importFullBackup(file);
                    handleImportFullBackupFile(importedData);
                    setMessage({ type: 'success', text: 'تمت استعادة النسخة الاحتياطية بنجاح! ✅' });
                } catch (error: any) {
                    setMessage({ type: 'error', text: error.message || 'فشل استيراد النسخة الاحتياطية.' });
                }
                e.target.value = '';
            }
        );
    };

    const handleSaveAppName = () => {
        if (!appNameInput.trim()) {
            setMessage({ type: 'error', text: 'لا يمكن أن يكون اسم البرنامج فارغاً.' });
            return;
        }
        setAppName(appNameInput.trim());
        setMessage({ type: 'success', text: 'تم حفظ اسم البرنامج بنجاح.' });
    };

    const handleResetAppName = () => {
        confirmAction('تأكيد استعادة الاسم الافتراضي', 'هل أنت متأكد من استعادة الاسم الافتراضي للبرنامج؟',
            async () => { 
                setAppName(DEFAULT_APP_NAME);
                setMessage({ type: 'success', text: 'تمت استعادة اسم البرنامج الافتراضي.' });
            }
        );
    };
    
    const handleSaveFirebaseConfig = () => {
        if (!setFirebaseConfig) return;
        try {
            const parsedConfig = parseFirebaseConfigString(firebaseConfigInput);
            if (!parsedConfig || !parsedConfig.apiKey) {
                setMessage({ type: 'error', text: 'تعذر استخراج بيانات الإعداد. يرجى لصق كود Firebase كاملاً.' });
                return;
            }
            setFirebaseConfig(parsedConfig);
            setFirebaseConfigInput(JSON.stringify(parsedConfig, null, 2));
            setMessage({ type: 'success', text: 'تم حفظ إعدادات المزامنة السحابية بنجاح.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'صيغة الكود غير صحيحة.' });
        }
    };

    const handleClearFirebaseConfig = () => {
        if (!setFirebaseConfig) return;
        confirmAction('تأكيد قطع الاتصال السحابي', 'هل أنت متأكد من إلغاء الاتصال السحابي؟ سيعمل التطبيق في الوضع المحلي فقط.',
            async () => {
                setFirebaseConfig(null);
                setFirebaseConfigInput('');
                setMessage({ type: 'success', text: 'تم قطع الاتصال والعمل في الوضع المحلي.' });
            }
        );
    };

    return (
        <div className="bg-white p-3.5 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            {confirmationModal.isOpen && (
                <Modal title={confirmationModal.title} onClose={handleCancel} hideDefaultCloseButton={isProcessing}>
                    <p className="dark:text-gray-200 text-center text-sm sm:text-lg font-bold py-3 sm:py-4 leading-relaxed">{confirmationModal.message}</p>
                    <div className="flex justify-center gap-3 mt-3 pt-3 border-t dark:border-gray-700">
                        <button onClick={handleCancel} disabled={isProcessing} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 min-h-[40px] text-xs sm:text-sm">إلغاء</button>
                        <button onClick={handleConfirm} disabled={isProcessing} className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md min-h-[40px] text-xs sm:text-sm">
                            {isProcessing ? 'جاري التنفيذ...' : 'تأكيد'}
                        </button>
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center mb-4 sm:mb-6">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-blue-800 dark:text-blue-400 leading-tight">إعدادات النظام والنسخ الاحتياطي</h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">إدارة البيانات، النسخ الاحتياطي، واستعادة بيانات الشراكات والمبادرات</p>
                </div>
            </div>

            <div className="flex border-b border-gray-200 mb-4 sm:mb-6 dark:border-gray-700 gap-1.5 sm:gap-2">
                <button 
                    className={`px-3 sm:px-5 py-2 sm:py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all min-h-[38px] ${
                        activeSettingsView === 'main' 
                        ? 'bg-blue-50 text-blue-800 border-b-2 border-blue-700 dark:bg-gray-700 dark:text-blue-300' 
                        : 'text-gray-500 hover:text-blue-700'
                    }`} 
                    onClick={() => setActiveSettingsView('main')}
                >
                    النسخ الاحتياطي والبيانات
                </button>
                <button 
                    className={`px-3 sm:px-5 py-2 sm:py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition-all min-h-[38px] ${
                        activeSettingsView === 'customization' 
                        ? 'bg-blue-50 text-blue-800 border-b-2 border-blue-700 dark:bg-gray-700 dark:text-blue-300' 
                        : 'text-gray-500 hover:text-blue-700'
                    }`} 
                    onClick={() => setActiveSettingsView('customization')}
                >
                    تخصيص اسم البرنامج
                </button>
            </div>

            {message && (
                <div className={`p-3 sm:p-4 mb-4 sm:mb-6 rounded-xl font-bold text-center text-xs sm:text-sm shadow-sm ${
                    message.type === 'success' 
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' 
                    : message.type === 'error' 
                    ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                    {message.text}
                </div>
            )}

            {activeSettingsView === 'main' && (
                <div className="space-y-4 sm:space-y-8 animate-fade-in">
                     <div className="bg-gray-50 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
                            {/* Import & Export Institutions */}
                            <div className="space-y-3 sm:space-y-4 bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h5 className="font-black text-blue-800 dark:text-blue-300 border-b pb-2 dark:border-gray-600 flex items-center gap-2 text-sm sm:text-base">
                                    <span>🏢</span>
                                    <span>إدارة ملف المؤسسات (Excel)</span>
                                </h5>
                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={handleDownloadImportTemplate} 
                                        className="w-full text-right px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors font-bold text-xs sm:text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 min-h-[42px]"
                                    >
                                        📄 تحميل نموذج Excel لإدخال المؤسسات
                                    </button>
                                    <button 
                                        onClick={handleExportInstitutions} 
                                        className="w-full text-right px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors font-bold text-xs sm:text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 min-h-[42px]"
                                    >
                                        📤 تصدير قائمة المؤسسات الحالية (Excel)
                                    </button>
                                    <label className="w-full cursor-pointer text-right px-3.5 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl hover:bg-blue-100 transition-colors font-bold text-xs sm:text-sm dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300 block min-h-[42px] flex items-center">
                                        📥 استيراد المؤسسات من ملف Excel
                                        <input type="file" accept=".xlsx, .xls" onChange={handleFileImport} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            {/* Full Backup & Restore */}
                            <div className="space-y-3 sm:space-y-4 bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h5 className="font-black text-blue-800 dark:text-blue-300 border-b pb-2 dark:border-gray-600 flex items-center gap-2 text-sm sm:text-base">
                                    <span>💾</span>
                                    <span>النسخة الاحتياطية الشاملة (Full Backup)</span>
                                </h5>
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                                    تشمل كافة بيانات الشراكات والمبادرات، المؤسسات، وكلمات المرور في ملف Excel آمن.
                                </p>
                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={() => handleExportFullBackup(false)} 
                                        className="w-full text-right px-3.5 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl hover:bg-blue-100 transition-colors font-bold text-xs sm:text-sm dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 min-h-[42px]"
                                    >
                                        💾 تصدير نسخة احتياطية كاملة (Excel)
                                    </button>
                                    <label className="w-full cursor-pointer text-center px-3.5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-xs sm:text-sm shadow-md block min-h-[42px] flex items-center justify-center">
                                        📂 استعادة النظام من نسخة احتياطية
                                        <input type="file" accept=".xlsx" onChange={handleImportFullBackup} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="mt-6 pt-5 border-t border-gray-300 dark:border-gray-600">
                            <h5 className="font-black text-red-700 mb-3 dark:text-red-400 text-center text-xs sm:text-sm">منطقة العمليات الحساسة</h5>
                            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
                                <button 
                                    onClick={handleDeleteReports} 
                                    className="flex-1 px-4 py-2.5 sm:py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-bold text-xs sm:text-sm dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 min-h-[42px]"
                                >
                                    🗑️ حذف جميع التقارير الشهرية
                                </button>
                                <button 
                                    onClick={handleDeleteAllData} 
                                    className="flex-1 px-4 py-2.5 sm:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-md text-xs sm:text-sm min-h-[42px]"
                                >
                                    ⚠️ إعادة ضبط البرنامج بالكامل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSettingsView === 'customization' && (
                <div className="animate-fade-in space-y-4 sm:space-y-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                        <h4 className="text-sm sm:text-base font-black text-gray-800 mb-3 dark:text-gray-200">تعديل اسم البرنامج</h4>
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                            <input 
                                ref={appNameInputRef} 
                                type="text" 
                                value={appNameInput} 
                                onChange={(e) => setAppNameInput(e.target.value)} 
                                className="input-style flex-grow font-bold text-sm sm:text-base min-h-[42px]" 
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSaveAppName} 
                                    className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-all shadow-md active:scale-95 text-xs sm:text-sm min-h-[42px]"
                                >
                                    حفظ الاسم
                                </button>
                                <button 
                                    onClick={handleResetAppName} 
                                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors dark:bg-gray-600 dark:text-gray-200 text-xs sm:text-sm min-h-[42px]"
                                >
                                    الافتراضي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
