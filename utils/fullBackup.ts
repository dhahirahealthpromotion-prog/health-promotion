import { FullBackupData, UserRole, MonthlyReport, User } from '../types';
declare const XLSX: any;

const getUniqueKeys = (data: any[], preferredOrder: string[] = []) => {
    const keys = new Set<string>();
    data.forEach(item => {
        Object.keys(item).forEach(k => keys.add(k));
    });
    const sortedKeys: string[] = [];
    preferredOrder.forEach(k => {
        if (keys.has(k)) {
            sortedKeys.push(k);
            keys.delete(k);
        }
    });
    return [...sortedKeys, ...Array.from(keys).sort()];
};

export const exportFullBackup = (data: FullBackupData, fileName: string) => {
    const wb = XLSX.utils.book_new();

    // 1. Institutions Sheet
    const institutionsOnly = data.users.filter(u => u.role === UserRole.INSTITUTION);
    const userKeys = ['id', 'name', 'role', 'state', 'pin'];
    let usersHeaders = getUniqueKeys(institutionsOnly, userKeys).filter(h => h !== 'population');

    const usersData = institutionsOnly.map(u => {
        const row: any = {};
        usersHeaders.forEach(h => {
            row[h] = (u as any)[h] ?? '';
        });
        return row;
    });
    const wsUsers = XLSX.utils.json_to_sheet(usersData, { header: usersHeaders });
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Institutions_List');

    // 2. Monthly Reports Sheet (with Partnerships and Initiatives fields)
    if (data.reports && data.reports.length > 0) {
        const reportPreferredKeys = [
            'id', 'institutionId', 'year', 'month', 'entryPerson', 'notes',
            'partnerships_field_1', 'partnerships_field_2', 'partnerships_field_3', 'partnerships_field_4', 'partnerships_field_5',
            'initiatives_field_1', 'initiatives_field_2', 'initiatives_field_3', 'initiatives_field_4', 'initiatives_field_5',
            'updatedAt'
        ];
        const reportHeaders = getUniqueKeys(data.reports, reportPreferredKeys);
        const wsReports = XLSX.utils.json_to_sheet(data.reports, { header: reportHeaders });
        XLSX.utils.book_append_sheet(wb, wsReports, 'Monthly_Reports');
    }

    // 3. Auth Credentials
    const authData = [
        ['الدور / الحساب', 'كلمة المرور / الرمز'],
        ['المشرف العام', data.supervisorPassword || '123'],
        ['قسم تعزيز الصحة', data.immunizationPassword || '12345']
    ];
    const wsAuth = XLSX.utils.aoa_to_sheet(authData);
    XLSX.utils.book_append_sheet(wb, wsAuth, 'Auth_Credentials');

    // 4. App Settings
    const settingsRows = [
        ['إعدادات التطبيق', 'القيمة'],
        ['اسم البرنامج', data.appName || 'برنامج الإجادة المؤسسية'],
        ['تاريخ النسخة الاحتياطية', new Date().toLocaleString('ar-OM')]
    ];
    const wsSettings = XLSX.utils.aoa_to_sheet(settingsRows);
    XLSX.utils.book_append_sheet(wb, wsSettings, 'App_Settings');

    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const importFullBackup = (file: File): Promise<FullBackupData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const imported: Partial<FullBackupData> = { 
                    users: [], reports: [] 
                };

                // 1. Load Institutions from Excel
                const instSheet = workbook.Sheets['Institutions_List'] || workbook.Sheets['Institutions'] || workbook.Sheets[workbook.SheetNames[0]];
                let parsedUsers: User[] = [];
                if (instSheet) {
                    const rows = XLSX.utils.sheet_to_json(instSheet);
                    parsedUsers = rows.filter((r: any) => r.name || r.Name || r['اسم المؤسسة'] || r['name of Institution']).map((r: any, index) => {
                        const idValue = r.id || r.Id || r.InstitutionId || (Date.now() + index);
                        return {
                            ...r,
                            id: Number(idValue),
                            name: (r.name || r.Name || r['اسم المؤسسة'] || r['name of Institution'] || '').toString().trim(),
                            state: (r.state || r.State || r['الولاية'] || r.willayat || '').toString().trim(),
                            role: r.role || UserRole.INSTITUTION,
                            pin: r.pin ? String(r.pin) : '123',
                            updatedAt: r.updatedAt || Date.now()
                        };
                    });
                }

                // 2. Ensure Supervisor exists
                const existingSupervisor = parsedUsers.find(u => u.role === UserRole.SUPERVISOR);
                if (!existingSupervisor) {
                    const isId1Taken = parsedUsers.some(u => Number(u.id) === 1);
                    const supervisorId = isId1Taken ? 0 : 1;
                    const defaultSupervisor: User = { 
                        id: supervisorId, 
                        name: 'المشرف العام', 
                        role: UserRole.SUPERVISOR, 
                        updatedAt: Date.now() 
                    };
                    parsedUsers.push(defaultSupervisor);
                }
                imported.users = parsedUsers;

                // 3. Import Monthly Reports
                const reportSheet = workbook.Sheets['Monthly_Reports'] || workbook.Sheets['Reports'] || workbook.Sheets['التقارير_الشهرية'];
                if (reportSheet) {
                    const rows = XLSX.utils.sheet_to_json(reportSheet);
                    imported.reports = rows.map((r: any) => {
                        const report: any = { ...r };
                        ['id', 'institutionId', 'year', 'month', 'updatedAt'].forEach(k => {
                            if (report[k] !== undefined) report[k] = Number(report[k]);
                        });
                        // Ensure partnerships and initiatives fields are numeric if present
                        for (let i = 1; i <= 5; i++) {
                            if (report[`partnerships_field_${i}`] !== undefined) {
                                report[`partnerships_field_${i}`] = Number(report[`partnerships_field_${i}`]);
                            }
                            if (report[`initiatives_field_${i}`] !== undefined) {
                                report[`initiatives_field_${i}`] = Number(report[`initiatives_field_${i}`]);
                            }
                        }
                        return report as MonthlyReport;
                    });
                }
                
                // 4. Import Credentials
                if (workbook.Sheets['Auth_Credentials']) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Auth_Credentials'], { header: 1 }) as any[][];
                    rows.forEach(row => {
                        if (row[0] === 'المشرف العام' || row[0] === 'Main Supervisor') {
                            imported.supervisorPassword = String(row[1]);
                        }
                        if (row[0] === 'قسم تعزيز الصحة' || row[0] === 'Immunization Dept') {
                            imported.immunizationPassword = String(row[1]);
                        }
                    });
                }

                // 5. Import App Settings
                if (workbook.Sheets['App_Settings']) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets['App_Settings'], { header: 1 }) as any[][];
                    rows.forEach(row => {
                        if (row[0] === 'اسم البرنامج' || row[0] === 'Application Name') {
                            imported.appName = String(row[1]);
                        }
                    });
                }
                
                resolve(imported as FullBackupData);
            } catch (err) { 
                console.error("Import Error:", err);
                reject(new Error("حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.")); 
            }
        };
        reader.readAsArrayBuffer(file);
    });
};
