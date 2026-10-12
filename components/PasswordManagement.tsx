import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { UserRole, User } from '../types';
import Modal from './Modal';
import { isSmartMatch } from '../utils/searchUtils';

const PasswordManagement: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { users, updateInstitution, immunizationPassword, setImmunizationPassword } = context;
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const institutions = users.filter(u => u.role === UserRole.INSTITUTION);
    const filteredInstitutions = institutions.filter(i => isSmartMatch(i.name, searchTerm) || isSmartMatch(i.state || '', searchTerm));

    const handleResetInstitutionPin = (institution: User) => {
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد إعادة تعيين رمز الدخول',
            message: `هل أنت متأكد من إعادة تعيين رمز الدخول (PIN) لمؤسسة "${institution.name}" إلى الرمز الافتراضي "123"؟`,
            onConfirm: () => {
                updateInstitution({
                    ...institution,
                    pin: '123',
                    updatedAt: Date.now()
                });
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    const handleResetImmunizationPassword = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'تأكيد إعادة تعيين كلمة المرور',
            message: 'هل أنت متأكد من إعادة تعيين كلمة مرور قسم تعزيز الصحة إلى "12345"؟',
            onConfirm: () => {
                setImmunizationPassword('12345');
                setConfirmationModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {confirmationModal.isOpen && (
                <Modal title={confirmationModal.title} onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} hideDefaultCloseButton={true}>
                    <p className="py-4 text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 text-center leading-relaxed">{confirmationModal.message}</p>
                    <div className="flex justify-center gap-3 pt-3 border-t dark:border-gray-700">
                        <button onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 min-h-[40px] text-xs sm:text-sm">إلغاء</button>
                        <button onClick={confirmationModal.onConfirm} className="px-5 py-2 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 shadow-md min-h-[40px] text-xs sm:text-sm">تأكيد التعيين</button>
                    </div>
                </Modal>
            )}

            {/* Department Password Card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-400 mb-1 leading-tight">كلمة مرور قسم تعزيز الصحة</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">تتيح للموظفين المصرح لهم الدخول إلى لوحة إدارة برنامج الإجادة</p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50 dark:bg-blue-950/30 p-3 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div>
                        <span className="text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 font-bold block mb-0.5">كلمة المرور الحالية:</span>
                        <span className="font-mono text-lg sm:text-xl font-black text-blue-950 dark:text-blue-100 tracking-wider">
                            {immunizationPassword}
                        </span>
                    </div>
                    <button 
                        onClick={handleResetImmunizationPassword} 
                        className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-700 transition shadow-sm min-h-[38px] flex items-center justify-center gap-1.5"
                    >
                        <span>إعادة تعيين للافتراضي (12345)</span>
                        <span>🔄</span>
                    </button>
                </div>
            </div>

            {/* Institutions PIN Card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                    <div>
                        <h3 className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-400 leading-tight">رموز الدخول للمؤسسات الصحية (PIN)</h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">إدارة وإعادة تعيين رمز الدخول لكل مركز ومجمع صحي</p>
                    </div>
                    <div className="w-full sm:w-72">
                        <input
                            type="text"
                            placeholder="بحث باسم المؤسسة أو الولاية..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-style text-xs sm:text-sm py-1.5 min-h-[40px]"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 max-h-[500px] overflow-y-auto custom-scrollbar p-0.5">
                    {filteredInstitutions.map(inst => (
                        <div key={inst.id} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-600 flex justify-between items-center gap-2">
                            <div>
                                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded inline-block mb-1">
                                    {inst.state || 'مؤسسة صحية'}
                                </span>
                                <h4 className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-100">{inst.name}</h4>
                                <div className="text-[11px] text-gray-500 font-semibold mt-0.5">
                                    الرمز الحالي: <span className="font-mono font-black text-gray-800 dark:text-gray-200">{inst.pin || '123'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleResetInstitutionPin(inst)}
                                className="px-2.5 sm:px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition min-h-[38px] flex items-center justify-center flex-shrink-0"
                                title="إعادة تعيين إلى 123"
                            >
                                ضبط (123) 🔄
                            </button>
                        </div>
                    ))}
                    {filteredInstitutions.length === 0 && (
                        <div className="col-span-full p-8 text-center text-gray-400 font-bold text-xs sm:text-sm">
                            لا توجد مؤسسات مطابقة للبحث
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PasswordManagement;
