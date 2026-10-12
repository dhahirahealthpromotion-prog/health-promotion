
export const translationMap: Record<string, string> = {
  'partnerships': 'الشراكات',
  'initiatives': 'المبادرات',
  'community_service': 'خدمة المجتمع',
  'other_activities': 'الأنشطة والفعاليات الأخرى',
};

export const renderCell = (value: any, type?: string) => {
  if (value === undefined || value === null || value === '') return '—';
  
  if (type === 'translation') {
      return translationMap[value as string] || value;
  }
  
  if (type === 'array' && Array.isArray(value)) {
      return value.join(', ');
  }

  return value;
};

interface ExportHeader {
  key: string;
  label: string;
  type?: string;
}

export const exportToWord = (
  headers: ExportHeader[],
  data: any[],
  fileName: string,
  reportTitle?: string
) => {
  const tableHeaders = headers.map(h => h.label);
  
  const tableRowsHtml = data.map(item => {
    const rowCellsHtml = headers.map(header => {
      const value = item[header.key];
      return `<td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${renderCell(value, header.type)}</td>`;
    }).join('');
    return `<tr>${rowCellsHtml}</tr>`;
  }).join('');

  let htmlContent = `
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="utf-8">
        <title>${reportTitle || fileName}</title>
        <style>
            body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #1E3A8A; color: #FFFFFF; border: 1px solid #CBD5E1; padding: 8px; font-weight: bold; }
            td { border: 1px solid #E2E8F0; padding: 6px; }
        </style>
    </head>
    <body>
  `;

  if (reportTitle) {
    htmlContent += `<h2 style="text-align: center; color: #1E3A8A; margin-bottom: 20px;">${reportTitle}</h2>`;
  }

  htmlContent += `
    <table>
        <thead><tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRowsHtml}</tbody>
    </table>
    </body></html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
