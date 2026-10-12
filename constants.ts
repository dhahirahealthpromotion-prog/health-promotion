import { User, UserRole, MonthlyReport, DropdownConfig } from './types';

export const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

export const DEFAULT_APP_NAME = 'برنامج الإجادة المؤسسية';

export const INITIAL_USERS: User[] = [
    { id: 1, name: 'المشرف العام', role: UserRole.SUPERVISOR, updatedAt: Date.now() },
];

export const MOCK_USERS: User[] = [
    { id: 1, name: 'المشرف العام', role: UserRole.SUPERVISOR, updatedAt: Date.now() },
    { id: 2, name: 'مركز صحي النور', role: UserRole.INSTITUTION, state: 'عبري', updatedAt: Date.now(), pin: '123' },
    { id: 3, name: 'مجمع الهدى الصحي', role: UserRole.INSTITUTION, state: 'ينقل', updatedAt: Date.now(), pin: '123' },
];

export const MOCK_REPORTS: MonthlyReport[] = [];

// Partnership Entities List
export const PARTNERSHIP_ENTITIES = [
  "وزارة التربية والتعليم",
  "وزارة الرياضة والثقافة والشباب",
  "وزارة العمل",
  "مركز ابراء الثقافي",
  "جمعية إحسان",
  "سلاح الجو السلطاني",
  "شرطة عمان السلطانية",
  "هيئة البيئة",
  "جامعة نزوى",
  "جامعة السلطان قابوس",
  "وزارة الداخلية",
  "وزارة التراث و السياحة",
  "وزارة الزراعة و الثروة السمكية",
  "وزارة الإعلام - التواصل الحكومي",
  "جامعة التقنية والعلوم التطبيقية بصلالة",
  "جامعة صحار"
];

// Institutional Excellence Logo Icon
export const COMMUNITY_SERVICE_OPTIONS = [
  "تحصينات الأطفال حتى عمر سنتين",
  "برنامج افحص و اطمئن",
  "الفحص قبل الزواج",
  "برنامج الفحص المبكر للثدي",
  "تحصينات المدارس + فحوصات المدارس",
  "فحص المسنين",
  "الرعاية المجتمعية"
];

export const OTHER_ACTIVITIES_CATEGORIES: Record<string, string[]> = {
  "صحة المرأة": [
    "صحة المرأة",
    "رعاية الحامل",
    "أمراض النساء",
    "سرطان الثدي",
    "الكشف المبكر قبل الزواج",
    "أمراض الدم الوراثية",
    "سن الأمان",
    "سرطان عنق الرحم",
    "العقم",
    "سكري الحمل",
    "التخطيط الأسري"
  ],
  "صحة الطفل": [
    "صحة الطفل",
    "الإساءة للطفل",
    "الإسهال",
    "الإصابات والحوادث عند الأطفال"
  ],
  "التغذية": [
    "التغذية",
    "الأنيميا وسوء التغذية",
    "الرضاعة الطبيعية + الأطعمة المكملة",
    "السمنة"
  ],
  "أمراض غير معدية": [
    "رفع الوعي بأنماط الحياة / افحص واطمئن",
    "النشاط البدني",
    "السكري",
    "ضغط الدم",
    "أمراض الكلي",
    "أمراض القلب",
    "الكوليسترول",
    "السرطان",
    "السكتة الدماغية",
    "الربو",
    "المسح الوطني للمراض غير معدية",
    "الصرع"
  ],
  "المسنين والخدمة المجتمعية": [
    "ذوى الإعاقة",
    "صحة المسن"
  ],
  "الأمراض المعدية": [
    "الأمراض المعدية",
    "الأمراض المنقولة جنسيا",
    "مكافحة العدوى وغسيل اليدين",
    "سلامة المرضى",
    "السلامة المهنية",
    "سلامة الغذاء",
    "صحة البيئة",
    "التحصينات",
    "البعوضة الزاعجة",
    "مكافحة نواقل الأمراض",
    "الأمراض التنفسية",
    "الملاريا",
    "الإيدز",
    "السل",
    "الكبد الوبائي",
    "الحميقي",
    "الحصبة الألمانية",
    "صحة السفر",
    "كورونا"
  ],
  "الإستهلاك الرشيد للدواء": [
    "الإستهلاك الرشيد للدواء"
  ],
  "الإسعافات والأولية والطوارئ": [
    "الإسعافات الأولية + طب الطوارئ",
    "الثقافة المرورية"
  ],
  "الصحة المدرسية + الصحة البئية + النفسية": [
    "التبرع بالدم",
    "الصحة النفسية",
    "الصحة المدرسية",
    "النظافة الشخصية و النظافة العامة"
  ],
  "الأمراض النوعية": [
    "صحة الإبصار",
    "صحة الفم و الأسنان",
    "صحة الأذن",
    "صحة الجلد"
  ],
  "التبرع بالأعضاء": [
    "التبرع بالأعضاء"
  ],
  "صحة الحاج والمعتمر": [
    "صحة الحاج والمعتمر"
  ],
  "المخدرات + التبغ ومشتقاته": [
    "التبغ و التدخين / السجائر الإلكترونية",
    "المخدرات و المؤثرات العقلية"
  ],
  "أخرى": [
    "التعريف بالمبادرات و الشراكات المجتمعية",
    "مؤسسة أثر الوقفية",
    "أهمية برنامج شفاء و تطبيقه",
    "مشاريع وقاية",
    "تعزيز الصحة",
    "اخرى : ايام عالمية تخصصية / اركان تثقيفية/ بعض المواضيع"
  ]
};

export const DEFAULT_FAVICON_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%231E3A8A' stroke='white' stroke-width='1'/%3E%3Ccircle cx='50' cy='50' r='38' fill='white' stroke='%23D4AF37' stroke-width='2.5'/%3E%3Ctext x='50' y='63' text-anchor='middle' font-family='Tajawal, sans-serif' font-weight='900' font-size='22' fill='%231E3A8A'%3Eإجادة%3C/text%3E%3C/svg%3E";

export const REMEMBERED_LOGIN_PASSWORD_KEY = 'excellenceRememberedLoginPassword';
export const REMEMBER_ME_PREFERENCE_KEY = 'excellenceRememberMePreference';
export const CUSTOM_LOGO_KEY = 'excellenceCustomLogo';
export const CURRENT_USER_KEY = 'excellenceCurrentUser';
export const DROPDOWN_CONFIG_KEY = 'excellenceDropdownConfig_v2';

export const DEFAULT_DROPDOWN_CONFIG: DropdownConfig = {
  partnershipsCategories: [
    {
      id: 'part_cat_gov',
      name: 'الجهات والوزارات الحكومية',
      icon: '🏛️',
      items: [
        'وزارة التربية والتعليم',
        'وزارة الرياضة والثقافة والشباب',
        'وزارة العمل',
        'سلاح الجو السلطاني',
        'شرطة عمان السلطانية',
        'هيئة البيئة',
        'وزارة الداخلية',
        'وزارة التراث و السياحة',
        'وزارة الزراعة و الثروة السمكية',
        'وزارة الإعلام - التواصل الحكومي'
      ]
    },
    {
      id: 'part_cat_acad',
      name: 'الجامعات والكليات التعليمية',
      icon: '🎓',
      items: [
        'جامعة نزوى',
        'جامعة السلطان قابوس',
        'جامعة التقنية والعلوم التطبيقية بصلالة',
        'جامعة صحار'
      ]
    },
    {
      id: 'part_cat_civil',
      name: 'الجمعيات والمراكز الأهلية والخيرية',
      icon: '🤝',
      items: [
        'مركز ابراء الثقافي',
        'جمعية إحسان',
        'جمعيات المرأة العمانية',
        'الفرق الخيرية التطوعية'
      ]
    },
    {
      id: 'part_cat_private',
      name: 'القطاع الخاص والشركات',
      icon: '🏢',
      items: [
        'شركات ومؤسسات القطاع الخاص',
        'المراكز التجارية والأسواق'
      ]
    },
    {
      id: 'part_cat_other',
      name: 'جهات ومؤسسات أخرى',
      icon: '🌐',
      items: [
        'أخرى'
      ]
    }
  ],
  initiativesCategories: [
    {
      id: 'init_cat_community_service',
      name: 'خدمة المجتمع',
      icon: '🩺',
      items: [...COMMUNITY_SERVICE_OPTIONS]
    },
    ...Object.entries(OTHER_ACTIVITIES_CATEGORIES).map(([catName, items], index) => ({
      id: `init_cat_${index + 1}`,
      name: catName,
      icon: '🏷️',
      items: [...items]
    }))
  ]
};
