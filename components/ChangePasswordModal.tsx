import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

interface ChangePasswordModalProps {
  onClose: () => void;
  currentStoredPassword: string;
  onSave: (password: string) => void;
  isMandatory?: boolean; 
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, currentStoredPassword, onSave, isMandatory = false }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const oldPasswordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (oldPasswordInputRef.current && window.innerWidth >= 768) {
      oldPasswordInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (message) {
      setMessage(null);
    }
  }, [oldPassword, newPassword, confirmPassword]);

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (oldPassword !== currentStoredPassword) {
      setMessage({ type: 'error', text: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'يجب أن تتكون كلمة المرور الجديدة من 4 خانات على الأقل.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' });
      return;
    }

    onSave(newPassword);
    setMessage({ type: 'success', text: 'تم تحديث كلمة المرور بنجاح ✅' });
    
    setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
    }, 1500);
  };

  return (
    <Modal title={isMandatory ? "إعداد الأمان الأولي" : "تغيير كلمة المرور"} onClose={onClose} hideDefaultCloseButton={true}>
      <form onSubmit={handleSubmitPassword} className="space-y-4 text-right">
        {isMandatory && (
            <div className="p-3 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded-xl text-sm font-bold border border-blue-100 mb-2">
                ⚠️ لدواعي الأمان، يرجى تغيير كلمة المرور الافتراضية قبل بدء الاستخدام.
            </div>
        )}
        
        {message && (
          <div className={`p-3 rounded-xl text-center mb-4 text-sm font-bold ${message.type === 'success' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'}`}>
            <p>{message.text}</p>
          </div>
        )}

        <div>
          <label htmlFor="old-password-modal" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 dark:text-gray-200">كلمة المرور الحالية:</label>
          <input
            id="old-password-modal"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="input-style text-center font-bold"
            required
            ref={oldPasswordInputRef}
          />
        </div>

        <div>
          <label htmlFor="new-password-modal" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 dark:text-gray-200">كلمة المرور الجديدة:</label>
          <input
            id="new-password-modal"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-style text-center font-bold"
            minLength={4}
            required
          />
          <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 block mt-1">تلميح: يجب ألا تقل عن 4 خانات</span>
        </div>

        <div>
          <label htmlFor="confirm-password-modal" className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 dark:text-gray-200">تأكيد كلمة المرور الجديدة:</label>
          <input
            id="confirm-password-modal"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-style text-center font-bold"
            minLength={4}
            required
          />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
            {!isMandatory && (
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-bold text-sm dark:bg-gray-700 dark:text-gray-200"
                >
                    إلغاء
                </button>
            )}
            <button 
                type="submit" 
                className={`px-6 py-2.5 font-bold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition shadow-md ${isMandatory ? 'w-full' : ''}`}
            >
                حفظ كلمة المرور الجديدة
            </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
