import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { UserRole, User } from '../types';
import Modal from './Modal';
import { isSmartMatch } from '../utils/searchUtils';

const InstitutionManagement: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { users, addInstitution, updateInstitution, deleteInstitution } = context;

    const [newInstitutionName, setNewInstitutionName] = useState('');
    const [newStateName, setNewStateName] = useState(''); 
    const [editingInstitution, setEditingInstitution] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editState, setEditState] = useState('');
    const [institutionSearchTerm, setInstitutionSearchTerm] = useState('');

    const newInstitutionInputRef = useRef<HTMLTextAreaElement>(null);
    const institutionSearchInputRef = useRef<HTMLInputElement>(null);

    const [message, setMessage] = useState<{ text: string, isError?: boolean } | null>(null);
    const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const institutions = useMemo(() => 
        users
            .filter(u => u.role === UserRole.INSTITUTION)
            .sort((a,b) => (a.state || '').localeCompare(b.state || '', 'ar') || a.name.localeCompare(b.name, 'ar')), 
        [users]
    );

    const filteredInstitutions = useMemo(() => {
        if (!institutionSearchTerm.trim()) return institutions;
        return institutions.filter(t => isSmartMatch(t.name, institutionSearchTerm) || isSmartMatch(t.state || '', institutionSearchTerm));
    }, [institutions, institutionSearchTerm]);

    const showMessage = (text: string, isError: boolean = false) => {
        setMessage({ text, isError });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleAddInstitution = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStateName.trim()) { 
            showMessage('⚠️ يرجى إدخال اسم الولاية أولاً.', true); 
            return; 
        }
        if (newInstitutionName.trim()) {
            const names = newInstitutionName.split('\n').map(n => n.trim()).filter(n => n !== '');
            const stateToSave = newStateName.trim();
            if (names.length > 0) {
                names.forEach(name => addInstitution(name, stateToSave, {}));
                setNewInstitutionName('');
                setNewStateName(''); 
                showMessage(`✅ تمت إضافة ${names.length} مؤسسة بنجاح.`);
            }
        } else { 
            showMessage('⚠️ يرجى إدخال اسم المؤسسة.', true); 
        }
    };

    const startEditing = (institution: User) => {
        setEditingInstitution(institution);
        setEditName(institution.name);
        setEditState(institution.state || '');
    };

    const handleUpdateInstitution = () => {
        if (!editingInstitution) return;
        if (!editState.trim() || !editName.trim()) {
            showMessage('⚠️ اسم المؤسسة والولاية حقلان إلزاميان.', true);
            return;
        }
        
        const original = users.find(u => u.id === editingInstitution.id);
        if (original) {
            updateInstitution({ 
                ...original, 
                name: editName.trim(), 
                state: editState.trim(),
                updatedAt: Date.now() 
            });
            setEditingInstitution(null);
            showMessage('✅ تم تحديث بيانات المؤسسة بنجاح.');
        }
    };

    const handleInstitutionDelete = (institution: User) => {
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد حذف المؤسسة',
            message: `هل أنت متأكد من حذف مؤسسة "${institution.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm: () => {
                deleteInstitution(institution.id);
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                showMessage('🗑️ تم حذف المؤسسة بنجاح.');
            }
        });
    };

    const uniqueStates = Array.from(new Set(institutions.map(i => i.state).filter(Boolean)));

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {confirmationModal.isOpen && (
                <Modal title={confirmationModal.title} onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))} hideDefaultCloseButton={true}>
                    <p className="py-4 text-sm sm:text-base font-bold text-red-800 dark:text-red-400 text-center leading-relaxed">{confirmationModal.message}</p>
                    <div className="flex justify-center gap-3 pt-4 border-t dark:border-gray-700">
                        <button onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 min-h-[40px]">إلغاء</button>
                        <button onClick={confirmationModal.onConfirm} className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md min-h-[40px]">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 no-print min-h-[36px]">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-blue-800 dark:text-blue-400 leading-tight">إدارة المؤسسات الصحية</h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">إضافة وتعديل وحذف المؤسسات التابعة لبرنامج الإجادة المؤسسية</p>
                </div>
                {message && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm ${message.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                        {message.text}
                    </span>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                {/* Form to Add New Institutions */}
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 bg-blue-50/30 dark:bg-gray-700/30">
                    <h4 className="text-sm sm:text-base font-black text-blue-900 dark:text-blue-300 mb-2.5">إضافة مؤسسة جديدة</h4>
                    <form onSubmit={handleAddInstitution} className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                            <input 
                                type="text" 
                                value={newStateName} 
                                onChange={(e) => setNewStateName(e.target.value)} 
                                placeholder="اسم الولاية *" 
                                className="input-style sm:w-1/3 text-xs sm:text-sm font-bold min-h-[42px]" 
                                list="states-list" 
                                required 
                            />
                            <datalist id="states-list">
                                {uniqueStates.map(s => <option key={s} value={s} />)}
                            </datalist>

                            <textarea 
                                ref={newInstitutionInputRef} 
                                value={newInstitutionName} 
                                onChange={(e) => setNewInstitutionName(e.target.value)} 
                                placeholder="اسم المؤسسة (يمكن كتابة أكثر من مؤسسة - كل اسم في سطر)... *" 
                                className="input-style flex-grow text-xs sm:text-sm font-bold resize-y min-h-[60px]" 
                                rows={2} 
                                required 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full sm:w-auto sm:self-end px-6 py-2.5 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-all shadow-md active:scale-95 text-xs sm:text-sm min-h-[42px] flex items-center justify-center gap-1.5"
                        >
                            <span>إضافة المؤسسات</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                            </svg>
                        </button>
                    </form>
                </div>

                {/* Institutions List with Search */}
                <div className="p-3.5 sm:p-6 bg-white dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-4 mb-4 sm:mb-6">
                        <div className="relative w-full sm:w-96">
                            <input 
                                ref={institutionSearchInputRef} 
                                type="text" 
                                placeholder="البحث باسم المؤسسة أو الولاية..." 
                                value={institutionSearchTerm} 
                                onChange={(e) => setInstitutionSearchTerm(e.target.value)} 
                                className="input-style w-full pl-4 pr-10 text-xs sm:text-sm font-semibold min-h-[42px]" 
                            />
                            <svg className="absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-gray-500 self-end sm:self-auto">
                            إجمالي المؤسسات: {filteredInstitutions.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 max-h-[600px] overflow-y-auto custom-scrollbar p-0.5">
                        {filteredInstitutions.map(institution => {
                            const isEditing = editingInstitution?.id === institution.id;
                            return (
                                <div key={institution.id} className="p-3.5 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-200 dark:bg-gray-700/50 dark:border-gray-600 hover:shadow-sm transition-all flex flex-col justify-between">
                                    {isEditing ? (
                                        <div className="space-y-2.5 animate-fade-in">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">الولاية:</label>
                                                <input type="text" value={editState} onChange={e => setEditState(e.target.value)} placeholder="الولاية" className="input-style text-xs sm:text-sm py-1 min-h-[38px]" required />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300">اسم المؤسسة:</label>
                                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="اسم المؤسسة" className="input-style text-xs sm:text-sm py-1 min-h-[38px]" required />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button onClick={handleUpdateInstitution} className="flex-1 bg-blue-700 text-white py-1.5 rounded-lg font-bold text-xs shadow-sm hover:bg-blue-800 min-h-[38px]">حفظ</button>
                                                <button onClick={() => setEditingInstitution(null)} className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-300 min-h-[38px]">إلغاء</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="text-[10px] sm:text-[11px] text-blue-800 dark:text-blue-300 font-black bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md inline-block mb-1">
                                                    {institution.state || 'بدون ولاية'}
                                                </span>
                                                <h4 className="font-extrabold text-gray-800 dark:text-gray-100 text-sm sm:text-base leading-snug">
                                                    {institution.name}
                                                </h4>
                                            </div>
                                            <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-600">
                                                <span className="text-[11px] sm:text-xs font-semibold text-gray-500">
                                                    رمز الدخول: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{institution.pin || '123'}</span>
                                                </span>
                                                <div className="flex gap-1.5">
                                                    <button 
                                                        onClick={() => startEditing(institution)} 
                                                        title="تعديل المؤسسة"
                                                        aria-label="تعديل المؤسسة"
                                                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all dark:bg-blue-900/40 dark:text-blue-300"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleInstitutionDelete(institution)} 
                                                        title="حذف المؤسسة"
                                                        aria-label="حذف المؤسسة"
                                                        className="min-h-[38px] min-w-[38px] flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all dark:bg-red-900/40 dark:text-red-300"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                        {filteredInstitutions.length === 0 && (
                            <div className="col-span-full p-8 text-center text-gray-500 font-bold text-xs sm:text-sm">
                                لا توجد مؤسسات مسجلة مطابقة للبحث
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstitutionManagement;
