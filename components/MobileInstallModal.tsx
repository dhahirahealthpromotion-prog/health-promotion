import React from 'react';
import Modal from './Modal';
import Logo from './Logo';

interface MobileInstallModalProps {
  onClose: () => void;
}

const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ onClose }) => {
  return (
    <Modal title="تثبيت التطبيق على جهازك والهاتف" onClose={onClose}>
      <div className="space-y-5 text-gray-800 text-sm leading-relaxed dark:text-gray-200 text-right">
        {/* App Logo & Title Showcase */}
        <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900 rounded-2xl border border-blue-100 dark:border-blue-800 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-md border border-blue-600/30 p-1.5 bg-white dark:bg-slate-800 mb-2.5">
            <Logo className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <h3 className="font-extrabold text-base text-blue-900 dark:text-blue-300">برنامج الإجادة المؤسسية</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">تطبيق ويب تقدمي (PWA) قابل للتثبيت على الكمبيوتر والهاتف بشعاره الرسمي</p>
        </div>

        {/* Desktop / PC & Laptop Section */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border-r-4 border-amber-500 dark:bg-amber-950/30 dark:border-amber-500">
          <h4 className="text-sm font-bold text-amber-950 mb-2 flex items-center gap-2 dark:text-amber-200">
            <span>💻</span>
            <span>للكمبيوتر المكتبي واللابتوب (سطح المكتب وشريط المهام):</span>
          </h4>
          <ol className="list-decimal pr-6 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            <li>من شريط عنوان متصفحك (Chrome أو Edge)، ستجد أيقونة تثبيت صغيرة <span className="font-bold">⊕</span> أو زر في نهاية شريط العنوان.</li>
            <li>أو اضغط على قائمة المتصفح (<span className="font-bold">⋮</span>) ثم اختر <span className="font-bold text-amber-800 dark:text-amber-300">"تثبيت برنامج الإجادة المؤسسية"</span> (Install App).</li>
            <li>سيتم تثبيت التطبيق وتظهر أيقونته تلقائياً على <span className="font-bold">سطح المكتب</span> وفي <span className="font-bold">شريط المهام (Taskbar)</span> لفتحه مباشرة وبشكل مستقل.</li>
          </ol>
        </div>

        {/* Android Phone Section */}
        <div className="p-4 bg-blue-50 rounded-2xl border-r-4 border-blue-600 dark:bg-blue-950/30 dark:border-blue-500">
          <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2 dark:text-blue-200">
            <span>📱</span>
            <span>لهواتف أندرويد (شاشة الهاتف الرئيسية):</span>
          </h4>
          <ol className="list-decimal pr-6 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            <li>افتح التطبيق عبر متصفح Google Chrome.</li>
            <li>اضغط على زر القائمة (النقاط الثلاث الرأسية <span className="font-bold">⋮</span>) في الزاوية العلوية.</li>
            <li>اختر <span className="font-bold text-blue-700 dark:text-blue-400">"تثبيت التطبيق"</span> أو <span className="font-bold text-blue-700 dark:text-blue-400">"إضافة إلى الشاشة الرئيسية"</span>.</li>
            <li>أكد التثبيت، وستظهر أيقونة التطبيق بشعارها الرسمي مباشرة على شاشة هاتفك الرئيسية.</li>
          </ol>
        </div>

        {/* iPhone & iPad Section */}
        <div className="p-4 bg-blue-50 rounded-2xl border-r-4 border-blue-600 dark:bg-blue-950/30 dark:border-blue-500">
          <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2 dark:text-blue-200">
            <span>🍎</span>
            <span>لهواتف آيفون وآيباد (متصفح Safari):</span>
          </h4>
          <ol className="list-decimal pr-6 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            <li>افتح الرابط عبر متصفح Safari.</li>
            <li>اضغط على زر المشاركة (أيقونة المربع وبداخله سهم للأعلى ⬆️) في الشريط السفلي.</li>
            <li>مرر للأسفل واختر <span className="font-bold text-blue-700 dark:text-blue-400">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</li>
            <li>اضغط على "إضافة"، وسيظهر التطبيق على شاشتك الرئيسية كأي تطبيق رسمي.</li>
          </ol>
        </div>
      </div>
    </Modal>
  );
};

export default MobileInstallModal;
