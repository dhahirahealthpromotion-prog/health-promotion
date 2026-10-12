declare const XLSX: any;

export const exportSheetTemplate = (fileName: string) => {
    // 1. Institutions Sheet (نموذج إدخال المؤسسات)
    const instHeaders = [
        ['الولاية', 'اسم المؤسسة']
    ];
    // Example rows
    const instData = [
        ['عبري', 'مركز صحي النور'],
        ['ينقل', 'مجمع الهدى الصحي'],
        ['ضنك', 'مستشفى ضنك']
    ];
    const wsInst = XLSX.utils.aoa_to_sheet([...instHeaders, ...instData]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsInst, 'المؤسسات');
    
    // Formatting
    const wscols = [{ wch: 25 }, { wch: 40 }];
    wsInst['!cols'] = wscols;

    XLSX.writeFile(wb, `${fileName}.xlsx`);
};
