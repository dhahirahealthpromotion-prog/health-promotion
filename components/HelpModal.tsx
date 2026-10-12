import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { getDistributableHtmlString, generateAndDownloadDistributableZip } from '../utils/distributableApp';
import { FullBackupData } from '../types';

export const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const context = useContext(AppContext);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'publish'>('local');
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  if (!context) return null;

  const getCurrentSnapshot = (): FullBackupData => {
    return {
        users: context.users,
        reports: context.reports,
        deletedItems: [],
        customLogo: context.customLogo,
        supervisorPassword: context.supervisorPassword,
        immunizationPassword: context.immunizationPassword,
        appName: context.appName,
        firebaseConfig: context.firebaseConfig,
        configUpdatedAt: undefined,
        isPublishedConnected: true,
        isDistributable: true
    };
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) { console.error("Clipboard API failed:", err); }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback copy failed:", err);
      return false;
    }
  };

  const handleCopyHtmlCode = async () => {
    if (copyState === 'copying') return;
    setCopyState('copying');
    try {
      const snapshot = getCurrentSnapshot();
      const htmlString = await getDistributableHtmlString(snapshot, 'snapshot');
      const success = await copyToClipboard(htmlString);
      if (success) {
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 3000);
      } else { throw new Error("Copy failed"); }
    } catch (err) {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 4000);
    }
  };

  const handleDownloadIndexHtml = async () => {
    try {
        const snapshot = getCurrentSnapshot();
        await generateAndDownloadDistributableZip(snapshot, 'snapshot');
        setDownloadMessage('✅ تم تنزيل ملف ZIP للنشر بنجاح.');
        setTimeout(() => setDownloadMessage(null), 5000);
    } catch (error) { 
        setDownloadMessage('⚠️ حدث خطأ أثناء التنزيل.'); 
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto relative text-right" dir="rtl">
        <button onClick={onClose} className="absolute top-6 left-6 text-gray-400 hover:text-red-500 transition-colors">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h3 className="text-2xl font-black text-blue-800 mb-6 border-b pb-4 dark:text-blue-400">
            دليل استخدام برنامج الإجادة المؤسسية
        </h3>

        {downloadMessage && (
            <div className="p-3 mb-6 bg-blue-50 border-r-4 border-blue-500 text-blue-800 rounded-xl font-bold animate-fade-in text-sm">
                {downloadMessage}
            </div>
        )}

        <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
            <button 
                onClick={() => setActiveTab('local')} 
                className={`px-5 py-2.5 font-bold text-base border-b-2 transition-all ${activeTab === 'local' ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-gray-400'}`}
            >
                العمل المحلي وحفظ البيانات
            </button>
            <button 
                onClick={() => setActiveTab('publish')} 
                className={`px-5 py-2.5 font-bold text-base border-b-2 transition-all ${activeTab === 'publish' ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-gray-400'}`}
            >
                المشاركة والنشر
            </button>
        </div>

        <div className="space-y-4 text-gray-700 text-sm leading-relaxed dark:text-gray-300">
            {activeTab === 'local' ? (
                <div className="animate-fade-in space-y-4">
                    <p>يعمل هذا التطبيق كـ <strong>تطبيق ويب محلي تقدمي (PWA)</strong>، حيث تُخزن البيانات بأمان داخل متصفح جهازك وتعمل حتى عند انقطاع الإنترنت.</p>
                    
                    <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                        <p className="font-black mb-1">⚠️ تنبيه هام حول الذاكرة المؤقتة:</p>
                        <p className="text-xs">مسح بيانات التصفح قد يؤدي لفقدان السجلات. احرص دائماً على تنزيل <strong>"نسخة احتياطية كاملة (Excel)"</strong> من صفحة الإعدادات دورياً.</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300">طريقة إدخال التقارير الشهرية:</h4>
                        <ol className="list-decimal pr-5 space-y-1.5 text-xs">
                            <li>اختر المؤسسة الصحية والسنة والشهر المطلوب.</li>
                            <li>اكتب اسم مسجل البيانات في الحقل المخصص.</li>
                            <li>أدخل قيم الشراكات في الصفحة الأولى (حقل 1 إلى حقل 5).</li>
                            <li>انتقل إلى صفحة المبادرات وأدخل قيم المبادرات (حقل 1 إلى حقل 5).</li>
                            <li>اضغط على زر <strong>حفظ البيانات</strong>، ويمكنك استخراج تقرير PDF أو Excel بنقرة زر.</li>
                        </ol>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-4">
                    <p>لمشاركة التطبيق مع الزملاء في المؤسسات الصحية:</p>
                    
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 space-y-3">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300">تنزيل نسخة للنشر:</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">يمكنك تنزيل ملف ZIP يحتوي على ملف HTML كامل جاهز للرفع على Netlify Drop أو استضافات الويب:</p>
                        <button 
                            onClick={handleDownloadIndexHtml} 
                            className="px-4 py-2 bg-blue-700 text-white text-xs font-bold rounded-xl hover:bg-blue-800 shadow transition"
                        >
                            ⬇️ تنزيل ملف ZIP للنشر
                        </button>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 dark:bg-gray-700/50 space-y-3">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">نسخ كود HTML كامل:</h4>
                        <p className="text-xs text-gray-500">انسخ الكود بالكامل لتضمينه في مواقع Google Sites أو أي منصة داخلية:</p>
                        <button 
                            onClick={handleCopyHtmlCode} 
                            disabled={copyState !== 'idle'} 
                            className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all ${
                                copyState === 'copying' ? 'bg-amber-500' : 
                                copyState === 'copied' ? 'bg-blue-600' : 
                                copyState === 'error' ? 'bg-red-600' : 
                                'bg-blue-700 hover:bg-blue-800 shadow'
                            }`}
                        >
                          {copyState === 'copying' ? 'جاري تجهيز الكود...' : 
                           copyState === 'copied' ? '✅ تم النسخ إلى الحافظة بنجاح!' : 
                           copyState === 'error' ? '⚠️ فشل النسخ' : 
                           'نسخ كود HTML المحدث كاملاً'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
