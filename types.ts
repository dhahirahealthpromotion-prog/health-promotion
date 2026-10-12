export enum UserRole {
  SUPERVISOR = 'supervisor',
  INSTITUTION = 'institution',
  IMMUNIZATION = 'immunization', // قسم تعزيز الصحة
}

export interface User {
  id: number;
  name: string;
  role: UserRole;
  updatedAt?: number;
  pin?: string;
  state?: string; // الولاية
  population?: { [year: number]: number };
}

export interface MonthlyReport {
  id: number;
  institutionId: number;
  year?: number;
  month?: number; // 1-12
  date?: string; // YYYY-MM-DD تاريخ المبادرة أو الشراكة
  entryPerson: string; // اسم مسجل البيانات
  categoryType?: 'partnerships' | 'initiatives'; // الشراكات أو المبادرات
  
  // الشراكات (Partnerships)
  partnershipTitle?: string; // عنوان الشراكة
  partnershipEntity?: string; // الجهة
  partnershipGoal?: string; // الهدف

  // المبادرات (Initiatives)
  initiativeType?: 'community_service' | 'other_activities'; // خدمة المجتمع أو الأنشطة والفعاليات الأخرى
  initiativeTypeLabel?: string;
  categoryName?: string; // الفئة المحددة (مثل: صحة المرأة، صحة الطفل، خدمة المجتمع)
  subItem?: string; // البند الدقيق المختار من القائمة المنسدلة
  beneficiariesCount?: number; // خانة رقمية لكتابة عدد المستفيدين
  notes?: string; // الملاحظات العامة
  updatedAt: number;

  // الشراكات (Partnerships) - حقول مخصصة
  partnerships_field_1?: number;
  partnerships_field_2?: number;
  partnerships_field_3?: number;
  partnerships_field_4?: number;
  partnerships_field_5?: number;

  // المبادرات (Initiatives) - حقول مخصصة
  initiatives_field_1?: number;
  initiatives_field_2?: number;
  initiatives_field_3?: number;
  initiatives_field_4?: number;
  initiatives_field_5?: number;
  
  // Index signature to allow any additional keys
  [key: string]: any;
}

export interface DeletedItem {
  id: number;
  type: 'user' | 'report';
  timestamp: number;
}

export interface DropdownCategory {
  id: string;
  name: string;
  items: string[];
  icon?: string;
}

export interface DropdownConfig {
  partnershipsCategories: DropdownCategory[];
  initiativesCategories: DropdownCategory[];
  updatedAt?: number;
}

export interface FullBackupData {
  users: User[];
  reports: MonthlyReport[];
  deletedItems?: DeletedItem[];
  customLogo: string | null;
  supervisorPassword?: string;
  immunizationPassword?: string;
  appName?: string;
  firebaseConfig?: any; 
  configUpdatedAt?: number; 
  isDistributable?: boolean;
  isPublishedConnected?: boolean;
  dropdownConfig?: DropdownConfig;
}
